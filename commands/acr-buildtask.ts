
import * as vscode from "vscode";
import { AzureAccountWrapper } from '.././explorer/deploy/azureAccountWrapper';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import {ContainerRegistryManagementClient} from 'azure-arm-containerregistry';
import {AzureAccount, AzureSession} from '../typings/azure-account.api';
import {accountProvider} from '../dockerExtension';
import { RegistryRootNode } from "../explorer/models/registryRootNode";
import { ServiceClientCredentials } from 'ms-rest';

const teleCmdId: string = 'vscode-docker.buildTask';

export async function buildTask(context ?: RegistryRootNode) {

    let opt:  vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        prompt: 'Resource Group? '
    };

    const resourceGroup: string = await vscode.window.showInputBox(opt);

    opt = {
        ignoreFocusOut: true,
        prompt: 'Container registry? '
    };

    
    const registryName: string = await vscode.window.showInputBox(opt);

    opt = {
        ignoreFocusOut: true,
        prompt: 'GitHub username? '
    };

    const username: string = await vscode.window.showInputBox(opt);

    opt = {
        ignoreFocusOut: true,
        prompt: 'GitHub source code URL? '
    };

    const gitURL: string = await vscode.window.showInputBox(opt);

    opt = {
        ignoreFocusOut: true,
        prompt: 'repository path? '
    };

    const repository: string = await vscode.window.showInputBox(opt);


    let azureAccount = context.azureAccount;
    if (!azureAccount) {
        return; 
    }

    if (azureAccount.status === 'LoggedOut') {
        return;
    }      
    const testName: string ='testname';
    const testAlias: string ='testAlias';
    const sourceControlType: string ='GitHub';
    const subs: SubscriptionModels.Subscription[] = getFilteredSubscriptions(azureAccount);
    const client = new ContainerRegistryManagementClient (getCredentialByTenantId(subs[0].tenantId,azureAccount), subs[0].subscriptionId);
        await client.buildTasks.beginCreate(resourceGroup, registryName, testName, {'alias':testAlias, 'sourceRepository':{'sourceControlType':sourceControlType, 'repositoryUrl':gitURL}, 'platform':{'osType':'Windows'}, 'location':registryName}).then(function(response){
            console.log("Success!", response);
        }, function(error){
            console.error("Failed!", error);
        })
    
    function getFilteredSubscriptions(azureAccount:AzureAccount): SubscriptionModels.Subscription[] {
        return azureAccount.filters.map<SubscriptionModels.Subscription>(filter => {
            return {
                id: filter.subscription.id,
                session: filter.session,
                subscriptionId: filter.subscription.subscriptionId,
                tenantId: filter.session.tenantId,
                displayName: filter.subscription.displayName,
                state: filter.subscription.state,
                subscriptionPolicies: filter.subscription.subscriptionPolicies,
                authorizationSource: filter.subscription.authorizationSource
            };
        });
    }


    function getCredentialByTenantId(tenantId: string,azureAccount:AzureAccount): ServiceClientCredentials {

        const session = azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());

        if (session) {
            return session.credentials;
        }

        throw new Error(`Failed to get credentials, tenant ${tenantId} not found.`);
    }

}