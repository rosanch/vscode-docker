import * as opn from 'opn';
import { AzureRepositoryNode, AzureImageNode, AzureRegistryNode } from '../models/azureRegistryNodes';
import { AzureSession } from '../../typings/azure-account.api';
import { Registry } from 'azure-arm-containerregistry/lib/models';
import * as vscode from "vscode";
import request = require('request-promise');



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

export async function getAzureRepositories(Authorization: string, registry: Registry): Promise<Repository[]> {


    let repos: Repository[];

    let options = {
        method: 'GET',
        uri: `https://${registry.name}/v2/users/${username}/repositories/`,
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
