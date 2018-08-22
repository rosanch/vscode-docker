import * as vscode from 'vscode';

export class LogContentProvider implements vscode.TextDocumentContentProvider {
    public static scheme: string = 'purejs';
    private onDidChangeEvent: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();

    constructor() { }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        return this.stylehtml(this.decodeBase64(JSON.parse(uri.query).log));
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this.onDidChangeEvent.event;
    }

    public update(uri: vscode.Uri, message: string): void {
        this.onDidChangeEvent.fire(uri);
    }

    private decodeBase64(str: string): string {
        return Buffer.from(str, 'base64').toString('ascii');
    }

    private stylehtml(log: string): string {
        if (log.length === 0) { return 'This Log appears to be empty'; }
        return log;
    }
}
