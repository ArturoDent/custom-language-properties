const vscode = require('vscode');
// const languageConfigs = require('./languageConfigs');


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

  let disposable;

	// const lineCommentString = languageConfigs.get('comments').lineComment;
	// const currentLanguageConfig = languageConfigs.get('javascript', 'comments');
	// const currentLanguageConfig = languageConfigs.get('javascript', '');
	// const currentLanguageConfig = languageConfigs.get('javascript', 'comments.lineComment');

  const configSet = new Set(['comments', 'brackets', 'indentationRules', 'onEnterRules', 'wordPattern']);
  // console.log(configSet.size);
  // console.log(configSet.has('comments'));

	const settingConfigs = vscode.workspace.getConfiguration('custom-comment-syntax');

	// loop through all languages that appear in the 'custom-comment-syntax' settings

  let languageArray = Object.entries(settingConfigs);
	languageArray = languageArray.filter(current => typeof current[1] !== 'function');
	
	// for (const langID of languageArray) {
	for (let index = 0; index < languageArray.length; index++) {
    const langID = languageArray[index];
		
		// get all language configurations for each language
    // use in completionProvider, not needed in extension.js
		// let thisLanguageConfig = languageConfigs.get(langID[0], '');
    let thisLanguageConfig = {};

		// The Object.entries() method returns an array of a given object's 
		// own enumerable string-keyed property [key, value] pairs.
    let langSettings = Object.entries(settingConfigs.get(String(langID[0])));
    // filter for brackets, comments, indentationRules, onEnterRules, and wordPattern
    

    // for (const prop of langSettings) {
    for (let index = 0; index < langSettings.length; index++) {
      const prop = langSettings[index];      

			// prop = "comments.lineComment" or "brackets.add" or "brackets.remove", etc.
      // can you remove or only add?
      if (prop[0].includes('.')) {
        
        let temp = prop[0].split('.');
        
                          //  Cannot convert undefined or null to object.

        if (temp.length === 2 && configSet.has(temp[0])) {
          // if (!thisLanguageConfig[temp[0]]) {
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

    disposable = vscode.languages.setLanguageConfiguration (
      langID[0],
      thisLanguageConfig
        // {
        //   "comments": { 
        //     "blockComment": ["<#", "#>"], 
        //   }
        // }
      );
    
	  // context.subscriptions.push(disposable);
    
    // console.log(thisLanguageConfig);
    
	}

	disposable = vscode.commands.registerCommand('custom-comments.setNewCommentSyntax', async function () {
	});

	context.subscriptions.push(disposable);

	disposable = vscode.workspace.onDidChangeConfiguration(async (event) => {

		if (event.affectsConfiguration('custom-comment-syntax') ) {

			
		}
	});
	context.subscriptions.push(disposable);

}
// exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
