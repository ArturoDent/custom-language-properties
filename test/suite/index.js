const path = require('path');
const Mocha = require('mocha');
const glob = require('glob');


/**
 * Run every *.test.js file under this directory, called by the extension host.
 * @returns {Promise<void>}
 */
function run() {

  const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 20000 });
  const testsRoot = __dirname;

  return new Promise((resolve, reject) => {

    glob('**/*.test.js', { cwd: testsRoot }, (err, files) => {

      if (err) return reject(err);

      files.forEach(file => mocha.addFile(path.resolve(testsRoot, file)));

      try {
        mocha.run(failures => {
          if (failures > 0) reject(new Error(`${ failures } tests failed.`));
          else resolve();
        });
      }
      catch (runError) {
        reject(runError);
      }
    });
  });
}

module.exports = { run };
