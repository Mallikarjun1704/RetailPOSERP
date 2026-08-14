const fs = require('fs');
const path = require('path');

const srcImagePath = `C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\553ac780-c421-43ee-b4ed-37095ec68c47\\tm_app_logo_1786691969078.png`;

if (!fs.existsSync(srcImagePath)) {
  console.error(`Source logo not found at: ${srcImagePath}`);
  process.exit(1);
}

const pngBuffer = fs.readFileSync(srcImagePath);

// Create ICO header for PNG embedded ICO
// Header: 6 bytes (reserved=0, type=1, count=1)
// Dir entry: 16 bytes (w=0(256), h=0(256), colors=0, res=0, planes=1, bpp=32, size=pngBuffer.length, offset=22)
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // Type: 1 = Icon
header.writeUInt16LE(1, 4); // Count: 1 image

header.writeUInt8(0, 6); // Width: 0 means 256px
header.writeUInt8(0, 7); // Height: 0 means 256px
header.writeUInt8(0, 8); // Color count
header.writeUInt8(0, 9); // Reserved
header.writeUInt16LE(1, 10); // Planes
header.writeUInt16LE(32, 12); // Bits per pixel
header.writeUInt32LE(pngBuffer.length, 14); // Image size in bytes
header.writeUInt32LE(22, 18); // Offset to image data

const icoBuffer = Buffer.concat([header, pngBuffer]);

// Target directories
const dirsToCreate = [
  path.join(__dirname, '../build'),
  path.join(__dirname, '../electron'),
  path.join(__dirname, '../frontend/public'),
  path.join(__dirname, '../frontend/src/assets')
];

dirsToCreate.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Write PNG files
fs.writeFileSync(path.join(__dirname, '../build/icon.png'), pngBuffer);
fs.writeFileSync(path.join(__dirname, '../electron/icon.png'), pngBuffer);
fs.writeFileSync(path.join(__dirname, '../frontend/public/logo.png'), pngBuffer);
fs.writeFileSync(path.join(__dirname, '../frontend/public/favicon.png'), pngBuffer);
fs.writeFileSync(path.join(__dirname, '../frontend/src/assets/tm_logo.png'), pngBuffer);

// Write ICO files
fs.writeFileSync(path.join(__dirname, '../build/icon.ico'), icoBuffer);
fs.writeFileSync(path.join(__dirname, '../electron/icon.ico'), icoBuffer);
fs.writeFileSync(path.join(__dirname, '../frontend/public/favicon.ico'), icoBuffer);

console.log('Successfully generated all TM logo icons (PNG and ICO) across build, electron, and frontend directories!');
