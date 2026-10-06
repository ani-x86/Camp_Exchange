# CampX — C2C Chat (Buyer ↔ Seller) on the Product Page

> Build instructions for **Antigravity IDE**.
> Read `prd.md`, `architecture.md`, `database.md` and `listing.md` first. If this file conflicts with them, stop and list the conflict instead of guessing.

---

## 1. Your Task

Implement a complete, working **C2C chat** so an authenticated, verified buyer can message the seller of a specific listing from the product detail page.

Do **not** stop at a UI mockup. Deliver the full flow: button, conversation creation/reuse, real-time messages, history, access control, read state, and error states.

### Working rules

- **Inspect first.** Before changing anything, read the existing project: frontend framework, backend, database/ORM, auth middleware, API conventions, existing Socket.IO setup (if any), listing and user models, Buy Now / Razorpay flow, design tokens, toast system.
- **Do not rewrite** the architecture, rename unrelated files, replace auth or the database, or redesign the product page.
- **Reuse** existing auth, components, styling, API client (RTK Query if present), and toast/error system.
- **Plan before code.** Briefly list which files you will change and why, then implement.
- **No unnecessary dependencies.** The one allowed addition is `socket.io` (server) and `socket.io-client` (client), and only if real-time is not already set up (see section 6).
- Existing **Buy Now must keep working** and be re-tested at the end.

---

## 2. Current Product Page (from the reference screenshot)

Two-column layout, warm off-white background, thin borders.

**Left column**
- Large product image with a small gold corner marker (top-right of the image).
- Thumbnail row below (selected thumbnail has a green border).

**Right column (top to bottom)**
1. Small uppercase category label (`BOOKS`)
2. Bold title (`Data Structures & Algorithms`)
3. Price chip with gold-tint background (`₹350`)
4. Thin divider
5. `Listed by **Rahul M.** ✓ Verified student` (green text for the badge)
6. Thin divider
7. **About this item** heading + description
8. Thin divider
9. Full-width dark green **Buy Now** button
10. Muted microcopy: `In-person campus handoff • Razorpay secure payment`

> Note (not part of this task): the second thumbnail in the screenshot renders as a broken image. Do not fix it unless it is trivial; just make sure the new code does not depend on it. If you touch the gallery, add a fallback for failed image loads.

---

## 3. Goal and Product Behavior

Replace the single action area with two actions:

```text
[ Chat with seller ]  [ Buy Now ]
```

- **Buy Now** stays the primary action (same dark green, same behavior).
- **Chat with seller** is secondary: outlined, thin border, dark text, same height as Buy Now.
- Layout: a row where Buy Now is wider (about 60/40 or `flex-[3]` vs `flex-[2]`). On narrow mobile widths they may stack with Buy Now on top.
- Keep the microcopy line under the row unchanged.

### Conversation rules

- One conversation per **buyer + seller + listing**.
  Example: `Aarav ↔ Rahul · Data Structures & Algorithms`.
- Clicking **Chat with seller** again **reuses** the existing conversation. Never create duplicates.
- The seller cannot start a chat with themselves. For the seller's own listing, hide the Chat button (show nothing, or a muted "This is your listing").
- Chat requires an authenticated user. Per `architecture.md`, unverified users can browse but cannot transact, so require `verificationStatus === 'verified'` to start a conversation. Unverified users see a toast: "Verify your student ID to message sellers."
- Logged-out users who click the button are sent to login, then returned to this product page with the chat open.
- Conversations are **never deleted** when a listing is sold; they stay readable but locked for new messages (section 5.4).

---

## 4. Data Model (MongoDB / Mongoose)

Extend the schema set in `database.md`. Do not duplicate the existing `User` or `Product` models. Add two collections, using the shared constants module.

### 4.1 `conversations`

| Field | Type | Rules |
|---|---|---|
| `listingId` | ObjectId → Product | required |
| `buyerId` | ObjectId → User | required, set from the authenticated user only |
| `sellerId` | ObjectId → User | required, copied from `product.sellerId` server-side |
| `listingSnapshot` | `{ title, price, imageUrl }` | required. Keeps the header readable if the listing is edited or removed |
| `lastMessage` | `{ body, senderId, createdAt }` | optional, body truncated to 120 chars, for the inbox preview |
| `unread` | `{ buyer: Number, seller: Number }` | default 0 each, for badge counts |
| `createdAt` / `updatedAt` | Date | automatic. `updatedAt` is bumped on every message |

