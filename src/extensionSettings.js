const vscode = require('vscode');
const fs = require('fs');
const path = require('path');


/**
 * @description - get theis extension's 'custom-language-properties' settings
 * @returns - a vscode.WorkspaceConfiguration
 */
exports.load = function () {
  return vscode.workspace.getConfiguration('custom-language-properties');
};


/**
 * @description - setLanguageConfiguration() for the given languageID's
 *
 * @param {vscode.WorkspaceConfiguration} settingConfigs - this extension's settings
 * @param {vscode.ExtensionContext} context
 * @param {Set} languageSet - an array of languageID's
 */
exports.setConfig = function (settingConfigs, context, languageSet) {

  let disposable;
  // const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);
  const configSet = new Set(['comments', 'brackets']);

  languageSet.forEach(async langID => {

    const thisPath = path.join(context.extensionPath, 'languageConfigs', `${ langID }-language.json`);

    if (!!thisPath && fs.existsSync(thisPath)) {

      let thisLanguageConfig = JSON.parse(fs.readFileSync(thisPath).toString()); // default language configuration
      for (const property in thisLanguageConfig) {
        if (!configSet.has(property)) delete thisLanguageConfig[property];
      }

      // The Object.entries() method returns an array of a given object's
      // own enumerable string-keyed property [key, value] pairs.
      // investigate hasOwnProperty() ***
      let settings = Object.entries(settingConfigs).filter(setting => typeof setting[1] !== 'function');

      for (let index = 0; index < settings.length; index++) {

        let entry = settings[index];
        let found = entry[0].match(/^(?<lang>[^.]*)\./m);

        if (!found || found.groups.lang !== langID) continue;

        let prop = entry[0].replace(/^([^.]*)\./m, '');

        // prop = "comments.lineComment"
        if (prop.includes('.')) {

          let temp = prop.split('.');

          // need to set both comment:lineComment and blockComment, else it is deleted from the configuration!!

          if (temp.length === 2 && configSet.has(temp[0])) {
            thisLanguageConfig[temp[0]][temp[1]] = entry[1];
          }
        }
        // prop = "brackets[[]] or
        else if (configSet.has(prop[0])) {
          thisLanguageConfig[prop] = entry[1];
        }
      }

      disposable = await vscode.languages.setLanguageConfiguration(
        langID,
        thisLanguageConfig
      );

      context.subscriptions.push(disposable);
    }
    // else // couldn't set config, languageConfigs/${ langID }-language.json doesn't exist
  })
};