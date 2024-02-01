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

  for (const langObject of Object.values(settingConfigs)) {
    
    const language = langObject[0].match(/^(.*?)\.(?=comments|brackets)/m);
    if (language) languagesInSettingsSet.add(language[1]);
  }

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
async function _load() {
  console.log();
  const configs = vscode.workspace.getConfiguration('custom-language-properties');
  // to strip off WorkspaceConfiguration.has/inspect/etc.
  return Object.entries(configs).filter(config => typeof config[1] !== 'function');
};


/**
 * Set the configs for any languages dropped from the settings configuration.
 * @param {[string, any][]} settingConfigs 
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
 * @param {[string, any][]} settingConfigs - this extension's settings
 * @param {vscode.ExtensionContext} context
 * @param {Set<string>} languageSet - an array of languageID's
 */
async function _setConfig (settingConfigs, context, languageSet) {

  let disposable;
  // const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);
  // const configSet = new Set(['comments', 'brackets', 'autoClosingPairs']);
  const configSet = new Set(['comments', 'brackets']);

  languageSet.forEach(async langID => {

    const originalLangID = langID;
    // if langID = 'html.erb' get only the 'erb' part
    langID = langID.replace(/^(.*\.)?(.+)$/m, '$2');
    const thisPath = path.join(context.globalStorageUri.fsPath, 'languageConfigs', `${ langID }-language.json`);

    if (!!thisPath && fs.existsSync(thisPath)) {

       // this is the default language configuration
      let thisLanguageConfig = jsonc.parse(fs.readFileSync(thisPath).toString());
      
      // // delete everything except comments, brackets and autoClosingPairs at present
      // delete everything except comments and brackets at present
      for (const property in thisLanguageConfig) {
        if (!configSet.has(property)) delete thisLanguageConfig[property];
      }

      // The Object.entries() method returns an array of a given object's
      //     own enumerable string-keyed property [key, value] pairs.

      // [
      //   [
      //     "html.erb.comments.blockComment",
      //     [
      //       "<!--",
      //       "-->",
      //     ],
      //   ],
      //   [
      //     "bat.comments.lineComment",
      //     "::",
      //   ],
      // ]

      for (let index = 0; index < settingConfigs.length; index++) {

        let entry = settingConfigs[index];

        const re = /^(.*\.)?(?<lang>.+)\.(?=comments|brackets)(?<prop>.*)/m;

        let found = entry[0].match(re);

        // get 'html.erb' from 'html.erb.comments.lineComment'
        // let found = entry[0].match(/^(.*\.)?(?<lang>.+)\.(?=comments|brackets)/m);
        
        if (!found?.groups || found.groups?.lang !== langID) continue;

        let prop = found.groups?.prop;

        // get 'comments.lineComment' from 'html.erb.comments.lineComment'
        // let prop = entry[0].replace(/^(.+)\.(?=comments|brackets)(.*)$/m, '$2');

        // e.g., prop = "comments.lineComment"
        if (prop.includes('.')) {

          let temp = prop.split('.');

          // need to set BOTH comment:lineComment and comment:blockComment, 
          //   else it is deleted from the configuration!!
          // will overwrite the default config with matching entry in the settings
          if (temp.length === 2 && configSet.has(temp[0])) {
            thisLanguageConfig[temp[0]][temp[1]] = entry[1];
          }
        }
        // this works except for notIn[]
        // else if (configSet.has(prop) && prop === 'autoClosingPairs'){
        //   thisLanguageConfig['autoClosingPairs'] = entry[1];
        // }
        // prop = "brackets[[]] brackets is an array of arrays

        else if (configSet.has(prop)) {
          thisLanguageConfig[prop] = entry[1];
        }
      }

      // use full `html.erb' ere
      disposable = vscode.languages.setLanguageConfiguration( originalLangID, thisLanguageConfig );
      context.subscriptions.push(disposable);
    }
    // else couldn't set config, languageConfigs/${ langID }-language.json doesn't exist
  })
};