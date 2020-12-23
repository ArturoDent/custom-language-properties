const vscode = require('vscode');


exports.load = function () {
  return vscode.workspace.getConfiguration('custom-comment-syntax');
};


exports.setConfig = function (settingConfigs, context, languageArray) {

  let disposable;
  const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);

  for (let index = 0; index < languageArray.length; index++) {

    const langID = languageArray[index];
    let thisLanguageConfig = {};

    // The Object.entries() method returns an array of a given object's
    // own enumerable string-keyed property [key, value] pairs.
    let langSettings = Object.entries(settingConfigs.get(langID));

    // for (const prop of langSettings) {
    for (let index = 0; index < langSettings.length; index++) {
      const prop = langSettings[index];

      // prop = "comments.lineComment" or "brackets.add" or "brackets.remove", etc.
      // can you remove or only add?
      if (prop[0].includes('.')) {

        let temp = prop[0].split('.');

        // filter for only brackets, comments, indentationRules, onEnterRules, and wordPattern

        if (temp.length === 2 && configSet.has(temp[0])) {
          if (!Object.keys(thisLanguageConfig).includes(temp[0])) {
            thisLanguageConfig[temp[0]] = {};  // comments are an object; brackets is an array; etc. for other properties
          }
          thisLanguageConfig[temp[0]][temp[1]] = prop[1];
        }
      }
      // prop = "brackets[[]] or
      else if (configSet.has(prop[0])) {
        thisLanguageConfig[prop[0]] = prop[1];
      }
    }
    disposable = vscode.languages.setLanguageConfiguration(
      langID,
      thisLanguageConfig
    );

    context.subscriptions.push(disposable);
  }
};

      // {
      //   "comments": {
      //     "blockComment": ["<#", "#>"],
      //   }
      // }