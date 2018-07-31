import * as vscode from "vscode";
import request = require('request-promise');
import * as azureUtils from '../explorer/utils/azureUtils';

import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { AzureAccountWrapper } from '.././explorer/deploy/azureAccountWrapper';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount, AzureSession } from '../typings/azure-account.api';
import { accountProvider } from '../dockerExtension';
import { RegistryRootNode } from "../explorer/models/registryRootNode";
import { ServiceClientCredentials } from 'ms-rest';
import { RegistryNameStatus, RegistryListResult, Registry } from "azure-arm-containerregistry/lib/models";
const teleCmdId: string = 'vscode-docker.deleteRepository';
import { AzureCredentialsManager } from '../utils/AzureCredentialsManager';
import { AzureRegistryNode, AzureLoadingNode, AzureNotSignedInNode } from '../explorer/models/azureRegistryNodes';
import { AzureRepositoryNode } from '../explorer/models/AzureRegistryNodes';
import { Repository, getRepositories, getRepositoryInfo } from "../explorer/utils/dockerHubUtils";


export async function deleteRepository(context?: AzureRepositoryNode) {

    let azureAccount = await AzureCredentialsManager.getInstance().getAccount();
    if (!azureAccount) {
        return;
    }

    if (azureAccount.status === 'LoggedOut') {
        return;
    }
    let registry: Registry;
    let subscription: SubscriptionModels.Subscription;
    let repoName: string;
    if (!context) {
        let registries = await AzureCredentialsManager.getInstance().getRegistries();
        let reg: string[] = [];
        for (let i = 0; i < registries.length; i++) {
            reg.push(registries[i].name);
        }
        let desired = await vscode.window.showQuickPick(reg, { 'canPickMany': false, 'placeHolder': 'Choose the Registry from which your desired repository exists' });
        if (desired === undefined) return;
        registry = registries.find(reg => { return desired === reg.name });
        let subscriptionId = registry.id.slice('/subscriptions/'.length, registry.id.search('/resourceGroups/'));
        const subs = AzureCredentialsManager.getInstance().getFilteredSubscriptionList();
        //get the actual subscription object by using the id found on the registry id above
        subscription = subs.find(function (sub): boolean {
            return sub.subscriptionId === subscriptionId;
        });
        const myRepos: azureUtils.Repository[] = await azureUtils.getAzureRepositories(registry);


        let rep: string[] = [];
        for (let j = 0; j < myRepos.length; j++) {
            rep.push(myRepos[j].name);
        }
        let desiredRepo = await vscode.window.showQuickPick(rep, { 'canPickMany': false, 'placeHolder': 'Choose the repository you want to delete' });
        if (desiredRepo === undefined) return;
        let repository = myRepos.find(rep => { return desiredRepo === rep.name });
        repoName = repository.name;
    }
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: 'No',
        value: 'No',
        prompt: 'Are you sure you want to delete this repository and its associated images? Enter Yes or No: '
    };
    //ensure user truly wants to delete registry
    let answer = await vscode.window.showInputBox(opt);
    if (answer !== 'Yes') return;
    let username: string;
    let password: string;
    if (context) {
        // let creds = await loginCredentia5ls(context.subscription, context.registry, context);
        // console.log('password from creds= ' + creds.password + ' username from creds= ' + creds.username);
        username = context.userName;
        password = context.password;
        console.log('password from context= ' + password + ' username from context= ' + username);
        repoName = context.label;
        subscription = context.subscription;
        registry = context.registry;
    }
    else {
        let creds = await loginCredentials(subscription, registry);
        username = creds.username;
        password = creds.password;
    }
    let path = `/v2/_acr/${repoName}/repository`;
    let r = await request_data_from_registry('delete', registry.loginServer, path, username, password);
}



async function request_data_from_registry(http_method: string, login_server: string, path: string, username: string, password: string) {
    let url: string = `https://${login_server}${path}`;
    let header = _get_authorization_header(username, password);
    let opt = {
        headers: { 'Authorization': header },
        http_method: http_method,
        url: url
    }
    let err = false;
    try {
        let response = await request.delete(opt);
    } catch (error) {
        err = true;
        console.log(error);
    }
    if (!err) {
        vscode.window.showInformationMessage('Successfully deleted repository');
    }
    //does this need params, json, and verify?
}

function _get_authorization_header(username: string, password: string): string {
    let auth = ('Basic ' + (encode(username + ':' + password).trim()));
    return (auth);
}


//Implements new Service principal model for ACR container registries while maintaining old admin enabled use
async function loginCredentials(subscription, registry, context?: AzureRepositoryNode): Promise<{ password: string, username: string }> {
    let username: string;
    let password: string;
    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(subscription);
    const resourceGroup: string = registry.id.slice(registry.id.search('resourceGroups/') + 'resourceGroups/'.length, registry.id.search('/providers/'));

    if (registry.adminUserEnabled) {
        let creds = await client.registries.listCredentials(resourceGroup, registry.name);
        password = creds.passwords[0].value;
        username = creds.username;
    } else {
        let creds = await azureUtils.getAccessCredentials(registry);
        password = creds.accessToken;
        username = '00000000-0000-0000-0000-000000000000';
    }
    return { password, username };
}


function encode(str: string): string {
    let bufferB64 = new Buffer(str);
    let bufferLat1 = new Buffer(bufferB64.toString('base64'));
    return bufferLat1.toString('latin1');
}
