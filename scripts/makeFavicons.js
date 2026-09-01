/**
 * Generate the raster favicon set from public/favicon.svg so all the icon
 * references in index.html resolve. Run: node scripts/makeFavicons.js
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = resolve(__dirname, "../public");
const svg = readFileSync(resolve(pub, "favicon.svg"));

async function main() {
  await sharp(svg, { density: 384 }).resize(96, 96).png().toFile(resolve(pub, "favicon-96x96.png"));
  console.log("✓ favicon-96x96.png");

  await sharp(svg, { density: 384 }).resize(180, 180).png().toFile(resolve(pub, "apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png");

  const png32 = await sharp(svg, { density: 384 }).resize(32, 32).png().toBuffer();
  const png48 = await sharp(svg, { density: 384 }).resize(48, 48).png().toBuffer();
  const ico = await pngToIco([png32, png48]);
  writeFileSync(resolve(pub, "favicon.ico"), ico);
  console.log("✓ favicon.ico");

  // Web app manifest (referenced by index.html)
  const manifest = {
    name: "SINOVA'26",
    short_name: "SINOVA",
    icons: [
      { src: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    theme_color: "#0b0b12",
    background_color: "#0b0b12",
    display: "standalone",
  };
  writeFileSync(resolve(pub, "site.webmanifest"), JSON.stringify(manifest, null, 2));
  console.log("✓ site.webmanifest");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
