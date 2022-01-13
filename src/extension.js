const vscode = require('vscode');
const extSettings = require('./extensionSettings');
const openIDs = require('./openLangIDs');
const providers = require('./completionProviders');
const makeFiles = require('../jsonFilter/getLanguageFiles');
const path = require('path');




/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

  // makeFiles.getLanguageConfigFiles(context);
  // makeFiles.reduceFiles(context);
  // return;

  // makeFiles.getLangIDsNotInExtension(context);
  // return;

  let disposable;
  let languagesInSettingsSet = new Set(); // in the settings
  let previousLanguagesInSettingsSet = new Set(); // in the settings

  let openIDSet = new Set(); // been visited
  let settingConfigs = extSettings.load();

  // loop through all languages that appear in the 'custom-language-properties' settings

  // openIDs.addOpenFiles(openIDSet);  // doesn't work, no available api for doing this??
  if (vscode.window.activeTextEditor) {

    Object.entries(settingConfigs).forEach(langObject => {
      if (typeof langObject[1] !== 'function') languagesInSettingsSet.add(langObject[0].replace(/^([^.]*)\..*/m, '$1'));
    });
    previousLanguagesInSettingsSet = new Set(languagesInSettingsSet);

    openIDs.addCurrentFileID(openIDSet);

    let currentLang = vscode.window.activeTextEditor.document.languageId;

    if (languagesInSettingsSet.has(currentLang)) extSettings.setConfig(settingConfigs, context, new Set([currentLang]));
    providers.makeSettingsCompletionProvider(context);
  }

  // ---------------------------------------------------------------------------------------------------------

  disposable = vscode.commands.registerCommand('custom-language-syntax.showConfigFile', async function () {

    makeFiles.showLanguageConfigFile(vscode.window.activeTextEditor.document.languageId);
	});
  context.subscriptions.push(disposable);

  // ---------------------------------------------------------------------------------------------------------

  disposable = vscode.commands.registerCommand('custom-language-syntax.transformConfigFile', function () {

    // C:\Users\...\AppData\Local\Programs\Microsoft VS Code\resources\app\extensions\python\language-configuration.json

    let langID = path.basename(path.dirname(vscode.window.activeTextEditor.document.fileName));
    
    makeFiles.reduceFile(context, langID);
	});
	context.subscriptions.push(disposable);

  // ---------------------------------------------------------------------------------------------------------

	disposable = vscode.workspace.onDidChangeConfiguration(async event => {

    // includes removal or commenting out or change
    if (event.affectsConfiguration('custom-language-properties')) {

      let droppedLanguages = new Set();

      languagesInSettingsSet.clear();
      settingConfigs = extSettings.load();

      Object.entries(settingConfigs).forEach(langObject => {
        if (typeof langObject[1] !== 'function') languagesInSettingsSet.add(langObject[0].replace(/^([^.]*)\..*/m, '$1'));
      });

      // was a language removed from the settings?
      previousLanguagesInSettingsSet.forEach(prevLang => {
        if (!languagesInSettingsSet.has(prevLang)) droppedLanguages.add(prevLang);
      });

      if (droppedLanguages.size) extSettings.setConfig(settingConfigs, context, droppedLanguages);

      previousLanguagesInSettingsSet = new Set(languagesInSettingsSet);

      if (languagesInSettingsSet.size) extSettings.setConfig(settingConfigs, context, languagesInSettingsSet);
		}
	});
  context.subscriptions.push(disposable);

  // ---------------------------------------------------------------------------------------------------------

  disposable = vscode.workspace.onDidOpenTextDocument(async event => {

    if (!openIDSet.has(event.languageId) && languagesInSettingsSet.has(event.languageId)) {

      extSettings.setConfig(settingConfigs, context, new Set([event.languageId]));  // modify to take only one?
      openIDs.addNewFileID(openIDSet, event.languageId);
    }
  })
  context.subscriptions.push(disposable);

}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;


// module.exports = {
// 	activate,
// 	deactivate
// }
