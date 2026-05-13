const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SOURCE = path.join(PUBLIC_DIR, 'icon-source.svg');

const sizes = [
  { size: 192, name: 'logo192.png' },
  { size: 512, name: 'logo512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

(async () => {
  const svg = fs.readFileSync(SOURCE);
  for (const { size, name } of sizes) {
    const out = path.join(PUBLIC_DIR, name);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log(`wrote ${name} (${size}x${size})`);
  }

  await sharp(svg).resize(32, 32).png().toFile(path.join(PUBLIC_DIR, 'favicon-32.png'));
  await sharp(svg).resize(16, 16).png().toFile(path.join(PUBLIC_DIR, 'favicon-16.png'));
  console.log('done');
})();
