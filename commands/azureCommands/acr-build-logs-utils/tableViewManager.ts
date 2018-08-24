
import { Build, ImageDescriptor } from "azure-arm-containerregistry/lib/models";
import * as path from 'path';
import * as vscode from "vscode";
import { openLog } from './logFileManager';
import { LogData } from './tableDataManager'

export class LogTableWebview {
    private logData: LogData;
    private panel: vscode.WebviewPanel;

    constructor(webviewName: string, logData: LogData) {
        this.logData = logData;
        this.panel = vscode.window.createWebviewPanel('log Viewer', webviewName, vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });

        //Get path to resource on disk
        let extensionPath = vscode.extensions.getExtension("PeterJausovec.vscode-docker").extensionPath;
        const scriptFile = vscode.Uri.file(path.join(extensionPath, 'commands', 'azureCommands', 'acr-build-logs-utils', 'logScripts.js')).with({ scheme: 'vscode-resource' });
        const styleFile = vscode.Uri.file(path.join(extensionPath, 'commands', 'azureCommands', 'acr-build-logs-utils', 'style', 'stylesheet.css')).with({ scheme: 'vscode-resource' });
        const iconFile = vscode.Uri.file(path.join(extensionPath, 'commands', 'azureCommands', 'acr-build-logs-utils', 'style', 'fabric', 'css', 'vscmdl2-icons.css')).with({ scheme: 'vscode-resource' });
        //Populate Webview
        this.panel.webview.html = this.getBaseHtml(scriptFile, styleFile, iconFile);
        this.setupIncomingListeners();
        this.addLogsToWebView();
    }
    //Post Opening communication from webview
    /** Setup communication with the webview sorting out received mesages from its javascript file */
    private setupIncomingListeners(): void {
        this.panel.webview.onDidReceiveMessage(async (message) => {
            if (message.logRequest) {
                const itemNumber: number = +message.logRequest.id;
                this.logData.getLink(itemNumber).then((url) => {
                    if (url !== 'requesting') {
                        openLog(url, this.logData.logs[itemNumber].buildId);
                    }
                })
            } else if (message.loadMore) {
                await this.logData.loadMoreLogs();
                this.addLogsToWebView();
            }
        });
    }

    //Content Management
    /** Communicates with the webview javascript file through post requests to populate the log table */
    private addLogsToWebView(startItem?: number): void {
        const begin = startItem ? startItem : 0;
        for (let i = begin; i < this.logData.logs.length; i++) {
            const log = this.logData.logs[i];
            this.panel.webview.postMessage({
                'type': 'populate',
                'id': i,
                'logComponent': this.getLogTableItem(log, i)
            });
        }
        if (startItem) {
            this.panel.webview.postMessage({ 'type': 'endContinued' });
        } else {
            this.panel.webview.postMessage({ 'type': 'end' });
        }
    }

    private getImageOutputTable(log: Build): string {
        let imageOutput: string = '';
        if (log.outputImages) {
            //Adresses strange error where the image list can exist and contain only one null item.
            if (!log.outputImages[0]) {
                imageOutput += this.getImageItem(true);
            } else {
                for (let j = 0; j < log.outputImages.length; j++) {
                    let img = log.outputImages[j]
                    imageOutput += this.getImageItem(j === log.outputImages.length - 1, img);
                }
            }
        } else {
            imageOutput += this.getImageItem(true);
        }
        return imageOutput;
    }

    //HTML Content Loaders
    /** Create the table in which to push the build logs */
    private getBaseHtml(scriptFile: vscode.Uri, stylesheet: vscode.Uri, iconStyles: vscode.Uri): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <link rel="stylesheet" type="text/css" href="${stylesheet}">
            <link rel="stylesheet" type="text/css" href=${iconStyles}>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="frame-src vscode-resource:; img-src vscode-resource: https:; script-src vscode-resource:; style-src vscode-resource:;">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Logs</title>
        </head>

        <body>
            <div id = "header">
                <table id="headerTable">
                    <th class = 'arrowHolder'></td>
                    <th class = 'widthControl'>Build Name<span class="sort">  </span></th>
                    <th class = 'widthControl'>BuildTask<span class="sort">  </span></th>
                    <th class = 'widthControl'>Status<span class="sort">  </span></th>
                    <th class = 'widthControl'>Created<span class="sort"> &#9661</span></th>
                    <th class = 'widthControl'>Elapsed Time<span class="sort">  </span></th>
                    <th class = 'widthControl'>Platform<span class="sort">  </span></th>
                    <td></td>
                </table>
            </div>
                <table id = 'core'>
                </table>
            <div class = 'loadMoreBtn'>
                <button id= "loadBtn" class="viewLog">Load More Logs</button>
            </div>
            <div class="overlay">
                <div class="modal">
                    <input id = "digestVisualizer", readonly>
                    <button class = "copyBtn">Copy</button>
                </div>
            </div>

            <script src= "${scriptFile}"></script>
        </body>`;
    }

    private getLogTableItem(log: Build, logId: number): string {
        const buildTask: string = log.buildTask ? log.buildTask : '';
        const createTime: string = log.createTime ? log.createTime.toLocaleString() : '';
        const timeElapsed: string = log.startTime && log.finishTime ? (Math.abs(log.startTime.valueOf() - log.finishTime.valueOf()) / 1000).toString() + 's' : '';
        const osType: string = log.platform.osType ? log.platform.osType : '';
        const name: string = log.name ? log.name : '';
        let imageOutput: string = this.getImageOutputTable(log);
        const statusIcon: string = this.getLogStatusIcon(log.status);

        return `
         <tbody class = "holder">
            <tr id= "btn${logId}" class="accordion">
                    <td class = 'arrowHolder'><div class = "arrow">&#x25f9</div></td>
                    <td class = 'widthControl'>${name}</td>
                    <td class = 'widthControl'>${buildTask}</td>
                    <td class ='status widthControl ${log.status}'>${statusIcon} ${log.status}</td>
                    <td class = 'widthControl'>${createTime}</td>
                    <td class = 'widthControl'>${timeElapsed}</td>
                    <td class = 'widthControl'>${osType}</td>
            </tr>
            <tr class="panel">
                <td colspan = "7">
                    <div class= "paddingDiv overflowX">
                        <table class="innerTable">
                            <tr>
                                <td class = "arrowHolder">&#160</td>
                                <td colspan = "5" class = "borderLimit widthControl5">Output Images</td>
                                <td class = "widthControl lastTd" rowspan = "300">
                                    <div class = "button-holder">
                                        <button id= "log${logId}" class="viewLog">Open Logs</button>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td class = "arrowHolder">&#160</td>
                                <td colspan = "2" class = "borderLimit widthControl2">Tag</th>
                                <td colspan = "2" class = "widthControl3">Repository</td>
                                <td class = "widthControl">Digest</td>
                            </tr>
                            ${imageOutput}
                        </table>
                    </div>
                </td>
            </tr>
        </tbody>`
    }

    private getImageItem(islastTd: boolean, img?: ImageDescriptor): string {
        if (img) {
            const tag: string = img.tag ? img.tag : '';
            const repository: string = img.repository ? img.repository : '';
            const digest: string = img.digest ? img.digest : '';
            const truncatedDigest: string = digest ? digest.substr(0, 5) + '...' + digest.substr(digest.length - 5) : '';
            const lastTd: string = islastTd ? 'lastTd' : '';
            return `<tr>
                        <td class = "arrowHolder">&#160</td>
                        <td colspan = "2" class = "borderLimit widthControl2 ${lastTd}">${tag}</td>
                        <td colspan = "2" class = "widthControl2 ${lastTd}">${repository}</td>
                        <td colspan = "1" class = "widthControl ${lastTd}" data-digest = "${digest}">${truncatedDigest} <inline class = 'copy'>&#128459</inline></td>
                    </tr>`
        } else {
            return `<tr>
                        <td class = "arrowHolder lastTd">&#160</td>
                        <td colspan = "2" class = "borderLimit widthControl2 lastTd">NA</td>
                        <td colspan = "2" class = "widthControl2 lastTd">NA</td>
                        <td colspan = "1" class = "widthControl lastTd">NA</td>
                    </tr>`;
        }

    }

    private getLogStatusIcon(status?: string): string {
        if (!status) { return ''; }
        switch (status) {
            case 'Error':
                return '<i class="ms-Icon ms-Icon--CriticalErrorSolid"></i>';
            case 'Failed':
                return '<i class="ms-Icon ms-Icon--StatusErrorFull"></i>';
            case 'Succeeded':
                return '<i class="ms-Icon ms-Icon--CompletedSolid"></i>';
            case 'Queued':
                return '<i class="ms-Icon ms-Icon--SkypeCircleClock"></i>';
            case 'Running':
                return '<i class="ms-Icon ms-Icon--MSNVideosSolid"></i>';
            default:
                return '';
        }
    }
}
