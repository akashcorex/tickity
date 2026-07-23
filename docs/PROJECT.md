# Tickity — Real-Time Event Ticketing SaaS

**Author:** Akash Laha | **License:** MIT | **Stack:** Next.js 15 + Convex + Clerk + Razorpay

Tickity is a real-time event ticketing platform. Organizers create events, attendees browse, queue, and purchase tickets via Razorpay (Indian payments), and manage digital tickets with QR codes.

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Frontend** | React 18, Tailwind CSS 3.4, shadcn/ui (New York), Lucide icons |
| **Backend** | Convex 1.17 (reactive DB, serverless functions, file storage, cron) |
| **Auth** | Clerk 6.3 (middleware-protected routes) |
| **Payments** | Razorpay 2.9 (orders, Route marketplace payouts, refunds) |
| **Rate Limiting** | @convex-dev/rate-limiter (3 queue joins / 30 min) |
| **Forms** | react-hook-form + zod |
| **QR / PDF** | react-qr-code, html2pdf.js |
| **Deployment** | Vercel |

---

## Directory Map

```
app/                        Next.js App Router pages
├── page.tsx                Home (event grid)
├── layout.tsx              Root layout (Clerk, Convex providers)
├── globals.css             Tailwind + CSS variables
├── event/[id]/             Event detail + purchase flow
├── search/                 Search results
├── seller/                 Dashboard, event CRUD
├── tickets/                User tickets (list + detail with QR)
├── tickets/purchase-success/  Post-purchase confirmation
├── actions/                Server Actions (Razorpay orders, refunds)
└── debug/                  Dev-only tools (env, payment, webhook)

components/                 React components
├── ui/                     shadcn/ui primitives (button, form, input, toast, etc.)
├── EventCard.tsx            Event grid card with availability/queue/ticket state
├── EventList.tsx            Home page event listing
├── EventForm.tsx            Create/edit event form
├── JoinQueue.tsx            Queue join button + status
├── PurchaseTicketRazorpay.tsx  Razorpay checkout modal
├── Ticket.tsx / TicketCard.tsx  Full ticket display (QR, details)
├── SellerDashboard.tsx      Payment onboarding
├── CancelEventButton.tsx    Cancel + refund
├── Header.tsx, SearchBar.tsx, Spinner.tsx, SyncUserWithConvex.tsx
└── ReleaseTicket.tsx        Release an offered ticket

convex/                     Convex backend (replaces traditional APIs)
├── schema.ts               Events, tickets, waitingList, users tables
├── events.ts               CRUD, availability, queue, purchase, search, seller metrics
├── tickets.ts              Ticket queries & status mutations
├── waitingList.ts          Queue logic (position, process, expire, release, cleanup)
├── users.ts                User sync
├── storage.ts              Image upload/delete URLs
├── crons.ts                Expired offer cleanup (every 1 min)
└── constants.ts            Enums (DURATIONS, WAITING_LIST_STATUS, TICKET_STATUS)

lib/                        Utilities
├── convex.ts               Convex HTTP client factory (server-side)
├── razorpay.ts             Razorpay instance
├── utils.ts                cn() helper + useStorageUrl hook
└── baseUrl.ts              Dynamic base URL (dev vs prod)
```

---

## Database Schema (Convex)

### `events`
| Field | Type | Notes |
|-------|------|-------|
| name | string | |
| description | string | |
| location | string | |
| eventDate | number (timestamp) | |
| price | number | INR |
| totalTickets | number | |
| userId | string | Clerk ID of organizer |
| imageStorageId | optional string | Convex storage ID |
| is_cancelled | optional boolean | |

### `tickets`
| Field | Type | Notes |
|-------|------|-------|
| eventId | Id | FK to events |
| userId | string | Clerk ID of buyer |
| purchasedAt | number | timestamp |
| status | union | `"valid"` / `"used"` / `"refunded"` / `"cancelled"` |
| paymentIntentId | optional string | Razorpay payment ID |
| amount | optional number | |

