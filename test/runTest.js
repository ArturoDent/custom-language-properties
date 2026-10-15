const fs = require('fs');
const path = require('path');
const { runTests } = require('@vscode/test-electron');


// VS Code's own startup logging, not from this extension or the tests. Set TEST_VERBOSE=1 to see it all.
const mainLogLine = /^\[main \d{4}-/;  // main process log, its error lines are kept
const noisyLines = [
  /^\[(RemoteAgentHost|RemoteAgentHostProtocol|AgentHost[^\]]*|ChatModelSelection|AccountPolicyGate|CloudSandboxApi)\]/,
  /^Settings Sync: Account status/,
  /^Unknown channel: agentHost/,
  /^Started local extension host/,
  /^Loading development extension/,
  /DeprecationWarning: `url\.parse\(\)`/,
  /^\(Use `Code --trace-deprecation/
];

/**
 * Drop the noise lines from the test VS Code output, pass everything else through.
 * The built-in Copilot Chat API proposals report is a multi-line block, skipped as a whole.
 * @param {NodeJS.WriteStream} target
 */
function makeOutputFilter(target) {

  let partial = '';
  let inProposalsBlock = false;

  /** @param {string} line */
  const writeLine = line => {
    if (/appears in product\.json but enables LESS API proposals/.test(line)) inProposalsBlock = true;
    if (inProposalsBlock) {
      if (/^Proceeding with EXTRA proposals/.test(line)) inProposalsBlock = false;
      return;
    }
    if (mainLogLine.test(line) && !/error/i.test(line)) return;
    if (noisyLines.some(re => re.test(line))) return;
    target.write(line + '\n');
  };

  return {
    /** @param {Buffer | string} chunk */
    write(chunk) {
      const lines = (partial + chunk.toString()).split(/\r?\n/);
      partial = lines.pop() ?? '';  // last piece has no newline yet
      lines.forEach(writeLine);
      return true;
    },
    flush() {
      if (partial) writeLine(partial);
      partial = '';
    }
  };
}


async function main() {

  const verbose = !!process.env.TEST_VERBOSE;
  const stdout = makeOutputFilter(process.stdout);
  const stderr = makeOutputFilter(process.stderr);

  try {
    // if set, the downloaded Code.exe runs as plain node and rejects every vscode cli flag
    delete process.env.ELECTRON_RUN_AS_NODE;

    const extensionDevelopmentPath = path.resolve(__dirname, '..');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // uses its own user-data directory under .vscode-test, so the real settings are not touched.
    // Start each run from these settings: the built-in chat/agent features only add log noise.
    const userSettingsDir = path.resolve(__dirname, '../.vscode-test/user-data/User');
    fs.mkdirSync(userSettingsDir, { recursive: true });
    fs.writeFileSync(path.join(userSettingsDir, 'settings.json'), JSON.stringify({ 'chat.disableAIFeatures': true }, null, 2));

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['--disable-extensions'],
      // @ts-ignore - only write() is called on these
      ...(verbose ? {} : { stdout, stderr })
    });
  }
  catch (err) {
    console.error('Failed to run tests');
    process.exitCode = 1;
  }
  finally {
    stdout.flush();
    stderr.flush();
  }
}

main();