Indexes:

- **Unique** `{ listingId: 1, buyerId: 1, sellerId: 1 }` (prevents duplicates; creation must handle the duplicate-key race by re-fetching).
- `{ buyerId: 1, updatedAt: -1 }` and `{ sellerId: 1, updatedAt: -1 }` (inbox lists).

Validator: `buyerId !== sellerId`.

### 4.2 `messages`

| Field | Type | Rules |
|---|---|---|
| `conversationId` | ObjectId → Conversation | required |
| `senderId` | ObjectId → User | required, set from the authenticated user only |
| `body` | String | required, trimmed, 1 to 1000 chars |
| `type` | String | enum `['text']`, default `text` (reserved for future types) |
| `readAt` | Date | optional |
| `createdAt` | Date | automatic |

Indexes:

- `{ conversationId: 1, createdAt: -1 }` (history and pagination).

### 4.3 Constants

Add to `constants.ts`: `MESSAGE_TYPES = ['text']`, `MESSAGE_MAX_LENGTH = 1000`, `MESSAGES_PAGE_SIZE = 30`.

---

## 5. UI Specification

Match the existing CampX look: minimal, compact, warm off-white, thin borders, dark text, muted secondary text, existing green for primary actions, gold accent, minimal shadows. Do not add decorative UI.

### 5.1 Chat button

- Label: **Chat with seller**, optional small `MessageCircle` icon (lucide-react).
- States: default, loading (while creating/opening conversation, disabled with spinner), hidden for the seller's own listing.
- Click: calls the create-or-get endpoint, then opens the chat panel.

### 5.2 Desktop: right-side drawer

- Slides in from the right, about 400 to 440px wide, full viewport height, thin left border, off-white surface, no heavy shadow. The product page stays visible (dimmed backdrop is optional and light).
- Closes with the close button, `Esc`, or backdrop click.
- URL stays on the product page. Optionally reflect state with `?chat=open` so refresh and the login redirect can reopen it.

### 5.3 Mobile: full screen

- Same content as the drawer, shown as a full-screen view with a back arrow.
- Message input stays pinned above the keyboard (handle `100dvh`, not `100vh`).
- Tap targets at least 44px.

### 5.4 Panel anatomy

```text
┌───────────────────────────────────────┐
│ ←  Rahul M.                 ✓ Verified │   ChatHeader
│    Seller                              │
├───────────────────────────────────────┤
│  ┌─────────────────────────────────┐  │   ListingPreview (pinned at top)
│  │ [img] Data Structures & Algo…   │  │
│  │       ₹350 · Listed by Rahul M. │  │
│  │       ✓ Verified student        │  │
│  │       [ View listing ]          │  │
│  └─────────────────────────────────┘  │
│                                       │
│  Rahul                                │   MessageList
│  Hi, yes the book is still available. │
│                            11:42 AM   │
│                                       │
│                 Is the price          │
│                 negotiable?           │
│                          You 11:43    │
├───────────────────────────────────────┤
│ Type a message...                [➤]  │   MessageInput
└───────────────────────────────────────┘
```

**ChatHeader**: back/close button, other person's name (`Rahul M.` format: first name + last initial), `✓ Verified student` badge (text + icon, not color alone), role label ("Seller" or "Buyer"). Optional online dot only if presence is trivial to add; otherwise skip.

**ListingPreview**: thumbnail, title, price chip (same gold-tint style), "Listed by", verified badge, **View listing** link. On the product page itself this scrolls to top / closes the panel; from the inbox it navigates to the product.

**MessageList**
- Other person's messages left, own messages right (own bubbles use a soft green tint or dark outline, not loud colors).
- Small muted timestamp per message; group by day with a thin date divider.
- Auto-scroll to the newest message on open and on new message; do not yank scroll if the user has scrolled up to read older ones (show a small "New messages" pill instead).
- "Load older messages" at the top (cursor pagination).
- Sent-state: sending (muted), sent, failed with **Retry**.

