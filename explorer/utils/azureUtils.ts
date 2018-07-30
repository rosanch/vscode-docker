import * as opn from 'opn';
import { AzureRepositoryNode, AzureImageNode, AzureRegistryNode } from '../models/azureRegistryNodes';
import { AzureSession } from '../../typings/azure-account.api';
import { Registry } from 'azure-arm-containerregistry/lib/models';
import * as vscode from "vscode";
import request = require('request-promise');
import { AzureCredentialsManager } from '../../utils/AzureCredentialsManager';



export interface Repository {
    namespace: string
    name: string
};

export interface RepositoryInfo {
    user: string
    name: string
    namespace: string
    repository_type: string
    status: number
    description: string
    is_private: boolean
    is_automated: boolean
    can_edit: boolean
    star_count: number
    pull_count: number
    last_updated: string
    build_on_cloud: any
    has_starred: boolean
    full_description: string
    affiliation: string
    permissions: {
        read: boolean
        write: boolean
        admin: boolean
    }
}

export function browseAzurePortal(context?: AzureRegistryNode | AzureRepositoryNode | AzureImageNode): void {

    if (context) {
        const tenantId: string = context.subscription.tenantId;
        const session: AzureSession = context.azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
        let url: string = `${session.environment.portalUrl}/${tenantId}/#resource${context.registry.id}`;
        if (context.contextValue === 'azureImageNode' || context.contextValue === 'azureRepositoryNode') {
            url = `${url}/repository`;
        }
        opn(url);
    }

}


/*
export async function getAzureRepositories(Authorization: string, registry: Registry): Promise<Repository[]> {


    let repos: Repository[];

    let options = {
        method: 'GET',
        uri: `https://${registry.name}/v2/users/${Authorization}/repositories/`,
        headers: {
            Authorization: 'JWT ' + _token.token
        },
        json: true
    }

    try {
        repos = await request(options);
    } catch (error) {
        console.log(error);
        vscode.window.showErrorMessage('Docker: Unable to retrieve Repositories');
    }

    return repos;
}

export async function getRepositoryInfo(repository: Repository): Promise<any> {

    let res: any;

    let options = {
        method: 'GET',
        uri: `https://hub.docker.com/v2/repositories/${repository.namespace}/${repository.name}/`,
        headers: {
            Authorization: 'JWT ' + _token.token
        },
        json: true
    }

    try {
        res = await request(options);
    } catch (error) {
        console.log(error);
        vscode.window.showErrorMessage('Docker: Unable to get Repository Details');
    }

    return res;
}
*/
export async function getAccessCredentials(context: AzureRepositoryNode): Promise<{ refreshToken: any, accessToken: any }> {

    let azureAccount = AzureCredentialsManager.getInstance().getAccount();
    const tenantId: string = context.subscription.tenantId;
    if (!this._azureAccount) {
        return;
    }

    const session: AzureSession = azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
    const { accessToken, refreshToken } = await acquireToken(session);

    if (accessToken && refreshToken) {
        let refreshTokenARC;
        let accessTokenARC;

        await request.post('https://' + context.registry.name + '/oauth2/exchange', {
            form: {
                grant_type: 'access_token_refresh_token',
                service: context.registry.name,
                tenant: tenantId,
                refresh_token: refreshToken,
                access_token: accessToken
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                refreshTokenARC = JSON.parse(body).refresh_token;
            } else {
                return;
            }
        });

        await request.post('https://' + context.registry.name + '/oauth2/token', {
            form: {
                grant_type: 'refresh_token',
                service: context.registry.name,
                scope: 'registry:catalog:*',
                refresh_token: refreshTokenARC
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                accessTokenARC = JSON.parse(body).access_token;
            } else {
                return;
            }
        });
        if (refreshTokenARC && accessTokenARC) {
            return { 'refreshToken': refreshTokenARC, 'accessToken': accessTokenARC };
        }
    }
    return { refreshToken, accessToken }
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
