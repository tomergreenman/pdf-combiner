// Generates the PWA icon PNGs with zero dependencies (pure Node + zlib).
// Draws a simple "document + merge arrows" mark on a dark slate background.
//
//   node scripts/make-icons.mjs
//
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

// ---- tiny PNG encoder ---------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- drawing ----------------------------------------------------------------
function draw(size, { padding }) {
  const buf = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b, a = 255]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    // simple source-over onto existing pixel
    const br = buf[i], bg = buf[i + 1], bb = buf[i + 2], ba = buf[i + 3];
    const sa = a / 255;
    const outA = sa + (ba / 255) * (1 - sa);
    buf[i] = Math.round((r * sa + br * (ba / 255) * (1 - sa)) / (outA || 1));
    buf[i + 1] = Math.round((g * sa + bg * (ba / 255) * (1 - sa)) / (outA || 1));
    buf[i + 2] = Math.round((b * sa + bb * (ba / 255) * (1 - sa)) / (outA || 1));
    buf[i + 3] = Math.round(outA * 255);
  };

  const BG = [15, 23, 42];
  const PAGE = [248, 250, 252];
  const LINE = [148, 163, 184];
  const ACCENT = [56, 189, 248];

  // background
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, BG);

  const p = Math.round(size * padding);
  const rectW = size - p * 2;
  const rectH = Math.round(rectW * 1.18);
  const rx = p;
  const ry = Math.round((size - rectH) / 2);
  const radius = Math.round(size * 0.06);
  const fold = Math.round(rectW * 0.28);

  const inPage = (x, y) => {
    if (x < rx || y < ry || x >= rx + rectW || y >= ry + rectH) return false;
    // rounded corners (skip top-right, that's the fold)
    const corners = [
      [rx + radius, ry + radius],
      [rx + rectW - radius, ry + rectH - radius],
      [rx + radius, ry + rectH - radius],
    ];
    for (const [cx, cy] of corners) {
      const nearX = Math.abs(x - cx) < radius && (x < cx) === (cx < rx + rectW / 2);
      const nearY = Math.abs(y - cy) < radius && (y < cy) === (cy < ry + rectH / 2);
      if (nearX && nearY && (x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) return false;
    }
    // diagonal fold cut on the top-right
    if (x - rx > rectW - fold && y - ry < fold) {
      if (x - (rx + rectW - fold) > y - ry) return false;
    }
    return true;
  };

  for (let y = ry; y < ry + rectH; y++) {
    for (let x = rx; x < rx + rectW; x++) {
      if (inPage(x, y)) set(x, y, PAGE);
    }
  }

  // fold triangle in accent
  for (let y = ry; y < ry + fold; y++) {
    for (let x = rx + rectW - fold; x < rx + rectW; x++) {
      if (x - (rx + rectW - fold) <= y - ry && x < rx + rectW && y < ry + fold) {
        set(x, y, ACCENT);
      }
    }
  }

  // text lines
  const lineH = Math.max(2, Math.round(size * 0.035));
  const lineX0 = rx + Math.round(rectW * 0.16);
  const lineX1 = rx + Math.round(rectW * 0.84);
  const startY = ry + Math.round(rectH * 0.5);
  for (let n = 0; n < 4; n++) {
    const ly = startY + n * Math.round(rectH * 0.12);
    const x1 = n === 3 ? rx + Math.round(rectW * 0.55) : lineX1;
    for (let y = ly; y < ly + lineH; y++)
      for (let x = lineX0; x < x1; x++) if (inPage(x, y)) set(x, y, LINE);
  }

  // downward merge arrow (accent) over the page top
  const cx = rx + Math.round(rectW * 0.42);
  const arrTop = ry + Math.round(rectH * 0.12);
  const arrBot = ry + Math.round(rectH * 0.4);
  const shaft = Math.max(2, Math.round(size * 0.03));
  for (let y = arrTop; y < arrBot; y++)
    for (let x = cx - shaft; x < cx + shaft; x++) if (inPage(x, y)) set(x, y, ACCENT);
  const head = Math.round(rectW * 0.14);
  for (let k = 0; k < head; k++) {
    for (let x = cx - k; x <= cx + k; x++) {
      const y = arrBot + head - k;
      if (inPage(x, y)) set(x, y, ACCENT);
    }
  }

  return buf;
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { name: 'pwa-192.png', size: 192, padding: 0.16 },
  { name: 'pwa-512.png', size: 512, padding: 0.16 },
  { name: 'maskable-512.png', size: 512, padding: 0.26 }, // extra safe-zone padding
  { name: 'apple-touch-icon.png', size: 180, padding: 0.14 },
];

for (const t of targets) {
  const rgba = draw(t.size, { padding: t.padding });
  writeFileSync(join(OUT_DIR, t.name), encodePng(t.size, t.size, rgba));
  console.log('wrote', t.name);
}
