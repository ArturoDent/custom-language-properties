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

  let newLanguageCount = 0;

  /** @type {string[]} */
  let newLanguages = [];

  if (!fs.existsSync(extConfigDirectory)) fs.mkdirSync(extConfigDirectory, {recursive: true});

  for (const [id, langConfigFilePath] of _getLangConfigPaths()) {

    let langID = id.replace(/^(.*\.)?(.+)$/m, '$2');
    const thisConfig = JSON.stringify(jsonc.parse(fs.readFileSync(langConfigFilePath).toString()));

    // const destPath = path.join(extConfigDirectory, `${id}-language.json`);
    const destPath = path.join(extConfigDirectory, `${langID}-language.json`);
    if (!fs.existsSync(destPath)) {
      newLanguageCount++;
      newLanguages.push(`${id}`);
    }

    fs.writeFileSync(destPath, thisConfig, {flag: 'w'});
    // destPath = "c:\\Users\\Mark\\AppData\\Roaming\\Code - Insiders\\User\\globalStorage\\arturodent.custom-language-syntax\\languageConfigs\\erb-language.json"
  }
  return {newLanguageCount, newLanguages};
};

/**
 * @param {string} langID -
 */
exports.getLanguageConfigFile = async function (langID) {

  const langConfigFilePath = _getLangConfigPaths().get(langID);
  if (!langConfigFilePath) return {};

  return jsonc.parse(fs.readFileSync(langConfigFilePath).toString());
};


/**
 * SHow the language configuration file for the current editor
 * @param {string} langConfigFilePath - vscode.window.activeTextEditor.document.languageId
 */
exports.showLanguageConfigFile = async function (langConfigFilePath) {

  const filePath = _getLangConfigPaths().get(langConfigFilePath);

  if (filePath) {
    await vscode.window.showTextDocument(vscode.Uri.file(filePath));
    await vscode.commands.executeCommand('editor.action.formatDocument');
  }
  else vscode.window.showInformationMessage(`Could not find a language configuration file for "${langConfigFilePath}".`);
}


/** @type {Map<string, string> | null} - language id -> absolute path of its language-configuration.json */
let _langConfigPaths = null;

/**
 * Build the language id -> configuration file path Map on first use, then reuse it.
 * @returns {Map<string, string>}
 */
function _getLangConfigPaths() {

  if (_langConfigPaths) return _langConfigPaths;

  _langConfigPaths = new Map();

  // "languages" to skip, like plaintext, etc. = no configuration properties that we are interested in
  const skipLangs = _getLanguagesToSkip();

  for (const _ext of vscode.extensions.all) {

    const contributedLanguages = _ext.packageJSON.contributes?.languages;  // may be an array
    if (!contributedLanguages) continue;  // most extensions

    for (const lang of contributedLanguages) {

      // several extensions may contribute the same language id, the first one with an existing configuration file wins
      if (!lang.configuration || skipLangs.includes(lang.id) || _langConfigPaths.has(lang.id)) continue;

      const filePath = path.join(_ext.extensionPath, lang.configuration);
      if (fs.existsSync(filePath)) _langConfigPaths.set(lang.id, filePath);
    }
  }
  return _langConfigPaths;
}

/**
 * Drop the cached Map so the next use rebuilds it, e.g. after extensions are installed or removed
 */
exports.clearLangConfigPathsCache = function () {
  _langConfigPaths = null;
};


/**
 * Transform all language-configuration.json files to 'comments.lineComment' form and 
 * remove properties that can not be currently set.
 * 
 * @param {vscode.ExtensionContext} context
 * @param {string} extConfigDirectory -
 * @param {string} extLangPropDirectory -
 */
exports.reduceFiles = async function (context, extConfigDirectory, extLangPropDirectory) {

  if (!fs.existsSync(extLangPropDirectory)) fs.mkdirSync(extLangPropDirectory, {recursive: true});

  // const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);
  const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern', 'autoClosingPairs']);
  const configDir = fs.readdirSync(extConfigDirectory, 'utf8');

  for (const lang of configDir) {

    /** @type  {Object<string, string>}*/
    let fileObject = {};

    // not require(), which caches the file so a rebuilt file is not seen until a reload
    let langJSON = jsonc.parse(fs.readFileSync(path.join(extConfigDirectory, lang)).toString());

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
function _getLanguagesToSkip() {
  // return ['log', 'Log', 'search-result', 'plaintext', 'scminput', 'properties', 'csv', 'tsv', 'excel'];
  return ['log', 'Log', 'search-result', 'plaintext', 'scminput', 'csv', 'tsv', 'excel'];
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
