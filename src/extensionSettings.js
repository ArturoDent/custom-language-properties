const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const jsonc = require('jsonc-parser');

let languagesInSettingsSet = new Set(); // currently in the settings
let previousLanguagesInSettingsSet = new Set(); // previously in the settings before change to configuration
let droppedLanguages = new Set();   // languages dropped on new configuration
let configDisposables = new Map();  // langID -> its current setLanguageConfiguration() disposable


// the language configuration properties that can currently be used in the settings
const supportedProperties = ['comments', 'brackets', 'autoClosingPairs'];


/**
 * Convert autoClosingPairs from the language-configuration.json form to the vscode api form:
 * ["(", ")"] => {open, close} and notIn: ["string"] => [vscode.SyntaxTokenType.String]
 * @param {any} pairs - the 'autoClosingPairs' value from the settings
 * @returns {vscode.AutoClosingPair[]}
 */
function _normalizeAutoClosingPairs(pairs) {

  if (!Array.isArray(pairs)) return [];

  const tokenTypes = new Map([
    ['string', vscode.SyntaxTokenType.String],
    ['comment', vscode.SyntaxTokenType.Comment],
    ['regex', vscode.SyntaxTokenType.RegEx]
  ]);

  /** @type {vscode.AutoClosingPair[]} */
  const normalized = [];

  for (const pair of pairs) {

    if (Array.isArray(pair)) {
      if (typeof pair[0] === 'string'  &&  typeof pair[1] === 'string') normalized.push({ open: pair[0], close: pair[1] });
      continue;
    }
    if (typeof pair?.open !== 'string'  ||  typeof pair?.close !== 'string') continue;

    /** @type {vscode.AutoClosingPair} */
    const thisPair = { open: pair.open, close: pair.close };

    if (Array.isArray(pair.notIn)) {
      thisPair.notIn = [];
      for (const token of pair.notIn) {
        const tokenType = tokenTypes.get(String(token).toLowerCase());
        if (tokenType !== undefined) thisPair.notIn.push(tokenType);
      }
    }
    normalized.push(thisPair);
  }
  return normalized;
}


/**
 * Convert any mix of ["(", ")"] and {open, close} pairs to [open, close] tuples.
 * @param {any} pairs - a 'brackets' value, or a '.add'/'.remove' value from the settings
 * @returns {[string, string][]}
 */
function _toPairTuples(pairs) {

  if (!Array.isArray(pairs)) return [];

  /** @type {[string, string][]} */
  const tuples = [];

  for (const pair of pairs) {

    if (Array.isArray(pair)) {
      if (typeof pair[0] === 'string'  &&  typeof pair[1] === 'string') tuples.push([pair[0], pair[1]]);
    }
    else if (typeof pair?.open === 'string'  &&  typeof pair?.close === 'string') tuples.push([pair.open, pair.close]);
  }
  return tuples;
}


/**
 * Remove the pairs in a '.remove' setting from a list, matching on the open and close characters only.
 * @template T
 * @param {T[]} list - brackets tuples or autoClosingPairs objects
 * @param {any} toRemove - the '.remove' value from the settings
 * @param {(pair: T) => string[]} getOpenClose - returns [open, close] for a member of the list
 * @returns {T[]}
 */
function _removePairs(list, toRemove, getOpenClose) {

  const removeTuples = _toPairTuples(toRemove);

  return list.filter(pair => {
    const [open, close] = getOpenClose(pair);
    return !removeTuples.some(remove => remove[0] === open  &&  remove[1] === close);
  });
}


/**
 * Append the pairs in a 'brackets.add' setting, skipping any pair already in the list.
 * @param {[string, string][]} list
 * @param {any} toAdd - the 'brackets.add' value from the settings
 * @returns {[string, string][]}
 */
function _addBrackets(list, toAdd) {

  const brackets = [...list];

  for (const pair of _toPairTuples(toAdd)) {
    if (!brackets.some(bracket => bracket[0] === pair[0]  &&  bracket[1] === pair[1])) brackets.push(pair);
  }
  return brackets;
}


/**
 * Append the pairs in an 'autoClosingPairs.add' setting.
 * A pair with the same 'open' as one already in the list replaces it, so its 'notIn' can be changed.
 * @param {vscode.AutoClosingPair[]} list
 * @param {any} toAdd - the 'autoClosingPairs.add' value from the settings
 * @returns {vscode.AutoClosingPair[]}
 */
function _addAutoClosingPairs(list, toAdd) {

  const autoClosingPairs = [...list];

  for (const pair of _normalizeAutoClosingPairs(toAdd)) {
    const index = autoClosingPairs.findIndex(existing => existing.open === pair.open);
    if (index === -1) autoClosingPairs.push(pair);
    else autoClosingPairs[index] = pair;
  }
  return autoClosingPairs;
}


/**
 * Main driver: Get the current settings and update the configs for current and dropped languages.
 * @param {vscode.ExtensionContext} context 
 */
