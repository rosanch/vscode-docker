import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
//import { DockerBuildStep } from 'azure-arm-containerregistry/lib/models/dockerBuildStep';
import { SubscriptionModels } from 'azure-arm-resource';
import * as os from 'os';
import * as vscode from "vscode";
import { BuildTaskNode } from '../../explorer/models/taskNode';
import { BuildStep, BuildTask, DockerBuildStep, Registry } from '../../node_modules/azure-arm-containerregistry/lib/models';
import { localeData } from '../../node_modules/moment';
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { quickPickACRRegistry, quickPickLocation, quickPickResourceGroup, quickPickSKU, quickPickSubscription } from '../utils/quick-pick-azure';

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
        prompt: 'Task Name? (5 or more charachters)'
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

    let client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    let taskCreateParameters: BuildTask = {
        'location': registry.location,
        'alias': buildTaskAlias,
        'creationDate': new Date(),
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
        'provisioningState': "Succeeded",
        'platform': { "cpu": 2, 'osType': 'Linux' },
        'status': 'Enabled',
        'timeout': 3600,
        'tags': null
    }

    await client.buildTasks.create(resourceGroupName, registry.name, taskName, taskCreateParameters);

    // stepName is set equal to taskName to prepare for new library without step
    const stepName = taskName + 'StepName';
    let dockerStep: DockerBuildStep = {
        'type': "Docker",
        'baseImageTrigger': 'Runtime',
        'baseImageDependencies': null,
        'branch': 'master',
        'imageNames': [imageName],
        'noCache': false,
        'dockerFilePath': 'Dockerfile',
        'buildArguments': [],
        'isPushEnabled': true,
        'provisioningState': "Succeeded",
    }
    try {
        let step = await client.buildSteps.create(resourceGroupName, registry.name, taskName, stepName, dockerStep);
    } catch (error) {
        console.log(error);
    }
}
