import * as vscode from "vscode";
import { RegistryNameStatus, RegistryListResult, BuildTaskListResult, BuildListResult, Build, BuildGetLogResult } from "azure-arm-containerregistry/lib/models";
import { BlobService, createBlobServiceWithSas } from "azure-storage";
const teleCmdId: string = 'vscode-docker.buildTaskLog';
import { AzureCredentialsManager } from '../utils/azureCredentialsManager';
import { AzureRegistryNode, AzureLoadingNode, AzureNotSignedInNode } from '../explorer/models/azureRegistryNodes';
import { Stream, Writable } from "stream";
import { AsyncPool } from "../explorer/utils/asyncpool";
import { IConnection, createConnection, DiagnosticSeverity } from 'vscode-languageserver'
import * as path from 'path';
import * as fs from "fs";
import { log } from "util";

/**
 *  this command is used through a right click on an azure registry in the Docker Explorer. It is used to view the build logs of the given registry.
 * functionalities will include: viewing 10 most recent builds, failed builds, and builds currently in progress. This will be useful for knowing where/when a build fails
 * @param context : this is the AzureRegistryNode the user right clicks on to invoke this command
 *
 */
export async function buildTaskLog(context?: AzureRegistryNode) {

    let resourceGroup: string = context.registry.id.slice(context.registry.id.search('resourceGroups/') + 'resourceGroups/'.length, context.registry.id.search('/providers/'));
    let subscriptionId: string = context.registry.id.slice('subscriptions/'.length, context.registry.id.search('/resourceGroups/'));

    if (!resourceGroup || !subscriptionId) {
        throw new Error('Something went wrong, this registry may no longer exist');
    }

    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(context.subscription);
    let logs: Build[];

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

    let pool = new AsyncPool(8);
    for (let j = 0; j < logs.length; j++) {
        pool.addTask(async () => {
            const temp: BuildGetLogResult = await client.builds.getLogLink(resourceGroup, context.registry.name, logs[j].buildId);
            let url: string = temp.logLink;
            links.push({ 'url': url, 'id': j });
        });
    }
    await pool.scheduleRun();
    links.sort(function (a, b) { return b.id - a.id });

    //creating the panel in which to show the logs
    const panel = vscode.window.createWebviewPanel('log Viewer', `${context.registry.name} Build Logs`, vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
    // Get path to resource on disk

    let extensionPath = vscode.extensions.getExtension("PeterJausovec.vscode-docker").extensionPath;
    const scriptPath = vscode.Uri.file(path.join(extensionPath, 'commands', 'utils', 'logs', 'logScripts.js'));
    const scriptFile = scriptPath.with({ scheme: 'vscode-resource' });
    const stylePath = vscode.Uri.file(path.join(extensionPath, 'commands', 'utils', 'logs', 'stylesheet.css'));
    const styleFile = stylePath.with({ scheme: 'vscode-resource' });
    panel.webview.html = getWebviewContent(scriptFile, styleFile);
    setupCommunication(panel, links, logs);

    for (let i = 0; i < logs.length; i++) {
        const buildTask: string = logs[i].buildTask ? logs[i].buildTask : '?';
        const startTime: string = logs[i].startTime ? logs[i].startTime.toLocaleString() : '?';
        const finishTime: string = logs[i].finishTime ? logs[i].finishTime.toLocaleString() : '?';
        const buildType: string = logs[i].buildType ? logs[i].buildType : '?';
        const osType: string = logs[i].platform.osType ? logs[i].platform.osType : '?';
        const name: string = logs[i].name ? logs[i].name : '?';
        let imageOutput: string = '';

        if (logs[i].outputImages) {
            for (let j = 0; j < logs[i].outputImages.length; j++) {
                const tag: string = logs[i].outputImages[j].tag ? logs[i].outputImages[j].tag : '?';
                const repository: string = logs[i].outputImages[j].repository ? logs[i].outputImages[j].repository : '?';
                const registry: string = logs[i].outputImages[j].registry ? logs[i].outputImages[j].registry : '?';
                const digest: string = logs[i].outputImages[j].digest ? logs[i].outputImages[j].digest : '?';
                imageOutput += `<tr>
                                    <td>${tag}</td>
                                    <td>${repository}</td>
                                    <td>${registry}</td>
                                    <td>${digest}</td>
                                </tr>`;
            }
            if (logs[i].outputImages.length === 0) {
                imageOutput += `<tr>
                <td>NA</td>
                    <td>NA</td>
                    <td>NA</td>
                    <td>NA</td>
                </tr>`;
            }
        }
        panel.webview.postMessage({
            'type': 'populate',
            'id': i,
            'logComponent': `<button id= "btn${i}" class="accordion">
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
                        <table class="overallTable">
                            <tr>
                                <td colspan="4">Output Images</td>
                            </tr>
                            <tr>
                                <td>Tag</th>
                                <td>Repository</td>
                                <td>Registry</td>
                                <td>Digest</td>
                            </tr>
                            ${imageOutput}
                        </table>
                            <div class = 'button-holder'>
                                <button id= "log${i}" class="viewLog">Open Logs</button>
                            </div>
                    </div>`
        });
    }
    panel.webview.postMessage({ 'type': 'end' });
}

function setupCommunication(panel: vscode.WebviewPanel, urlList: { url?: string, id: number }[], logList: Build[]) {
    panel.webview.onDidReceiveMessage(message => {
        if (message.logRequest) {
            streamContent(urlList[+message.logRequest.id].url, logList[+message.logRequest.id].buildId);
        }
    });
}

function streamContent(url, title) {
    let blobInfo = getBlobInfo(url);
    try {
        var blob: BlobService = createBlobServiceWithSas(blobInfo.host, blobInfo.sasToken);
    } catch (error) {
        console.log(error);
    }
    try {
        blob.getBlobToText(blobInfo.containerName, blobInfo.blobName, async (error, text, result, response) => {
            if (response) {
                createLogView(text, title);
            } else {
                console.log(error);
            }
        });
    } catch (error) {
        console.log(error);
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

function createLogView(text: string, title: string) {
    const scheme = 'purejs';
    try {
        let query = JSON.stringify({ 'log': makeBase64(text) });
        var uri = vscode.Uri.parse(`${scheme}://authority/${title}?${query}#idk`);
    } catch (error) {
        console.log(error);
    }

    // vscode.workspace.openTextDocument(uri).then(function (doc) {
    //     return vscode.window.showTextDocument(doc, vscode.ViewColumn.Active + 1, true);
    // });
    vscode.commands.executeCommand('vscode.previewHtml', uri, undefined, title).then(_ => { }, _ => {
        vscode.window.showErrorMessage('Cant open!');
    });
}

function makeBase64(str: string): string {
    var buffer = new Buffer(str);
    return buffer.toString('base64');
}

//create the table in which to push the build logs
function getWebviewContent(scriptFile, stylesheet) {
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
        </div>
        <script src= "${scriptFile}"></script>
    </body>
`;
}

//let str = (url);
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
// stream.addListener
