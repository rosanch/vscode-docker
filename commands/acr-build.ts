
import * as vscode from "vscode";
import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { ImageNode } from "../explorer/models/imageNode";
import { QuickBuildRequest } from "azure-arm-containerregistry/lib/models";
import { AzureCredentialsManager } from "../utils/AzureCredentialsManager";
import { BlobService, createBlobServiceWithSas } from "azure-storage";
var tar = require('tar');
var fs = require('fs');
var os = require('os');
var url = require('url');

export async function queueBuild(context?: ImageNode) {

    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: 'tutorialsGroup',
        value: 'tutorialsGroup',
        prompt: 'Resource Group? '
    };
    const resourceGroup: string = await vscode.window.showInputBox(opt);

    opt = {
        ignoreFocusOut: true,
        placeHolder: 'rocketPenguinInterns',
        value: 'rocketPenguinInterns',
        prompt: 'Registry name? '
    };
    const registryName: string = await vscode.window.showInputBox(opt);

    let sourceLocation: string = vscode.workspace.rootPath;
    let dockerPath: string = (vscode.workspace.rootPath + "\\Dockerfile");

    console.log("Obtaining Subscription and Client");
    const subscription = AzureCredentialsManager.getInstance().getFilteredSubscriptionList()[0];
    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(subscription);

    let images: string[] = [];

    console.log("Setting up temp file with 'sourceArchive.tar.gz' ");
    let tarFilePath = url.resolve(os.tmpdir(), 'sourceArchive.tar.gz');
    console.log("Uploading Source Code");
    sourceLocation = await uploadSourceCode(client, registryName, resourceGroup, sourceLocation, tarFilePath);

    console.log("Setting up Build Request");
    let buildRequest: QuickBuildRequest = {
        'type': 'QuickBuild',
        'imageNames': images,
        'isPushEnabled': false,
        'sourceLocation': sourceLocation,
        'platform': { 'osType': 'Linux' },
        'dockerFilePath': 'DockerFile'
    };

    console.log("Queueing Build");
    try {
        await client.registries.queueBuild(resourceGroup, registryName, buildRequest);
    } catch (error) {
        console.log(error.message);
    }
    console.log(client.builds.list(resourceGroup, registryName));
}

async function uploadSourceCode(client: ContainerRegistryManagementClient, registryName, resourceGroupName, sourceLocation, tarFilePath) {
    console.log("   Sending source code to temp file");
    try {
        tar.c( // or tar.create
            {
                gzip: true
            },
            [sourceLocation]
        ).pipe(fs.createWriteStream(tarFilePath));
    } catch (error) {
        console.log(error);
    }

    console.log("   Getting Build Source Upload Url ");
    let sourceUploadLocation = await client.registries.getBuildSourceUploadUrl(resourceGroupName, registryName);
    let upload_url = sourceUploadLocation.uploadUrl;
    let relative_path = sourceUploadLocation.relativePath;
    console.log("   Getting blob info from upload URl ");
    let { accountName, endpointSuffix, containerName, blobName, sasToken, host } = getBlobInfo(upload_url);
    let blob: BlobService;
    console.log("   Creating Blob service ");
    try {
        blob = createBlobServiceWithSas(host, sasToken);
    } catch (error) {
        console.log(error);
    }
    console.log("   Creating Block Blob ");
    try {
        blob.createBlockBlobFromLocalFile(containerName, blobName, tarFilePath, (): void => { });
    } catch (error) {
        console.log(error);
    }
    console.log("   Success ");
    return relative_path;
}

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
