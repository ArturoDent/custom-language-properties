const vscode = require('vscode');
const fs = require('fs');
const path = require('path');


/**
 * @description - register a CompletionProvider for settings.json
 * @description - get either all languageIds or language configuration properties for a specific language
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

        // get all text until the current `position` and check if it reads `` before the cursor
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        const linePrefix2 = document.lineAt(position).text.substr(0, position.character-1);

        // do 2 regex'es by context.triggerCharacter
        if (context.triggerCharacter === '"') {
          let regex = /^\s*"/gm;
          if (linePrefix.search(regex) === -1 || linePrefix.includes(':')) {
            return undefined;
          }
        }
        else if (context.triggerCharacter === '.') {
          let regex = /^\s*"\w*\./gm;
          if (linePrefix.search(regex) === -1 || linePrefix2.includes('.')) {
            return undefined;
          }
        }

        // check that cursor position is within "custom-language-properties": { | }, i.e., within our setting

        const fullText = document.getText();
        // const regex = /(?<setting>"custom-language-properties"\s*:\s*{[\s\S]*?\s})/;  // our 'custom-language-properties' setting
        const regex = /(?<setting>^[ \t]*"custom-language-properties"\s*:\s*{[\s\S]*?^\s*})/m;  // our 'custom-language-properties' setting
        const settingMatch = fullText.match(regex);

        if (!settingMatch) return undefined;
        const startPos = document.positionAt(settingMatch.index);  // "custom-language-properties" index
        const endPos   = document.positionAt(settingMatch.index + settingMatch.groups.setting.length);

        const settingRange = new vscode.Range(startPos, endPos);
        if (!settingRange.contains(position)) return undefined;  // not in the 'custom-language-properties' setting

        if (context.triggerCharacter === '"') {
          return getCompletionItemsNewLangs(position);
        }
        else if (context.triggerCharacter === '.') {
          // "javascript.comments.lineComment": "//",
          // "javascript.

          // get the language (word at cursor)
          let langRange = vscode.window.activeTextEditor.document.getWordRangeAtPosition(position);
          let language = vscode.window.activeTextEditor.document.getText(langRange); // returns '"javascript."'
          language = language.substring(1, language.length - 2);

          let completionArray = getCompletionItemsProperties(language, position, extensionContext);

          // let langConfigs;  // must be saved to appear in the get() !
          const langSettings = vscode.workspace.getConfiguration('custom-language-properties');

          // filter out already used properties, like 'comments.lineComment'
          if (langSettings) {
            const langConfigs = Object.keys(langSettings);  // can't do keys() on a null/undefined object
            completionArray = completionArray.filter(property => !langConfigs.find(config => config === `${ language }.${ property.label }`));
            return completionArray;
          }
          return completionArray;
        }

        else if (context.triggerKind === vscode.CompletionTriggerKind.Invoke) {
          return getCompletionItemsNewLangs(position);
        }
      }
    },
    ...['"', '.']    // triggers for intellisense/completion
  );

  extensionContext.subscriptions.push(settingsCompletionProvider);
}


/**
 * @description - get an array of all languageIDs
 *
 * @param {vscode.Position} position
 * @returns - an array of vscode.CompletionItem's
 */
async function getCompletionItemsNewLangs(position) {

  let completionItemArray = [];
  const langIDArray = await vscode.languages.getLanguages();

  for (const langID in langIDArray) {
    completionItemArray.push(makeCompletionItem(langIDArray[langID], position));
  }

  return completionItemArray;
}

/**
 * @description - get all the lang config properties for a given language and
 * @description - make an array of vscode.CompletionItems's
 *
 * @param {string} langID
 * @param {vscode.Position} position
 * @param {vscode.ExtensionContext} extensionContext
 * @returns - an array of vscode.CompletionItem's
 */
function getCompletionItemsProperties(langID, position, extensionContext) {

  let completionItemArray = [];
  const langConfigPath = path.join(extensionContext.extensionPath, 'langProperties', `${ langID }.json`);

  if (fs.existsSync(langConfigPath)) {
    const properties = require(langConfigPath);

    for (const property of Object.entries(properties)) {
      // filter out all but comments/brackets
      if (property[0].replace(/^([^.]*)\..*/m, '$1') === 'comments' || property[0] === "brackets")
            completionItemArray.push(makeCompletionItem(property, position));
    }
    return completionItemArray;
  }
}

/**
 * @description - from a string input make a CompletionItemKind.Text
 *
 * @param {any} key
 * @param {object} position
 * @returns - CompletionItemKind.Text
 */
function makeCompletionItem(key, position) {

	// '    "java'
	let item;

  // only from getCompletionItemsNewLangs() and trigger character '"'
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