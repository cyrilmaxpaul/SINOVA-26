/**
 * Generate the printable event QR code as PNG + SVG.
 * Usage:
 *   node scripts/makeQR.js                       -> defaults to the landing page
 *   node scripts/makeQR.js https://foo/register  -> custom URL
 * Output: qr-codes/sinova26-qr.png and .svg
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import QRCode from "qrcode";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../qr-codes");
mkdirSync(outDir, { recursive: true });

const url = process.argv[2] || "https://sinova26.web.app/";

const opts = { errorCorrectionLevel: "M", margin: 2, width: 1200, color: { dark: "#0b0b12", light: "#ffffff" } };

QRCode.toFile(resolve(outDir, "sinova26-qr.png"), url, opts, (err) => {
  if (err) throw err;
  console.log(`✓ PNG  -> qr-codes/sinova26-qr.png  (${url})`);
});
QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2 }, (err, svg) => {
  if (err) throw err;
  writeFileSync(resolve(outDir, "sinova26-qr.svg"), svg);
  console.log(`✓ SVG  -> qr-codes/sinova26-qr.svg   (${url})`);
});
