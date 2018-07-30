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


/**
 * delete a registry and all it's associated nested items
 * @param context : the AzureRegistryNode the user right clicked on to delete
 */
export async function deleteRepository(context?: AzureRepositoryNode) {
    if (!context) {
        //deleteRepositoryNoContext();
        vscode.window.showErrorMessage('You must right click on a valid repository to delete it');
        return;
    }
    else {
        deleteRepositoryContextAvailable(context);
        return;
    }
}

async function deleteRepositoryContextAvailable(context: AzureRepositoryNode) {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: 'No',
        value: 'No',
        prompt: 'Are you sure you want to delete this repository and all of its associated images? Enter Yes or No: '
    };
    let answer = await vscode.window.showInputBox(opt);
    if (answer !== 'Yes') { return };

    let azureAccount = context.azureAccount;
    if (!azureAccount) {
        return;
    }

    if (azureAccount.status === 'LoggedOut') {
        return;
    }
    let registry: Registry = context.registry;
    let repoName = context.label;
    let subscription: SubscriptionModels.Subscription = context.subscription;
    let subscriptionid: string = context.subscription.subscriptionId;
    let loginserver = context.registry.loginServer;
    let resourceGroup = registry.id.slice(registry.id.search('resourceGroups/') + 'resourceGroups/'.length, registry.id.search('/providers/'));
    let creds: { password: string, username: string } = await loginCredentials(subscription, registry);

    if (!resourceGroup || !subscriptionid) {
        throw 'Something went wrong, could not find resource group and/or subscription id';
    }
    //  const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(context.subscription);
    let path = `/v2/_acr/${repoName}/repository`;
    let r = await request_data_from_registry('delete', loginserver, path, creds.username, creds.password);
    console.log(r);

}

async function request_data_from_registry(http_method: string, login_server: string, path: string, username: string, password: string) {
    let url: string = `https://${login_server}${path}`;
    let header = _get_authorization_header(username, password);
    let opt = {
        headers: { 'Authorization': header },
        http_method: http_method,
        url: url
    }
    try {
        let response = await request.delete(opt);
    } catch (error) {
        console.log(error);
    }

    //does this need params, json, and verify?
}

function _get_authorization_header(username: string, password: string): string {
    let auth = ('Basic ' + (encode(username + ':' + password).trim()));
    return (auth);
}


//Implements new Service principal model for ACR container registries while maintaining old admin enabled use
async function loginCredentials(subscription, registry): Promise<{ password: string, username: string }> {
    let username: string;
    let password: string;
    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(subscription);
    const resourceGroup: string = registry.id.slice(registry.id.search('resourceGroups/') + 'resourceGroups/'.length, registry.id.search('/providers/'));

    if (registry.adminUserEnabled) {
        let creds = await client.registries.listCredentials(resourceGroup, registry.name);
        password = creds.passwords[0].value;
        username = creds.username;
    } else {

        let opt: vscode.InputBoxOptions = {
            ignoreFocusOut: false,
            prompt: 'Service Principal ID ?'
        };

        username = await vscode.window.showInputBox(opt);
        if (username) throw ('No input from user received for Service Principal ID');

        opt = {
            ignoreFocusOut: false,
            prompt: 'Service Principal Password ?'
        };
        password = await vscode.window.showInputBox(opt);

        if (!password) throw ('No input from user received for Service Principal Password');

    }
    return { password, username };
}


function encode(str: string): string {
    let bufferB64 = new Buffer(str);
    let bufferLat1 = new Buffer(bufferB64.toString('base64'));
    return bufferLat1.toString('latin1');
}

