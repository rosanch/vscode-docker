import ContainerRegistryManagementClient from "azure-arm-containerregistry";
import { Build, BuildGetLogResult, BuildListResult, Registry } from "azure-arm-containerregistry/lib/models";
/** Class to manage data and data acquisition for logs */
export class LogData {
    public registry: Registry;
    public resourceGroup: string;
    public links: { requesting: boolean, url?: string }[];
    public logs: Build[];
    public client: ContainerRegistryManagementClient;
    private nextLink: string;

    constructor(client: ContainerRegistryManagementClient, registry: Registry, resourceGroup: string) {
        this.registry = registry;
        this.resourceGroup = resourceGroup;
        this.client = client;
        this.logs = [];
        this.links = [];
    }
    /** Acquires Links from an item number corresponding to the index of the corresponding log, caches
     * logs in order to avoid unecessary requests if opened multiple times.
     */
    public async getLink(itemNumber: number): Promise<string> {
        if (itemNumber >= this.links.length) {
            throw new Error('Log for which the link was requested has not been added');
        }

        if (this.links[itemNumber].url) {
            return this.links[itemNumber].url;
        }

        //If user is simply clicking many times impatiently it makes sense to only have one request at once
        if (this.links[itemNumber].requesting) { return 'requesting' }

        this.links[itemNumber].requesting = true;
        const temp: BuildGetLogResult = await this.client.builds.getLogLink(this.resourceGroup, this.registry.name, this.logs[itemNumber].buildId);
        this.links[itemNumber].url = temp.logLink;
        this.links[itemNumber].requesting = false;
        return this.links[itemNumber].url
    }

    //contains(BuildTaskName, 'testTask')
    //`BuildTaskName eq 'testTask'
    //
    /** Loads logs from azure
     * @param loadNext Determines if the next page of logs should be loaded, will throw an error if there are no more logs to load
     * @param removeOld Cleans preexisting information on links and logs imediately before new requests, if loadNext is specified
     * the next page of logs will be saved and all preexisting data will be deleted.
     * @param filter Specifies a filter for log items, can be in the following formats : BuildTaskName eq '<taskName>', contains(,'')
     */
    public async loadLogs(loadNext: boolean, removeOld?: boolean, filter?: Filter): Promise<void> {
        let buildListResult: BuildListResult;
        let options: any = {};
        if (filter) { options.filter = this.parseFilter(filter); }
        if (loadNext) {
            if (this.nextLink) {
                buildListResult = await this.client.builds.listNext(this.nextLink);
            } else {
                throw new Error('No more logs to show');
            }
        } else {
            buildListResult = await this.client.builds.list(this.resourceGroup, this.registry.name, options);
        }
        if (removeOld) { this.clearLogItems() }
        this.nextLink = buildListResult.nextLink;
        this.addLogs(buildListResult);
    }

    public addLogs(logs: Build[]): void {
        this.logs = this.logs.concat(logs);

        const itemCount = logs.length;
        for (let i = 0; i < itemCount; i++) {
            this.links.push({ 'requesting': false });
        }
    }

    public clearLogItems(): void {
        this.logs = [];
        this.links = [];
        this.nextLink = '';
    }

    private parseFilter(filter: Filter): string {
        let parsedFilter = "";
        if (filter.buildTask) { // Build Task id
            parsedFilter = `BuildTaskName eq '${filter.buildTask}'`;
        } else if (filter.image) { //Image

            // filter = filter.length > 0 ? filter + `and contains(Image,'${inputFields[2].value}')` : `contains(Image,'${inputFields[2].value}')`;
        }
        return parsedFilter;
    }
}

export interface Filter {
    image?: string;
    buildId?: string;
    buildTask?: string;
}
