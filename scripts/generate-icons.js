// Generate PWA icons as PNGs
const fs = require("fs");
const path = require("path");

// Creates a valid minimal PNG with a solid purple color
function createPNG(size) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);  // width
  ihdrData.writeUInt32BE(size, 4);  // height
  ihdrData[8] = 8;   // bit depth
  ihdrData[9] = 2;   // color type (RGB)
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace
  
  const ihdr = createChunk("IHDR", ihdrData);
  
  // IDAT chunk - raw pixel data (purple #7c3aed = 124, 58, 237)
  const rawData = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    rawData[y * (1 + size * 3)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const offset = y * (1 + size * 3) + 1 + x * 3;
      rawData[offset] = 124;     // R
      rawData[offset + 1] = 58;  // G
      rawData[offset + 2] = 237; // B
    }
  }
  
  // Compress with zlib
  const zlib = require("zlib");
  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk("IDAT", compressed);
  
  // IEND chunk
  const iend = createChunk("IEND", Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons
const sizes = [192, 512];
for (const size of sizes) {
  const png = createPNG(size);
  const filepath = path.join(__dirname, "..", "public", `icon-${size}.png`);
  fs.writeFileSync(filepath, png);
  console.log(`✅ icon-${size}.png (${png.length} bytes)`);
}
