/**
 * Generates a 128x128 solid purple PNG using only Node built-ins (zlib, fs).
 * Run: node scripts/gen-icon.js
 * Output: assets/icon.png
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 table and function for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function writeChunk(out, type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  out.push(len);
  out.push(Buffer.from(type, 'ascii'));
  out.push(data);
  const crcBuf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  out.push(crc);
}

// Purple #7c3aed
const R = 124, G = 58, B = 237;
const W = 128, H = 128;

// Raw scanlines: filter byte 0 (None) + W*3 RGB bytes per row
const raw = Buffer.alloc((1 + W * 3) * H);
let off = 0;
for (let y = 0; y < H; y++) {
  raw[off++] = 0; // filter
  for (let x = 0; x < W; x++) {
    raw[off++] = R;
    raw[off++] = G;
    raw[off++] = B;
  }
}

const compressed = zlib.deflateSync(raw, { level: 9 });

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 2;  // color type RGB
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

const out = [signature];
writeChunk(out, 'IHDR', ihdr);
writeChunk(out, 'IDAT', compressed);
writeChunk(out, 'IEND', Buffer.alloc(0));

const dir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon.png'), Buffer.concat(out));
console.log('Written assets/icon.png (128x128 purple)');
