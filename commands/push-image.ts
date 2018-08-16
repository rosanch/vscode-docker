import vscode = require('vscode');
import { AzureImageNode } from '../explorer/models/AzureRegistryNodes';
import { ImageNode } from '../explorer/models/imageNode';
import { ext } from '../extensionVariables';
import { reporter } from '../telemetry/telemetry';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
const teleCmdId: string = 'vscode-docker.image.push';
const teleAzureId: string = 'vscode-docker.image.push.azureContainerRegistry';
import * as acrTools from '../utils/Azure/acrTools';

export async function pushImageToAzure(context?: AzureImageNode): Promise<void> {
    let imageName: string = "";

    if (context) {
        imageName = context.label;
    } else {
        const selectedItem: ImageItem = await quickPickImage();
        if (selectedItem) {
            imageName = selectedItem.label;
        }
    }

    const terminal = ext.terminalProvider.createTerminal(imageName);
    if (imageName.toLowerCase().includes('azurecr.io')) {

        //docker login here
        let credentials = await acrTools.acquireRegistryLoginCredential(context.subscription, context.registry, context);
        let username = credentials.username;
        let password = credentials.password;
        let registry = context.registry.loginServer;

    }
    terminal.sendText(`docker push ${imageName}`);
    terminal.show();
    if (reporter) {
        /* __GDPR__
           "command" : {
              "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
           }
         */
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });

        if (imageName.toLowerCase().includes('azurecr.io')) {
            /* __GDPR__
               "command" : {
                  "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
               }
             */
            reporter.sendTelemetryEvent('command', {
                command: teleAzureId
            });

        }
    }

}

export async function pushImage(context?: ImageNode): Promise<void> {
    let imageToPush: Docker.ImageDesc;
    let imageName: string = "";

    if (context && context.imageDesc) {
        imageToPush = context.imageDesc;
        imageName = context.label;
    } else {
        const selectedItem: ImageItem = await quickPickImage();
        if (selectedItem) {
            imageToPush = selectedItem.imageDesc;
            imageName = selectedItem.label;
        }
    }

    if (imageToPush) {
        const terminal = ext.terminalProvider.createTerminal(imageName);
        terminal.sendText(`docker push ${imageName}`);
        terminal.show();
        if (reporter) {
            /* __GDPR__
               "command" : {
                  "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
               }
             */
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });

            if (imageName.toLowerCase().includes('azurecr.io')) {
                /* __GDPR__
                   "command" : {
                      "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                   }
                 */
                reporter.sendTelemetryEvent('command', {
                    command: teleAzureId
                });

            }
        }
    }
}
