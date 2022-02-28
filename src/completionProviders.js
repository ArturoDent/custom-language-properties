const vscode = require('vscode');
const makeFiles = require('./getLanguageFiles');

const fs = require('fs');
const path = require('path');
const jsonc = require('jsonc-parser');


/**
 * Register a CompletionProvider for settings.json
 * Get either all languageIds or language configuration properties for a specific language
 *
 * @param {vscode.ExtensionContext} extensionContext
 * @returns a CompletionProvider
 */
exports.makeSettingsCompletionProvider = function(extensionContext) {
  const settingsCompletionProvider = vscode.languages.registerCompletionItemProvider (
    { pattern: '**/settings.json' },
    {
                        // eslint-disable-next-line no-unused-vars
      async provideCompletionItems(document, position, token, context) {

            //   "custom-language-properties": {
            //     "javascript.comments.lineComment": "//",
            //     "javascript.indentationRules.javascript": "^}}((?!\\/\\/).)*(\\{[^}\"'`]*|\\([^)\"'`}}}]*|\\[[^\\]\"'`]*)$",
            //     "html.indentationRules.html": "^((?!\\/\\/).)*(\\{[^}\"'`]*|\\([^)\"'`}}}]*|\\[[^\\]\"'`]*)$"
            //  },

        const rootNode = jsonc.parseTree(document.getText());
        const curLocation = jsonc.getLocation(document.getText(), document.offsetAt(position));
        const command = curLocation.path[0];

        if (command !== 'custom-language-properties') return undefined;

        if (curLocation.isAtPropertyKey && context.triggerCharacter === '"') {
          return _getCompletionItemsNewLangs(position);
				}
        else if (curLocation.isAtPropertyKey && context.triggerCharacter === '.') {

          // curLocation.path[1] = 'javascript.'
          // get the language (word at cursor)
          let langRange = vscode.window.activeTextEditor.document.getWordRangeAtPosition(position);
          let language = vscode.window.activeTextEditor.document.getText(langRange); // returns '"javascript."'
          language = language.substring(1, language.length - 2);

          let completionArray = _getCompletionItemsProperties(language, position, extensionContext);

          // must be saved to appear in the get() !
          const langSettings = vscode.workspace.getConfiguration('custom-language-properties');

          // filter out already used properties, like 'comments.lineComment'
          if (langSettings) {
            const langConfigs = Object.keys(langSettings);  // can't do keys() on a null/undefined object
            completionArray = completionArray.filter(property => !langConfigs.find(config => config === `${ language }.${ property.label }`));
            return completionArray;
          }
          return completionArray;
        }
      }
    },
    ...['"', '.']    // triggers for intellisense/completion
  );

  extensionContext.subscriptions.push(settingsCompletionProvider);
}


/**
 * Get an array of all languageIDs
 *
 * @param {vscode.Position} position
 * @returns - an array of vscode.CompletionItem's
 */
async function _getCompletionItemsNewLangs(position) {

  let completionItemArray = [];
  let langIDArray = await vscode.languages.getLanguages();

  const skipLangs = makeFiles.getLanguagesToSkip();
  langIDArray = langIDArray.filter(lang => !skipLangs.includes(lang));

  for (const langID in langIDArray) {
    completionItemArray.push(makeCompletionItem(langIDArray[langID], position));
  }

  return completionItemArray;
}


/**
 * Get all the lang config properties for a given language and
 * make an array of vscode.CompletionItems's
 *
 * @param {string} langID
 * @param {vscode.Position} position
 * @param {vscode.ExtensionContext} extensionContext
 * @returns - an array of vscode.CompletionItem's
 */
function _getCompletionItemsProperties(langID, position, context) {

  let completionItemArray = [];
  // const langConfigPath = path.join(extensionContext.extensionPath, 'langProperties', `${ langID }.json`);
  const langConfigPath = path.join(context.globalStorageUri.fsPath, 'languageProperties', `${ langID }.json`);


  if (fs.existsSync(langConfigPath)) {
    const properties = require(langConfigPath);

    for (const property of Object.entries(properties)) {
      // filter out aets
      if (property[0].replace(/^([^.]*)\..*/m, '$1') === 'comments' || property[0] === "brackets")
            completionItemArray.push(makeCompletionItem(property, position));
    }
    return completionItemArray;
  }
}

/**
 * From a string input make a CompletionItemKind.Text
 *
 * @param {any} key
 * @param {object} position
 * @returns - CompletionItemKind.Text
 */
function makeCompletionItem(key, position) {

	// '    "java'
	let item;

  // only from _getCompletionItemsNewLangs() and trigger character '"'
  if (typeof key === 'string') {
    item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Text);
    item.range = new vscode.Range(position, position);
    // let numReplace = vscode.window.activeTextEditor.document.lineAt(position).text.replace(/^\s*"(\w*)/m, '$1').length;
    // item.range = { inserting: new vscode.Range(position, position), replacing: new vscode.Range(new vscode.Position(position.number, position.character - numReplace + 1), position) };
  }
  else if (typeof key[1] === 'string') {
    item = new vscode.CompletionItem(key[0], vscode.CompletionItemKind.Value);
    item.range = new vscode.Range(position, position);
    item.detail = `string : "${escape2(key[1])}"`;
    item.insertText = `${key[0]}": "${escape2(key[1])}`;
  }
  else {  // Array.isArray(key[1]) === true, brackets/blockComment
    item = new vscode.CompletionItem(key[0], vscode.CompletionItemKind.Value);
    let keyStringified = JSON.stringify(key[1]);
    // item.range = { inserting: new vscode.Range(position, position), replacing: new vscode.Range(position, new vscode.Position(position.number, position.character + 1)) };
    item.range = { inserting: new vscode.Range(position, position), replacing: new vscode.Range(position, new vscode.Position(position.line, position.character + 1)) };
    item.detail = `array : ${ keyStringified }`;
    item.insertText = `${key[0]}": ${ keyStringified }`;
  }
  return item;
}

function escape2(value) {
  if (typeof(value) !== "string") return value;
    return value
    .replace(/\\([^"\\|])/g, '\\\\$1')
    .replace(/\\\"/g, '\\\\\\\"')
    .replace(/\\\\\\\|/g, '\\\\\\\\\\\\|')
    .replace(/(?<!\\)"/g, '\\\"')             // an unescaped "
}