**MessageInput**
- Single auto-growing textarea (max about 4 rows), `Enter` sends, `Shift+Enter` newline.
- Send button disabled when empty or over the limit; character counter appears only near the limit (e.g. from 900/1000).
- Disabled with explanation when the listing is unavailable.

### 5.5 Unavailable listing

If `product.status` is `sold` (or the listing was removed): the conversation stays readable, and above the input show a muted notice "This listing is no longer available." and disable the input. For `reserved`, keep chat open.

### 5.6 States

- **Loading**: skeleton bubbles.
- **Empty (new conversation)**: muted line "Say hello to Rahul and ask about the item." with 2 optional quick-reply chips (`Is this still available?`, `Is the price negotiable?`) that just fill the input.
- **Error**: use the existing toast system for transient errors, and an inline retry block for load failure.
- **Offline/socket down**: small muted banner "Reconnecting…"; messages sent meanwhile fall back to REST (section 6.3).

### 5.7 Inbox (minimal, required so sellers can reply)

Without an inbox the seller has no way to find incoming chats. Add a compact **Messages** page:

- Route: `/messages`, with a **Messages** link and unread count badge in the existing TopBar/header.
- `ConversationList`: each row has the other person's name, verified badge, listing title and thumbnail, `lastMessage` preview, relative time, and unread count.
- Selecting a row opens the same chat panel (full screen on mobile, split or drawer on desktop).
- Keep it plain: no search, no filters, no archive.

---

## 6. API and Real-time

Follow the project's existing route, controller, and response conventions. All routes sit behind the existing auth middleware.

### 6.1 REST endpoints

| Method | Route | Behavior |
|---|---|---|
| `POST` | `/api/conversations` | Body `{ listingId }`. Create or return the existing conversation |
| `GET` | `/api/conversations` | Only the authenticated user's conversations, newest first, paginated |
| `GET` | `/api/conversations/:id` | Single conversation (header + listing data), membership checked |
| `GET` | `/api/conversations/:id/messages?before=<cursor>&limit=30` | Membership checked, newest page first, cursor pagination |
| `POST` | `/api/conversations/:id/messages` | REST fallback send (same validation as socket path) |
| `PATCH` | `/api/conversations/:id/read` | Mark the other party's messages as read, reset own unread count |

### 6.2 `POST /api/conversations` logic

1. Authenticate; `buyerId = req.user.id`. **Ignore** any `buyerId`, `sellerId` or `senderId` in the body.
2. Require verified user.
3. Validate `listingId` is a valid ObjectId; fetch the product. 404 if missing.
4. `sellerId = product.sellerId`. 422 if missing.
5. If `sellerId === buyerId`, reject (400 "You can't message yourself").
6. Optionally reject starting a **new** conversation when the listing is `sold` (existing ones still return).
7. Find by `{ listingId, buyerId, sellerId }`. Return it with `200` if found.
8. Otherwise create it (with `listingSnapshot`) and return `201`. If the unique index throws a duplicate-key error (double click or race), re-fetch and return the existing one.

### 6.3 Socket.IO

- **If Socket.IO already exists**, use it and add only a `chat` namespace/events. **If no real-time layer exists** (`architecture.md` does not list one), add `socket.io` on the existing Express server and `socket.io-client` on the frontend. Do not add any other real-time library. Keep REST as the fallback so the feature still works if sockets fail.
- **Authenticate the handshake** with the same JWT used by REST (passed via `auth: { token }`, never in the query string). Reject invalid or expired tokens. When the 15-minute access token expires, the client should refresh it and reconnect.
- **Rooms**: `conversation:{conversationId}`. A client may join only after the server verifies the user is that conversation's buyer or seller.
- Also join a per-user room `user:{userId}` for inbox badge updates.

Events:

| Direction | Event | Payload | Notes |
|---|---|---|---|
| client → server | `conversation:join` | `{ conversationId }` | Server checks membership, then joins room |
| client → server | `message:send` | `{ conversationId, body, clientId }` | Server derives sender from the socket's authenticated user |
| server → client | `message:new` | message DTO (+ `clientId`) | Emitted to the conversation room. `clientId` lets the sender reconcile its optimistic message |
| server → client | `conversation:updated` | `{ conversationId, lastMessage, unread }` | Emitted to `user:{id}` of both parties for inbox/badges |
| client → server | `message:read` | `{ conversationId }` | Marks messages read |
| server → client | `message:read` | `{ conversationId, readAt }` | Optional read receipts |
| server → client | `error` | `{ code, message }` | Validation/authorization failures |

