const vscode = require('vscode');
const fs = require('fs');
const path = require('path');


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
      const packageLangID = _ext.packageJSON.contributes.languages[0].id;

      let skipLangs = ['jsonc', 'ignore', 'log', 'search-result'];

      if (!skipLangs.includes(packageLangID)) {

        langConfigFilePath = path.join(
          _ext.extensionPath,
          _ext.packageJSON.contributes.languages[0].configuration
        );
        if (!!langConfigFilePath && fs.existsSync(langConfigFilePath)) {

          // the whole language config will be returned if config arg was the empty string ''
          // desiredConfig = JSON.parse(fs.readFileSync(langConfigFilePath).toString());

          let destPath = path.join(context.extensionPath, 'languageConfigs', `${ packageLangID }-language.json`);

          fs.copyFileSync(langConfigFilePath, destPath);
        }
      }
    }
  }
};

/**
 *
 * @param {vscode.ExtensionContext} context
 */
exports.reduce = function (context) {

  const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);

  const configDirPath = path.join(context.extensionPath, 'languageConfigs');
  const configDir = fs.readdirSync(configDirPath, 'utf8');

  for (const lang of configDir) {
    let fileObject = {};
    let langJSON = JSON.parse(fs.readFileSync(path.join(context.extensionPath, 'languageConfigs', lang)).toString());
    console.log(langJSON);

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
