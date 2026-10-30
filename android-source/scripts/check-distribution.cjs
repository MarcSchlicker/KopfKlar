const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const pkg = JSON.parse(read('package.json'));
const gradle = read('android/app/build.gradle');
const version = gradle.match(/versionName "([^"]+)"/)[1];
const code = gradle.match(/versionCode (\d+)/)[1];
assert.equal(pkg.version, version, 'Android/npm version mismatch');
for (const locale of ['de-DE', 'en-US']) {
  const base = `fastlane/metadata/android/${locale}`;
  for (const [file, limit] of [['title.txt', 50], ['short_description.txt', 80], ['full_description.txt', 4000], [`changelogs/${code}.txt`, 500]]) {
    const value = read(`${base}/${file}`).trim();
    assert(value.length > 0 && [...value].length <= limit, `${locale}/${file}: empty or over ${limit} characters`);
  }
}
for (const font of ['dm-sans', 'manrope']) {
  const source = read(`node_modules/@fontsource-variable/${font}/LICENSE`);
  for (const destination of ['public', 'android-web/public']) {
    assert.equal(read(`${destination}/licenses/${font}-OFL.txt`), source, `Outdated ${font} license`);
  }
}
assert(!/fonts\.(googleapis|gstatic)\.com/.test(read('app/globals.css')), 'External font service in source CSS');
if (process.argv.includes('--android-web')) {
  const base = path.join(root, 'android-web/dist');
  const files = fs.readdirSync(base, { recursive: true }).filter(file => fs.statSync(path.join(base, file)).isFile());
  assert(files.some(file => file.endsWith('.woff2')), 'Font binaries missing from Android bundle');
  for (const file of files.filter(file => /\.(css|html|js)$/.test(file))) {
    assert(!/fonts\.(googleapis|gstatic)\.com/.test(fs.readFileSync(path.join(base, file), 'utf8')), `External font service in ${file}`);
  }
  for (const font of ['dm-sans', 'manrope']) assert(fs.existsSync(path.join(base, 'licenses', `${font}-OFL.txt`)), 'Bundled font license missing');
}
console.log(`Preparation checked: de.kopfklar.app ${version} (${code}), DE/EN descriptions and local fonts.`);
console.log('Not an F-Droid approval: public source, free-software license, asset rights, build review, signing and device acceptance remain separate.');
