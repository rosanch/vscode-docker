import * as vscode from 'vscode';
import * as opn from 'opn';
import * as ContainerModels from '../../node_modules/azure-arm-containerregistry/lib/models';
import { NodeBase } from './nodeBase';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount, AzureSession } from '../../typings/azure-account.api';
import { AzureCredentialsManager } from '../../utils/azureCredentialsManager';

/*Single TaskRootNode under each Repository. Labeled "Build Tasks" */
export class TaskRootNode extends NodeBase {
    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public subscription: SubscriptionModels.Subscription,
        public readonly azureAccount: AzureAccount,
        public registry: ContainerModels.Registry,
        public readonly iconPath: any = {}
    ) {
        super(label);
    }

    public name: string;

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    /*Making a list view of BuildTaskNodes, or the Build Tasks of the current registry */
    async getChildren(element: TaskRootNode): Promise<BuildTaskNode[]> {
        const buildTaskNodes: BuildTaskNode[] = [];
        let buildTasks: ContainerModels.BuildTask[] = [];

        const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(element.subscription);
        const resourceGroup: string = element.registry.id.slice(element.registry.id.search('resourceGroups/') + 'resourceGroups/'.length, element.registry.id.search('/providers/'));

        buildTasks = await client.buildTasks.list(resourceGroup, element.registry.name);
        if (buildTasks.length === 0) {
            vscode.window.showErrorMessage(`You do not have any Build Tasks in '${element.registry.name}'. You can create one with ACR Build. `, "Learn More").then(val => {
                if (val === "Learn More") {
                    opn('https://docs.microsoft.com/en-us/azure/container-registry/container-registry-tutorial-build-task');
                }
            })
        }

        for (let buildTask of buildTasks) {
            let node = new BuildTaskNode(buildTask.name, "buildTaskNode");
            buildTaskNodes.push(node);
        }
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
}
