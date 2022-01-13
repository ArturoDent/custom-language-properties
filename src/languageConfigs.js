const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * @description - from the language configuration for the current file
 * @description - get the value of config argument
 *
 * @param {String} langID - the languageID of the desired language configuration
 * @param {String} config - the language configuration to get, e.g., 'comments.lineComment' or 'autoClosingPairs'
 *
 * @returns {any} - string or array or null if can't be found
 */
exports.get = function (langID, config) {

  // const lineCommentString = languageConfigs.get('comments').lineComment;
	// const currentLanguageConfig = languageConfigs.get('javascript', 'comments');
	// const currentLanguageConfig = languageConfigs.get('javascript', '');
	// const currentLanguageConfig = languageConfigs.get('javascript', 'comments.lineComment');

	// if pass in no config ?
	let configArg;

	if (config && config.includes('.')) configArg = config.split('.');
	else configArg = config;

	let desiredConfig = null;  // return null default if can't be found

	// for language of current editor
	// const editor = vscode.window.activeTextEditor;
	// const documentLanguageId = editor.document.languageId;
	var langConfigFilePath = null;

	for (const _ext of vscode.extensions.all) {
		// All vscode default extensions ids starts with "vscode."
		if (
			_ext.id.startsWith("vscode.") &&
			_ext.packageJSON.contributes &&
			_ext.packageJSON.contributes.languages
		) {
			// Find language data from "packageJSON.contributes.languages" for the langID argument
			// don't filter if you want them all
			const packageLangData = _ext.packageJSON.contributes.languages.find(
				_packageLangData => (_packageLangData.id === langID)
			);
			// If found, get the absolute config file path
			if (!!packageLangData) {
				langConfigFilePath = path.join(
					_ext.extensionPath,
					packageLangData.configuration
				);
				break;
			}
		}
	}

	// "c:\\Users\\Mark\\AppData\\Local\\Programs\\Microsoft VS Code Insiders\\resources\\app\\extensions\\javascript\\javascript-language-configuration.json"
	// drill down through config args
	if (!!langConfigFilePath && fs.existsSync(langConfigFilePath)) {

		// the whole language config will be returned if config arg was the empty string ''
    desiredConfig = JSON.parse(fs.readFileSync(langConfigFilePath).toString());

		if (Array.isArray(configArg)) {

			for (let index = 0; index < configArg.length; index++) {
				desiredConfig = desiredConfig[configArg[index] ];
			}
			return desiredConfig;
		}
		// only one arg without a dot, like 'comments' passed in
		else if (config) return JSON.parse(fs.readFileSync(langConfigFilePath).toString())[config];
		else return desiredConfig;

		// desiredConfig = JSON.parse(fs.readFileSync(langConfigFilePath).toString())[`${config[0]}`][`${config[1]}`];
		// desiredConfig = JSON.parse(fs.readFileSync(langConfigFilePath).toString())[`${config[0]}`];
	}
	else return null;
}