const vscode = require('vscode');


/**
 * @description - would add all open textEditorID's languageID's to the Set
 * @description - but that is not currently possible
 * @param {Set} openIDSet - Set of visited languageID's
 */
exports.addOpenFiles = function (openIDSet) {
  // on launch vscode currently gets **only** the activeTextEditor and no other editors
  // let openDocs = vscode.workspace.textDocuments;
  // for (const doc of openDocs) {
  //   openIDSet.add(doc.languageId);
  // }
  openIDSet.add(vscode.window.activeTextEditor.document.languageId);
};


/**
 * @description - add a just-visited textEditor's languageID to the Set
 *
 * @param {Set} openIDSet - Set of visited languageID's
 * @param {String} langID - a languageID
 */
exports.addNewFileID = function (openIDSet, langID) {
  openIDSet.add(langID);
};


/**
 * @description - add the currentTextEditor languageID to the Set
 * @description - typically called just on start-up, else use addNewFileID()
 *
 * @param {Set} openIDSet - Set of visited languageID's
 */
exports.addCurrentFileID = function (openIDSet) {
   openIDSet.add(vscode.window.activeTextEditor.document.languageId);
};