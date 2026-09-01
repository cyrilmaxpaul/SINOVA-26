/**
 * Optional quick-start: create the 5 AI-themed teams so a demo works immediately.
 * Teams are otherwise created by admins in the Teams page.
 *
 * Run: npm run seed:teams
 * Requires ./serviceAccountKey.json (see seedAdmin.js).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(resolve(__dirname, "../serviceAccountKey.json"), "utf8")
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TEAMS = [
  { name: "ChatGPT", color: "green" },
  { name: "Claude", color: "purple" },
  { name: "DeepSeek", color: "blue" },
  { name: "Gemini", color: "teal" },
  { name: "Grok", color: "orange" },
];

async function main() {
  const existing = await db.collection("teams").get();
  const existingNames = new Set(existing.docs.map((d) => d.data().name));

  for (const t of TEAMS) {
    if (existingNames.has(t.name)) {
      console.log(`• ${t.name} already exists — skipping`);
      continue;
    }
    await db.collection("teams").add({
      name: t.name,
      color: t.color,
      members: 0,
      points: 0,
      maxMembers: 7,
    });
    console.log(`✓ Created team ${t.name}`);
  }
  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
