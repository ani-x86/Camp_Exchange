# CampX — Add Item (Create Listing) Feature

> Build instructions for **Antigravity IDE**.
> This feature lives **inside the Profile Page**. It is reached from the profile card and renders in the same centered card shell, so it inherits the profile page's visual style.

---

## 0. Context and Constraints

- Project: **CampX**, campus-only marketplace for students of ABC College.
- Stack: React 18, Vite, TypeScript, Tailwind, lucide-react, local mock data (no backend yet).
- Reuse: existing header/TopBar, design tokens, `useListings` mock data, wishlist and cart contexts.
- Visual style: follow `campx_profile_page_structure.md` (warm off-white background, thin neutral borders, compact type, strong dark text, muted secondary text, small yellow/gold accent marker, no heavy shadows).
- Do not add new dependencies. Use native `<input type="file">`, `URL.createObjectURL`, and plain React state.

---

## 1. Where This Feature Lives in the Profile Page

The Add Item flow is a **section/view of the Profile Page**, not a separate site area.

### 1.1 Entry point on the Profile Page

Add a new section to `ProfileCard`, between **Bio** and **Save changes**:

```text
│  ─────────────────────────────────  │
│  Sell on CampX                      │
│  List a book, gadget or lab item    │
│  [ + Add item ]                     │
│  ─────────────────────────────────  │
```

- Section label: **Sell on CampX**
- One-line muted helper text.
- Secondary (outlined) button: **+ Add item**
- Optional later: a small "My listings (N)" link next to it.

### 1.2 Routing

- Route: `/profile/add-item`
- Clicking **Add item** navigates to this route.
- The route renders `ProfilePage` shell (TopBar + centered card) with `AddItemPanel` in place of the profile fields.
- Top-left link changes from `← Back to board` to `← Back to profile` while on this route.
- Browser back returns to `/profile`.

### 1.3 Component placement

```text
ProfilePage
├── TopBar
└── ProfileCard
    ├── AccentMarker
    ├── (route /profile)          → ProfileHeader, fields, Bio, SellSection, SaveButton
    └── (route /profile/add-item) → AddItemPanel
```

---

## 2. Page Structure

```text
Add Item
│
├── Item Photos
│   ├── Upload primary image
│   ├── Upload additional images
│   └── Image preview / remove
│
├── Item Information
│   ├── Item title
│   ├── Category
│   ├── Price
│   └── Description
│
├── Seller Information            (all auto-filled, read-only)
│   ├── Seller name
│   ├── Verified status
│   └── Campus
│
└── Listing Actions
    ├── Preview listing
    └── Publish item
```

### Layout

- Same centered card as profile: max width about 480px on desktop, thin border, off-white surface, gold accent marker at top-left.
- Single column. Sections separated by thin horizontal rules (same as profile rows).
- Section labels: small, muted, uppercase-free, same size as profile row labels.
- Page title at top of card: **Add item** (bold, compact), with muted subtitle "Photos and details buyers will see."

---

## 3. Section A — Item Photos

### 3.1 Rules

| Rule | Value |
|---|---|
| Accepted formats | **JPG / JPEG and PNG only** (`image/jpeg`, `image/png`) |
| Max file size | 5 MB per image |
| Primary image | Required (exactly 1) |
| Additional images | Optional, up to 5 (total max 6) |
| Validation | Check MIME type **and** file extension; reject everything else (webp, gif, heic, svg) |

`<input accept="image/jpeg,image/png" />` is only a hint. Always validate in code.

### 3.2 Primary image slot

- Large dashed-border drop zone (aspect 4:3), thin border, muted icon (`ImagePlus` from lucide-react).
- Text: **Add primary photo** and muted "JPG or PNG, up to 5 MB".
- Click or keyboard (Enter/Space) opens file picker. Drag and drop supported.
- After selecting: show the preview filling the slot with `object-cover`, a **Primary** badge (small gold chip), and a remove button (`X`) top-right.

### 3.3 Additional images

- Row/grid of up to 5 small square thumbnails (3 per row on mobile, 5 across on desktop where space permits).
- First empty slot shows a dashed **+** tile. Multiple files can be chosen at once; extras beyond the limit are rejected with a message.
- Each thumbnail has: remove button, and "Make primary" action (swaps with the primary image).

