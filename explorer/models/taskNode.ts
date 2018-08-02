import * as vscode from 'vscode';
import * as path from 'path';
import * as moment from 'moment';
import * as request from 'request-promise';
import * as ContainerModels from '../../node_modules/azure-arm-containerregistry/lib/models';
import { NodeBase } from './nodeBase';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount, AzureSession } from '../../typings/azure-account.api';
import { RegistryType } from './registryType';
import { AsyncPool } from '../../utils/asyncpool';
import { MAX_CONCURRENT_REQUESTS } from '../../utils/constants'
import { AzureCredentialsManager } from '../../utils/azureCredentialsManager';
import { BuildTasks } from '../../node_modules/azure-arm-containerregistry/lib/operations';
import { AzureRegistryNode } from './azureRegistryNodes';

export class TaskRootNode extends NodeBase { ///starting class of simple with just name attribute
    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: any = {},
    ) {
        super(label);
    }

    public name: string;
    public subscription: SubscriptionModels.Subscription;

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    async getChildren(element: TaskRootNode): Promise<BuildTaskNode[]> {
        console.log("get children of TaskRootNode");
        const buildTaskNodes: BuildTaskNode[] = [];
        console.log(element); //TaskRootNode

        console.log(this.subscription); //undefined here

        const tenantId: string = element.subscription.tenantId;
        console.log(tenantId);

        const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(element.subscription);
        console.log("just made client");

        let buildTasks: ContainerModels.BuildTask[] = [];
        console.log(buildTasks);

        //const resourceGroup: string = element.registry.id.slice(element.registry.id.search('resourceGroups/') + 'resourceGroups/'.length, element.registry.id.search('/providers/'));
        //buildTasks = await client.buildTasks.list(resourceGroup, element.registry.name);

        console.log("buildTasks filled in:");
        console.log(buildTasks);

        for (let buildTask of buildTasks) {
            let node = new BuildTaskNode(buildTask.name, "buildTaskNode");
            buildTaskNodes.push(node);
        }

        console.log(buildTaskNodes);
        return buildTaskNodes;
    }
}

export class BuildTaskNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
    ) {
        super(label);
    }

    public accessTokenARC: string;
    public azureAccount: AzureAccount
    public password: string;
    public refreshTokenARC: string;
    public registry: ContainerModels.Registry;
    public repository: string;
    public subscription: SubscriptionModels.Subscription;
    public userName: string;

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
        }
    }
}
