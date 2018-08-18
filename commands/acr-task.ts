import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { DockerBuildStep } from 'azure-arm-containerregistry/lib/models/dockerBuildStep';
import { SubscriptionModels } from 'azure-arm-resource';
import * as os from 'os';
import * as vscode from "vscode";
import { ImageNode } from "../explorer/models/imageNode";
import { BuildStep, BuildTask } from '../node_modules/azure-arm-containerregistry/lib/models';
import { AzureUtilityManager } from "../utils/AzureUtilityManager";
import { quickPickACRRegistry, quickPickLocation, quickPickResourceGroup, quickPickSKU, quickPickSubscription } from './utils/quick-pick-azure';
//import { DockerBuildStep } from "azure-arm-containerregistry/lib/models";

// This function creates a build task from an existing image, pulling the context from that image in order to limit the number of parameters.

/*export async function buildTask(context?: ImageNode): Promise<void> {
    let registryName = context;
    const resourceGroup: string = context.registry.id.slice(context.registry.id.search('resourceGroups/') + 'resourceGroups/'.length, context.registry.id.search('/providers/'));
    const registryName: string = context.registry.name;

    createTask(subscription, resourceGroupName, registryName);
}*/
// This creates and launches a build task from a workspace solution which hasn't yet been built into an image, so no context is provided.

export async function launchAsTask(): Promise<void> {
    let subscription = await quickPickSubscription();
    let resourceGroup = await quickPickResourceGroup(false);
    let registry = await quickPickACRRegistry();

    createTask(subscription, resourceGroup.name, registry.name);
}

async function createTask(subscription: SubscriptionModels.Subscription, resourceGroupName: string, registryName: string): Promise<void> {
    let opt = {
        ignoreFocusOut: true,
        prompt: 'GitHub personal access token? Acquired from https://github.com/settings/tokens/new'
    };
    const gitToken: string = await vscode.window.showInputBox(opt);

    opt = {
        ignoreFocusOut: true,
        prompt: 'GitHub source context URL? '
    };
    const gitURL: string = await vscode.window.showInputBox(opt);

    opt = {
        ignoreFocusOut: true,
        prompt: 'Task Name? '
    };
    const taskName: string = await vscode.window.showInputBox(opt);
    let newOpt = {
        ignoreFocusOut: true,
        placeHolder: taskName,
        value: taskName,
        prompt: 'BuildTask alias? '
    };
    const buildTaskAlias: string = await vscode.window.showInputBox(newOpt);
    const sourceControlType: string = 'GitHub';

    let osType = os.type();
    if (osType === 'Windows_NT') {
        osType = 'Windows'
    }
    let client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    console.log("uhh");
    let taskCreateParameters: BuildTask = {
        'alias': buildTaskAlias,
        'platform': { 'osType': osType },
        'sourceRepository': { 'repositoryUrl': gitURL, 'sourceControlType': sourceControlType, 'sourceControlAuthProperties': { 'token': gitToken } },
        'location': registryName
    }

    client.buildTasks.create(resourceGroupName, registryName, taskName, taskCreateParameters);
    const type: string = 'image';
    // stepName is set equal to taskName to prepare for new library without step
    const stepName = taskName;
    let stepCreateParameters: BuildStep = {
        'properties': { 'type': 'image' }
    }
    try {
        client.buildSteps.create(resourceGroupName, registryName, taskName, stepName, stepCreateParameters);
    } catch (error) {
        console.log(error);
    }
}