### 3.4 Preview and remove

- Previews use `URL.createObjectURL(file)`.
- **Revoke** object URLs on remove and on unmount (`URL.revokeObjectURL`) to avoid memory leaks.
- Removing the primary image: promote the next additional image to primary if one exists, otherwise return to the empty state.
- Remove buttons need `aria-label="Remove photo 2"` etc.

### 3.5 Photo errors (inline, under the section)

- `Only JPG and PNG images are allowed.`
- `"{filename}" is larger than 5 MB.`
- `You can add up to 6 photos.`
- `Add a primary photo to continue.` (shown on publish attempt)

### 3.6 Types

```ts
export type ListingImage = {
  id: string;          // crypto.randomUUID()
  file: File;
  previewUrl: string;  // object URL
  isPrimary: boolean;
};
```

---

## 4. Section B — Item Information

All inputs follow the profile page field style: compact label above, thin border, off-white fill, visible focus ring.

| Field | Control | Rules |
|---|---|---|
| Item title | Text input | Required, 3 to 80 chars, live counter `n/80` |
| Category | Select | Required. Options: Books, Electronics, Lab Equipment, Stationery, Furniture, Clothing, Sports, Other |
| Price | Number input with `₹` prefix | Required, integer, 1 to 100000, no negatives, no decimals |
| Description | Textarea (compact, 4 rows) | Required, 10 to 500 chars, live counter `n/500` |

Optional (include only if easy; otherwise leave out): **Condition** select (New, Like new, Good, Fair).

### Behavior

- Validate on blur and on publish attempt, not on every keystroke.
- Show error text below the field in a muted red, plus `aria-invalid` and `aria-describedby`.
- Trim whitespace before validating.
- Price input: block `e`, `+`, `-`, `.` keystrokes.

---

## 5. Section C — Seller Information (Auto)

Read-only rows using the same locked-row pattern as the profile page. The seller can't edit these here.

| Row | Source | Display |
|---|---|---|
| Seller name | `profile.name` | `Aarav Sharma` |
| Verified status | `profile.verified` | `✓ Verified Student` (text + icon, not color alone) |
| Campus | `profile.campusAddress` or campus constant | e.g. `ABC College` |

- Each row shows a small lock icon plus the text `auto`.
- Pull from the same profile data object used by the Profile Page (single source of truth, e.g. `useProfile()`).
- **If `verified` is false**: disable **Publish item**, and show a muted note "Only verified students can publish listings." Preview stays available.

---

## 6. Section D — Listing Actions

Two buttons at the bottom of the card, stacked on mobile, side by side on desktop.

| Button | Style | Behavior |
|---|---|---|
| **Preview listing** | Secondary, outlined | Opens preview modal. Enabled once there is at least a primary image and a title |
| **Publish item** | Primary, full-width or dominant | Enabled only when the form is valid and seller is verified |

### Publish states

```text
Invalid / incomplete   [ Publish item ]   ← disabled (aria-disabled)
Ready                  [ Publish item ]   ← enabled
Publishing             [ Publishing... ]  ← disabled, spinner
Success                [ Item published ] → navigate to confirmation state
Error                  inline error message + button re-enabled
```

### Preview modal

- Renders the listing exactly as a buyer would see it, reusing the existing `ResultCard` / item card component where possible, plus an expanded view with the image gallery, title, price, category, description, and seller block (name, verified badge).
- Buttons: **Back to editing** and **Publish item**.
- Focus trapped in modal, `Esc` closes, focus returns to the Preview button.

### Success state

- Replace form with a short confirmation: "Your item is live", thumbnail, title, and two links: **View listing** and **Add another item**.
- Also add a link back to the profile.

---

## 7. Data Model

```ts
export type Category =
  | 'Books' | 'Electronics' | 'Lab Equipment' | 'Stationery'
  | 'Furniture' | 'Clothing' | 'Sports' | 'Other';

export type ListingDraft = {
  title: string;
  category: Category | '';
  price: string;          // keep as string in the form, convert on publish
  description: string;
  images: ListingImage[]; // exactly one isPrimary
};

export type Listing = {
  id: string;
  title: string;
  category: Category;
  price: number;
  description: string;
  images: string[];        // data URLs for mock; primary first
  seller: {
    name: string;
    verified: boolean;
    campus: string;
  };
  createdAt: string;       // ISO
  status: 'active';
};
```