### 6.4 Send-message flow (socket and REST share one service function)

1. Authenticate the user.
2. Load the conversation; confirm the user is `buyerId` or `sellerId` (else `403`).
3. Confirm the listing is still messageable (not `sold`/removed), else reject with a clear error.
4. Validate `body`: string, trim, 1 to 1000 chars, strip control characters.
5. Save the message.
6. Update the conversation: `updatedAt`, `lastMessage`, increment the **other** party's `unread`.
7. Emit `message:new` to the room and `conversation:updated` to both user rooms.
8. Return the message DTO.

### 6.5 Response shape (DTOs)

Return only what the UI needs. **Never** include phone, personal email, PRN, hostel/room, campus address, `passwordHash` or any ID-card reference.

```ts
ConversationDTO = {
  id, listing: { id, title, price, imageUrl, status },
  otherUser: { id, displayName /* "Rahul M." */, verified, avatarUrl? },
  yourRole: 'buyer' | 'seller',
  lastMessage?, unreadCount, updatedAt
}

MessageDTO = { id, conversationId, senderId, body, type, createdAt, readAt? }
```

Populate the other user with a **field whitelist** (`name`, `verificationStatus`, `avatarUrl`), not by returning the whole user document.

---

## 7. Validation, Security and Privacy

Required checklist (verify each at the end):

- [ ] Authentication required on every route and on the socket handshake.
- [ ] `buyerId` and `senderId` come only from the authenticated user, never from the request body or socket payload.
- [ ] `sellerId` comes only from the listing.
- [ ] Membership check (buyer or seller) on conversation fetch, message fetch, send, read, and room join. Non-members get `403`; unknown IDs get `404`. Do not leak whether a conversation exists to non-members.
- [ ] `GET /api/conversations` returns only the caller's conversations.
- [ ] Duplicate conversations impossible (unique index plus race handling).
- [ ] Seller cannot chat with themselves.
- [ ] Message validation: non-empty after trim, max 1000 chars, string type only.
- [ ] **XSS**: store the raw trimmed text, render it as plain text in React (never `dangerouslySetInnerHTML`), and make links non-clickable plain text in the MVP.
- [ ] No private profile data in any DTO, log line or socket payload.
- [ ] Rate limiting: reuse `express-rate-limit` on conversation/message REST routes; add a simple per-user, in-memory limit on `message:send` (for example 20 messages per 10 seconds).
- [ ] All ObjectIds validated before querying.
- [ ] Socket CORS limited to the configured frontend origin.
- [ ] Listing sold/removed: conversation readable, sending blocked server-side (not only in the UI).

---

## 8. Error Handling

Use the existing toast/error components. Handle at minimum:

| Case | Behavior |
|---|---|
| Not authenticated | Redirect to login, return to the product page and reopen chat |
| Not verified | Toast explaining verification is required |
| Listing not found | Toast + close panel |
| Listing has no seller | Toast "This listing can't be messaged" |
| User is the seller | Chat button hidden; API also rejects |
| Conversation creation fails | Toast + button re-enabled |
| Unauthorized conversation access | `403`, panel closes with a toast |
| Message send fails | Message stays in the list marked **Failed** with Retry |
| Empty/too-long message | Inline, send disabled |
| Socket connection failure | "Reconnecting…" banner, REST fallback for sending |
| Listing becomes unavailable | Notice above the input, input disabled |
| Network failure | Toast + retry on load errors |

---

## 9. Performance

- Load only the latest 30 messages initially; **Load older messages** fetches the previous page using a cursor (`createdAt` + `_id`), not skip/offset.
- Use `lean()` and field projection on message and conversation queries.
- Use the indexes in section 4. Do not add extras.
- On the client, keep messages normalized by `id` and dedupe by `id`/`clientId` so the socket event and the REST response never produce double messages.
- Join a conversation room only while its panel is open; leave on close.

---

## 10. Suggested Components and Files

Adapt names and locations to the existing codebase.

