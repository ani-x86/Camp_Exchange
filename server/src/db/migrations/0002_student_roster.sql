CREATE TABLE IF NOT EXISTS students (
  prn           TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  college_email TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  roll_number   TEXT        NOT NULL,
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_students_prn_digits
    CHECK (prn ~ '^[0-9]+$'),
  CONSTRAINT chk_students_name_length
    CHECK (char_length(name) BETWEEN 2 AND 80),
  CONSTRAINT chk_students_email_lower
    CHECK (college_email = lower(college_email))
);
