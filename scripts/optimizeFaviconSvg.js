/**
 * Replace the heavy public/favicon.svg with a lightweight SVG that embeds a
 * downscaled 128px PNG of the logo. Source: the 512px manifest icon.
 * Run: node scripts/optimizeFaviconSvg.js
 */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = resolve(__dirname, "../public");

async function main() {
  const src = resolve(pub, "web-app-manifest-512x512.png");
  const png = await sharp(readFileSync(src)).resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer();
  const b64 = png.toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><image width="128" height="128" href="data:image/png;base64,${b64}"/></svg>\n`;
  const out = resolve(pub, "favicon.svg");
  const before = statSync(out).size;
  writeFileSync(out, svg);
  console.log(`✓ favicon.svg: ${(before / 1024).toFixed(0)} KB -> ${(svg.length / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
