const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

const settingsSection = 'custom-language-properties';


suite('language configurations from the settings', function () {

  /** @type {vscode.TextDocument} */
  let document;
  /** @type {vscode.TextEditor} */
  let editor;
  /** @type {{ subscriptionCount: () => number }} */
  let api;


  /**
   * Read a fixture file of a scenario, without its final newline.
   * @param {string} scenario - the fixture folder
   * @param {string} fileName - 'input.js' or 'expected.js'
   * @returns {string}
   */
  function readFixture(scenario, fileName) {
    return fs.readFileSync(path.join(__dirname, scenario, fileName)).toString()
      .replace(/\r\n/g, '\n').replace(/\n$/, '');
  }

  /**
   * Replace the whole shared document with a scenario's input.js, cursor at the end.
   * This is also the reset between tests.
   * @param {string} scenario - the fixture folder
   */
  async function loadFixture(scenario) {

    editor = await vscode.window.showTextDocument(document);

    const wholeDocument = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
    await editor.edit(editBuilder => editBuilder.replace(wholeDocument, readFixture(scenario, 'input.js')));

    const end = document.positionAt(document.getText().length);
    editor.selection = new vscode.Selection(end, end);
  }

  /**
   * Set this extension's settings, in the test instance's own user settings.
   * @param {Object<string, any>|undefined} value - undefined removes the setting
   */
  async function setSettings(value) {
    await vscode.workspace.getConfiguration().update(settingsSection, value, vscode.ConfigurationTarget.Global);
  }

  /**
   * @param {number} ms
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Load a scenario's input.js, run a command and compare the document to its expected.js.
   * Retried until it matches, there is no event for when a changed setting has been applied.
   * @param {string} scenario - the fixture folder
   * @param {string} command
   * @param {any} [args]
   */
  async function expectAfter(scenario, command, args) {

    const expected = readFixture(scenario, 'expected.js');
    const deadline = Date.now() + 5000;
    let actual = '';

    do {
      await loadFixture(scenario);
      await vscode.commands.executeCommand(command, args);
      actual = document.getText().replace(/\r\n/g, '\n');
      if (actual === expected) return;
      await sleep(100);
    } while (Date.now() < deadline);

    assert.strictEqual(actual, expected, `scenario: ${ scenario }`);
  }

  const toggleComment = 'editor.action.commentLine';
  const addedPair = { 'javascript.autoClosingPairs.add': [{ open: '<', close: '>' }] };


  suiteSetup(async function () {

    this.timeout(60000);   // the first activation builds all the language config files

    const extension = vscode.extensions.getExtension('ArturoDent.custom-language-syntax');
    assert.ok(extension, 'extension not found');
    api = await extension.activate();

    document = await vscode.workspace.openTextDocument({ language: 'javascript', content: '' });
    editor = await vscode.window.showTextDocument(document);
  });

  suiteTeardown(async function () {

    await setSettings(undefined);
    await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  });


  test('a custom line comment is used', async function () {

    await setSettings({ 'javascript.comments.lineComment': '//*' });
    await expectAfter('customLineComment', toggleComment);
  });

  test('the latest value is used after each change', async function () {

    await setSettings({ 'javascript.comments.lineComment': '//*' });
    await expectAfter('customLineComment', toggleComment);

    await setSettings({ 'javascript.comments.lineComment': '//!' });
    await expectAfter('changedLineComment', toggleComment);

    await setSettings({ 'javascript.comments.lineComment': '//*' });
    await expectAfter('customLineComment', toggleComment);
  });

  test('the default returns when a language is dropped from the settings', async function () {

    await setSettings({ 'javascript.comments.lineComment': '//*' });
    await expectAfter('customLineComment', toggleComment);

    await setSettings(undefined);
    await expectAfter('defaultLineComment', toggleComment);
  });

  test('an added autoClosingPair closes', async function () {

    await setSettings(addedPair);
    await expectAfter('autoClosingPairAdded', 'type', { text: '<' });
  });

  test('a removed autoClosingPair does not linger', async function () {

    await setSettings(addedPair);
    await expectAfter('autoClosingPairAdded', 'type', { text: '<' });

    await setSettings(undefined);
    await expectAfter('autoClosingPairRemoved', 'type', { text: '<' });
  });

  test('the settings still apply after rebuilding the config files', async function () {

    this.timeout(60000);

    await setSettings({ 'javascript.comments.lineComment': '//*' });
    await expectAfter('customLineComment', toggleComment);

    await vscode.commands.executeCommand('custom-language-syntax.rebuildConfigFiles');
    await expectAfter('customLineComment', toggleComment);
  });

  test('the subscriptions do not grow on configuration changes', async function () {

    await setSettings(undefined);
    await expectAfter('defaultLineComment', toggleComment);
    const before = api.subscriptionCount();

    for (const lineComment of ['//*', '//!', '//*']) {

      // an unrelated setting, the configuration listener still runs for it
      await vscode.workspace.getConfiguration('editor').update('rulers', [80], vscode.ConfigurationTarget.Global);
      await vscode.workspace.getConfiguration('editor').update('rulers', undefined, vscode.ConfigurationTarget.Global);

      await setSettings({ 'javascript.comments.lineComment': lineComment });
      await expectAfter(lineComment === '//*' ? 'customLineComment' : 'changedLineComment', toggleComment);
    }
    await sleep(300);   // let any remaining configuration events arrive

    assert.strictEqual(api.subscriptionCount(), before);
  });
});
