const vscode = require('vscode');
const extSettings = require('./extensionSettings');
const openIDs = require('./openLangIDs');
const providers = require('./completionProviders');
const makeFiles = require('../jsonFilter/getLanguageFiles');

// const fs = require('fs');
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
    // if (languagesInSettingsSet.has(currentLang)) extSettings.setConfig(settingConfigs, context, languagesInSettingsSet);

    // failed: ENOENT: no such file or directory, open 'c:\Users\Mark\custom-comments\languageConfigs\html-language.json'.

    if (languagesInSettingsSet.has(currentLang)) extSettings.setConfig(settingConfigs, context, new Set([currentLang]));
    providers.makeSettingsCompletionProvider(context);
  }

  disposable = vscode.commands.registerCommand('custom-language-syntax.showConfigFile', async function () {

    makeFiles.showLanguageConfigFile(vscode.window.activeTextEditor.document.languageId);

    // C:\Users\Mark\AppData\Local\Programs\Microsoft VS Code\resources\app\extensions\html\language-configuration.json
    // C:\Users\Mark\AppData\Local\Programs\Microsoft VS Code\resources\app\extensions\python\language-configuration.json

    // let langConfigFilePath;
    // for (const _ext of vscode.extensions.all) {
    // // All vscode default extensions ids starts with "vscode."
    //   if (
    //     _ext.id.startsWith("vscode.") &&
    //     _ext.packageJSON.contributes &&
    //     _ext.packageJSON.contributes.languages
    //   ) {
    //     const packageLangID = _ext.packageJSON.contributes.languages[0].id;

    //     if (packageLangID === vscode.window.activeTextEditor.document.languageId) {

    //       langConfigFilePath = path.join(
    //         _ext.extensionPath,
    //         _ext.packageJSON.contributes.languages[0].configuration
    //       );
    //       if (!!langConfigFilePath && fs.existsSync(langConfigFilePath)) {
    //         await vscode.window.showTextDocument(vscode.Uri.file(langConfigFilePath));
    //         await vscode.commands.executeCommand('editor.action.formatDocument');
    //         break;
    //       }
    //     }
    //   }
    // }
	});
  context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('custom-language-syntax.transformConfigFile', function () {

    // C:\Users\Mark\AppData\Local\Programs\Microsoft VS Code\resources\app\extensions\python\language-configuration.json

      let langID = path.basename(path.dirname(vscode.window.activeTextEditor.document.fileName));

      makeFiles.reduceFile(context, langID);

    //   let langID = path.basename(path.dirname(vscode.window.activeTextEditor.document.fileName));

    //   if (path.basename(vscode.window.activeTextEditor.document.fileName) !== "language-configuration.json") return;

    //   let fullText = JSON.parse(vscode.window.activeTextEditor.document.getText());

    //   const thisLanguagePath = path.join(context.extensionPath, 'languageConfigs', `${ langID }-language.json`);
    //   fs.writeFileSync(thisLanguagePath, JSON.stringify(fullText));

    //   const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);
    //   let fileObject = {};

    //   configSet.forEach(config => {

    //     if (fullText[config]) {
    //       switch (config) {
    //         case 'comments':
    //           if (fullText.comments.lineComment) fileObject['comments.lineComment'] = fullText.comments.lineComment;
    //           if (fullText.comments.blockComment) fileObject['comments.blockComment'] = fullText.comments.blockComment;
    //           break;
    //         case 'brackets':
    //           fileObject['brackets'] = fullText.brackets;
    //           break;
    //         case 'indentationRules':
    //           if (fullText.indentationRules.increaseIndentPattern) fileObject['indentationRules.increaseIndentPattern'] = fullText.indentationRules.increaseIndentPattern;
    //           if (fullText.indentationRules.decreaseIndentPattern) fileObject['indentationRules.decreaseIndentPattern'] = fullText.indentationRules.decreaseIndentPattern;
    //           break;
    //         case 'onEnterRules':
    //           if (fullText.onEnterRules.action) fileObject['onEnterRules.action'] = fullText.onEnterRules.action;
    //           if (fullText.onEnterRules.afterText) fileObject['onEnterRules.afterText'] = fullText.onEnterRules.afterText;
    //           if (fullText.onEnterRules.beforeText) fileObject['onEnterRules.beforeText'] = fullText.onEnterRules.beforeText;
    //           break;
    //         case 'wordPattern':
    //           fileObject['wordPattern'] = fullText.wordPattern;
    //           break;

    //         default:
    //           break;
    //       }
    //     }
    //   });
    // const configTargetPath = path.join(context.extensionPath, 'langProperties', `${langID}.json`);
    // fs.writeFileSync(configTargetPath, JSON.stringify(fileObject));
	});
	context.subscriptions.push(disposable);

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


      // languagesInSettingsSet.clear();
      // settingConfigs = extSettings.load();
      // check for null here?

      // Object.entries(settingConfigs).forEach(langObject => {
      //   if (typeof langObject[1] !== 'function') {
      //     let langID = langObject[0].replace(/^([^.]*).*/m, '$1');
      //     languagesInSettingsSet.add(langID);
      //   }
      // });

      // Object.entries(settingConfigs).forEach(langObject => {
      //   if (typeof langObject[1] !== 'function') languagesInSettingsSet.add(langObject[0].replace(/^([^.]*)\..*/m, '$1'));
      // });

      if (languagesInSettingsSet.size) extSettings.setConfig(settingConfigs, context, languagesInSettingsSet);
		}
	});
  context.subscriptions.push(disposable);


  disposable = vscode.workspace.onDidOpenTextDocument(async event => {

    if (!openIDSet.has(event.languageId) && languagesInSettingsSet.has(event.languageId)) {

      // extSettings.setConfig(settingConfigs, context, languagesInSettingsSet);  // modify to take only one?
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
