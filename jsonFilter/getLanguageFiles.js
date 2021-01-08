const vscode = require('vscode');
const fs = require('fs');
const path = require('path');


exports.getLangIDsNotInExtension = async function (context) {

  let missingLangs = [];

  vscode.languages.getLanguages()
    .then(array => {
      console.log(array);
      const langPath = path.join(context.extensionPath, 'languageConfigs');
      const localLangConfigArray = fs.readdirSync(langPath, 'utf8');


      // if (langIDArray.length > localLangConfigArray.length) {
      // missingLangs = langIDArray.filter(langID => {
      missingLangs = array.filter(langID => {
        return !localLangConfigArray.includes(`${ langID }-language.json`);
      });
      console.log(missingLangs);
      return missingLangs;
    });
}


/**
 *
 * @param {vscode.ExtensionContext} context
 */
exports.getLanguageConfigFiles = function (context) {

  let langConfigFilePath = null;

  for (const _ext of vscode.extensions.all) {
    // All vscode default extensions ids starts with "vscode."
    if (
      _ext.id.startsWith("vscode.") &&
      _ext.packageJSON.contributes &&
      _ext.packageJSON.contributes.languages
    ) {
      // const packageLangID = _ext.packageJSON.contributes.languages[0].id;
      const contributedLanguages = _ext.packageJSON.contributes.languages;  // an array

      contributedLanguages.forEach((packageLang, index) => {

        // let skipLangs = ['jsonc', 'ignore', 'log', 'search-result'];
        let skipLangs = ['log', 'Log', 'search-result', 'plaintext', 'scminput', 'properties', 'csv', 'tsv', 'excel'];

        if (!skipLangs.includes(packageLang.id) && _ext.packageJSON.contributes.languages[index].configuration) {

          langConfigFilePath = path.join(
            _ext.extensionPath,
            // _ext.packageJSON.contributes.languages[0].configuration
            _ext.packageJSON.contributes.languages[index].configuration
          );
          if (!!langConfigFilePath && fs.existsSync(langConfigFilePath)) {

            // the whole language config will be returned if config arg was the empty string ''
            // desiredConfig = JSON.parse(fs.readFileSync(langConfigFilePath).toString());

            let destPath = path.join(context.extensionPath, 'languageConfigs', `${ packageLang.id }-language.json`);

            fs.copyFileSync(langConfigFilePath, destPath);
          }
        }
      });
    }
  }
};

exports.showLanguageConfigFile = async function (langConfigFilePath) {

  // let langConfigFilePath;
  for (const _ext of vscode.extensions.all) {
  // All vscode default extensions ids starts with "vscode."
    if (
      _ext.id.startsWith("vscode.") &&
      _ext.packageJSON.contributes &&
      _ext.packageJSON.contributes.languages
    ) {
      // const packageLangID = _ext.packageJSON.contributes.languages[0].id;
      const packageLang = _ext.packageJSON.contributes.languages;

      packageLang.forEach(async (lang, index) => {

        // if (packageLangID === vscode.window.activeTextEditor.document.languageId) {
        if (lang.id === langConfigFilePath) {

          let filePath = path.join(
            _ext.extensionPath,
            _ext.packageJSON.contributes.languages[index].configuration
          );
          if (!!langConfigFilePath && fs.existsSync(filePath)) {
            await vscode.window.showTextDocument(vscode.Uri.file(filePath));
            await vscode.commands.executeCommand('editor.action.formatDocument');
            return;
          }
        }
      });

    }
  }
}

