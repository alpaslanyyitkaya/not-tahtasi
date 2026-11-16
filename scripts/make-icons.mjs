// Uygulama simgelerini (PNG) bağımlılıksız üretir: mavi zemin üzerinde beyaz kalem çizgisi.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../app/icons/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
// Normalised (0..1) shapes: a pen body + a handwritten wave underneath.
const wave = Array.from({ length: 41 }, (_, i) => {
  const t = i / 40;
  return [0.22 + t * 0.56, 0.72 + Math.sin(t * Math.PI * 3) * 0.035];
});
function draw(size, inset) {
  const bg = [43, 98, 201];
  const s = size * (1 - inset * 2), o = size * inset;
  return (x, y) => {
    const u = (x - o) / s, v = (y - o) / s;
    let cov = 0;
    const pen = segDist(u, v, 0.70, 0.20, 0.36, 0.54) - 0.065;          // pen body
    const tip = segDist(u, v, 0.36, 0.54, 0.30, 0.60) - 0.03;           // nib
    let w = Infinity;
    for (let i = 1; i < wave.length; i++) w = Math.min(w, segDist(u, v, ...wave[i - 1], ...wave[i]));
    w -= 0.025;
    const d = Math.min(pen, tip, w) * s;
    cov = Math.max(0, Math.min(1, 0.5 - d));
    return [
      Math.round(bg[0] + (255 - bg[0]) * cov),
      Math.round(bg[1] + (255 - bg[1]) * cov),
      Math.round(bg[2] + (255 - bg[2]) * cov),
      255,
    ];
  };
}

writeFileSync(outDir + 'icon-192.png', png(192, draw(192, 0)));
writeFileSync(outDir + 'icon-512.png', png(512, draw(512, 0)));
writeFileSync(outDir + 'icon-maskable-512.png', png(512, draw(512, 0.1)));
console.log('Simgeler yazıldı:', outDir);
