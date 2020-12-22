const vscode = require('vscode');


/**
 * @description - get the settings for 'command aliases'
 * 
 * @returns - an array of settings.json entries for this extension
 */
exports.getCurrentSettings = function (setting) {

	let currentSettings = vscode.workspace.getConfiguration(setting);
	let commandArray = Object.entries(currentSettings);
	// commandArray = commandArray.filter(current => (typeof current[1] === 'string') || (Array.isArray(current[1])));
	commandArray = commandArray.filter(current => {
		// console.log(typeof current[1]);
		return (typeof current[1] !== 'function');
	});

	return commandArray;
};

// "custom-comment-syntax": {
	// "javascript": {
		// "comments.lineComment": "//$$",
			// "comments.blockComment": ["/**", "**/"],
				// "brackets.add": ["<", ">"]
	// },
	// "html": {
		// "blockComment": ["<!--**", "**-->"]
	// }
// }