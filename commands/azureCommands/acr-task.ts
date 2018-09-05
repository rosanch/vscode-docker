import * as Azure from 'azure';
import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
//import { DockerBuildStep } from 'azure-arm-containerregistry/lib/models/dockerBuildStep';
import { SubscriptionModels } from 'azure-arm-resource';
//const Azure = require('azure');
//const MsRest = require('ms-rest-azure');
import * as MsRest from "ms-rest-azure";
//import * as MsRest from "ms-rest-azure";
import * as os from 'os';
import * as vscode from "vscode";
import { DockerBuildStep, Registry, SourceTrigger, Task } from '../../node_modules/azure-arm-containerregistry/lib/models';
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
    const options = {
        environment: {
            language: 'en-us',
            name: 'Dogfood',
            portalUrl: 'https://df.onecloud.azure-test.net',
            managementEndpointUrl: 'https://management.core.windows.net',
            resourceManagerEndpointUrl: 'https://api-dogfood.resources.windows-int.net/',
            activeDirectoryEndpointUrl: 'https://login.windows-ppe.net/',
            activeDirectoryResourceId: 'https://management.core.windows.net/',
            activeDirectoryGraphResourceId: 'https://graph.ppe.windows.net/',
            activeDirectoryGraphApiVersion: '2013-04-05',
            publishingProfileUrl: 'https://go.microsoft.com/fwlink/?LinkId=254432',
            storageEndpointSuffix: '.core.test-cint.azure-test.net',
            sqlManagementEndpointUrl: 'https://management.core.windows.net:8443/',
            sqlServerHostnameSuffix: '.database.windows.net',
            galleryEndpointUrl: 'https://gallery.azure.com/',
            batchResourceId: 'https://batch.core.windows.net/',
            keyVaultDnsSuffix: '.vault.azure.net',
            azureDataLakeStoreFileSystemEndpointSuffix: 'azuredatalakestore.net',
            azureDataLakeAnalyticsCatalogAndJobEndpointSuffix: 'azuredatalakeanalytics.net',
            validateAuthority: true
        }
    };
    // await getStorageClient(options, subscription)

    MsRest.interactiveLogin(options, async (err, credentials) => {
        if (err) { throw err; }
        // ..use the client instance to manage service resources.
        let subscription = await quickPickSubscription();
        let resourceGroup = await quickPickResourceGroup(false, subscription);
        let registry = await quickPickACRRegistry();
        createTask(subscription, resourceGroup.name, registry);
    });
}

async function getInfo(): Promise<{ gitToken: string, gitUrl: string, imageName: string, taskName: string, sourceControlType: string }> {
    let opt = {
        ignoreFocusOut: true,
        prompt: 'GitHub personal access token? Acquired from https://github.com/settings/tokens/new'
    };
    const gitToken: string = await vscode.window.showInputBox(opt);

    opt = {
        ignoreFocusOut: true,
        prompt: 'GitHub source context URL? '
    };
    const gitUrl: string = await vscode.window.showInputBox(opt);

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
    const sourceControlType: string = 'GitHub';
    return { gitToken, gitUrl, imageName, taskName, sourceControlType }
}

async function createTask(subscription: SubscriptionModels.Subscription, resourceGroupName: string, registry: Registry): Promise<void> {
    let { gitToken, gitUrl, imageName, taskName, sourceControlType } = await getInfo();

    let client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    console.log("uhh");
    let dockerStep: DockerBuildStep = {
        'baseImageDependencies': null,
        'imageNames': [imageName],
        'noCache': false,
        'dockerFilePath': 'Dockerfile',
        'isPushEnabled': true,
        'type': 'Docker'
    }

    let pullTrig: SourceTrigger = {
        'name': 'triggerName',
        'sourceRepository': {
            'repositoryUrl': gitUrl,
            'sourceControlType': sourceControlType,
            'sourceControlAuthProperties': {
                'token': gitToken,
                'tokenType': 'PAT',
                'refreshToken': '',
                'scope': 'repo',
                'expiresIn': 1313141
            },
        },
        'sourceTriggerEvents': [],
    }
    let taskCreateParameters: Task = {
        'step': dockerStep,
        'location': registry.location,
        //'id': subscription.id + '/resourceGroups/' + resourceGroupName + '/providers/Microsoft.ContainerRegistry/registries/' + registry.name + '/buildTasks/' + taskName,
        'name': taskName,
        'trigger': {
            'sourceTriggers': [pullTrig]
        },
        'provisioningState': "Succeeded",
        'platform': { 'os': 'Linux' },
        'status': 'Enabled',
        'timeout': 3600,
        'tags': null
    }
    console.log(taskCreateParameters.id)
    console.log(taskCreateParameters);
    try {
        await client.tasks.create(resourceGroupName, registry.name, taskName, taskCreateParameters);
    } catch (error) {
        console.log(error);
    }
}

/*

let newOpt = {
    ignoreFocusOut: true,
    placeHolder: taskName,
    value: taskName,
    prompt: 'BuildTask alias? '
};
const buildTaskAlias: string = await vscode.window.showInputBox(newOpt);
*/