Indexes: `by_event`, `by_user`, `by_user_event`, `by_payment_intent`

### `waitingList`
| Field | Type | Notes |
|-------|------|-------|
| eventId | Id | FK to events |
| userId | string | Clerk ID |
| status | union | `"waiting"` / `"offered"` / `"purchased"` / `"expired"` |
| offerExpiresAt | optional number | timestamp |

Indexes: `by_event_status`, `by_user_event`, `by_user`

### `users`
| Field | Type | Notes |
|-------|------|-------|
| name | string | |
| email | string | |
| userId | string | Unique Clerk ID |
| stripeConnectId | optional string | Repurposed for Razorpay account ID |

Indexes: `by_user_id`, `by_email`

---

## Key Flows

### Ticket Booking & Waiting Queue — Deep Dive

The booking system uses a **two-phase offer queue** model (not first-come-first-sold). Tickets are never instantly purchased — every buyer must first enter a queue, receive a timed offer, and then complete payment within the window.

---

#### 1. Joining the Queue (`JoinQueue` → `events.joinWaitingList`)

When a user clicks **"Buy Ticket"** on an event card:

1. **Rate limit check** — The Convex rate limiter enforces a max of **3 queue joins per 30 minutes per user**. If exceeded, a `ConvexError` is thrown with the retry period, and the user sees a toast: *"Slow down there!"*.

2. **Duplicate check** — Queries `waitingList` by `by_user_event` index to ensure the user doesn't already have an active entry (non-expired). If they do, the mutation throws.

3. **Availability check** — Calls `checkAvailability` which computes:
   ```
   availableSpots = event.totalTickets - (purchasedCount + activeOffers)
   ```
   - `purchasedCount` = tickets with status `valid` or `used`
   - `activeOffers` = waitingList entries with status `offered` where `offerExpiresAt > now`

4. **Branch: tickets available** — If `availableSpots > 0`:
   - Inserts a `waitingList` entry with `status: "offered"` and `offerExpiresAt: Date.now() + 30 minutes`.
   - Schedules a Convex job via `ctx.scheduler.runAfter(30min, internal.waitingList.expireOffer, { waitingListId, eventId })` — this job will mark the offer expired and trigger `processQueue` if the user doesn't purchase in time.
   - Returns `{ status: "offered", message: "Ticket offered - you have 15 minutes to purchase" }`.

5. **Branch: sold out** — If `availableSpots <= 0`:
   - Inserts a `waitingList` entry with `status: "waiting"` (no expiration).
   - Returns `{ status: "waiting", message: "Added to waiting list..." }`.

> **Note:** The UI show message says "15 minutes" but the actual constant is `30 * 60 * 1000` (30 minutes). The 30-minute value is the minimum Stripe allows for checkout expiry (origin of this app).

---

#### 2. Queue Position & UI States (`EventCard`)

The `getQueuePosition` query returns the user's entry with a computed `position` field:

```ts
peopleAhead = count of entries with _creationTime < user's entry time
               AND status is "waiting" or "offered"
position = peopleAhead + 1
```

The `EventCard` renders different UI depending on the user's queue state:

| Queue State | UI Shown |
|-------------|----------|
| No entry | **"Buy Ticket"** button (calls `joinWaitingList`) |
| `"offered"` | `PurchaseTicketRazorpay` — reservation card with countdown timer + purchase button |
| `"waiting"` at position 2 | Amber banner: *"You're next in line!"* with spinning loader |
| `"waiting"` at position >2 | Blue banner: *"Queue position #N"* |
| `"expired"` | Red banner: *"Offer expired"* + "Buy Ticket" button reappears |
| Has purchased ticket | Green banner: *"You have a ticket!"* with link to view it |

---

#### 3. The Timed Offer Window (`PurchaseTicketRazorpay`)

When a user has `status: "offered"`, the `PurchaseTicketRazorpay` component renders:

