-- =============================================================================
-- CampX — Migration 0001: Initial schema
-- database.md §4, §5
--
-- Rules:
--   • UUID PKs from gen_random_uuid() (pgcrypto / pg 13+ built-in).
--   • Enums stored as TEXT + named CHECK constraints. Easier to extend than
--     native ENUM types; repos import matching arrays from constants.js.
--   • Money: INTEGER, whole rupees.
--   • All multi-row CHECK constraint names follow: chk_<table>_<column>.
--   • One shared trigger function set_updated_at() keeps updated_at current.
--   • This migration is idempotent: migrate.ts skips it if already applied.
-- =============================================================================

-- Enable the extension that provides gen_random_uuid() on older PG versions
-- (PG 13+ has it built in; this is a no-op there).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- Shared trigger function — keeps updated_at = now() on every UPDATE
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- TABLE: users
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT        NOT NULL,
  college_email           TEXT        NOT NULL,
  password_hash           TEXT        NOT NULL,
  prn                     TEXT        NOT NULL,
  mobile_number           TEXT,
  department              TEXT,
  academic_year           TEXT,
  campus_address          TEXT,
  campus                  TEXT        NOT NULL DEFAULT 'ABC College',
  bio                     TEXT,
  avatar_url              TEXT,
  -- Cloudinary public ID of the private ID-card asset (never a public URL)
  id_card_image_public_id TEXT,
  verification_status     TEXT        NOT NULL DEFAULT 'pending',
  verification_confidence NUMERIC(4,3),
  verified_at             TIMESTAMPTZ,
  role                    TEXT        NOT NULL DEFAULT 'student',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- email is always stored lowercase (enforced in repo before insert too)
  CONSTRAINT chk_users_college_email_lower
    CHECK (college_email = lower(college_email)),

  CONSTRAINT chk_users_name_length
    CHECK (char_length(name) BETWEEN 2 AND 80),

  CONSTRAINT chk_users_prn_digits
    CHECK (prn ~ '^[0-9]+$'),

  -- E.164 mobile: +<country><number>
  CONSTRAINT chk_users_mobile_e164
    CHECK (mobile_number IS NULL OR mobile_number ~ '^\+[1-9][0-9]{7,14}$'),

  CONSTRAINT chk_users_bio_max
    CHECK (bio IS NULL OR char_length(bio) <= 300),

  CONSTRAINT chk_users_verification_status
    CHECK (verification_status IN (
      'pending','pending_review','verified','rejected'
    )),

  CONSTRAINT chk_users_verification_confidence
    CHECK (verification_confidence IS NULL
           OR verification_confidence BETWEEN 0 AND 1),

  CONSTRAINT chk_users_role
    CHECK (role IN ('student','admin'))
);

-- Unique indexes on users
-- login / duplicate signup
CREATE UNIQUE INDEX IF NOT EXISTS uidx_users_college_email ON users (college_email);
-- duplicate registration number
CREATE UNIQUE INDEX IF NOT EXISTS uidx_users_prn          ON users (prn);
-- admin review queue
CREATE INDEX IF NOT EXISTS idx_users_verification_queue
  ON users (verification_status, created_at);

-- updated_at trigger for users
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: products
-- =============================================================================
CREATE TABLE IF NOT EXISTS products (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id         UUID        NOT NULL
                      REFERENCES users(id) ON DELETE RESTRICT,
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL,
  category          TEXT        NOT NULL,
  condition         TEXT,
  price             INTEGER     NOT NULL,
  -- JSONB array of {url, publicId}. First element is primary image.
  images            JSONB       NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'available',
  -- Set only while status = 'reserved'. Cleared to NULL when status changes.
  reserved_for      UUID
                      REFERENCES users(id) ON DELETE SET NULL,
  pickup_location   TEXT,
  pickup_time_window TEXT,
  view_count        INTEGER     NOT NULL DEFAULT 0,
  sold_at           TIMESTAMPTZ,
  -- Full-text search vector: title (weight A) || description (weight B).
  -- GENERATED ALWAYS so it is always in sync without application code.
  search_vector     TSVECTOR    GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_products_title_length
    CHECK (char_length(title) BETWEEN 3 AND 80),

  CONSTRAINT chk_products_description_length
    CHECK (char_length(description) BETWEEN 10 AND 500),

  CONSTRAINT chk_products_category
    CHECK (category IN (
      'books','electronics','lab-equipment','stationery',
      'furniture','clothing','sports','other'
    )),

  CONSTRAINT chk_products_condition
    CHECK (condition IS NULL OR condition IN ('new','like-new','good','fair')),

  CONSTRAINT chk_products_price
    CHECK (price BETWEEN 1 AND 100000),

  CONSTRAINT chk_products_view_count
    CHECK (view_count >= 0),

  CONSTRAINT chk_products_status
    CHECK (status IN ('available','reserved','sold')),

  -- reserved_for may only be set when status = 'reserved'
  CONSTRAINT chk_products_reserved_consistency
    CHECK (status = 'reserved' OR reserved_for IS NULL),

  -- sold_at must be set if and only if status = 'sold'
  CONSTRAINT chk_products_sold_at_consistency
    CHECK ((status = 'sold') = (sold_at IS NOT NULL)),

  -- images must be a JSON array of 1-6 items
  CONSTRAINT chk_products_images_array
    CHECK (jsonb_typeof(images) = 'array'
           AND jsonb_array_length(images) BETWEEN 1 AND 6),

  -- Second line of defence against data: URLs (repo also validates)
  CONSTRAINT chk_products_images_no_data_url
    CHECK (images::text NOT LIKE '%data:%')
);

