const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const AMO_CREDENTIALS_URL = 'https://addons.mozilla.org/en-US/developers/addon/api/key/';
const ENV_PATH = path.join(__dirname, '..', '.env');

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  if (result.error) {
    return false;
  }
  return result.status === 0 || result.status === null;
}

function openWithFirefox(url) {
  const firefoxBin = process.env.FIREFOX_BIN;
  if (!firefoxBin) {
    return false;
  }
  return run(firefoxBin, [url]);
}

function openWithDefaultBrowser(url) {
  switch (process.platform) {
    case 'win32':
      return run('cmd', ['/c', 'start', '', url], { windowsVerbatimArguments: true });
    case 'darwin':
      return run('open', [url]);
    default:
      return run('xdg-open', [url]);
  }
}

function ask(question, { silent = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    if (silent) {
      rl.stdoutMuted = true;
      rl._writeToOutput = function _writeToOutput(stringToWrite) {
        if (rl.stdoutMuted) {
          rl.output.write('*');
        } else {
          rl.output.write(stringToWrite);
        }
      };
    }

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function saveEnvFile(apiKey, apiSecret) {
  const content = [
    'AMO_JWT_ISSUER=' + apiKey,
    'AMO_JWT_SECRET=' + apiSecret,
    ''
  ].join('\n');
  fs.writeFileSync(ENV_PATH, content, { encoding: 'utf8' });
}

async function main() {
  const opened = openWithFirefox(AMO_CREDENTIALS_URL) || openWithDefaultBrowser(AMO_CREDENTIALS_URL);

  if (!opened) {
    console.error('Failed to open a browser. Please visit:');
    console.error(AMO_CREDENTIALS_URL);
  }

  const apiKey = await ask('AMO JWT Issuer: ');
  const apiSecret = await ask('AMO JWT Secret (input hidden): ', { silent: true });
  console.log('');

  if (!apiKey || !apiSecret) {
    console.error('Both AMO JWT Issuer and Secret are required.');
    process.exit(1);
  }

  await saveEnvFile(apiKey, apiSecret);
  console.log(`Saved credentials to ${ENV_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
