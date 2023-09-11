const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const jsonc = require('jsonc-parser');

let languagesInSettingsSet = new Set(); // currently in the settings
let previousLanguagesInSettingsSet = new Set(); // previously in the settings before change to configuration
let droppedLanguages = new Set();   // languages dropped on new configuration


/**
 * Main driver: Get the current settings and update the configs for current and dropped languages.
 * @param {vscode.ExtensionContext} context 
 */
exports.getSettingsAndSetConfigs = async function (context) {
  
  let settingConfigs = await _load();
  
  // loop through all languages that appear in the 'custom-language-properties' settings
  // and add to the languagesInSettingsSet
  Object.entries(settingConfigs).forEach(langObject => {
    if (typeof langObject[1] !== 'function') languagesInSettingsSet.add(langObject[0].replace(/^([^.]*)\..*/m, '$1'));
  });

  // compare the previousLanguagesInSettingsSet to languagesInSettingsSet
  // updates droppedLanguages Set and sets their configs to the default state
  _updateDroppedLanguages(settingConfigs, context);
  previousLanguagesInSettingsSet = new Set(languagesInSettingsSet);

  languagesInSettingsSet.forEach(async currentLang => 
    await _setConfig(settingConfigs, context, new Set([currentLang])));
}

/**
 * Get this extension's 'custom-language-properties' settings
 * @returns - a vscode.WorkspaceConfiguration
 */
async function _load  () {
  return await vscode.workspace.getConfiguration('custom-language-properties');
};


/**
 * Set the configs for any languages dropped from the settings configuration.
 * @param {vscode.WorkspaceConfiguration} settingConfigs 
 * @param {vscode.ExtensionContext} context 
 */
async function _updateDroppedLanguages  (settingConfigs, context) {
  
  droppedLanguages.clear();
  previousLanguagesInSettingsSet.forEach(prevLang => {
      if (!languagesInSettingsSet.has(prevLang)) droppedLanguages.add(prevLang);
    });

  if (droppedLanguages.size) await _setConfig(settingConfigs, context, droppedLanguages);
}


/**
 * SetLanguageConfiguration() for the given languageID's, both current and dropped languages.
 *
 * @param {vscode.WorkspaceConfiguration} settingConfigs - this extension's settings
 * @param {vscode.ExtensionContext} context
 * @param {Set<string>} languageSet - an array of languageID's
 */
async function _setConfig (settingConfigs, context, languageSet) {

  let disposable;
  // const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);
  // const configSet = new Set(['comments', 'brackets']);
  const configSet = new Set(['comments', 'brackets', 'autoClosingPairs']);

  languageSet.forEach(async langID => {

    const thisPath = path.join(context.globalStorageUri.fsPath, 'languageConfigs', `${ langID }-language.json`);

    if (!!thisPath && fs.existsSync(thisPath)) {

       // this is the default language configuration
      let thisLanguageConfig = jsonc.parse(fs.readFileSync(thisPath).toString());
      
      // delete everything except comments and brackets at present
      for (const property in thisLanguageConfig) {
        if (!configSet.has(property)) delete thisLanguageConfig[property];
      }

      // The Object.entries() method returns an array of a given object's
      // own enumerable string-keyed property [key, value] pairs.
      let settings = Object.entries(settingConfigs).filter(setting => typeof setting[1] !== 'function');

      for (let index = 0; index < settings.length; index++) {

        let entry = settings[index];
        let found = entry[0].match(/^(?<lang>[^.]*)\./m);

        // if (!found || !found.groups || found.groups.lang !== langID) continue;
        if (!found?.groups || found.groups?.lang !== langID) continue;

        let prop = entry[0].replace(/^([^.]*)\./m, '');

        // prop = "comments.lineComment"
        if (prop.includes('.')) {

          let temp = prop.split('.');

          // need to set both comment:lineComment and blockComment, else it is deleted from the configuration!!
          // will overwrite the default config with matching entry in the settings
          if (temp.length === 2 && configSet.has(temp[0])) {
            thisLanguageConfig[temp[0]][temp[1]] = entry[1];
          }
        }
        // this works (uses proposed api though) autoClosingPairs is an array of objects
        else if (configSet.has(prop) && prop === 'autoClosingPairs'){
          thisLanguageConfig['autoClosingPairs'] = entry[1];
        }
        // prop = "brackets[[]] brackets is an array of arrays
        else if (configSet.has(prop[0])) {
          thisLanguageConfig[prop] = entry[1];
        }
      }

      disposable = await vscode.languages.setLanguageConfiguration( langID, thisLanguageConfig );
      context.subscriptions.push(disposable);
    }
    // else // couldn't set config, languageConfigs/${ langID }-language.json doesn't exist
  })
};