```text
Frontend
  features/chat/
    ChatButton.tsx
    ChatDrawer.tsx          (desktop drawer / mobile full screen wrapper)
    ChatHeader.tsx
    ListingPreview.tsx
    MessageList.tsx
    MessageBubble.tsx
    MessageInput.tsx
    ConversationList.tsx
    useChat.ts              (conversation + messages + socket handling)
    chatApi.ts              (RTK Query endpoints, if RTK Query is used)
    socket.ts               (single shared socket client)
  pages/MessagesPage.tsx

Backend
  models/Conversation.ts
  models/Message.ts
  services/chatService.ts   (getOrCreateConversation, sendMessage, markRead)
  controllers/conversationController.ts
  routes/conversationRoutes.ts
  sockets/chatSocket.ts     (auth, rooms, events)
```

Keep the service layer shared between REST and socket handlers so validation and authorization live in exactly one place.

---

## 11. Not in Scope

Do **not** add (unless already present in the project): voice or video calls, file or image messages, offers or negotiation features, AI in private chats, automatic sharing of phone or email, end-to-end encryption, push or email notification infrastructure, typing indicators, message editing or deletion, blocking/reporting inside chat.

---

## 12. Build Order

1. Inspect the project and write the short plan (files to change and why).
2. `Conversation` and `Message` models, indexes, constants.
3. `chatService` (get-or-create, send, list, mark read) with authorization.
4. REST routes and controllers, DTO mappers with the field whitelist.
5. Socket.IO server: auth, `conversation:join`, `message:send`, `message:new`, `conversation:updated`.
6. Frontend: socket client, `useChat`, API hooks.
7. `ChatButton` on the product page (alongside Buy Now), `ChatDrawer` with header, listing preview, list, input, and all states.
8. Mobile full-screen behavior.
9. `/messages` inbox, header link, and unread badge.
10. Security checklist pass, error states, then tests.

---

## 13. Testing and Verification

Run type checks, lint, and the existing test suite, and fix what you break. Add tests for the rules that matter most:

**Backend**
1. Unauthenticated request to any chat route returns `401`.
2. Creating a conversation twice for the same listing and buyer returns the same conversation (`201` then `200`), and the collection holds one document.
3. Concurrent double create still yields one document.
4. Seller creating a conversation on their own listing is rejected.
5. A third user reading messages, sending, or marking read gets `403`.
6. A body containing `buyerId` or `senderId` is ignored.
7. Empty, whitespace-only, and 1001-character messages are rejected; a message is trimmed on save.
8. Sending to a `sold` listing's conversation is rejected, reading it still works.
9. DTOs never contain phone, email, PRN or address fields.
10. `GET /api/conversations` returns only the caller's conversations.

**Socket**
11. Connection without a valid token is refused.
12. A non-member cannot join `conversation:{id}` and receives nothing.
13. A sent message reaches both participants once, and updates `lastMessage` and unread counts.

**Manual checklist**
- Buyer opens chat from the product page, sends a message, seller (second browser) sees it live in the drawer and in `/messages`.
- Refresh keeps history. Clicking **Chat with seller** again opens the same thread.
- Mobile width shows the full-screen chat with the input above the keyboard.
- **Buy Now still works end to end** (Razorpay test mode) and the two buttons coexist at all breakpoints.

---

## 14. Acceptance Criteria

- [ ] Product page shows **[ Chat with seller ] [ Buy Now ]**, with Buy Now unchanged and still primary.
- [ ] One conversation per buyer, seller and listing; reopening reuses it.
- [ ] Real-time text messaging works between two accounts, with history and "load older".
- [ ] Desktop right drawer and mobile full-screen both work and match the CampX style.
- [ ] Listing preview with **View listing** link sits at the top of every conversation.
- [ ] Sold or removed listings keep the conversation readable and block new messages.
- [ ] Read/unread state and an inbox with badge exist.
- [ ] Every item in the security checklist (section 7) passes.
- [ ] No private user data is exposed through chat.
- [ ] Type checks, lint and tests pass; no unrelated files changed.

---

## 15. Final Report Format

When done, reply with a concise summary:

- Files changed (grouped: frontend, backend, shared)
- Database changes (collections and indexes)
- API changes
- Socket.IO changes (and whether the library was newly added)
- UI changes
- Security measures taken
- How to test the feature
- Any `TODO(decision):` items you had to leave open
