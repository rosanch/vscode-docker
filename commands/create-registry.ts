
import * as vscode from "vscode";
import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { AzureAccountWrapper } from '.././explorer/deploy/azureAccountWrapper';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount, AzureSession } from '../typings/azure-account.api';
import { RegistryRootNode } from "../explorer/models/registryRootNode";
import { ServiceClientCredentials } from 'ms-rest';
import { RegistryNameStatus } from "azure-arm-containerregistry/lib/models";
const teleCmdId: string = 'vscode-docker.createRegistry';
import { ResourceGroup, ResourceGroupListResult } from "azure-arm-resource/lib/resource/models";
import { AzureCredentialsManager } from '../utils/AzureCredentialsManager';


export async function createRegistry(context?: RegistryRootNode) {

    let azureAccount = context.azureAccount;
    if (!azureAccount) {
        return;
    }

    if (azureAccount.status === 'LoggedOut') {
        return;
    }
    let subscription: SubscriptionModels.Subscription;
    let resourceGroup: ResourceGroup;
    try {
        subscription = await acquireSubscription(azureAccount);
        resourceGroup = await acquireResourceGroup(subscription, azureAccount);
    } catch (error) {
        return;
    }
    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(subscription);

    let registryName: string;
    try {
        registryName = await acquireRegistryName(client);
    } catch (error) {
        return;
    }

    const sku: string = await vscode.window.showInputBox({
        ignoreFocusOut: false,
        placeHolder: 'Basic',
        value: 'Basic',
        prompt: 'SKU? '
    });

    client.registries.beginCreate(resourceGroup.name, registryName, { 'sku': { 'name': sku }, 'location': resourceGroup.location }).then(function (response) {
        vscode.window.showInformationMessage(response.name + ' has been created succesfully!');
    }, function (error) {
        vscode.window.showErrorMessage(error.message);
    })

}

// INPUT HELPERS
async function acquireSubscription(azureAccount): Promise<SubscriptionModels.Subscription> {
    let subscription: SubscriptionModels.Subscription;

    //const subs: SubscriptionModels.Subscription[] = getFilteredSubscriptions(azureAccount);
    const subs = AzureCredentialsManager.getInstance().getFilteredSubscriptionList();

    let subsNames: string[] = [];
    for (let i = 0; i < subs.length; i++) {
        subsNames.push(subs[i].displayName);
    }
    let subscriptionName: string;
    do {
        subscriptionName = await vscode.window.showQuickPick(subsNames, { 'canPickMany': false, 'placeHolder': 'Choose a subscription to be used' });

        if (subscriptionName === undefined) throw 'User exit';
    } while (!subscriptionName);


    return subs.find(sub => { return sub.displayName === subscriptionName });
}

async function acquireResourceGroup(subscription: SubscriptionModels.Subscription, azureAccount): Promise<ResourceGroup> {
    //Acquire each subscription's data simultaneously
    const resourceGroupClient = new ResourceManagementClient(AzureCredentialsManager.getInstance().getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);

    const resourceGroups = await AzureCredentialsManager.getInstance().getResourceGroups(subscription);
    let resourceGroupNames: string[] = [];
    resourceGroupNames.push('+ Create new resource group');
    for (let i = 0; i < resourceGroups.length; i++) {
        resourceGroupNames.push(resourceGroups[i].name);
    }
    let resourceGroup;
    let resourceGroupName;
    do {
        resourceGroupName = await vscode.window.showQuickPick(resourceGroupNames, { 'canPickMany': false, 'placeHolder': 'Choose a Resource Group to be used' });

        if (resourceGroupName === undefined) throw 'user Exit';

        if (resourceGroupName === '+ Create new resource group') {
            let opt: vscode.InputBoxOptions = {
                ignoreFocusOut: false,
                prompt: 'Resource group name? '
            };
            let resourceGroupName: string = await vscode.window.showInputBox(opt);

            let resourceGroupStatus: boolean = await resourceGroupClient.resourceGroups.checkExistence(resourceGroupName);
            console.log(resourceGroupStatus);

            while (resourceGroupStatus) {
                opt = {
                    ignoreFocusOut: false,
                    prompt: "That resource group name is already in existence. Try again: "
                }
                resourceGroupName = await vscode.window.showInputBox(opt);
                if (resourceGroupName === undefined) throw 'user Exit';
                resourceGroupStatus = await resourceGroupClient.resourceGroups.checkExistence(resourceGroupName); //not working
            }

            let resroup: ResourceGroup = { ///added for parameter into createOrUpdate. constructor wasn't working
                name: resourceGroupName,
                properties: { provisioningState: '' },
                location: '',
                managedBy: '',
                tags: {}
            };

            ///HERE createOrUpdate resource group

            const resourceClient = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(subscription);

            //resourceClient.resourceGroups.createOrUpdate(resroup);
            ///TO DO
            resourceGroupClient.resourceGroups.createOrUpdate(resourceGroupName, resroup);
        }

        resourceGroup = resourceGroups.find(resGroup => { return resGroup.name === resourceGroupName });
        console.log(resourceGroup);

        if (!resourceGroupName) {
            vscode.window.showErrorMessage('You must select a valid resource group');
        }

    } while (!resourceGroupName);
    return resourceGroup;
}

async function acquireRegistryName(client: ContainerRegistryManagementClient) {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: false,
        prompt: 'Registry name? '
    };
    let registryName: string = await vscode.window.showInputBox(opt);

    let registryStatus: RegistryNameStatus = await client.registries.checkNameAvailability({ 'name': registryName });
    while (!registryStatus.nameAvailable) {
        opt = {
            ignoreFocusOut: false,
            prompt: "That registry name is unavailable. Try again: "
        }
        registryName = await vscode.window.showInputBox(opt);

        if (registryName === undefined) throw 'user Exit';

        registryStatus = await client.registries.checkNameAvailability({ 'name': registryName });
    }
    return registryName;
}

