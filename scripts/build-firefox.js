const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const archiver = require('archiver');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');

function createBuildId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '');
}

async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

async function buildFirefox() {
  const buildId = createBuildId();
  const outDir = path.join(DIST_DIR, `firefox-build-${buildId}`);
  const xpiPath = path.join(DIST_DIR, `gpt-boost-firefox-build-${buildId}.xpi`);

  await fsp.mkdir(outDir, { recursive: true });

  await fsp.copyFile(
    path.join(ROOT, 'manifest_firefox.json'),
    path.join(outDir, 'manifest.json')
  );
  await copyDir(path.join(ROOT, 'src'), path.join(outDir, 'src'));
  await copyDir(path.join(ROOT, 'icons'), path.join(outDir, 'icons'));

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(xpiPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    output.on('error', reject);

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn(err.message);
        return;
      }
      reject(err);
    });
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(outDir, false);
    archive.finalize();
  });

  return { outDir, xpiPath, buildId };
}

if (require.main === module) {
  buildFirefox().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { buildFirefox };
