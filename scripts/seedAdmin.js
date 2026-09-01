/**
 * Seed the first admin.
 *
 * Creates a Firebase Auth email/password user AND the matching
 * `admins/{email}` Firestore doc (role: "super").
 *
 * Prerequisites:
 *   1. Firebase project with Firestore + Email/Password auth enabled.
 *   2. A service account key JSON at ./serviceAccountKey.json
 *      (Firebase Console → Project settings → Service accounts → Generate new private key).
 *
 * Run once:
 *   npm run seed:admin
 *
 * Optional env overrides:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ROLE
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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

const EMAIL = (process.env.ADMIN_EMAIL || "admin@sinova26.com").toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD || "Sinova2026!";
const ROLE = process.env.ADMIN_ROLE || "super";

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

async function main() {
  // 1) Auth user
  let uid;
  try {
    const user = await auth.createUser({ email: EMAIL, password: PASSWORD, emailVerified: true });
    uid = user.uid;
    console.log(`✓ Created auth user ${EMAIL}`);
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      const existing = await auth.getUserByEmail(EMAIL);
      uid = existing.uid;
      await auth.updateUser(uid, { password: PASSWORD });
      console.log(`• Auth user ${EMAIL} already existed — password reset`);
    } else {
      throw e;
    }
  }

  // 2) Firestore admins doc (keyed by email)
  await db.collection("admins").doc(EMAIL).set({
    email: EMAIL,
    role: ROLE,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`✓ Wrote admins/${EMAIL} (role: ${ROLE})`);

  console.log(`\nAdmin ready:\n  email:    ${EMAIL}\n  password: ${PASSWORD}\n`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
