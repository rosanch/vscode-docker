import * as vscode from "vscode";
import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { AzureAccountWrapper } from '.././explorer/deploy/azureAccountWrapper';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount, AzureSession } from '../typings/azure-account.api';
import { accountProvider } from '../dockerExtension';
import { RegistryRootNode } from "../explorer/models/registryRootNode";
import { ServiceClientCredentials } from 'ms-rest';
import { RegistryNameStatus, RegistryListResult, BuildTaskListResult, BuildListResult, Build, BuildGetLogResult } from "azure-arm-containerregistry/lib/models";
import { BlobService, createBlobServiceWithSas } from "azure-storage";
const teleCmdId: string = 'vscode-docker.buildTaskLog';
import { AzureCredentialsManager } from '../utils/AzureCredentialsManager';
import { AzureRegistryNode, AzureLoadingNode, AzureNotSignedInNode } from '../explorer/models/azureRegistryNodes';
import { Stream, Writable } from "stream";
import { AsyncPool } from "../explorer/utils/asyncpool";
import { IConnection, createConnection } from 'vscode-languageserver'
import * as path from 'path';
import * as fs from "fs";
import { log } from "util";

/**
 *  this command is used through a right click on an azure registry in the Docker Explorer. It is used to view the build logs of the given registry.
 * functionalities will include: viewing 10 most recent builds, failed builds, and builds currently in progress. This will be useful for knowing where/when a build fails
 * @param context : this is the AzureRegistryNode the user right clicks on to invoke this command
 *
 */
const logWindow = vscode.window.createOutputChannel('Logs');

export async function buildTaskLog(context?: AzureRegistryNode) {

    // get the resource group name from the AzureRegistryNode (the context) to be passed into other functions
    let resourceGroup: string = context.registry.id.slice(context.registry.id.search('resourceGroups/') + 'resourceGroups/'.length, context.registry.id.search('/providers/'));
    let subscriptionId: string = context.registry.id.slice('subscriptions/'.length, context.registry.id.search('/resourceGroups/')); //this isn't necessary after all

    if (!resourceGroup || !subscriptionId) {
        throw 'Something went wrong, this registry may no longer exist'
    }

    //const subs: SubscriptionModels.Subscription[] = AzureCredentialsManager.getInstance().getFilteredSubscriptionList();

    // build the client by passing in the desired subscription, a property of the AzureRegistryNode (context)
    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(context.subscription);
    let logs: Build[];
    // get all the builds for a given registry
    try {
        logs = await client.builds.list(resourceGroup, context.registry.name);
    } catch (error) {
        throw error;
    }
    if (logs.length === 0) {
        vscode.window.showErrorMessage('This registry has no associated build logs');
        return;
    }

    let links: { url?: string, id: number }[] = [];

    // get all the log links asynchronously in case there are a lot of them. Most efficient way to do this!
    //this is where it's breaking. the j starts at 96 and jumps all over the place, it doesn't increment by 1
    let pool = new AsyncPool(8);
    for (let j = 0; j < logs.length; j++) {
        pool.addTask(async () => {
            const temp: BuildGetLogResult = await client.builds.getLogLink(resourceGroup, context.registry.name, logs[j].buildId);
            let url: string = temp.logLink;
            links.push({ 'url': url, 'id': j });
        });
    }
    links.sort(function (a, b) { return b.id - a.id });
    await pool.scheduleRun();

    let table: string = '';
    for (let i = 0; i < logs.length; i++) {
        const buildTask: string = logs[i].buildTask ? logs[i].buildTask : '?';
        const startTime: string = logs[i].startTime ? logs[i].startTime.toLocaleString() : '?';
        const finishTime: string = logs[i].finishTime ? logs[i].finishTime.toLocaleString() : '?';
        const buildType: string = logs[i].buildType ? logs[i].buildType : '?';
        const osType: string = logs[i].platform.osType ? logs[i].platform.osType : '?';
        const name: string = logs[i].name ? logs[i].name : '?';
        table += `<button id= "${i}" class="accordion">
                    <table>
                        <tr>
                            <td class = 'widthControl'>${name}</td>
                            <td class = 'widthControl'>${buildTask}</td>
                            <td class ='status widthControl ${logs[i].status}'> ${logs[i].status}</td>
                            <td class = 'widthControl'>${startTime}</td>
                            <td class = 'widthControl'>${finishTime}</td>
                            <td class = 'widthControl'>${osType}</td>
                            <td class = 'widthControl'>${buildType}</td>
                        </tr>
                    </table>
                </button>
                <div class="panel">
                    ${links[i].url}
                </div>`
    }

    //creating the panel in which to show the logs
    const panel = vscode.window.createWebviewPanel('log Viewer', "Build Logs", vscode.ViewColumn.One, { enableScripts: true });

    let extensionPath = vscode.extensions.getExtension("PeterJausovec.vscode-docker").extensionPath;
    // Get path to resource on disk
    const scriptPath = vscode.Uri.file(path.join(extensionPath, 'commands', 'utils', 'logs', 'logScripts.js'));
    const scriptFile = scriptPath.with({ scheme: 'vscode-resource' });
    const stylePath = vscode.Uri.file(path.join(extensionPath, 'commands', 'utils', 'logs', 'stylesheet.css'));
    const styleFile = stylePath.with({ scheme: 'vscode-resource' });
    panel.webview.html = getWebviewContent(table, scriptFile, styleFile, context.registry.name);
    setupCommunication(panel, links);
    //panel.webview.postMessage({ logsHtml: table });

}