### Mock persistence (no backend)

- On publish, convert images to data URLs with `FileReader` (object URLs don't survive reload).
- Push the new `Listing` into the existing mock listings store (`useListings`), persisting to `localStorage` under a key such as `campx.listings`.
- Wrap `localStorage` writes in try/catch. If the quota is exceeded, show: "Images are too large to save. Remove a photo and try again."
- Keep the submit function behind one async function `createListing(draft, seller)` so it can later be swapped for a real API call without touching UI.

---

## 8. Component Structure

```text
ProfilePage
└── ProfileCard
    ├── SellSection                     (entry button on /profile)
    └── AddItemPanel                    (route /profile/add-item)
        ├── PanelHeader
        ├── PhotoUploader
        │   ├── PrimaryImageSlot
        │   ├── AdditionalImageGrid
        │   └── ImageThumb              (preview + remove + make primary)
        ├── ItemInfoFields
        │   ├── TitleField
        │   ├── CategorySelect
        │   ├── PriceField
        │   └── DescriptionField
        ├── SellerInfoRows              (read-only, auto)
        ├── ListingActions
        │   ├── PreviewButton
        │   └── PublishButton
        ├── PreviewModal
        └── PublishSuccess
```

### Suggested files

```text
src/features/listing/
  AddItemPanel.tsx
  PhotoUploader.tsx
  ItemInfoFields.tsx
  SellerInfoRows.tsx
  ListingActions.tsx
  PreviewModal.tsx
  PublishSuccess.tsx
  useListingDraft.ts      // form state, validation, image handling
  validators.ts           // title, price, description, image rules
  createListing.ts        // mock publish
  types.ts
```

---

## 9. Build Order for Antigravity

1. `types.ts`, `validators.ts` (image type/size, title, price, description rules).
2. `useListingDraft` hook (state, add/remove/promote images, object URL cleanup, errors).
3. `PhotoUploader` with primary slot, extra grid, drag and drop, and error messages.
4. `ItemInfoFields` with counters and validation.
5. `SellerInfoRows` wired to the profile data source.
6. `ListingActions`, `PreviewModal`, publish flow, `createListing` mock.
7. `SellSection` entry on the Profile Page and the `/profile/add-item` route (including the "Back to profile" link).
8. `PublishSuccess`, accessibility pass, responsive pass.

---

## 10. Responsive Behavior

- **Desktop**: centered narrow card, generous outer whitespace.
- **Tablet**: reduced outer margins, single column.
- **Mobile**: card near full viewport width; additional photo grid becomes 3 columns; action buttons stack with **Publish item** first; tap targets at least 44px.

---

## 11. Accessibility Requirements

- Every input has a visible `<label>`; errors linked with `aria-describedby`.
- Drop zones are real buttons or labels wrapping the file input, operable by keyboard.
- Remove and "Make primary" buttons have descriptive `aria-label`s.
- Counters and photo errors announced via `aria-live="polite"`.
- Disabled **Publish** exposes `aria-disabled` and the reason in nearby text.
- Verified status uses text plus icon, not color only.
- Modal: focus trap, `Esc` to close, focus restored on close.
- Visible focus styles on all controls; sufficient contrast on muted text.

---

## 12. Acceptance Criteria

- [ ] "Sell on CampX" section with **Add item** appears on the Profile Page.
- [ ] `/profile/add-item` shows the form inside the profile card shell with a "Back to profile" link.
- [ ] Only JPG/PNG accepted; other types and files over 5 MB are rejected with clear messages.
- [ ] Primary photo required; up to 5 additional photos; preview, remove, and make-primary all work.
- [ ] No leaked object URLs (revoked on remove and unmount).
- [ ] Title, category, price, description validated with the rules above.
- [ ] Seller name, verified status, and campus are auto-filled and read-only.
- [ ] Unverified sellers cannot publish.
- [ ] Preview shows the buyer's view; Publish creates a listing visible in search and dashboard mock data.
- [ ] Page matches the profile page style and works on mobile, tablet, and desktop.
