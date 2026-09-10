# CampusXchange (CampX) — Design System

## Concept

CampX is a campus thrift board, not a generic storefront. The reference point is a **corkboard notice board / secondhand bookstore price tag**, not a SaaS product grid — items are things students are handing off to each other, not a retail catalog. That's where the visual identity comes from: paper texture without skeuomorphism, string-tag accents instead of card shadows, and a monospace treatment for anything that's actually data (price, PRN, order code) rather than decoration.

**Design plan reviewed against generic defaults:** dropped a cream-background+serif-headline pairing (too close to the common AI-generated look), dropped rounded-card-with-soft-shadow grids (SaaS default, wrong for a peer-to-peer thrift feel), and only used numbered markers where content is a genuine sequence (the 3-step verification flow) — not on things like product categories, which aren't ordered.

---

## 1. Color

| Name | Hex | Role |
|---|---|---|
| Bone | `#F2EFE6` | Page background — warm paper, not pure white |
| Ink | `#17181A` | Primary text |
| Moss | `#3F6B3E` | Primary accent — verified states, primary buttons, "reuse" signal |
| Marigold | `#E0A72E` | Secondary accent — price tags, highlights, active states |
| Clay | `#C9C2B2` | Borders, dividers, disabled states |
| Rust | `#B5482A` | Errors, destructive actions only |

Used sparingly and deliberately: Moss carries "trust/verified/confirmed," Marigold carries "price/attention," Rust appears nowhere except errors — so color itself communicates state, not decoration.

## 2. Type

| Role | Typeface | Notes |
|---|---|---|
| Headings | **General Sans**, Bold/Semibold | Wide, confident, no serif — keeps the page feeling like a functional board, not a magazine |
| Body / UI | **Inter**, Regular/Medium | Neutral, highly legible at small sizes for listings and forms |
| Data (price, PRN, order ID, timestamps) | **IBM Plex Mono**, Regular | Reserved *only* for literal data — this is a structural signal: if it's in monospace, it's a value you'd copy or check, not prose |

Line length capped at ~72 characters for descriptions. No all-caps labels, no single-word accent-in-a-different-color headlines.

## 3. Layout concept

**"Pinboard grid"** — not uniform cards. Each listing is an index-card-style tile with a small colored tab (the "string tag") in one corner instead of a drop shadow; tiles vary slightly in internal padding by content length rather than being forced into identical boxes.

```
┌─────────────────────────────────────────────┐
│  CampX            Browse   Sell   ⌕   👤     │  ← flat header, hairline
├─────────────────────────────────────────────┤   bottom border only
│                                               │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐  │
│  │▪ photo    │ │▪ photo    │ │▪ photo    │  │
│  │  Title    │ │  Title    │ │  Title    │  │
│  │  ₹450 mono│ │  ₹120 mono│ │  ₹900 mono│  │  ← tag corner in Marigold
│  └───────────┘ └───────────┘ └───────────┘  │
│                                               │
│  ┌───────────┐ ┌───────────┐                │
│  │▪ photo    │ │▪ photo    │   (asymmetric  │
│  │  Title    │ │  Title    │    — not a     │
│  │  ₹250 mono│ │  ₹80  mono│    forced grid)│
│  └───────────┘ └───────────┘                │
└─────────────────────────────────────────────┘
```

Left-aligned throughout — this is a browsing/scanning interface, not a marketing page, so center alignment is never used except the empty-state illustration.

## 4. Principles

1. **Motion answers an action.** Nothing animates on scroll or on page load. Every animation below exists because the user clicked, hovered, or something changed state — never ambient.
2. **One accent moment per screen.** If the price tag corner animates on hover, nothing else on that card also animates at the same time.
3. **Data looks like data.** Prices, PRNs, and order codes are always monospace and never styled as prose.
4. **Verified is earned, and shown once.** The verification checkmark draws itself the first time status changes — it doesn't replay on every page visit.

---

## 5. Interaction & Motion Spec

All durations use `ease-out` for entrances/response and `ease-in-out` for reversible toggles, unless noted. Everything here respects `prefers-reduced-motion` — reduced-motion users get instant state changes with a simple opacity crossfade, no transforms.

### Buttons (primary/secondary)
- **Hover:** background lightens 6%, an underline accent grows from center outward under the label, 150ms.
- **Click/press:** scale to `0.97`, 100ms, springs back to `1` on release.
- **Disabled:** no hover/click response at all — flat, Clay-colored, communicates "not available" instantly rather than via a lag.

### Product card
- **Hover:** photo scales to `1.03` inside a fixed-size frame (no layout shift), 200ms ease-out. The Marigold tag corner lifts 3° like a paper tag catching air, same duration, same trigger — one motion, two elements moving together.
- **Click:** card dips to `0.98` scale for 80ms before navigating, so the tap registers visually even on a fast page transition.

### Wishlist / heart icon
- **Click:** icon pops `0.85 → 1.15 → 1` over 260ms with a slight spring overshoot, while the fill transitions from outline to solid Moss over the same window. This is the one "stamp" moment in the whole interface — deliberately more expressive than anything else, because it's a single, infrequent, satisfying action.

### Add-to-cart icon
- **Click:** the item's thumbnail arcs in a short curved path toward the cart icon in the header (a single 350ms motion, cubic-bezier arc, then fades out at the cart), and the cart icon itself ticks up its counter with a quick `1 → 1.2 → 1` bounce. This is the other deliberately expressive moment — reserved for the action that matters most (a successful add), not reused elsewhere.

### Nav icons (search, profile, cart)
- **Hover:** icon tilts `-6°`, a text label fades in beneath it over 120ms. No color change — tilt + label is enough signal.

### Verification badge
- **On status change to Verified:** checkmark path draws itself via `stroke-dashoffset` over 400ms, once, then stays static on every future view (state is stored, not replayed).
- **On hover (after verified):** no animation — a completed, trustworthy state should feel settled, not interactive.

### Form fields (OTP input, signup)
- **Focus:** border color shifts Clay → Moss over 120ms, no glow/shadow — keeps the paper aesthetic instead of a typical SaaS focus ring.
- **Error:** field border shifts to Rust and the field shakes horizontally once (`±4px`, 200ms) — the one place a "negative" motion is allowed, because it needs to interrupt.

### Toasts / confirmations (e.g. "Listed", "Payment received")
- **Enter:** slide up 12px + fade in, 180ms.
- **Exit:** fade only, 150ms, no slide — asymmetric in/out reads calmer than a mirrored animation.

---

## 6. Accessibility floor
- All interactive elements have a visible keyboard focus state (2px Moss outline, offset 2px) — not removed for aesthetics.
- Color is never the only signal: verified status pairs the Moss color with the checkmark icon and the word "Verified," not color alone.
- Motion durations stay under 400ms and none loop indefinitely, so they don't fight `prefers-reduced-motion` users or cause distraction during repeated browsing.
- Contrast: Ink (#17181A) on Bone (#F2EFE6) exceeds WCAG AA for body text; Marigold is used only for accents/tags, never for body text on Bone, since it doesn't hit AA contrast on its own.
