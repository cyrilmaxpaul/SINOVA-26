# SINOVA'26 — Event Intelligence Platform

A real-time event management app with two flows:

- **Employee (mobile-first):** scan one printed QR → register with ID + Name → get auto-assigned to a team → live dashboard with a personal QR, points, teammates, and Team Championship Rankings.
- **Admin (mobile scanner + desktop standings):** manage teams/games/employees, and during games **scan a winner's personal QR to award points** — standings update live on every screen via Firestore `onSnapshot`.

Built with **React 18 + TypeScript + Vite + Tailwind + Firebase (Firestore + Auth)** — runs on the free Spark plan.

_Powered By Standard Insights._

---

## 1. Prerequisites

- Node 18+ (tested on Node 20)
- A Firebase project (free Spark plan is fine)

## 2. Firebase project setup

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method:** enable **Anonymous** _and_ **Email/Password**.
3. **Firestore Database:** create a database (production mode is fine — rules are provided).
4. **Project settings → General → Your apps →** add a **Web app** and copy the config values.

> No Firebase **Storage** needed — this app runs entirely on the **free Spark plan**. The
> dashboard logo is downscaled in the browser and stored as a small data URI in the
> `settings/app` Firestore doc, so there's no Blaze-plan requirement.

## 3. Configure environment

```bash
cp .env.example .env
```

Fill `.env` with the web config from step 2.5:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com   # can be left blank — Storage is not used
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 4. Install & run

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

## 5. Seed the first admin (and optional demo teams)

The seed scripts use the Firebase **Admin SDK** and need a service account key:

- Firebase Console → **Project settings → Service accounts → Generate new private key**.
- Save the file as `serviceAccountKey.json` in the project root (it's git-ignored).

Then:

```bash
npm run seed:admin     # creates admin@sinova26.com / Sinova2026!  (role: super)
npm run seed:teams     # optional: creates ChatGPT / Claude / DeepSeek / Gemini / Grok
```

Override the admin credentials if you like:

```bash
ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='StrongPass!23' npm run seed:admin
```

> Teams are **admin-created** — you don't need `seed:teams`. You can create teams (name + color) from the admin **Teams** page. **At least one team must exist before employees can register**, since registration auto-assigns to an available team.

## 6. Deploy Firestore rules

```bash
npm i -g firebase-tools
firebase login
firebase use --add            # select your project
firebase deploy --only firestore:rules
```

## 7. Deploy the web app (Firebase Hosting)

```bash
npm run build
firebase deploy --only hosting
```

`firebase.json` includes an SPA rewrite so deep links (e.g. `/employee/register`) work.
You can also deploy the `dist/` folder to Vercel/Netlify — just add the same env vars and an SPA fallback to `index.html`.

---

## The single printed QR code

Print **one** QR code that points to your deployed registration URL:

```
https://<your-domain>/employee/register
```

Any QR generator works (e.g. <https://www.qr-code-generator.com>). Employees scan it →
register → get a team → see their dashboard and personal QR. That personal QR (rendered
in-app) is what admins scan to award points. **No other printed codes are needed.**

---

## How it works

### Roles

`admins/{email}` docs carry a `role`: `super`, `scanner`, or `viewer`.

- **super** — full access (games, teams, employees, branding).
- **scanner** — scanner + dashboards/leaderboard/history.
- **viewer** — dashboards/leaderboard/history (no scanning).

### Team assignment

New registrations are randomly assigned to a team with fewer than 6 members; once every
team has ≥6, assignment overflows up to each team's `maxMembers` (default 7). All writes
happen inside Firestore **transactions** so member counts and points stay consistent.

### Awarding points

On the **Scanner** page, scanning an employee's QR loads their card. Pick an **active**
game (only `status: "active"` games appear), adjust points (pre-filled from the game),
enter time for time-based games (a built-in stopwatch can fill it), add notes, and award.
A single transaction increments the employee's points, the team's points, and writes a
`gameResults` record. The scanner auto-resets after 2 seconds.

## Data model

| Collection    | Key fields |
|---------------|-----------|
| `employees`   | `id`, `name`, `team`, `points`, `registeredAt`, `authUid` |
| `teams`       | `name`, `color`, `members`, `points`, `maxMembers` |
| `games`       | `name`, `defaultPoints`, `isTimeBased`, `timeUnit`, `status`, `createdAt` |
| `gameResults` | `gameId`, `employeeId`, `employeeName`, `team`, `points`, `timeTaken`, `notes`, `awardedAt`, `awardedBy` |
| `admins`      | doc id = email; `email`, `role`, `createdAt` |
| `settings/app`| `eventName`, `logoUrl` |

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed:admin` | Create the first admin (Auth user + Firestore doc) |
| `npm run seed:teams` | Create the 5 demo teams |

## Security notes

The Firestore rules are tuned to let anonymous employees self-register (a constrained
`members`/`points` increment on `teams`) while restricting all other team/game/settings
writes to admins. For a hardened production setup, move point-awarding and registration
into Cloud Functions and tighten the client rules further.
