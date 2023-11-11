const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const extSettings = require('./extensionSettings');
const providers = require('./completionProviders');
const makeFiles = require('./getLanguageFiles');



/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {

  const extConfigDirectory = path.join(context.globalStorageUri.fsPath, 'languageConfigs');
  const extLangPropDirectory = path.join(context.globalStorageUri.fsPath, 'languageProperties');

  // so first run only, doesn't mean there is anything in those directories though
  if (!fs.existsSync(extConfigDirectory) || !fs.existsSync(extLangPropDirectory)) {
    await makeFiles.getLanguageConfigFiles(context, extConfigDirectory);
    await makeFiles.reduceFiles(context, extConfigDirectory, extLangPropDirectory);
  }
  
  await extSettings.getSettingsAndSetConfigs(context);
  providers.makeSettingsCompletionProvider(context);
  
  // ---------------------------------------------------------------------------------------------------------

  let disposable = vscode.commands.registerCommand('custom-language-syntax.showConfigFile', async function () {
    
    if (vscode.window.activeTextEditor) 
      makeFiles.showLanguageConfigFile(vscode.window.activeTextEditor.document.languageId);
	});
  context.subscriptions.push(disposable);

  // ---------------------------------------------------------------------------------------------------------

  disposable = vscode.commands.registerCommand('custom-language-syntax.rebuildConfigFiles', async function () {
    await makeFiles.getLanguageConfigFiles(context, extConfigDirectory);
    await makeFiles.reduceFiles(context, extConfigDirectory, extLangPropDirectory);
    await extSettings.getSettingsAndSetConfigs(context);
	});
	context.subscriptions.push(disposable);

  // ---------------------------------------------------------------------------------------------------------

	disposable = vscode.workspace.onDidChangeConfiguration(async event => {

    // includes removal or commenting out or change, must save to trigger
    if (event.affectsConfiguration('custom-language-properties')) 
      await extSettings.getSettingsAndSetConfigs(context);
      
    context.subscriptions.push(disposable);
  });
}

exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;