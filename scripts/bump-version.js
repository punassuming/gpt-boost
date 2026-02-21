const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = ['package.json', 'manifest.json', 'manifest_firefox.json'];
const BUMP = process.argv[2];
const DRY_RUN = process.argv.includes('--dry-run');
const VALID_BUMPS = new Set(['patch', 'minor', 'major']);

function parseVersion(value) {
  const match = String(value).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported version format: ${value}`);
  }
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function bumpVersion(version, bumpType) {
  if (bumpType === 'major') {
    return { major: version.major + 1, minor: 0, patch: 0 };
  }
  if (bumpType === 'minor') {
    return { major: version.major, minor: version.minor + 1, patch: 0 };
  }
  return { major: version.major, minor: version.minor, patch: version.patch + 1 };
}

function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function main() {
  if (!VALID_BUMPS.has(BUMP)) {
    console.error('Usage: node scripts/bump-version.js <patch|minor|major>');
    process.exit(1);
  }

  const docs = FILES.map((file) => {
    const fullPath = path.join(ROOT, file);
    return {
      file,
      fullPath,
      json: JSON.parse(fs.readFileSync(fullPath, 'utf8'))
    };
  });

  const parsed = docs.map((doc) => ({ file: doc.file, version: parseVersion(doc.json.version), text: doc.json.version }));
  const distinct = [...new Set(parsed.map((p) => p.text))];
  if (distinct.length !== 1) {
    console.warn('Version mismatch detected before bump; normalizing in lock-step:');
    for (const item of parsed) {
      console.warn(`${item.file}: ${item.text}`);
    }
  }

  const base = parsed.reduce((max, item) => (compareVersions(item.version, max) > 0 ? item.version : max), parsed[0].version);
  const currentText = formatVersion(base);
  const next = bumpVersion(base, BUMP);
  const nextText = formatVersion(next);

  for (const doc of docs) {
    doc.json.version = nextText;
    if (!DRY_RUN) {
      fs.writeFileSync(doc.fullPath, `${JSON.stringify(doc.json, null, 2)}\n`, 'utf8');
    }
  }

  console.log(`${DRY_RUN ? 'Would bump' : 'Bumped'} version ${currentText} -> ${nextText} (${BUMP})`);
}

main();
