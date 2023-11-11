const vscode = require('vscode');
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
        
        if (!vscode.window.activeTextEditor) return undefined;
        
        const curLocation = jsonc.getLocation(document.getText(), document.offsetAt(position));
        const command = curLocation.path[0];
        if (command !== 'custom-language-properties') return undefined;        

				const linePrefix = document.lineAt(position).text.substring(0, position.character);
        
        if (curLocation.isAtPropertyKey && linePrefix.endsWith('"')) return _getCompletionItemsNewLangs();
        
        else if (curLocation.isAtPropertyKey && linePrefix.endsWith('.')) {
          
          let language = "";
          let langNode;
          let args = "";
          let /** @type {string[]} */ found = [];

          // curLocation.path[1] = 'javascript.'
          if (curLocation.path && curLocation.path[1].toString().endsWith('.')) {
            language = curLocation.path[1].toString();
            language = language.substring(0, language.length - 1);
          }
          else return undefined;

          let completionArray = _getCompletionItemsProperties(language, position, extensionContext);

          const rootNode = jsonc.parseTree(document.getText());  
          if (rootNode) langNode = jsonc.findNodeAtLocation(rootNode, ['custom-language-properties']);
          else return completionArray;
          
          if (langNode) {
            args = document.getText(new vscode.Range(document.positionAt(langNode?.offset),
              document.positionAt(langNode?.offset + langNode.length)));
            // @ts-ignore
            found = [...args.matchAll(/^\s*"(?<prop>[^"]+)/gm)];
          }

          // filter out already used properties, even if not saved, like 'comments.lineComment'

          if (found && completionArray) {
            completionArray = completionArray.filter(property => !found.find(config =>
              config[1] === `${ language }.${ property.label }`));
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
 * @returns - an array of vscode.CompletionItem's
 */
async function _getCompletionItemsNewLangs() {

  let langIDArray = await vscode.languages.getLanguages();

  const skipLangs = _getLanguagesToSkip();
  langIDArray = langIDArray.filter(lang => !skipLangs.includes(lang) && !lang.startsWith('csv'));

  return langIDArray.map(lang => new vscode.CompletionItem(lang, vscode.CompletionItemKind.Constant));
}


/**
 * Get all the lang config properties for a given language and
 * make an array of vscode.CompletionItems's
 *
 * @param {string} langID
 * @param {vscode.Position} position
 * @param {vscode.ExtensionContext} context
 * @returns - an array of vscode.CompletionItem's
 */
function _getCompletionItemsProperties(langID, position, context) {

  let completionItemArray = [];
  const langConfigPath = path.join(context.globalStorageUri.fsPath, 'languageProperties', `${ langID }.json`);

  if (fs.existsSync(langConfigPath)) {
    const properties = require(langConfigPath);

    for (const property of Object.entries(properties)) {
      // filter out anything but comments or brackets here
      // if (property[0].replace(/^([^.]*)\..*/m, '$1') === 'comments' || property[0] === "brackets" || property[0] === "autoClosingPairs")
      if (property[0].replace(/^([^.]*)\..*/m, '$1') === 'comments' || property[0] === "brackets")
            completionItemArray.push(makeCompletionItem(property, position));
    }
    return completionItemArray;
  }
}

/**
 * From a string input make a CompletionItemKind.Text
 *
 * @param {string|Array<string>} key
 * @param {vscode.Position} position
 * @returns - CompletionItemKind.Text
 */
function makeCompletionItem(key, position) {

	let item;

  // only from _getCompletionItemsNewLangs() and trigger character '"'
  if (typeof key === 'string') {
    item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Text);
    item.range = new vscode.Range(position, position);
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
    item.range = { inserting: new vscode.Range(position, position), replacing: new vscode.Range(position, new vscode.Position(position.line, position.character + 1)) };
    item.detail = `array : ${ keyStringified }`;
    item.insertText = `${key[0]}": ${ keyStringified }`;
  }

  return item;
}

/**
 * These "languages" will not be indexed for their properties 
 * because they do not have comments, for example.
 * @returns {string[]}
 */
function _getLanguagesToSkip  () {
  return ['code-text-binary', 'bibtex', 'log', 'Log', 'search-result', 'plaintext', 'juliamarkdown', 'scminput', 'properties', 'csv', 'tsv', 'excel'];
}

/**
 * Escape certain values.
 * @param {string} value 
 * @returns {string}
 */
function escape2(value) {
  if (typeof(value) !== "string") return value;
    return value
    .replace(/\\([^"\\|])/g, '\\\\$1')
    .replace(/\\\"/g, '\\\\\\\"')
    .replace(/\\\\\\\|/g, '\\\\\\\\\\\\|')
    .replace(/(?<!\\)"/g, '\\\"')             // an unescaped "
}