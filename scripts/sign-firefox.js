const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { buildFirefox } = require('./build-firefox');

function loadEnvIfPresent() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      return;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  });
}

async function signFirefox() {
  loadEnvIfPresent();
  const { outDir } = await buildFirefox();

  const apiKey = process.env.AMO_JWT_ISSUER;
  const apiSecret = process.env.AMO_JWT_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Missing AMO_JWT_ISSUER or AMO_JWT_SECRET environment variables.');
    process.exit(1);
  }

  const webExtBin = path.join(
    __dirname,
    '..',
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'web-ext.cmd' : 'web-ext'
  );

  const result = spawnSync(
    webExtBin,
    [
      'sign',
      '--source-dir',
      outDir,
      '--channel',
      'unlisted',
      '--api-key',
      apiKey,
      '--api-secret',
      apiSecret
    ],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    }
  );

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error('web-ext is not installed. Run `npm install` to install dev dependencies.');
    } else {
      console.error(result.error.message);
    }
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

signFirefox().catch((err) => {
  console.error(err);
  process.exit(1);
});
