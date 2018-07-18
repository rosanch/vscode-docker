
import * as vscode from "vscode";
import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { AzureAccountWrapper } from '.././explorer/deploy/azureAccountWrapper';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount, AzureSession } from '../typings/azure-account.api';
import { accountProvider } from '../dockerExtension';
import { RegistryRootNode } from "../explorer/models/registryRootNode";
import { ServiceClientCredentials } from 'ms-rest';
import { RegistryNameStatus, RegistryListResult, BuildTaskListResult, BuildListResult, Build, BuildGetLogResult } from "azure-arm-containerregistry/lib/models";
const teleCmdId: string = 'vscode-docker.buildTaskLog';
import { AzureCredentialsManager } from '../utils/AzureCredentialsManager';
import { AzureRegistryNode, AzureLoadingNode, AzureNotSignedInNode } from '../explorer/models/azureRegistryNodes';
import { Stream } from "stream";
import { AsyncPool } from "../explorer/utils/asyncpool";


export async function buildTaskLog(context?: AzureRegistryNode) {
    let azureAccount = await AzureCredentialsManager.getInstance().getAccount();

    let resourceGroup: string = context.registry.id.slice(context.registry.id.search('resourceGroups/') + 'resourceGroups/'.length, context.registry.id.search('/providers/'));
    let subscriptionId: string = context.registry.id.slice('subscriptions/'.length, context.registry.id.search('/resourceGroups/'));

    if (!resourceGroup || !subscriptionId) {
        throw 'Something went wrong, this registry may no longer exist'
    }

    const subs: SubscriptionModels.Subscription[] = AzureCredentialsManager.getInstance().getFilteredSubscriptionList();

    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(context.subscription);
    let logs: Build[];
    try {
        logs = await client.builds.list(resourceGroup, context.registry.name);
    } catch (error) {
        throw error;
    }

    let links: string[] = [];

    let pool = new AsyncPool(8);
    for (let i = 0; i < logs.length; i++) {
        pool.addTask(async () => {
            const temp = await client.builds.getLogLink(resourceGroup, context.registry.name, logs[i].buildId);
            links.push(temp.logLink);
        });
    }
    let table: string;
    for (let i = 0; i < logs.length; i++) {
        table += `<tr> <td>${logs[i].name}</td>`;
        table += `<td>${logs[i].createTime}</td>`;
        table += `<td>${logs[i].status}</td> </tr>`
    }

    const panel = vscode.window.createWebviewPanel('log Viewer', "Build Logs", vscode.ViewColumn.One, {});
    panel.webview.html = getWebviewContent(table);
    await pool.scheduleRun();
    console.log("Build items in array form: ", links);
}
function getWebviewContent(table) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Logs</title>
    </head>
    <body>
    <table style="width:100%">
        <tc>
            <th>Name</th>
            <th>Date Created</th>
            <th>Status</th>
        </tc>

        ${table}

        </tc>
    </table>
    </body>
    </html>`;
}


