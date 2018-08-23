import { BlobService, createBlobServiceWithSas } from 'azure-storage';
import * as vscode from 'vscode';
import { getBlobInfo } from '../../../utils/Azure/acrTools';

export class LogContentProvider implements vscode.TextDocumentContentProvider {
    public static scheme: string = 'purejs';
    private onDidChangeEvent: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();

    constructor() { }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        return decodeBase64(JSON.parse(uri.query).log);
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this.onDidChangeEvent.event;
    }

    public update(uri: vscode.Uri, message: string): void {
        this.onDidChangeEvent.fire(uri);
    }

}

export function decodeBase64(str: string): string {
    return Buffer.from(str, 'base64').toString('ascii');
}

export function encodeBase64(str: string): string {
    return Buffer.from(str, 'ascii').toString('base64');
}

/** Loads log text from remote url using azure blobservices */
export function openLog(url: string, title: string): void {
    let blobInfo = getBlobInfo(url);
    let blob: BlobService = createBlobServiceWithSas(blobInfo.host, blobInfo.sasToken);
    blob.getBlobToText(blobInfo.containerName, blobInfo.blobName, async (error, text, result, response) => {
        if (response) {
            openLogInNewWindow(text, title);
        } else if (error) {
            throw error;
        }
    });
}

function openLogInNewWindow(content: string, title: string): void {
    const scheme = 'purejs';
    let query = JSON.stringify({ 'log': encodeBase64(content) });
    let uri: vscode.Uri = vscode.Uri.parse(`${scheme}://authority/${title}.log?${query}#idk`);
    vscode.workspace.openTextDocument(uri).then((doc) => {
        return vscode.window.showTextDocument(doc, vscode.ViewColumn.Active + 1, true);
    });
}
