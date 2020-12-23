const vscode = require('vscode');
// const languageConfigs = require('./languageConfigs');
const extSettings = require('./extensionSettings');
const openIDs = require('./openLangIDs');


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

  let disposable;
  let languageArray = [];
  let openIDSet = new Set();

  let settingConfigs = extSettings.load();

  Object.entries(settingConfigs).forEach(langObject => {
    if (typeof langObject[1] !== 'function') languageArray.push(langObject[0]);
  });

	// loop through all languages that appear in the 'custom-comment-syntax' settings
  if (languageArray.length) extSettings.setConfig(settingConfigs, context, languageArray);

  openIDs.addOpenFiles(openIDSet);

  // just go to custom-comments setting ??
  // disposable = vscode.commands.registerCommand('custom-comments.setNewCommentSyntax', async function () {
	// });
	// context.subscriptions.push(disposable);

	disposable = vscode.workspace.onDidChangeConfiguration(async event => {

    // including removal or commenting out or change
		if (event.affectsConfiguration('custom-comment-syntax') ) {

      languageArray = [];
      settingConfigs = extSettings.load();

      Object.entries(settingConfigs).forEach(langObject => {
        if (typeof langObject[1] !== 'function') languageArray.push(langObject[0]);
      });

      if (languageArray.length) extSettings.setConfig(settingConfigs, context, languageArray);
		}
	});
  context.subscriptions.push(disposable);


  disposable = vscode.workspace.onDidOpenTextDocument(async event => {

    if (!openIDSet.has(event.languageId) && languageArray.includes(event.languageId)) {

      extSettings.setConfig(settingConfigs, context, [event.languageId]);
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