exports.getSettingsAndSetConfigs = async function (context) {
  
  let settingConfigs = await _load();

  // start fresh, else a language removed from the settings is never seen as dropped
  languagesInSettingsSet.clear();

  // loop through all languages that appear in the 'custom-language-properties' settings
  // and add to the languagesInSettingsSet

  const languageRE = new RegExp(`^(.*?)\\.(?=${ supportedProperties.join('|') })`, 'm');

  for (const langObject of Object.values(settingConfigs)) {

    const language = langObject[0].match(languageRE);
    if (language) languagesInSettingsSet.add(language[1]);
  }

  // compare the previousLanguagesInSettingsSet to languagesInSettingsSet
  // updates droppedLanguages Set and sets their configs to the default state
  _updateDroppedLanguages();
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
 * Remove the configs for any languages dropped from the settings configuration.
 */
function _updateDroppedLanguages  () {
  
  droppedLanguages.clear();
  previousLanguagesInSettingsSet.forEach(prevLang => {
      if (!languagesInSettingsSet.has(prevLang)) droppedLanguages.add(prevLang);
    });

  // disposing a language's configuration restores its default configuration
  droppedLanguages.forEach(droppedLang => {
    configDisposables.get(droppedLang)?.dispose();
    configDisposables.delete(droppedLang);
  });
}


/**
 * Dispose all the current setLanguageConfiguration() disposables, on deactivation.
 */
exports.disposeConfigs = function () {

  configDisposables.forEach(disposable => disposable.dispose());
  configDisposables.clear();
}


/**
 * SetLanguageConfiguration() for the given languageID's.
 *
 * @param {[string, any][]} settingConfigs - this extension's settings
 * @param {vscode.ExtensionContext} context
 * @param {Set<string>} languageSet - an array of languageID's
 */
async function _setConfig (settingConfigs, context, languageSet) {

  let disposable;
  // const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);
  // these are kept from the default configuration, autoClosingPairs is only set if it is in the settings
  const configSet = new Set(['comments', 'brackets']);
  const re = new RegExp(`^(.*\\.)?(?<lang>.+)\\.(?=${ supportedProperties.join('|') })(?<prop>.*)`, 'm');

  languageSet.forEach(async langID => {

    const originalLangID = langID;
    // if langID = 'html.erb' get only the 'erb' part
    langID = langID.replace(/^(.*\.)?(.+)$/m, '$2');
    const thisPath = path.join(context.globalStorageUri.fsPath, 'languageConfigs', `${ langID }-language.json`);

    if (!!thisPath  &&  fs.existsSync(thisPath)) {

       // this is the default language configuration
      let thisLanguageConfig = jsonc.parse(fs.readFileSync(thisPath).toString());

      // kept for 'autoClosingPairs.add' and 'autoClosingPairs.remove', which edit the default list
      const defaultAutoClosingPairs = thisLanguageConfig.autoClosingPairs;

      // 'brackets' and 'autoClosingPairs' settings: replace = the plain key, add/remove = the suffix keys
      /** @type {Object<string, {replace?: any, add?: any, remove?: any}>} */
      const listEdits = { brackets: {}, autoClosingPairs: {} };

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

        let found = entry[0].match(re);

        // get 'html.erb' from 'html.erb.comments.lineComment'
        // let found = entry[0].match(/^(.*\.)?(?<lang>.+)\.(?=comments|brackets)/m);
        
        if (!found?.groups  ||  found.groups?.lang !== langID) continue;

        let prop = found.groups?.prop;

        // get 'comments.lineComment' from 'html.erb.comments.lineComment'
        // let prop = entry[0].replace(/^(.+)\.(?=comments|brackets)(.*)$/m, '$2');

        // e.g., prop = "comments.lineComment"
        if (prop.includes('.')) {

          let temp = prop.split('.');

          // need to set BOTH comment:lineComment and comment:blockComment, 
          //   else it is deleted from the configuration!!
          // will overwrite the default config with matching entry in the settings
          // e.g., prop = "brackets.add" or "autoClosingPairs.remove", applied after this loop
          if (temp.length === 2  &&  listEdits[temp[0]]  &&  (temp[1] === 'add'  ||  temp[1] === 'remove')) {
            listEdits[temp[0]][temp[1]] = entry[1];
          }
          else if (temp.length === 2  &&  configSet.has(temp[0])) {
            thisLanguageConfig[temp[0]][temp[1]] = entry[1];
          }
        }
        // prop = "brackets" or "autoClosingPairs", replaces the whole default list, applied after this loop
        else if (listEdits[prop]) {
          listEdits[prop].replace = entry[1];
        }
        else if (configSet.has(prop)) {
          thisLanguageConfig[prop] = entry[1];
        }
      }

      // brackets is an array of arrays, the setting alone is used as is
      const bracketEdits = listEdits.brackets;

      if (bracketEdits.add !== undefined  ||  bracketEdits.remove !== undefined) {
        let brackets = _toPairTuples(bracketEdits.replace !== undefined ? bracketEdits.replace : thisLanguageConfig.brackets);
        brackets = _removePairs(brackets, bracketEdits.remove, pair => pair);
        thisLanguageConfig.brackets = _addBrackets(brackets, bracketEdits.add);
      }
      else if (bracketEdits.replace !== undefined) thisLanguageConfig.brackets = bracketEdits.replace;

      // autoClosingPairs is an array of objects, converted to the form the vscode api needs
      // it is only set if it is in the settings in some form
      const pairEdits = listEdits.autoClosingPairs;

      if (pairEdits.replace !== undefined  ||  pairEdits.add !== undefined  ||  pairEdits.remove !== undefined) {
        let autoClosingPairs = _normalizeAutoClosingPairs(pairEdits.replace !== undefined ? pairEdits.replace : defaultAutoClosingPairs);
        autoClosingPairs = _removePairs(autoClosingPairs, pairEdits.remove, pair => [pair.open, pair.close]);
        thisLanguageConfig.autoClosingPairs = _addAutoClosingPairs(autoClosingPairs, pairEdits.add);
      }

      // remove this language's previous configuration, else a removed property (like autoClosingPairs) lingers
      configDisposables.get(originalLangID)?.dispose();

      // use full `html.erb' ere
      disposable = vscode.languages.setLanguageConfiguration( originalLangID, thisLanguageConfig );
      // not pushed to context.subscriptions, which would keep every replaced disposable, see disposeConfigs()
      configDisposables.set(originalLangID, disposable);
    }
    // else couldn't set config, languageConfigs/${ langID }-language.json doesn't exist
  })
};