- **Reservation card** with a **live countdown timer** that ticks every second (using `setInterval`). The timer shows minutes:seconds remaining until `offerExpiresAt`.
- **"Purchase Your Ticket Now →"** button that:
  1. Calls server action `createRazorpayOrder` → Creates a Razorpay order via `razorpay.orders.create()`.
  2. Dynamically loads `https://checkout.razorpay.com/v1/checkout.js` (if not already loaded).
  3. Opens the Razorpay checkout modal with `order_id`, amount, user prefill.
  4. On successful payment, calls server action `purchaseTicketDirect` → which calls the Convex mutation `events.purchaseTicket`.
  5. On success: redirect to `/tickets/purchase-success`.

> If the offer expires before payment, the button disables and the expired state is shown.

---

#### 4. Purchase Completion (`events.purchaseTicket`)

Key validations and side-effects:

1. Fetches the `waitingList` entry — verifies it exists and belongs to the requesting user.
2. Checks status: normally expects `"offered"`, but also allows `"expired"` (handles edge case where offer expired moments before payment succeeded).
3. Verifies event exists and `is_cancelled` is falsy.
4. **Inserts a ticket** with `status: "valid"`, `purchasedAt: now`, `paymentIntentId` (Razorpay payment ID), `amount`.
5. **Patches the waitingList entry** to `status: "purchased"`.
6. Calls **`processQueue(ctx, { eventId })`** — offers tickets to the next waiting users.

---

#### 5. Queue Processing Engine (`waitingList.processQueue`)

This is the core function that advances the queue. It is called from:
- `purchaseTicket` → when a ticket is bought
- `expireOffer` (scheduled job) → when 30min timer runs out
- `releaseTicket` → when user voluntarily releases
- `cleanupExpiredOffers` (cron) → fail-safe cleanup

**Algorithm:**

```
processQueue(eventId):
  1. Compute availableSpots:
     purchasedCount = tickets where status in ("valid", "used")
     activeOffers    = waitingList where status = "offered" AND offerExpiresAt > now
     availableSpots  = event.totalTickets - (purchasedCount + activeOffers)

  2. If availableSpots <= 0, return (no action needed)

  3. Fetch next waiting users:
     waitingUsers = waitingList
       .withIndex("by_event_status")
       .eq("eventId", eventId)
       .eq("status", "waiting")
       .order("asc")          // FIFO by _creationTime
       .take(availableSpots)  // Only fill available spots

  4. For each waiting user:
     a. Patch entry → status = "offered", offerExpiresAt = now + 30min
     b. Schedule ctx.scheduler.runAfter(30min, expireOffer, { waitingListId, eventId })
```

This ensures **FIFO ordering** (earliest `_creationTime` wins) and never overallocates (since `availableSpots` accounts for active offers already outstanding).

---

#### 6. Offer Expiry (`expireOffer`)

A scheduled internal mutation called 30 minutes after an offer was created:

1. Checks the offer still exists and is still `"offered"` (user may have already purchased).
2. Patches status to `"expired"`.
3. Calls `processQueue(ctx, { eventId })` to offer the freed-up spot to the next waiting user.

---

#### 7. Manual Release (`ReleaseTicket`)

The user can voluntarily release their offer by clicking **"Release Ticket Offer"** in the `PurchaseTicketRazorpay` card (red button at the bottom, with a confirmation dialog). This:

1. Validates the entry exists and is `"offered"`.
2. Patches status to `"expired"`.
3. Calls `processQueue(ctx, { eventId })`.

---

#### 8. Cron-based Fail-Safe (`cleanupExpiredOffers`)

A Convex cron job runs **every 1 minute** as a safety net:

1. Queries all `waitingList` entries where `status = "offered"` AND `offerExpiresAt < now`.
2. Groups them by `eventId`.
3. For each group: patches all to `"expired"`, then calls `processQueue` per event.

This catches any offers that weren't expired by the scheduled job (e.g., due to Convex scheduler edge cases, deploy restarts, etc.).

---

#### Full State Machine

