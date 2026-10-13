const path = require('path');
const { runTests } = require('@vscode/test-electron');


async function main() {

  try {
    // if set, the downloaded Code.exe runs as plain node and rejects every vscode cli flag
    delete process.env.ELECTRON_RUN_AS_NODE;

    const extensionDevelopmentPath = path.resolve(__dirname, '..');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // uses its own user-data directory under .vscode-test, so the real settings are not touched
    await runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs: ['--disable-extensions'] });
  }
  catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();
