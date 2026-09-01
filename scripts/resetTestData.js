/**
 * Reset all event test data while preserving admin login and dashboard appearance.
 *
 * Wipes: gameResults, employees, trades, tradeGuards, attendance, attendanceAwards,
 * screamLevels, screamResults, teams, games, roster — plus resets scream/state.
 *
 * Preserves: admins/admin@sinova26.com, settings/app, settings/background.
 * Does not touch Firebase Auth (anonymous employee sessions stay as-is).
 *
 * Prerequisites: ./serviceAccountKey.json (see seedAdmin.js).
 *
 * Usage:
 *   npm run reset:test-data -- --dry-run     # counts only, no writes
 *   npm run reset:test-data -- --confirm     # perform the reset
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, "../serviceAccountKey.json");

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  console.error(
    `\n✖ Could not read ${keyPath}.\n` +
      "  Download a service account key from Firebase Console → Project settings →\n" +
      "  Service accounts → Generate new private key, and save it as serviceAccountKey.json\n"
  );
  process.exit(1);
}

const KEEP_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@sinova26.com").toLowerCase();

/** Collections wiped entirely (every document deleted). */
const COLLECTIONS_TO_WIPE = [
  "gameResults",
  "employees",
  "trades",
  "tradeGuards",
  "attendance",
  "attendanceAwards",
  "screamLevels",
  "screamResults",
  "teams",
  "games",
  "roster",
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const confirm = args.has("--confirm");

if (!dryRun && !confirm) {
  console.log(`
SINOVA'26 — reset test data

  npm run reset:test-data -- --dry-run    Preview doc counts (safe)
  npm run reset:test-data -- --confirm    Delete test data (destructive)

Preserved: admins/${KEEP_ADMIN_EMAIL}, settings/app, settings/background
`);
  process.exit(0);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const projectId = serviceAccount.project_id;

async function countCollection(col) {
  const snap = await db.collection(col).get();
  return snap.size;
}

async function wipeCollection(col, { execute }) {
  const snap = await db.collection(col).get();
  const total = snap.size;
  if (!execute || total === 0) {
    return total;
  }
  const BATCH = 450;
  for (let i = 0; i < snap.docs.length; i += BATCH) {
    const batch = db.batch();
    for (const d of snap.docs.slice(i, i + BATCH)) {
      batch.delete(d.ref);
    }
    await batch.commit();
  }
  return total;
}

async function resetScreamState({ execute }) {
  const ref = db.collection("scream").doc("state");
  const snap = await ref.get();
  if (!execute) {
    return snap.exists ? 1 : 0;
  }
  await ref.set({ activeTeam: null, recording: false, startedAt: null });
  return snap.exists ? 1 : 0;
}

async function pruneExtraAdmins({ execute }) {
  const snap = await db.collection("admins").get();
  const toDelete = snap.docs.filter((d) => d.id.toLowerCase() !== KEEP_ADMIN_EMAIL);
  if (!execute) {
    return { kept: snap.docs.length - toDelete.length, removed: toDelete.length };
  }
  for (const d of toDelete) {
    await d.ref.delete();
  }
  return { kept: snap.docs.length - toDelete.length, removed: toDelete.length };
}

async function main() {
  console.log(`\nFirebase project: ${projectId}`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "CONFIRM — deleting data"}\n`);

  const counts = {};
  for (const col of COLLECTIONS_TO_WIPE) {
    counts[col] = await countCollection(col);
  }
  const screamStateExists = (await db.collection("scream").doc("state").get()).exists;
  const adminSnap = await db.collection("admins").get();
  const extraAdmins = adminSnap.docs.filter((d) => d.id.toLowerCase() !== KEEP_ADMIN_EMAIL).length;

  console.log("Documents to remove:");
  for (const col of COLLECTIONS_TO_WIPE) {
    console.log(`  ${col.padEnd(20)} ${counts[col]}`);
  }
  console.log(`  ${"scream/state".padEnd(20)} ${screamStateExists ? "reset" : "(missing — will create)"}`);
  if (extraAdmins > 0) {
    console.log(`  ${"admins (extra)".padEnd(20)} ${extraAdmins}`);
  }
  console.log("\nPreserved:");
  console.log(`  admins/${KEEP_ADMIN_EMAIL}`);
  console.log("  settings/app (event name, logo, theme)");
  console.log("  settings/background");

  const totalDocs = Object.values(counts).reduce((a, b) => a + b, 0);
  if (totalDocs === 0 && extraAdmins === 0) {
    console.log("\nNothing to reset — collections are already empty.");
    if (!dryRun) {
      await resetScreamState({ execute: true });
      console.log("✓ scream/state reset to idle");
    }
    process.exit(0);
  }

  if (dryRun) {
    console.log(`\nDry run complete. ${totalDocs} document(s) would be deleted.`);
    console.log("Run with --confirm to apply.\n");
    process.exit(0);
  }

  console.log("\nDeleting…");
  for (const col of COLLECTIONS_TO_WIPE) {
    const n = await wipeCollection(col, { execute: true });
    console.log(`✓ ${col}: deleted ${n}`);
  }

  await resetScreamState({ execute: true });
  console.log("✓ scream/state: reset to idle");

  const { kept, removed } = await pruneExtraAdmins({ execute: true });
  if (removed > 0) {
    console.log(`✓ admins: removed ${removed} extra, kept ${kept}`);
  } else {
    console.log(`✓ admins: kept ${KEEP_ADMIN_EMAIL}`);
  }

  console.log("\nReset complete. Create teams and games from the admin panel when ready.\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
