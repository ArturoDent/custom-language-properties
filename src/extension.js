const vscode = require('vscode');
const extSettings = require('./extensionSettings');
// ** const openIDs = require('./openLangIDs');
const providers = require('./completionProviders');
const makeFiles = require('./getLanguageFiles');

const fs = require('fs');
const path = require('path');


/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {

  const extConfigDirectory = path.join(context.globalStorageUri.fsPath, 'languageConfigs');
  const extLangPropDirectory = path.join(context.globalStorageUri.fsPath, 'languageProperties');

  if (!fs.existsSync(extConfigDirectory)) {
    await makeFiles.getLanguageConfigFiles(context, extConfigDirectory);
    await makeFiles.reduceFiles(context, extConfigDirectory, extLangPropDirectory);
  }
  
  let languagesInSettingsSet = new Set(); // in the settings
  let previousLanguagesInSettingsSet = new Set(); // in the settings

  let settingConfigs = await extSettings.load();

  // loop through all languages that appear in the 'custom-language-properties' settings
  Object.entries(settingConfigs).forEach(langObject => {
    if (typeof langObject[1] !== 'function') languagesInSettingsSet.add(langObject[0].replace(/^([^.]*)\..*/m, '$1'));
  });

  previousLanguagesInSettingsSet = new Set(languagesInSettingsSet);

  languagesInSettingsSet.forEach(async currentLang => 
    await extSettings.setConfig(settingConfigs, context, new Set([currentLang])));

  providers.makeSettingsCompletionProvider(context);
  // ---------------------------------------------------------------------------------------------------------

  let disposable = vscode.commands.registerCommand('custom-language-syntax.showConfigFile', async function () {

    makeFiles.showLanguageConfigFile(vscode.window.activeTextEditor.document.languageId);
	});
  context.subscriptions.push(disposable);

  // ---------------------------------------------------------------------------------------------------------

  disposable = vscode.commands.registerCommand('custom-language-syntax.rebuildConfigFiles', async function () {
    await makeFiles.getLanguageConfigFiles(context, extConfigDirectory);
    await makeFiles.reduceFiles(context, extConfigDirectory, extLangPropDirectory);
    await _newSettings(languagesInSettingsSet, previousLanguagesInSettingsSet, context);
	});
	context.subscriptions.push(disposable);



  // ---------------------------------------------------------------------------------------------------------

	disposable = vscode.workspace.onDidChangeConfiguration(async event => {

    // includes removal or commenting out or change
    if (event.affectsConfiguration('custom-language-properties')) 
      await _newSettings(languagesInSettingsSet, previousLanguagesInSettingsSet, context);
    
    context.subscriptions.push(disposable);
  });

  // ---------------------------------------------------------------------------------------------------------
}

exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;


/**
 * 
 * @param {Set} languagesInSettingsSet - 
 * @param {Set} previousLanguagesInSettingsSet - 
 * @param {vscode.ExtensionContext} context
 */
async function _newSettings(languagesInSettingsSet, previousLanguagesInSettingsSet, context)  {

  let droppedLanguages = new Set();

  languagesInSettingsSet.clear();
  settingConfigs = await extSettings.load();

  Object.entries(settingConfigs).forEach(langObject => {
    if (typeof langObject[1] !== 'function') languagesInSettingsSet.add(langObject[0].replace(/^([^.]*)\..*/m, '$1'));
  });

  // was a language removed from the settings?
  previousLanguagesInSettingsSet.forEach(prevLang => {
    if (!languagesInSettingsSet.has(prevLang)) droppedLanguages.add(prevLang);
  });

  if (droppedLanguages.size) await extSettings.setConfig(settingConfigs, context, droppedLanguages);

  previousLanguagesInSettingsSet = new Set(languagesInSettingsSet);
  if (languagesInSettingsSet.size) await extSettings.setConfig(settingConfigs, context, languagesInSettingsSet);
}



// module.exports = {
// 	activate,
// 	deactivate
// }
