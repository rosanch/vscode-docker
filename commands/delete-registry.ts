
import * as vscode from "vscode";
import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { AzureAccountWrapper } from '.././explorer/deploy/azureAccountWrapper';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount, AzureSession } from '../typings/azure-account.api';
import { accountProvider } from '../dockerExtension';
import { RegistryRootNode } from "../explorer/models/registryRootNode";
import { ServiceClientCredentials } from 'ms-rest';
import { RegistryNameStatus, RegistryListResult } from "azure-arm-containerregistry/lib/models";
const teleCmdId: string = 'vscode-docker.deleteRegistry';
import { AzureCredentialsManager } from '../utils/AzureCredentialsManager'
import { AzureRegistryNode, AzureLoadingNode, AzureNotSignedInNode } from '../explorer/models/azureRegistryNodes';


export async function deleteRegistry(context?: AzureRegistryNode) {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: 'No',
        value: 'No',
        prompt: 'Are you sure you want to delete this registry and its associated images? Enter Y or N: '
    };
    console.log(context);
    let answer = await vscode.window.showInputBox(opt);
    if (answer == 'N' || answer == 'n') { return };

    let azureAccount = context.azureAccount;
    if (!azureAccount) {
        return;
    }

    if (azureAccount.status === 'LoggedOut') {
        return;
    }

    const registries = await AzureCredentialsManager.getInstance().getRegistries();
    let resourceGroup: string;
    let subscriptionId: string;
    for (let i = 0; i < registries.length; i++) {
        if (registries[i].name === context.registry.name) {
            resourceGroup = registries[i].id.slice(registries[i].id.search('resourceGroups/') + 'resourceGroups/'.length, registries[i].id.search('/providers/'));
            subscriptionId = context.subscription.id; //registries[i].id.slice('subscriptions/'.length, registries[i].id.search('/resourceGroups/'));
            break;
        }
    }
    if (!resourceGroup || !subscriptionId) {
        throw 'Something went wrong, this registry may no longer exist'
    }
    const subs = AzureCredentialsManager.getInstance().getFilteredSubscriptionList();
    const subscription = subs.find(function (sub): boolean {
        return sub.subscriptionId === subscriptionId;
    });
    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(context.subscription);
    await client.registries.beginDeleteMethod(resourceGroup, context.registry.name).then(function (response) {
        console.log("Success!", response);
    }, function (error) {
        console.error("Failed!", error);
    })

}