/**
 * this is called if the command is called through the input bar as opposed to on an AzureRegistryNode
 *
 *
 *
 *     url = 'https://{}{}'.format(login_server, path)
    headers = _get_authorization_header(username, password)
    for i in range(0, retry_times):
        errorMessage = None
        try:

            response = requests.request(
                method=http_method,
                url=url,
                headers=headers,
                params=params,
                json=json_payload,
                verify=(not should_disable_connection_verify())
            )
 *
 *
async function deleteRepositoryNoContext() {

    let azureAccount = await AzureCredentialsManager.getInstance().getAccount();
    let registries = await AzureCredentialsManager.getInstance().getRegistries();
    let reg: string[] = [];
    for (let i = 0; i < registries.length; i++) {
        reg.push(registries[i].name);
    }
    let desired = await vscode.window.showQuickPick(reg, { 'canPickMany': false, 'placeHolder': 'Choose the Registry from which your desired repository exists' });
    if (desired === undefined) return;
    let registry = registries.find(reg => { return desired === reg.name });
    let resourceGroup: string = registry.id.slice(registry.id.search('resourceGroups/') + 'resourceGroups/'.length, registry.id.search('/providers/'));
    let subscriptionId = registry.id.slice('/subscriptions/'.length, registry.id.search('/resourceGroups/'));
    const subs = AzureCredentialsManager.getInstance().getFilteredSubscriptionList();
    //get the actual subscription object by using the id found on the registry id above
    const subscription = subs.find(function (sub): boolean {
        return sub.subscriptionId === subscriptionId;
    });
    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(subscription);






    const repos: Repository[] = [];
    let node: AzureRepositoryNode;

    const tenantId: string = subscription.tenantId;

    const session: AzureSession = this._azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
    const { accessToken, refreshToken } = await acquireToken(session);

    if (accessToken && refreshToken) {
        let refreshTokenARC;
        let accessTokenARC;

        await request.post('https://' + registry.name + '/oauth2/exchange', {
            form: {
                grant_type: 'access_token_refresh_token',
                service: registry.name,
                tenant: tenantId,
                refresh_token: refreshToken,
                access_token: accessToken
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                refreshTokenARC = JSON.parse(body).refresh_token;
            } else {
                return [];
            }
        });

        await request.post('https://' + registry.name + '/oauth2/token', {
            form: {
                grant_type: 'refresh_token',
                service: registry.name,
                scope: 'registry:catalog:*',
                refresh_token: refreshTokenARC
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                accessTokenARC = JSON.parse(body).access_token;
            } else {
                return [];
            }
        });
        await request.get('https://' + registry.name + '/v2/_catalog', {
            auth: {
                bearer: accessTokenARC
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                const repositories = JSON.parse(body).repositories;
                for (let i = 0; i < repositories.length; i++) {
                    node = new AzureRepositoryNode(repositories[i], "azureRepositoryNode");
                    node.accessTokenARC = accessTokenARC;
                    node.azureAccount = azureAccount;
                    node.password = element.password;
                    node.refreshTokenARC = refreshTokenARC;
                    node.registry = registry;
                    node.repository = element.label;
                    node.subscription = element.subscription;
                    node.userName = element.userName;
                    repoNodes.push(node);
                }
            }
        });
    }
    //Note these are ordered by default in alphabetical order
    return repoNodes;
}








    let rep: string[] = [];
    for (let j = 0; j < myRepos.length; j++) {
        rep.push(myRepos[j].name);
    }
    let desiredRepo = await vscode.window.showQuickPick(rep, { 'canPickMany': false, 'placeHolder': 'Choose the repository you want to delete' });
    if (desiredRepo === undefined) return;
    let repository = myRepos.find(rep => { return desiredRepo === rep.name });
    let temp = await dockerHub.getRepositoryInfo(repository);
    console.log(temp);

    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: 'No',
        value: 'No',
        prompt: 'Are you sure you want to delete this repository and its associated images? Enter Yes or No: '
    };
    //ensure user truly wants to delete registry
    let answer = await vscode.window.showInputBox(opt);
    if (answer !== 'Yes') return;

    if (!azureAccount) {
        return;
    }

    if (azureAccount.status === 'LoggedOut') {
        return;
    }

    // grab the resource group and subscription ID to be passed in as parameters to beginDeleteMethod
    for (let i = 0; i < registries.length; i++) {
        if (registries[i].name === registry.name) {
            resourceGroup = registries[i].id.slice(registries[i].id.search('resourceGroups/') + 'resourceGroups/'.length, registries[i].id.search('/providers/'));
            subscriptionId = registries[i].id.slice('/subscriptions/'.length, registries[i].id.search('/resourceGroups/'));
            break;
        }
    }

    if (!resourceGroup || !subscriptionId) {
        throw 'Something went wrong, this registry may no longer exist'
    }

    //get all the subscriptions to look through


}


async function acquireToken(session: AzureSession) {
    return new Promise<{ accessToken: string; refreshToken: string; }>((resolve, reject) => {
        const credentials: any = session.credentials;
        const environment: any = session.environment;
        credentials.context.acquireToken(environment.activeDirectoryResourceId, credentials.username, credentials.clientId, function (err: any, result: any) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken
                });
            }
        });
    });
}
*/
