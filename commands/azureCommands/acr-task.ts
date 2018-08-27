import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
//import { DockerBuildStep } from 'azure-arm-containerregistry/lib/models/dockerBuildStep';
import { SubscriptionModels } from 'azure-arm-resource';
import * as os from 'os';
import * as vscode from "vscode";
import { BuildStep, BuildTask, DockerBuildStep, Registry } from '../../node_modules/azure-arm-containerregistry/lib/models';
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { quickPickACRRegistry, quickPickLocation, quickPickResourceGroup, quickPickSKU, quickPickSubscription } from '../utils/quick-pick-azure';
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
    let resourceGroup = await quickPickResourceGroup(false, subscription);
    let registry = await quickPickACRRegistry();
    createTask(subscription, resourceGroup.name, registry);
}

async function createTask(subscription: SubscriptionModels.Subscription, resourceGroupName: string, registry: Registry): Promise<void> {
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
        prompt: 'new image name in format: <name>:<tag> '
    };
    const imageName: string = await vscode.window.showInputBox(opt);

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
        'type': "Microsoft.ContainerRegistry/registries/buildTasks",
        'location': registry.location,
        'alias': buildTaskAlias,
        'name': taskName,
        'sourceRepository': {
            'repositoryUrl': gitURL,
            'sourceControlType': sourceControlType,
            'isCommitTriggerEnabled': true,
            'sourceControlAuthProperties': {
                'token': gitToken,
                'tokenType': 'PAT',
                'refreshToken': '',
                'scope': 'repo',
                'expiresIn': 1313141
            }
        },
        'platform': { "cpu": 2, 'osType': 'Linux' },
        'status': 'Enabled',
        'timeout': 3600
    }

    try {
        await client.buildTasks.create(resourceGroupName, registry.name, taskName, taskCreateParameters);
    } catch (error) {
        console.log(error);
    }
    const type: string = 'image';
    // stepName is set equal to taskName to prepare for new library without step
    const stepName = taskName + 'StepName';
    let dockerStep: DockerBuildStep = {
        'baseImageTrigger': 'Runtime',
        'baseImageDependencies': null,
        'branch': 'master',
        'imageNames': [imageName],
        'noCache': false,
        'dockerFilePath': 'Dockerfile',
        'buildArguments': [],
        'isPushEnabled': true,
        'type': 'Docker'
    }
    /*let stepCreateParameters: BuildStep = {
        'properties': {
            'type': dockerStep
        }
    }*/
    try {
        let buildStep = await client.buildSteps.create(resourceGroupName, registry.name, taskName, stepName, dockerStep);
        //buildTask.prope
        //setattr
    } catch (error) {
        console.log(error);
    }
}
