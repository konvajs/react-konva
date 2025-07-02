const fs = require('fs');
const path = require('path');

const pkg = require('./package.json');
const version = pkg.version;

const targets = [
  path.join(__dirname, 'es', 'ReactKonvaCore.js'),
  path.join(__dirname, 'lib', 'ReactKonvaCore.js'),
];

targets.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    const src = fs.readFileSync(filePath, 'utf8');
    const replaced = src.replace(/\{VERSION\}/g, version);
    fs.writeFileSync(filePath, replaced, 'utf8');
    console.log(`Updated version in ${filePath}`);
  }
});
