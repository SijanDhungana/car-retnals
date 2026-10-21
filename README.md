# Fleet Rentals — Staff Console

An internal car rental management tool. Staff sign in and manage the fleet's
bookings, odometer readings, km-overage billing and availability. There is no
public-facing side and no customer signup — every route requires a session.

Built as a single Next.js (App Router) project so it deploys to Vercel as one
unit, backed by Neon Postgres.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Database: migrations and seeding](#database-migrations-and-seeding)
- [Deploying to Vercel + Neon](#deploying-to-vercel--neon)
- [How the billing rules work](#how-the-billing-rules-work)
- [How double-booking is prevented](#how-double-booking-is-prevented)
- [Project structure](#project-structure)
- [Tests](#tests)

---

## Features

| Page | What it does |
| --- | --- |
| **Login** (`/login`) | Email + password for staff. No signup route exists. |
| **Dashboard** (`/dashboard`) | Which cars are out right now, which are free today, what's coming up next. |
| **Bookings** (`/bookings`) | Create, edit, delete. Filter by status and by car. |
| **Booking detail** (`/bookings/[id]`) | Full km/charge breakdown and one-click status changes. |
| **Calendar** (`/calendar`) | Month grid of every booking, filterable by car, colour-coded by status. |
| **Availability** (`/availability`) | Pick a date range, see which of the 6 cars are free vs taken. |

The fleet is a fixed list of six vehicles, inserted by the seed script:

- Yellow Lamborghini Urus
- Black Lamborghini Urus
- Mercedes CLS 53 AMG
- BMW 330i M Sport
- BMW M340i
- Hyundai Elantra

### Food call system (public, no login)

A stand-in for the broken kitchen call button. Anyone with the link can use it.

| Page | Who uses it |
| --- | --- |
| `/food/send` | Downstairs kitchen: pick an item, how many, optional name, **Send** — or switch to **Message** to type a custom note that is read out. |
| `/food/receive` | Upstairs: shows the last 16 hours of orders and reads each new one out loud (tap **Turn on sound** once after opening). |

The item buttons are the Savory section of the Craves menu; edit them in
`src/lib/food.ts` (`FOOD_MENU`). Orders are stored in
the `food_orders` table (migration `drizzle/0002_food_orders.sql`, applied
automatically on deploy).

---

## Tech stack

- **Next.js 15** (App Router) — pages, server components and server actions. No
  separate backend process.
- **Neon Postgres** via the **`@neondatabase/serverless` HTTP driver**. Each
  query is a stateless `fetch`, so concurrent Vercel lambdas cannot exhaust a
  connection pool.
- **Drizzle ORM** + `drizzle-kit` for the schema, migrations and seed.
- **Auth.js v5** (`next-auth`) with a Credentials provider and JWT session
  cookies. Passwords are hashed with bcrypt.
- **Tailwind CSS v4**.
- **Zod** for input validation.

---

## Local setup

Requires Node.js 20+ and a Neon database (the free tier is fine).

```bash
git clone <this-repo>
cd car-retnals
npm install

cp .env.example .env.local
# then edit .env.local — see the next section

npm run db:migrate     # create the tables
npm run db:seed        # insert the 6 cars + the admin account

npm run dev            # http://localhost:3000
```

Sign in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set in
`.env.local`.

Other scripts:

```bash
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm test            # billing + overlap unit tests
npm run db:studio   # Drizzle Studio, a GUI over the database
```

---

## Environment variables

Every variable lives in [`.env.example`](.env.example). Copy it to `.env.local`
for development, and add the same keys to Vercel for deployment.

### Required

| Variable | What it is | How to get it |
| --- | --- | --- |
| `DATABASE_URL` | Neon Postgres connection string. **Use the pooled one** — the host contains `-pooler` — and keep `?sslmode=require`. | Neon dashboard → your project → **Connection string** → *Pooled connection* |
| `AUTH_SECRET` | Signs the Auth.js session cookie. | `openssl rand -base64 32` |

### Required locally, automatic on Vercel

| Variable | What it is |
| --- | --- |
| `AUTH_URL` | Canonical app URL, e.g. `http://localhost:3000`. Auth.js infers this on Vercel, so you only need it locally or when self-hosting. |
| `AUTH_TRUST_HOST` | Set to `true`. Needed on Vercel preview deployments, where the hostname changes on every push. |

### Seed-script only (not read at runtime)

| Variable | Default |
| --- | --- |
| `SEED_ADMIN_EMAIL` | `admin@example.com` |
| `SEED_ADMIN_PASSWORD` | `changeme123` |
| `SEED_ADMIN_NAME` | `Fleet Admin` |

### Optional business rules

These have working defaults; set them only if the pricing changes.

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_FREE_KM_PER_DAY` | `200` | Free km included per rental day |
| `NEXT_PUBLIC_OVERAGE_RATE_PER_KM` | `1.00` | Dollars per km over the allowance |
| `NEXT_PUBLIC_CURRENCY` | `USD` | ISO 4217 code used for formatting |

They are `NEXT_PUBLIC_` so the server and the live in-form charge preview read
exactly the same numbers. All three are defined once in
[`src/lib/settings.ts`](src/lib/settings.ts) — nothing else hardcodes them.

---

## Database: migrations and seeding

```bash
npm run db:migrate    # apply everything in ./drizzle to DATABASE_URL
npm run db:seed       # insert the 6 cars + the admin account (idempotent)
```

Both scripts read `.env.local`, then `.env`.

After editing `src/db/schema.ts`, generate a new migration and apply it:

```bash
npm run db:generate   # writes a new SQL file into ./drizzle
npm run db:migrate
```

Re-running the seed is safe, which is what lets it run on every deploy. Cars are
upserted on their `slug`, and the admin account is inserted only if that email
does not already exist — an existing account is never modified.

### Changing the admin password

There is no password-change screen (the app was scoped to a single seeded
admin). To change it, run the seed once with the reset flag set:

```bash
DATABASE_URL="<pooled neon string>" \
SEED_ADMIN_EMAIL="you@yourcompany.com" \
SEED_ADMIN_PASSWORD="<the new password>" \
SEED_ADMIN_RESET_PASSWORD=true \
  npm run db:seed
```

On Vercel you can instead add `SEED_ADMIN_RESET_PASSWORD=true` alongside a new
`SEED_ADMIN_PASSWORD`, redeploy once, then **remove the flag again** so later
deploys stop overwriting the password.

There are two migrations:

- `0000_init.sql` — the `users`, `cars` and `bookings` tables.
- `0001_no_double_booking.sql` — the `btree_gist` exclusion constraint that makes
  double-booking impossible, plus check constraints for `end_at > start_at` and
  `end_km >= start_km`.

---

## Deploying to Vercel + Neon

### 1. Create the Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. Open **Connection string** and pick **Pooled connection**. The host must
   contain `-pooler`.
3. Copy the full string, including `?sslmode=require`.

### 2. Push this repo to GitHub

```bash
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

### 3. Import into Vercel

1. [vercel.com/new](https://vercel.com/new) → import the repository.
2. Framework preset: **Next.js**. Leave the build settings at their defaults.
3. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | your pooled Neon string |
   | `AUTH_SECRET` | output of `openssl rand -base64 32` |
   | `AUTH_TRUST_HOST` | `true` |
   | `SEED_ADMIN_EMAIL` | the email you want to log in with |
   | `SEED_ADMIN_PASSWORD` | a strong password |

   Apply them to **Production**, **Preview** and **Development**.

   > Do not skip the two `SEED_ADMIN_*` values. The deploy runs the seed, and
   > without them your live site gets `admin@example.com` / `changeme123`.
4. Deploy.

Vercel runs the `vercel-build` script, which applies migrations and seeds
before building:

```
npm run db:migrate && npm run db:seed && next build
```

So the schema, the 6 cars and your admin account are all created by the first
deploy — **steps 4 and 5 below are only needed if you prefer to run them
yourself.** Both commands are safe on every redeploy: migrations already
applied are skipped, cars are upserted, and an existing admin account is left
untouched (see [Changing the admin password](#changing-the-admin-password)).

> Alternatively, use the Vercel **Neon integration** (Storage → Neon), which
> creates the database and injects `DATABASE_URL` for you. If you do, confirm
> the injected value is the *pooled* string.

`DATABASE_URL` and `AUTH_SECRET` are **runtime** variables — the database
connection is created on first query, not at import time, so `next build`
succeeds without them. The app will still fail at runtime if they are missing,
so set them before you expect the deployment to work.

You can ignore the `CompressionStream ... not supported in the Edge Runtime`
build warning. It comes from an unused code path in `jose` (a dependency of
Auth.js) and does not affect the deployment.

### 4. (Optional) Run the migrations and seed yourself

Only needed if you want to run them by hand instead of letting the deploy do
it. From your machine, pointed at the production database:

```bash
DATABASE_URL="<your pooled neon string>" npm run db:migrate
DATABASE_URL="<your pooled neon string>" \
SEED_ADMIN_EMAIL="you@yourcompany.com" \
SEED_ADMIN_PASSWORD="<a real password>" \
  npm run db:seed
```

### 5. Sign in

Open the deployment URL and log in with the credentials you just seeded.

**Re-deploys do not need steps 4–5 again** — only run migrations when you have
added a new one.

---

## How the billing rules work

Every rental includes **200 free km per day**; anything beyond that is billed at
**$1.00/km**. The whole calculation lives in
[`src/lib/billing.ts`](src/lib/billing.ts) and is a pure function, so the
booking form's live preview, the saved booking page and the tests can never
disagree.

```
rental days   = ceil((endAt − startAt) / 24h), minimum 1
free km       = rental days × 200
km driven     = endKm − startKm
overage km    = max(0, km driven − free km)
overage $     = overage km × $1.00
total         = base rental price + overage $
```

**Partial days round up.** A rental of 1 day and 3 hours bills as 2 days, and so
earns 400 free km. Any rental is at least 1 day.

**Nothing is calculated until the car is back.** While `endKm` is empty the
booking shows *"pending return"* instead of an overage figure, and the total
shows just the base rate.

**Bad odometer readings are rejected.** `endKm` must be ≥ `startKm`, enforced in
the Zod schema *and* by a database check constraint. Marking a booking
`Returned` without an ending km redirects to the edit form instead.

Worked example — the case covered by the test suite and the screenshots:

| | |
| --- | --- |
| Period | Sep 1 10:00 → Sep 3 13:00 (2 days 3 hours) |
| Rental days | **3** (rounded up) |
| Free km | 3 × 200 = **600 km** |
| Odometer | 10,000 → 10,875 = **875 km driven** |
| Overage | 875 − 600 = **275 km** → **$275.00** |
| Base rate | $1,200.00 |
| **Total** | **$1,475.00** |

---

## How double-booking is prevented

A car can never be double-booked. Two independent layers enforce this:

1. **Application check** — `findConflicts()` in
   [`src/lib/availability.ts`](src/lib/availability.ts) runs before every insert
   and update, and the form shows which booking clashes.
2. **Database exclusion constraint** — `bookings_no_overlap_per_car` (migration
   `0001`) uses `btree_gist` over `tstzrange(start_at, end_at, '[)')`. Two staff
   submitting at the same instant cannot both slip through; the loser gets a
   clear "booked a moment ago" message.

Two details worth knowing:

- **Touching boundaries are allowed.** The range is half-open (`[)`), so a
  booking may start at exactly the moment another one ends. That is what makes
  same-day turnarounds possible.
- **Cancelled bookings never block.** They are excluded from both the query and
  the constraint, so cancelling a booking frees the slot immediately.

Editing a booking excludes itself from the conflict check, so saving an
unchanged booking never reports a clash with itself.

---

## Project structure

```
src/
  app/
    layout.tsx                    root layout
    globals.css                   Tailwind + shared form/button classes
    login/                        sign-in page + server action
    api/auth/[...nextauth]/       Auth.js route handlers
    (app)/                        every route below requires a session
      layout.tsx                  header, nav, session guard
      dashboard/                  out now / free today
      bookings/
        page.tsx                  list with status + car filters
        actions.ts                create / update / delete / set status
        new/                      create form
        [id]/                     detail + km breakdown
        [id]/edit/                edit form
      calendar/                   month grid
      availability/               date-range checker
  components/
    BookingForm.tsx               shared create/edit form + live charge preview
    CalendarView.tsx              month grid, car filter, status colours
    KmBreakdown.tsx               the charges panel
    DateTime.tsx                  renders instants in the viewer's timezone
    NavLinks.tsx                  desktop header nav + phone bottom bar
    StatusBadge.tsx               status colours, defined once
    SignOutButton.tsx
  db/
    schema.ts                     Drizzle tables and enums
    index.ts                      Neon serverless driver + Drizzle client
    migrate.ts                    migration runner
    seed.ts                       the 6 cars + the admin account
  lib/
    settings.ts                   free km/day, $/km, currency — single source
    billing.ts                    the km-overage calculation (pure)
    overlap.ts                    the overlap rule (pure, no db import)
    availability.ts               conflict + fleet-availability queries
    validation.ts                 Zod schemas
    dates.ts                      date helpers for inputs and the calendar
  auth.ts                         Auth.js: providers, requireSession()
  auth.config.ts                  edge-safe half, imported by the middleware
  middleware.ts                   session guard over every route
drizzle/                          generated SQL migrations
tests/                            billing + overlap unit tests
```

### A note on timezones

Instants are stored as `timestamptz`, so the database always holds an
unambiguous UTC moment. Formatting happens in the browser (`DateTime.tsx`,
`CalendarView.tsx`) so staff always see times in their own timezone — matching
what they typed into the `datetime-local` inputs.

---

## Tests

```bash
npm test
```

Covers the rules most expensive to get wrong: partial-day rounding, the 1-day
minimum, free-km allowance, overage arithmetic, cent rounding, the
pending-return state, and overlap detection including the touching-boundary
case.

The migrations were additionally verified against a real Postgres 16 instance:
overlapping inserts are rejected, touching-boundary inserts succeed, cancelled
bookings do not block, and both check constraints fire.