function setupCommunication(panel: vscode.WebviewPanel, urlList: any[]) {
    panel.webview.onDidReceiveMessage(message => {
        if (message.logRequest) {
            let errors: string[] = streamContent(urlList[+message.logRequest.id].url);
        }
    });
}

function streamContent(url): string[] {
    let blobInfo = getBlobInfo(url);
    let array1: string[];
    try {
        var blob: BlobService = createBlobServiceWithSas(blobInfo.host, blobInfo.sasToken);
    } catch (error) {
        console.log(error);
    }
    // let str = (url);
    // let stream: Writable = new Writable();
    // try {
    //     blob.getBlobToStream(blobInfo.containerName, blobInfo.blobName, stream, (error, response) => {
    //         if (response) {
    //             console.log(response.name + 'has Completed');
    //         } else {
    //             console.log(error);
    //         }
    //     });
    // } catch (error) {
    //     console.log('a' + error);
    // }
    // console.log(stream);
    try {
        blob.getBlobToText(blobInfo.containerName, blobInfo.blobName, async (error, text, result, response) => {
            if (response) {
                logWindow.clear();
                logWindow.append(text);
                logWindow.show();
                array1 = getErrors(text);
                if (array1.length !== 0) {
                    logWindow.append(`Errors found: \n`);
                    for (let i = 0; i < array1.length; i++) {
                        array1[i] = array1[i].substr(44); //delete this part if time stamp also desired
                        logWindow.append(`> ` + array1[i] + `\n`);
                    }

                }
            } else {
                console.log(error); //no console here, this will break!
            }
        });
    } catch (error) {
        console.log(error);
    }
    return array1;
}

/**
 * this function takes the log stream and searches it for error messages
 * @param streamlog - the entire text of the build log, currently in the form of a response from getBlobToText called in streamContent
 * @returns - an array of the unique error messages found in chronological order, currently including their time stamps
 */
function getErrors(streamlog: string): string[] {
    var fail = `--- FAIL`;
    if (streamlog.search(fail) === -1) {
        console.log('No failures found');
        let none: string[] = [];
        return none;
    } else {
        // console.log('Found error messages!');
        let i = streamlog.search(`error msg=`);
        let temp = streamlog.substr(i - 34, streamlog.length); //there were 34 characters between the line beginning and 'error msg='
        var allerrors = temp.split(`\n`);
        var unique_errors: string[] = [];
        // errors are often repeated in the log. This is undesirable information, so we run a quick filter to ensure each individual error
        // is only displayed to the user once
        for (let j = 0; j < allerrors.length; j++) {
            //all failed logs begin with '--- FAIL' and end with 'FAIL'. This is how we know when to break
            if (allerrors[j].includes('FAIL')) {
                break;
            }
            // trim whitespace before adding to array to make it readable
            if (!unique_errors.includes(allerrors[j].trim())) {
                unique_errors.push(allerrors[j].trim());

            }
        }
        //console.log('Final array found: ');
        //console.log(unique_errors);
        return unique_errors;

    }
}

function getBlobInfo(blobUrl: string) {
    const items: string[] = blobUrl.slice(blobUrl.search('https://') + 'https://'.length).split('/');
    const accountName: string = blobUrl.slice(blobUrl.search('https://') + 'https://'.length, blobUrl.search('.blob'));
    const endpointSuffix: string = items[0].slice(items[0].search('.blob.') + '.blob.'.length);
    const containerName: string = items[1];
    const blobName: string = items[2] + '/' + items[3] + '/' + items[4].slice(0, items[4].search('[?]'));
    const sasToken: string = items[4].slice(items[4].search('[?]') + 1);
    const host: string = accountName + '.blob.' + endpointSuffix;
    return { accountName, endpointSuffix, containerName, blobName, sasToken, host }
}

function makeBase64(str: string): string {
    var buffer = new Buffer(str);
    return buffer.toString('base64');
}

//create the table in which to push the build logs
function getWebviewContent(table, scriptFile, stylesheet, registryName) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <link rel="stylesheet" type="text/css" href="${stylesheet}">
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="frame-src vscode-resource:; img-src vscode-resource: https:; script-src vscode-resource:; style-src vscode-resource:;">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Logs</title>
    </head>

    <body>
        <div id = "header">
            <h2>Build Logs for ${registryName}</h2>

            <table id="headerTable">
                <th class = 'widthControl'>Build Name </th>
                <th class = 'widthControl'>BuildTask </th>
                <th class = 'widthControl'>Status </th>
                <th class = 'widthControl'>Start Time </th>
                <th class = 'widthControl'>Finish Time </th>
                <th class = 'widthControl'>Platform </th>
                <th class = 'widthControl'>Build Type </th>
            </table>
        </div>
        <div id = 'core'>
            ${table}
        </div>
        <script src= "${scriptFile}"></script>
    </body>
`;
}