-- products indexes
-- Full-text search (search bar)
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON products USING GIN (search_vector);
-- Browse with category + price filters
CREATE INDEX IF NOT EXISTS idx_products_browse
  ON products (status, category, price);
-- Newest-first feed / dashboard featured
CREATE INDEX IF NOT EXISTS idx_products_newest
  ON products (status, created_at DESC);
-- Seller "My Listings" dashboard
CREATE INDEX IF NOT EXISTS idx_products_seller
  ON products (seller_id, created_at DESC);

-- updated_at trigger for products
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: transactions
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable so receipts survive product deletion
  product_id            UUID        REFERENCES products(id) ON DELETE SET NULL,
  buyer_id              UUID        NOT NULL
                          REFERENCES users(id) ON DELETE RESTRICT,
  seller_id             UUID        NOT NULL
                          REFERENCES users(id) ON DELETE RESTRICT,
  -- Price snapshot: copied at checkout, never recomputed
  amount                INTEGER     NOT NULL,
  -- Snapshot ensures receipts survive product edits or deletion
  product_title         TEXT        NOT NULL,
  product_image_url     TEXT        NOT NULL,
  payment_status        TEXT        NOT NULL DEFAULT 'created',
  razorpay_order_id     TEXT        NOT NULL,
  razorpay_payment_id   TEXT,
  paid_at               TIMESTAMPTZ,
  pickup_location       TEXT,
  pickup_time_window    TEXT,
  receipt_sent_at       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_transactions_amount
    CHECK (amount > 0),

  CONSTRAINT chk_transactions_payment_status
    CHECK (payment_status IN ('created','paid','failed')),

  -- buyer and seller must be different people
  CONSTRAINT chk_transactions_buyer_ne_seller
    CHECK (buyer_id <> seller_id),

  -- paid_at and razorpay_payment_id are set if and only if status = 'paid'
  CONSTRAINT chk_transactions_paid_consistency
    CHECK (
      (payment_status = 'paid')
      = (paid_at IS NOT NULL AND razorpay_payment_id IS NOT NULL)
    )
);

-- transactions indexes
-- Webhook lookup by Razorpay order ID
CREATE UNIQUE INDEX IF NOT EXISTS uidx_transactions_razorpay_order
  ON transactions (razorpay_order_id);
