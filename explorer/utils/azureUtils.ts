import * as opn from 'opn';
import { AzureRepositoryNode, AzureImageNode, AzureRegistryNode } from '../models/azureRegistryNodes';
import { AzureAccount, AzureSession } from '../../typings/azure-account.api';
import { Registry } from 'azure-arm-containerregistry/lib/models';
import * as vscode from "vscode";
import request = require('request-promise');
import { AzureCredentialsManager } from '../../utils/AzureCredentialsManager';
import { SubscriptionModels } from 'azure-arm-resource';


export class Repository {
    accessToken: string;
    azureAccount: AzureAccount;
    //password: string;
    refreshToken: string;
    registry: Registry;
    name: string;
    subscription: SubscriptionModels.Subscription;
    //username: string;
    resourceGroupName: string;

    constructor(accessToken: string, AzureAccount: AzureAccount, refreshToken: string, registry: Registry, repository: string, subscription:
        SubscriptionModels.Subscription, resourceGroupName: string) {
        this.accessToken = accessToken;
        this.azureAccount = AzureAccount;
        // this.password=password;
        this.refreshToken = refreshToken;
        this.registry = registry;
        this.name = repository;
        this.subscription = subscription;
        this.resourceGroupName = resourceGroupName;
        // this.username=username;
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



export async function getAzureRepositories(registry: Registry): Promise<Repository[]> {
    const allRepos: Repository[] = [];
    let repo: Repository;
    let resourceGroup: string = registry.id.slice(registry.id.search('resourceGroups/') + 'resourceGroups/'.length, registry.id.search('/providers/'));
    let subscriptionId = registry.id.slice('/subscriptions/'.length, registry.id.search('/resourceGroups/'));
    const subs = AzureCredentialsManager.getInstance().getFilteredSubscriptionList();
    //get the actual subscription object by using the id found on the registry id above
    const subscription = subs.find(function (sub): boolean {
        return sub.subscriptionId === subscriptionId;
    });
    let azureAccount: AzureAccount = AzureCredentialsManager.getInstance().getAccount();
    if (!this._azureAccount) {
        return [];
    }

    const { accessToken, refreshToken } = await getAccessCredentials(registry);

    if (accessToken && refreshToken) {

        await request.get('https://' + registry.loginServer + '/v2/_catalog', {
            auth: {
                bearer: accessToken
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                const repositories = JSON.parse(body).repositories;
                for (let i = 0; i < repositories.length; i++) {
                    repo = new Repository(accessToken, azureAccount, refreshToken, registry, repositories[i], subscription, resourceGroup);
                    allRepos.push(repo);
                }
            }
        });
    }
    //Note these are ordered by default in alphabetical order
    return allRepos;
}

export async function getAccessCredentials(registry: Registry): Promise<{ refreshToken: any, accessToken: any }> {
    let subscriptionId = registry.id.slice('/subscriptions/'.length, registry.id.search('/resourceGroups/'));
    const subs = AzureCredentialsManager.getInstance().getFilteredSubscriptionList();
    //get the actual subscription object by using the id found on the registry id above
    const subscription = subs.find(function (sub): boolean {
        return sub.subscriptionId === subscriptionId;
    });
    const tenantId: string = subscription.tenantId;
    let azureAccount: AzureAccount = AzureCredentialsManager.getInstance().getAccount()
    if (!this._azureAccount) {
        return;
    }

    const session: AzureSession = azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
    const { accessToken, refreshToken } = await acquireToken(session);

    if (accessToken && refreshToken) {
        let refreshTokenARC;
        let accessTokenARC;

        await request.post('https://' + registry.loginServer + '/oauth2/exchange', {
            form: {
                grant_type: 'access_token_refresh_token',
                service: registry.loginServer,
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

        await request.post('https://' + registry.loginServer + '/oauth2/token', {
            form: {
                grant_type: 'refresh_token',
                service: registry.loginServer,
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
