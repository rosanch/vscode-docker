import { Build, BuildGetLogResult, BuildListResult, BuildTaskListResult, RegistryListResult, RegistryNameStatus } from "azure-arm-containerregistry/lib/models";
import { BlobService, createBlobServiceWithSas } from "azure-storage";
import * as vscode from "vscode";
const teleCmdId: string = 'vscode-docker.buildTaskLog';
import * as fs from "fs";
import * as path from 'path';
import { AzureImageNode, AzureLoadingNode, AzureNotSignedInNode, AzureRegistryNode, AzureRepositoryNode } from '../../explorer/models/azureRegistryNodes';
import { AsyncPool } from "../../utils/asyncpool";
import { AzureCredentialsManager } from '../../utils/azureCredentialsManager';

/**  This command is used through a right click on an azure registry, repository or image in the Docker Explorer. It is used to view build logs for a given item. */
export async function viewBuildLogs(context?: AzureRegistryNode | AzureRepositoryNode | AzureImageNode): Promise<void> {

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
    await pool.runAll();
    links.sort((a, b): number => { return a.id - b.id });
    createWebview(context.registry.name, links, logs);

}

//# WEBVIEW COMPONENTS
/** Generate the webview to display the logs */
function createWebview(webviewName: string, links: { url?: string, id: number }[], logs: Build[]): void {
    //Creating the panel in which to show the logs
    const panel = vscode.window.createWebviewPanel('log Viewer', `${webviewName} Build Logs`, vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });

    //Get path to resource on disk
    let extensionPath = vscode.extensions.getExtension("PeterJausovec.vscode-docker").extensionPath;
    const scriptPath = vscode.Uri.file(path.join(extensionPath, 'commands', 'azureCommands', 'acr-build-logs-utils', 'logScripts.js'));
    const scriptFile = scriptPath.with({ scheme: 'vscode-resource' });
    const stylePath = vscode.Uri.file(path.join(extensionPath, 'commands', 'azureCommands', 'acr-build-logs-utils', 'stylesheet.css'));
    const styleFile = stylePath.with({ scheme: 'vscode-resource' });

    //Populate Webview
    panel.webview.html = getWebviewContent(scriptFile, styleFile);
    addLogsToWebView(panel, links, logs);
}
/** Communicates with the webview javascript file through post requests to populate the log table */
function addLogsToWebView(panel: vscode.WebviewPanel, links: { url?: string, id: number }[], logs: Build[]): void {
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
            for (let img of logs[i].outputImages) {
                const tag: string = img.tag ? img.tag : '?';
                const repository: string = img.repository ? img.repository : '?';
                const registry: string = img.registry ? img.registry : '?';
                const digest: string = img.digest ? img.digest : '?';
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
/** Create the table in which to push the build logs */
function getWebviewContent(scriptFile: vscode.Uri, stylesheet: vscode.Uri): string {
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
/** Setup communication with the webview sorting out received mesages from its javascript file */
function setupCommunication(panel: vscode.WebviewPanel, urlList: { url?: string, id: number }[], logList: Build[]): void {
    panel.webview.onDidReceiveMessage(message => {
        if (message.logRequest) {
            openLog(urlList[+message.logRequest.id].url, logList[+message.logRequest.id].buildId);
        }
    });
}

//# LOGS
/** Passes the log text into a document provider */
function createLogView(text: string, title: string): void {
    const scheme = 'purejs';
    let uri: vscode.Uri;
    try {
        let query = JSON.stringify({ 'log': makeBase64(text) });
        uri = vscode.Uri.parse(`${scheme}://authority/${title}?${query}#idk`);
    } catch (error) {
        console.log(error);
    }

    vscode.commands.executeCommand('vscode.previewHtml', uri, undefined, title).then(_ => { }, _ => {
        vscode.window.showErrorMessage('Cant open!');
    });
}
/** Loads log text from remote url using azure blobservices */
function openLog(url: string, title: string): void {
    let blobInfo = getBlobInfo(url);
    let blob: BlobService;
    try {
        blob = createBlobServiceWithSas(blobInfo.host, blobInfo.sasToken);
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
/** Parses blob url into a readable form */
function getBlobInfo(blobUrl: string): { accountName: string, endpointSuffix: string, containerName: string, blobName: string, sasToken: string, host: string } {
    const items: string[] = blobUrl.slice(blobUrl.search('https://') + 'https://'.length).split('/');
    const accountName: string = blobUrl.slice(blobUrl.search('https://') + 'https://'.length, blobUrl.search('.blob'));
    const endpointSuffix: string = items[0].slice(items[0].search('.blob.') + '.blob.'.length);
    const containerName: string = items[1];
    const blobName: string = items[2] + '/' + items[3] + '/' + items[4].slice(0, items[4].search('[?]'));
    const sasToken: string = items[4].slice(items[4].search('[?]') + 1);
    const host: string = accountName + '.blob.' + endpointSuffix;
    return { accountName, endpointSuffix, containerName, blobName, sasToken, host };
}

//# UTILS
function makeBase64(str: string): string {
    let buffer = new Buffer(str);
    return buffer.toString('base64');
}