-- Duplicate webhook protection (Postgres allows multiple NULLs in unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_transactions_razorpay_payment
  ON transactions (razorpay_payment_id);
-- One paid transaction per product (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_transactions_one_paid_per_product
  ON transactions (product_id) WHERE payment_status = 'paid';
-- Buyer order history
CREATE INDEX IF NOT EXISTS idx_transactions_buyer
  ON transactions (buyer_id, created_at DESC);
-- Seller sales history
CREATE INDEX IF NOT EXISTS idx_transactions_seller
  ON transactions (seller_id, created_at DESC);

-- updated_at trigger for transactions
DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Payment status state-machine trigger ──────────────────────────────────────
-- Only 'created → paid' and 'created → failed' are legal.
-- All other transitions raise an exception so no code path can bypass this.
CREATE OR REPLACE FUNCTION enforce_payment_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.payment_status = NEW.payment_status THEN
    RETURN NEW; -- no-op update, allow
  END IF;
  IF OLD.payment_status = 'created' AND NEW.payment_status IN ('paid','failed') THEN
    RETURN NEW; -- legal transition
  END IF;
  RAISE EXCEPTION
    'Illegal payment_status transition: % → %. Only created→paid and created→failed are allowed.',
    OLD.payment_status, NEW.payment_status
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_payment_status ON transactions;
CREATE TRIGGER trg_transactions_payment_status
  BEFORE UPDATE OF payment_status ON transactions
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_status_transition();

-- =============================================================================
-- TABLE: otps
-- =============================================================================
CREATE TABLE IF NOT EXISTS otps (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  code_hash   TEXT        NOT NULL,
  purpose     TEXT        NOT NULL,
  attempts    SMALLINT    NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  -- For 'signup' purpose: stores {name, prn, passwordHash} so the user row
  -- is only created after OTP is verified (avoids orphaned pending users).
  temp_data   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_otps_email_lower
    CHECK (email = lower(email)),

  CONSTRAINT chk_otps_purpose
    CHECK (purpose IN ('signup','reset')),

  CONSTRAINT chk_otps_attempts
    CHECK (attempts BETWEEN 0 AND 5)
);

-- otps indexes
-- Purge job — find expired rows efficiently
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps (expires_at);
-- Latest OTP lookup (most recent valid OTP for email + purpose)
CREATE INDEX IF NOT EXISTS idx_otps_lookup
  ON otps (email, purpose, created_at DESC);

-- =============================================================================
-- TABLE: wishlists  (composite PK — no id column needed)
-- =============================================================================
CREATE TABLE IF NOT EXISTS wishlists (
  user_id     UUID        NOT NULL
                REFERENCES users(id)    ON DELETE CASCADE,
  product_id  UUID        NOT NULL
                REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, product_id)
);
-- PK already serves as the unique + lookup index.

-- =============================================================================
-- TABLE: reports
-- =============================================================================
CREATE TABLE IF NOT EXISTS reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID        NOT NULL
                 REFERENCES users(id)    ON DELETE CASCADE,
  product_id   UUID        NOT NULL
                 REFERENCES products(id) ON DELETE CASCADE,
  reason       TEXT        NOT NULL,
  details      TEXT,
  status       TEXT        NOT NULL DEFAULT 'open',
  -- admin who reviewed this report
  reviewed_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_reports_reason
    CHECK (reason IN ('spam','prohibited-item','misleading','harassment','other')),

  CONSTRAINT chk_reports_details_max
    CHECK (details IS NULL OR char_length(details) <= 300),

  CONSTRAINT chk_reports_status
    CHECK (status IN ('open','reviewed','dismissed','actioned'))
);

-- reports indexes
-- Admin review queue (open reports, oldest first)
CREATE INDEX IF NOT EXISTS idx_reports_admin_queue
  ON reports (status, created_at);
-- Prevent a user from reporting the same listing twice
CREATE UNIQUE INDEX IF NOT EXISTS uidx_reports_reporter_product
  ON reports (reporter_id, product_id);

-- updated_at trigger for reports
DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: refresh_tokens
-- =============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL
                REFERENCES users(id) ON DELETE CASCADE,
  -- Only a hash of the raw token is stored (raw token lives in httpOnly cookie)
  token_hash  TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  -- Set on logout / rotation; allows detecting replay of revoked tokens
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- refresh_tokens indexes
-- Cleanup job
CREATE INDEX  IF NOT EXISTS idx_refresh_tokens_expires_at
  ON refresh_tokens (expires_at);
-- Token lookup on refresh + revoke
CREATE UNIQUE INDEX IF NOT EXISTS uidx_refresh_tokens_hash
  ON refresh_tokens (token_hash);

-- =============================================================================
-- TABLE: conversations  (chat feature — kept in SQL alongside other data)
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        UUID        REFERENCES products(id) ON DELETE SET NULL,
  buyer_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Snapshot: keeps inbox readable if the listing is edited or removed
  listing_title     TEXT        NOT NULL,
  listing_price     INTEGER     NOT NULL,
  listing_image_url TEXT        NOT NULL,
  last_message_body TEXT,
  last_message_at   TIMESTAMPTZ,
  unread_buyer      INTEGER     NOT NULL DEFAULT 0,
  unread_seller     INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_conversations_buyer_ne_seller
    CHECK (buyer_id <> seller_id),

  -- One conversation per (listing, buyer, seller) triplet
  CONSTRAINT uq_conversations_triplet
    UNIQUE (listing_id, buyer_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer
  ON conversations (buyer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_seller
  ON conversations (seller_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: messages
-- =============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        NOT NULL
                     REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID        NOT NULL
                     REFERENCES users(id) ON DELETE CASCADE,
  body             TEXT        NOT NULL,
  type             TEXT        NOT NULL DEFAULT 'text',
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_messages_type  CHECK (type IN ('text')),
  CONSTRAINT chk_messages_body  CHECK (char_length(body) BETWEEN 1 AND 1000)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages (conversation_id, created_at DESC);

-- =============================================================================
-- Migration tracking table (managed by migrate.js, not part of app schema)
-- =============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  name       TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
