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

    public async loadMoreLogs(filterFunc?: (logEntry: Build) => boolean): Promise<void> {
        let buildListResult: BuildListResult;
        if (this.logs.length === 0) {
            buildListResult = await this.client.builds.list(this.resourceGroup, this.registry.name);
            this.nextLink = buildListResult.nextLink;
        } else if (!this.nextLink) {
            throw new Error('No more logs to show');
        } else {
            let options = { 'skipToken': this.nextLink };
            buildListResult = await this.client.builds.list(this.resourceGroup, this.registry.name, options);
            this.nextLink = buildListResult.nextLink;
        }
        if (filterFunc) {
            buildListResult = buildListResult.filter(filterFunc);
        }

        this.addLogs(buildListResult);
    }

    public addLogs(logs: Build[]): void {
        this.logs = this.logs.concat(logs);

        const itemCount = logs.length;
        for (let i = 0; i < itemCount; i++) {
            this.links.push({ 'requesting': false });
        }
    }
}
