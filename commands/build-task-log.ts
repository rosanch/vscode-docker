
import * as vscode from "vscode";
import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { AzureAccountWrapper } from '.././explorer/deploy/azureAccountWrapper';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount, AzureSession } from '../typings/azure-account.api';
import { accountProvider } from '../dockerExtension';
import { RegistryRootNode } from "../explorer/models/registryRootNode";
import { ServiceClientCredentials } from 'ms-rest';
import { RegistryNameStatus, RegistryListResult, BuildTaskListResult, BuildListResult, Build } from "azure-arm-containerregistry/lib/models";
const teleCmdId: string = 'vscode-docker.buildTaskLog';
import { AzureCredentialsManager } from '../utils/AzureCredentialsManager';
import { AzureRegistryNode, AzureLoadingNode, AzureNotSignedInNode } from '../explorer/models/azureRegistryNodes';
import { Stream } from "stream";


export async function buildTaskLog(context?: AzureRegistryNode) {
    console.log(context);
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
        if (registries[i].loginServer === context.label) {
            resourceGroup = registries[i].id.slice(registries[i].id.search('resourceGroups/') + 'resourceGroups/'.length, registries[i].id.search('/providers/'));
            subscriptionId = registries[i].id.slice('subscriptions/'.length, registries[i].id.search('/resourceGroups/'));
            break;
        }
    }
    if (!resourceGroup || !subscriptionId) {
        throw 'Something went wrong, this registry may no longer exist'
    }
    const subs = AzureCredentialsManager.getInstance().getFilteredSubscriptionList();

    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(context.subscription);
    let logs = [];

    await client.builds.list(resourceGroup, context.registry.name).then(function (response) {
        console.log("Success!", response);
        response.forEach((item) => {
            logs.push(item);
        })

    }, function (error) {
        console.error("Failed!", error);
    })

    let links: String[] = [];
    // logs.forEach((item: Build) => {
    //     let temp=await client.builds.getLogLink(resourceGroup, context.label, item.buildId);
    //     links.push(temp.logLink);
    // })
    for (let i = 0; i < logs.length; i++) {
        const temp = await client.builds.getLogLink(resourceGroup, context.registry.name, logs[i].buildId);
        console.log(temp);
    }
    console.log("Build items in array form: ", logs);
}

