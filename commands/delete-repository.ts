import { Registry } from "azure-arm-containerregistry/lib/models";
import { SubscriptionModels } from 'azure-arm-resource';
import request = require('request-promise');
import * as vscode from "vscode";
import { AzureRepositoryNode } from '../explorer/models/AzureRegistryNodes';
import * as azureUtils from '../explorer/utils/azureUtils';
import { AzureCredentialsManager } from '../utils/AzureCredentialsManager';
const teleCmdId: string = 'vscode-docker.deleteRepository';

/**
 * function to delete an Azure repository and its associated images
 * @param context : if called through right click on AzureRepositoryNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function deleteRepository(context?: AzureRepositoryNode): Promise<void> {

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
    let username: string;
    let password: string;
    if (!context) {
        //first get desired registry
        let registries = await AzureCredentialsManager.getInstance().getRegistries();
        let regStrings: string[] = [];
        for (let item of registries) {
            regStrings.push(item.name);
        }
        let desired = await vscode.window.showQuickPick(regStrings, { 'canPickMany': false, 'placeHolder': 'Choose the Registry from which your desired repository exists' });
        if (desired === undefined) { return; }
        registry = registries.find(reg => { return desired === reg.name });

        //get the subscription object by using the id found on the registry id
        let subscriptionId = registry.id.slice('/subscriptions/'.length, registry.id.search('/resourceGroups/'));
        const subs = AzureCredentialsManager.getInstance().getFilteredSubscriptionList();
        subscription = subs.find((sub): boolean => {
            return sub.subscriptionId === subscriptionId;
        });

        //get the desired repository to delete
        const myRepos: azureUtils.Repository[] = await azureUtils.getAzureRepositories(registry);
        let repoStrings: string[] = [];
        for (let repo of myRepos) {
            repoStrings.push(repo.name);
        }
        let desiredRepo = await vscode.window.showQuickPick(repoStrings, { 'canPickMany': false, 'placeHolder': 'Choose the repository you want to delete' });
        if (desiredRepo === undefined) { return; }
        let repository = myRepos.find((rep): boolean => { return desiredRepo === rep.name });
        if (repository === undefined) { return; }
        repoName = repository.name;
    }

    //ensure user truly wants to delete registry
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: 'No',
        value: 'No',
        prompt: 'Are you sure you want to delete this repository and its associated images? Enter Yes or No: '
    };
    let answer = await vscode.window.showInputBox(opt);
    answer = answer.toLowerCase();
    if (answer !== 'Yes') { return; }

    // generate credentials before requesting a delete.
    if (context) {
        username = context.userName;
        password = context.password;
        repoName = context.label;
        subscription = context.subscription;
        registry = context.registry;
    } else { //this is separated from !context above so it only calls loginCredentials once user has assured they want to delete the repository
        let creds = await loginCredentials(subscription, registry);
        username = creds.username;
        password = creds.password;
    }
    let path = `/v2/_acr/${repoName}/repository`;
    await request_data_from_registry('delete', registry.loginServer, path, username, password);
}

/**
 *
 * @param http_method : the http method, this function currently only uses delete
 * @param login_server: the login server of the registry
 * @param path : the URL path
 * @param username : registry username, can be in generic form of 0's, used to generate authorization header
 * @param password : registry password, can be in form of accessToken, used to generate authorization header
 */
async function request_data_from_registry(http_method: string, login_server: string, path: string, username: string, password: string): Promise<void> {
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
}

/**
 *
 * @param username : username for creating header
 * @param password : password for creating header
 */
function _get_authorization_header(username: string, password: string): string {
    let auth = ('Basic ' + (encode(username + ':' + password).trim()));
    return (auth);
}

//Implements new Service principal model for ACR container registries while maintaining old admin enabled use
/**
 * this function implements a new Service principal model for ACR and gets the valid login credentials to make an API call
 * @param subscription : the subscription the registry is on
 * @param registry : the registry to get login credentials for
 * @param context : if command is invoked through a right click on an AzureRepositoryNode. This context has a password and username
 */
async function loginCredentials(subscription: SubscriptionModels.Subscription, registry: Registry, context?: AzureRepositoryNode): Promise<{ password: string, username: string }> {
    let username: string;
    let password: string;
    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(subscription);
    const resourceGroup: string = registry.id.slice(registry.id.search('resourceGroups/') + 'resourceGroups/'.length, registry.id.search('/providers/'));
    if (context) {
        username = context.userName;
        password = context.password;
    } else if (registry.adminUserEnabled) {
        let creds = await client.registries.listCredentials(resourceGroup, registry.name);
        password = creds.passwords[0].value;
        username = creds.username;
    } else {
        //grab the access token to be used as a password, and a generic username
        let creds = await azureUtils.getTokens(registry);
        password = creds.accessToken;
        username = '00000000-0000-0000-0000-000000000000';
    }
    return { password, username };
}

/**
 * first encodes to base 64, and then to latin1. See online documentation to see typescript encoding capabilities
 * see https://nodejs.org/api/buffer.html#buffer_buf_tostring_encoding_start_end for details {Buffers and Character Encodings}
 * current character encodings include: ascii, utf8, utf16le, ucs2, base64, latin1, binary, hex. Version v6.4.0
 * @param str : the string to encode for api URL purposes
 */
function encode(str: string): string {
    let bufferB64 = new Buffer(str);
    let bufferLat1 = new Buffer(bufferB64.toString('base64'));
    return bufferLat1.toString('latin1');
}