```
                         ┌─────────────┐
                         │   No Entry  │
                         └──────┬──────┘
                                │ click "Buy Ticket"
                                ├──────────────────────────┐
                                │ availableSpots > 0       │ availableSpots <= 0
                                ▼                          ▼
                     ┌──────────────────┐      ┌──────────────────┐
                     │    "offered"      │      │    "waiting"     │
                     │ offerExpiresAt +  │      │ (no expiration)  │
                     │ 30min timer runs  │      └────────┬─────────┘
                     └────────┬─────────┘               │
                              │                         │ processQueue
                    ┌─────────┼─────────┐               │ (ticket frees up)
                    │         │         │               │
                    ▼         ▼         ▼               ▼
               purchase   timer     release       ┌──────────────┐
                    │     expires   ticket        │  "offered"    │
                    │         │         │         └──────┬───────┘
                    ▼         ▼         ▼                │
             ┌──────────┐ ┌────────┐ ┌────────┐          │
             │"purchased"│ │"expired"│ │"expired"│         └──→ (repeats flow)
             │ ticket    │ │ button │ │ button │
             │ created   │ │reappears│ │reappears│
             └──────────┘ └────────┘ └────────┘
```

---

### Razorpay Payment Flow

### Event Management (Seller)

- Create: `EventForm` (zod validated, optional image upload to Convex storage).
- Edit: Can update details; `totalTickets` can only be increased (not below sold count).
- Cancel: Requires refunding all tickets first via Razorpay (admin-only server action).

### Authentication

- Clerk middleware protects `/seller/*` and `/tickets/*`.
- `SyncUserWithConvex` syncs Clerk user data to Convex `users` table on every sign-in.
- Convex auth configured to accept Clerk tokens (`convex/auth.config.ts`).

### Payments (Razorpay)

- Orders created server-side with `razorpay.orders.create()` (amount in paise).
- Sellers use Razorpay Route for marketplace-style payouts — currently a mock/dev implementation.
- Refunds: iterate valid tickets, call Razorpay refund API (partially implemented / TODO).

---

## Pages & Routes

| Route | Page | Notes |
|-------|------|-------|
| `/` | Event grid | Upcoming & past events |
| `/event/[id]` | Event detail | Queue, purchase, ticket info |
| `/search?q=` | Search results | Full-text search via Convex |
| `/tickets` | My tickets | Upcoming / Past / Other tabs |
| `/tickets/[id]` | Ticket detail | QR code, download PDF, share |
| `/tickets/purchase-success` | Confirmation | Processing state with timer |
| `/seller` | Dashboard | Razorpay account onboarding |
| `/seller/events` | My events | Metrics per event |
| `/seller/new-event` | Create event | |
| `/seller/events/[id]/edit` | Edit event | |
| `/debug/*` | Dev tools | Env, payment, webhook debuggers |

---

## Notable Config

- **Rate limiter** — 3 queue joins per 30 min per user (fixed window, Convex).
- **Clerk middleware** (`middleware.ts`) — protects `/seller/*`, runs for all API routes.
- **Next.js image domains** — allowed Convex storage hosts (upbeat-stoat-959, wary-anaconda-29, amiable-herring-583).
- **Tailwind** — dark mode via `class`, shadcn/ui compatible (neutral palette, CSS variables).
- **shadcn/ui** — New York style, RSC enabled, lucide icons.

---

## Development Status & Notes

- **Razorpay Route integration** (marketplace payouts) is currently mock/dev — needs production hardening.
- **Webhook endpoint** (`/api/webhooks/razorpay`) is referenced in debug pages but not yet implemented.
- **Stripe remnants** — `stripeConnectId` field and some function names are leftover from an earlier Stripe version, repurposed for Razorpay.
- **Sample data** — 10 sample events in `convex/sampleData.json` (prices in USD format but displayed as INR).

---

## Running Locally

```sh
bun install          # or npm install
bun run dev          # next dev --turbopack
```

Requires environment variables: Clerk keys, Razorpay keys, Convex URL, Convex deployment key.
