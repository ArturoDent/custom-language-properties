const vscode = require('vscode');
const extSettings = require('./extensionSettings');
const openIDs = require('./openLangIDs');
const providers = require('./completionProviders');
// const makeFiles = require('../jsonFilter/getLanguageFiles');


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

  // makeFiles.getLanguageConfigFiles(context);
  // makeFiles.reduce(context);
  // return;

  let disposable;
  let languageSet = new Set(); // in the settings
  let openIDSet = new Set(); // been visited
  let settingConfigs = extSettings.load();

  // loop through all languages that appear in the 'custom-language-properties' settings

  // openIDs.addOpenFiles(openIDSet);  // doesn't work, no available api for doing this??
  if (vscode.window.activeTextEditor) {

    Object.entries(settingConfigs).forEach(langObject => {
      if (typeof langObject[1] !== 'function') languageSet.add(langObject[0].replace(/^([^.]*)\..*/m, '$1'));
    });

    openIDs.addCurrentFileID(openIDSet);

    let currentLang = vscode.window.activeTextEditor.document.languageId;
    if (languageSet.has(currentLang)) extSettings.setConfig(settingConfigs, context, languageSet, '');
    providers.makeSettingsCompletionProvider(context);
  }

  // disposable = vscode.commands.registerCommand('custom-comments.setNewCommentSyntax', async function () {
	// });
	// context.subscriptions.push(disposable);

	disposable = vscode.workspace.onDidChangeConfiguration(async event => {

    // including removal or commenting out or change
		if (event.affectsConfiguration('custom-language-properties')) {

      // languageSet = [];
      languageSet.clear();
      settingConfigs = extSettings.load();
      // check for null here?

      Object.entries(settingConfigs).forEach(langObject => {
        if (typeof langObject[1] !== 'function') {
          let langID = langObject[0].replace(/^([^.]*).*/m, '$1');
          languageSet.add(langID);
        }
      });

      if (languageSet.size) extSettings.setConfig(settingConfigs, context, languageSet, '');
		}
	});
  context.subscriptions.push(disposable);


  disposable = vscode.workspace.onDidOpenTextDocument(async event => {

    if (!openIDSet.has(event.languageId) && languageSet.has(event.languageId)) {

      extSettings.setConfig(settingConfigs, context, languageSet, event.languageId);  // modify to take only one?
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
