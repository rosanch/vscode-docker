import * as path from 'path';
import * as vscode from "vscode";

//# WEBVIEW COMPONENTS
/** Generate the webview to display the logs */
export class LogWebview {
    private content: string;
    private title: string;
    constructor(content: string, title: string) {
        const panel = vscode.window.createWebviewPanel('log Viewer', title, vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
        panel.webview.html = this.getWebviewContent(content);
        this.content = content;
        this.title = title;
        panel.webview.onDidReceiveMessage(this.handleCommunication.bind(this));
    }

    private getWebviewContent(log: string): string {
        let processedLog: string = '';
        const lines: string[] = log.split(`\n`);
        if (lines.length === 0) { return 'This Log appears to be empty'; }
        lines[0] = lines[0].trim();

        for (let line of lines) {
            if (line.toLowerCase().indexOf('error') !== -1 || line.toLowerCase().indexOf('fail') !== -1) {
                processedLog += `<span class = 'r'>${line}\n </span>`
            } else if (line.toLowerCase().indexOf('success') !== -1 || line.toLowerCase().indexOf('succeeded') !== -1 || line.toLowerCase().indexOf('complete') !== -1 ||
                line.toLowerCase().indexOf('0 warning(s)') !== -1 || line.toLowerCase().indexOf('0 error(s)') !== -1) {
                processedLog += `<span class = 'g'>${line}\n </span>`
            } else {
                processedLog += `${line}\n`
            }
        }
        let extensionPath = vscode.extensions.getExtension("PeterJausovec.vscode-docker").extensionPath;
        const scriptPath = vscode.Uri.file(path.join(extensionPath, 'commands', 'azureCommands', 'acr-build-logs-utils', 'saveLogScript.js')); ///savelogscript
        const scriptFile = scriptPath.with({ scheme: 'vscode-resource' });

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Logs</title>
            <style>
                body{
                    font-size: var(--vscode-editor-font-size);
                    font-family: var(--vscode-editor-font-family);
                }
                #force{
                    font-size: var(--vscode-editor-font-size);
                    font-family: monospace;
                    font-size: var(--font-size);
                    font-weight: var(--font-weight);
                }
                .r{
                    color:var(--vscode-terminal-ansiBrightRed);
                }
                .g{
                    color:var(--vscode-terminal-ansiBrightGreen);
                }
            </style>
        </head>

        <body>
            <pre><span id="force">${processedLog}</span></pre>
            <script src= "${scriptFile}"></script>
        </body>`;
        //
        // <!DOCTYPE html>
        //     <html lang="en">
        //     <head>
        //         <link rel="stylesheet" type="text/css" href="${stylesheet}">
        //         <meta charset="UTF-8">
        //         <meta http-equiv="Content-Security-Policy" content="frame-src vscode-resource:; img-src vscode-resource: https:; script-src vscode-resource:; style-src vscode-resource:;">
        //         <meta name="viewport" content="width=device-width, initial-scale=1.0">
        //         <title>Logs</title>
        //     </head>

        //     <head>
        //         <meta charset="UTF-8">
        //         <meta http-equiv="Content-Security-Policy" content="frame-src vscode-resource:; img-src vscode-resource: https:; script-src vscode-resource:; style-src vscode-resource:;">
        //         <meta name="viewport" content="width=device-width, initial-scale=1.0">
        //         <style>
        //             body{
        //                 font-size: var(--vscode-editor-font-size);
        //                 font-family: var(--vscode-editor-font-family);
        //             }
        //             #force{
        //                 font-size: var(--vscode-editor-font-size);
        //                 font-family: monospace;
        //                 font-size: var(--font-size);
        //                 font-weight: var(--font-weight);
        //             }
        //             .r{
        //                 color:var(--vscode-terminal-ansiBrightRed);
        //             }
        //             .g{
        //                 color:var(--vscode-terminal-ansiBrightGreen);
        //             }

        //         </style>
        //     </head>

        //     <body>
        //         <pre><span id="force">${processedLog}</span></pre>

        //     </body>
        // </html>`
    }

    private handleCommunication(message: any): void {
        if (message.download) {
            let fs = require('fs');
            try {
                fs.writeFile(`C:/Users/t-rusama/Downloads/vscode-docker-57f39125c3e5990e20a36e48ab1f71df31f1f402/.vscode/${this.title}.log`, this.content,
                    (err) => {
                        console.log(err)
                    });

            } catch (err) {
                console.log(err);
            }
        }
    }
}