exports.reduceFile = function (context, langID) {

  // let langID = path.basename(path.dirname(vscode.window.activeTextEditor.document.fileName));

    if (path.basename(vscode.window.activeTextEditor.document.fileName) !== "language-configuration.json") return;

    let fullText = JSON.parse(vscode.window.activeTextEditor.document.getText());

    const thisLanguagePath = path.join(context.extensionPath, 'languageConfigs', `${ langID }-language.json`);
    fs.writeFileSync(thisLanguagePath, JSON.stringify(fullText));

    const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);
    let fileObject = {};

    configSet.forEach(config => {

      if (fullText[config]) {
        switch (config) {
          case 'comments':
            if (fullText.comments.lineComment) fileObject['comments.lineComment'] = fullText.comments.lineComment;
            if (fullText.comments.blockComment) fileObject['comments.blockComment'] = fullText.comments.blockComment;
            break;
          case 'brackets':
            fileObject['brackets'] = fullText.brackets;
            break;
          case 'indentationRules':
            if (fullText.indentationRules.increaseIndentPattern) fileObject['indentationRules.increaseIndentPattern'] = fullText.indentationRules.increaseIndentPattern;
            if (fullText.indentationRules.decreaseIndentPattern) fileObject['indentationRules.decreaseIndentPattern'] = fullText.indentationRules.decreaseIndentPattern;
            break;
          case 'onEnterRules':
            if (fullText.onEnterRules.action) fileObject['onEnterRules.action'] = fullText.onEnterRules.action;
            if (fullText.onEnterRules.afterText) fileObject['onEnterRules.afterText'] = fullText.onEnterRules.afterText;
            if (fullText.onEnterRules.beforeText) fileObject['onEnterRules.beforeText'] = fullText.onEnterRules.beforeText;
            break;
          case 'wordPattern':
            fileObject['wordPattern'] = fullText.wordPattern;
            break;

          default:
            break;
        }
      }
    });
  const configTargetPath = path.join(context.extensionPath, 'langProperties', `${langID}.json`);
  fs.writeFileSync(configTargetPath, JSON.stringify(fileObject));
}

/**
 *
 * @param {vscode.ExtensionContext} context
 */
exports.reduceFiles = function (context) {

  const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);

  const configDirPath = path.join(context.extensionPath, 'languageConfigs');
  const configDir = fs.readdirSync(configDirPath, 'utf8');

  for (const lang of configDir) {
    let fileObject = {};
    let langJSON = JSON.parse(fs.readFileSync(path.join(context.extensionPath, 'languageConfigs', lang)).toString());

    configSet.forEach(config => {

      if (langJSON[config]) {
        switch (config) {
          case 'comments':
            if (langJSON.comments.lineComment) fileObject['comments.lineComment'] = langJSON.comments.lineComment;
            if (langJSON.comments.blockComment) fileObject['comments.blockComment'] = langJSON.comments.blockComment;
            break;
          case 'brackets':
            fileObject['brackets'] = langJSON.brackets;
            break;
          case 'indentationRules':
            if (langJSON.indentationRules.increaseIndentPattern) fileObject['indentationRules.increaseIndentPattern'] = langJSON.indentationRules.increaseIndentPattern;
            if (langJSON.indentationRules.decreaseIndentPattern) fileObject['indentationRules.decreaseIndentPattern'] = langJSON.indentationRules.decreaseIndentPattern;
            break;
          case 'onEnterRules':
            if (langJSON.onEnterRules.action) fileObject['onEnterRules.action'] = langJSON.onEnterRules.action;
            if (langJSON.onEnterRules.afterText) fileObject['onEnterRules.afterText'] = langJSON.onEnterRules.afterText;
            if (langJSON.onEnterRules.beforeText) fileObject['onEnterRules.beforeText'] = langJSON.onEnterRules.beforeText;
            break;
          case 'wordPattern':
            fileObject['wordPattern'] = langJSON.wordPattern;
            break;

          default:
            break;
        }
      }
    })
    const langID = lang.replace(/(^\S*)-\S*$/m, '$1');  // bat-language.json or objective-c-language.json
    const configTargetPath = path.join(context.extensionPath, 'langProperties', `${langID}.json`);
    fs.writeFileSync(configTargetPath, JSON.stringify(fileObject));
  }
}

// {
//   "comments.lineComment": "//",
//   "comments.blockComment": [
//     "/*",
//     "*/",
//   ],
//   brackets: [
//     [
//       "{",
//       "}",
//     ],
//     [
//       "[",
//       "]",
//     ],
//     [
//       "(",
//       ")",
//     ],
//   ],
// }
