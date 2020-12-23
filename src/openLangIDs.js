const vscode = require('vscode');

/**
 *
 * @param {Set} openIDSet
 */
exports.addOpenFiles = function (openIDSet) {

  // on launch this currently gets only the activeTextEditor and no other editors
  // let openDocs = vscode.workspace.textDocuments;

  // for (const doc of openDocs) {
  //   openIDSet.add(doc.languageId);
  // }
  openIDSet.add(vscode.window.activeTextEditor.document.languageId);
};


exports.addNewFileID = function (openIDSet, langID) {
  openIDSet.add(langID);
}