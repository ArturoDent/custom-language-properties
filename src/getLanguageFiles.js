const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const jsonc = require('jsonc-parser');


/**
 * Get and make all the language configuration json files
 * @param {vscode.ExtensionContext} context
 * @param {string} extConfigDirectory - 
 */
exports.getLanguageConfigFiles = async function (context, extConfigDirectory) {

  if (!fs.existsSync(extConfigDirectory)) fs.mkdirSync(extConfigDirectory,{ recursive: true });

  let langConfigFilePath = null;

  for (const _ext of vscode.extensions.all) {
    // All vscode default extensions ids starts with "vscode.": _ext.id.startsWith("vscode.")
    if (
      _ext.packageJSON.contributes &&
      _ext.packageJSON.contributes.languages
    ) {
      const contributedLanguages = _ext.packageJSON.contributes.languages;  // may be an array

      contributedLanguages.forEach((packageLang, index) => {

        let skipLangs = getLanguagesToSkip();

        if (!skipLangs.includes(packageLang.id) && _ext.packageJSON.contributes.languages[index].configuration) {

          langConfigFilePath = path.join(
            _ext.extensionPath,
            _ext.packageJSON.contributes.languages[index].configuration
          );
          if (!!langConfigFilePath && fs.existsSync(langConfigFilePath)) {

            const thisConfig = JSON.stringify(jsonc.parse(fs.readFileSync(langConfigFilePath).toString()));
            // * const thisConfig = JSON.stringify(require(langConfigFilePath));  

            const destPath = path.join(extConfigDirectory, `${ packageLang.id }-language.json`);
            fs.writeFileSync(destPath, thisConfig, { flag:'w' });
          }
        }
      });
    }
  }
};


/**
 * 
 * @param {string} langConfigFilePath 
 */
exports.showLanguageConfigFile = async function (langConfigFilePath) {

  for (const _ext of vscode.extensions.all) {
    // all vscode default extensions ids starts with "vscode."
    if (
      // _ext.id.startsWith("vscode.") &&
      _ext.packageJSON.contributes &&
      _ext.packageJSON.contributes.languages
    ) {
      const packageLang = _ext.packageJSON.contributes.languages;

      packageLang.forEach(async (lang, index) => {

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
    // TODO else { show notification message can't find a language-configuration.json file }
  }
}


/**
 * Transform all language-configuration.json files to 'comments.lineComment' form and 
 * remove properties that can not be currently set
 * @param {vscode.ExtensionContext} context
 * @param {string} extConfigDirectory -
 * @param {string} extLangPropDirectory -
 */
exports.reduceFiles = async function (context, extConfigDirectory, extLangPropDirectory) {

  if (!fs.existsSync(extLangPropDirectory)) fs.mkdirSync(extLangPropDirectory,{ recursive: true });

  const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);

  const configDir = fs.readdirSync(extConfigDirectory, 'utf8');

  for (const lang of configDir) {
    let fileObject = {};
    let langJSON = require(path.join(extConfigDirectory, lang));

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
    const configTargetPath = path.join(extLangPropDirectory, `${langID}.json`);

    fs.writeFileSync(configTargetPath, JSON.stringify(fileObject));
  }
}

/**
 * These "languages" will not be indexed for their properties 
 * because they do not have comments, for example.
 * @returns {string[]}
 */
 exports.getLanguagesToSkip = function () {
  return ['log', 'Log', 'search-result', 'plaintext', 'scminput', 'properties', 'csv', 'tsv', 'excel'];
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
