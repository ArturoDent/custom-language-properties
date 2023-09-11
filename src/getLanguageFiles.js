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
    
    if (_ext.packageJSON.contributes && _ext.packageJSON.contributes.languages) {
      
      const contributedLanguages = _ext.packageJSON.contributes.languages;  // may be an array

      contributedLanguages.forEach((/** @type {{ id: string; }} */ packageLang, /** @type {number} */ index) => {

        // "languages" to skip, like plaintext, etc. = no configuration properties that we are interested in
        let skipLangs = _getLanguagesToSkip();

        if (!skipLangs?.includes(packageLang.id) && _ext.packageJSON.contributes.languages[index].configuration) {

          langConfigFilePath = path.join(
            _ext.extensionPath,
            _ext.packageJSON.contributes.languages[index].configuration
          );
          
          if (!!langConfigFilePath && fs.existsSync(langConfigFilePath)) {
            const thisConfig = JSON.stringify(jsonc.parse(fs.readFileSync(langConfigFilePath).toString()));
            const destPath = path.join(extConfigDirectory, `${ packageLang.id }-language.json`);
            fs.writeFileSync(destPath, thisConfig, { flag:'w' });
          }
        }
      });
    }
  }
};

/**
 * @param {string} langID - 
 */
exports.getLanguageConfigFile = async function (langID) {

  let thisConfig = {};
  let langConfigFilePath = null;

  for (let i = 0; i < vscode.extensions.all.length; i++) {

    let _ext = vscode.extensions.all[i];

    if (_ext.packageJSON.contributes && _ext.packageJSON.contributes.languages) {

      const contributedLanguages = _ext.packageJSON.contributes.languages;  // may be an array

      for (let j = 0; j < contributedLanguages.length; j++) {

        let packageLang = contributedLanguages[j];

        if (packageLang.id === langID) {

          // "languages" to skip, like plaintext, etc. = no configuration properties that we are interested in
          let skipLangs = _getLanguagesToSkip();

          // if (!skipLangs?.includes(packageLang.id) && _ext.packageJSON.contributes.languages[index].configuration) {
          if (!skipLangs?.includes(packageLang.id) && _ext.packageJSON.contributes.languages[j].configuration) {


            langConfigFilePath = path.join(
              _ext.extensionPath,
              // _ext.packageJSON.contributes.languages[index].configuration
              _ext.packageJSON.contributes.languages[j].configuration

            );

            if (!!langConfigFilePath && fs.existsSync(langConfigFilePath)) {
              thisConfig = jsonc.parse(fs.readFileSync(langConfigFilePath).toString());
              return thisConfig;
            }
          }
        }
      }
    }
  }
  return thisConfig;
};


/**
 * SHow the language configuration file for the current editor
 * @param {string} langConfigFilePath - vscode.window.activeTextEditor.document.languageId
 */
exports.showLanguageConfigFile = async function (langConfigFilePath) {

  for (const _ext of vscode.extensions.all) {
    if (_ext.packageJSON.contributes && _ext.packageJSON.contributes.languages) {
      
      const packageLang = _ext.packageJSON.contributes.languages; // could be an array

      packageLang.forEach(async (/** @type {{ id: string; }} */ lang, /** @type {number} */ index) => {

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
 * remove properties that can not be currently set.
 * 
 * @param {vscode.ExtensionContext} context
 * @param {string} extConfigDirectory -
 * @param {string} extLangPropDirectory -
 */
exports.reduceFiles = async function (context, extConfigDirectory, extLangPropDirectory) {

  if (!fs.existsSync(extLangPropDirectory)) fs.mkdirSync(extLangPropDirectory,{ recursive: true });

  // const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);
  const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern', 'autoClosingPairs']);
  const configDir = fs.readdirSync(extConfigDirectory, 'utf8');

  for (const lang of configDir) {
    
    /** @type  {Object<string, string>}*/
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

            // TODO add autoClosingPairs from proposed api
          case 'autoClosingPairs':
            // {
            //   "open": "{",
            //   "close": "}"
            // },
            // {
            //   "open": "<",
            //   "close": ">",
            //   "notIn": [
            //     "string"
            //   ]
            // }
            fileObject['autoClosingPairs'] = langJSON.autoClosingPairs;
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
 * because they do not have comments or other applicable properties.
 * @returns {string[]}
 */
function _getLanguagesToSkip  () {
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
