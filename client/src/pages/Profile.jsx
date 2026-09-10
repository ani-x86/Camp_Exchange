import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProfilePhoto from '../components/profile/ProfilePhoto';
import ProfileField from '../components/profile/ProfileField';
import BioBox from '../components/profile/BioBox';

/**
 * Initial mock profile data representing a verified college student.
 * In production Phase 2, this will be wired to RTK Query / authSlice.
 */
const INITIAL_PROFILE = {
  name: 'Aarav Sharma',
  email: 'aarav.sharma@college.edu',
  mobile: '+91 98765 43210',
  prn: '12210456',
  branch: 'Computer Engineering',
  year: '3rd Year (Sem 5)',
  address: 'Hostel Block B, Room 314',
  bio: 'CS student trading tech books, lab equipment, and desk accessories before semester break.',
  photoUrl: null,
  isVerified: true,
};

/**
 * Profile — minimal, compact User Profile page for CampusXchange.
 *
 * Rules (design.md / architecture.md):
 *  - One column, no dashboard widgets, no sidebar, no tabs.
 *  - Single compact card (max-width ~480px) with Marigold string-tag accent.
 *  - Read-only fields: full name, PRN, branch, year, address — plain text, not disabled inputs.
 *  - Editable fields: email, mobile number, bio, profile photo.
 *  - PRN in IBM Plex Mono (data looks like data).
 *  - Bio in Inter (prose).
 *  - Primary save button with hover underline-grow and press 0.97 scale.
 *  - Toast confirmation with asymmetric slide-up/fade enter and fade-only exit.
 */
export default function Profile() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [draftProfile, setDraftProfile] = useState(INITIAL_PROFILE);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { message, exiting: boolean } | null

  // Check if anything changed compared to saved profile
  const isDirty =
    draftProfile.email !== profile.email ||
    draftProfile.mobile !== profile.mobile ||
    draftProfile.bio !== profile.bio ||
    draftProfile.photoUrl !== profile.photoUrl;

  const showToast = (message) => {
    setToast({ message, exiting: false });

    // Exit transition starts at 2700ms
    setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, exiting: true } : null));

      // Unmount after 150ms fade-out
      setTimeout(() => {
        setToast(null);
      }, 150);
    }, 2700);
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    if (!isDirty || saving) return;

    setSaving(true);

    try {
      // Simulate API call (PUT /api/users/profile)
      await new Promise((resolve) => setTimeout(resolve, 350));
      setProfile(draftProfile);
      setSaving(false);
      showToast('Profile updated');
    } catch {
      setSaving(false);
    }
  };

  const validateEmail = (val) => {
    if (!val.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      return 'Enter a valid college email address.';
    }
    return null;
  };

  const validateMobile = (val) => {
    if (!val.trim()) return 'Mobile number is required.';
    // Standard phone validation (allow spaces, +country code, digits)
    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 13) {
      return 'Enter a valid 10-digit mobile number.';
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-bone font-sans text-ink">
      {/* ── Top Navigation Bar ── */}
      <header className="border-b border-clay bg-bone px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-ink hover:text-moss transition-colors duration-120"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to board</span>
          </Link>

          <Link
            to="/dashboard"
            className="font-heading text-lg font-bold text-ink no-underline"
            aria-label="CampusXchange home"
          >
            CampX
          </Link>
        </div>
      </header>

      {/* ── Main Compact Profile Card ── */}
      <main className="flex justify-center px-4 py-8 sm:py-12">
        <div className="relative w-full max-w-[480px]">
          {/* Marigold string-tag accent — design.md §3 pinboard aesthetic */}
          <div
            className="absolute -top-2 -left-2 h-6 w-6 rounded-br-lg bg-marigold select-none"
            aria-hidden="true"
          />

          <div className="rounded-sm border border-clay bg-bone px-6 py-7 sm:px-8">
            {/* Header: Photo + Name + Verification badge (Horizontal layout) */}
            <div className="flex items-center gap-4 sm:gap-5 pb-5 border-b border-clay">
              <div className="shrink-0">
                <ProfilePhoto
                  initialUrl={draftProfile.photoUrl}
                  name={draftProfile.name}
                  onPhotoChange={(newUrl) =>
                    setDraftProfile((prev) => ({ ...prev, photoUrl: newUrl }))
                  }
                />
              </div>

              {/* Full Name & Student details — horizontal to photo */}
              <div className="flex-1 min-w-0">
                <h1 className="font-heading text-xl font-bold text-ink sm:text-2xl truncate">
                  {profile.name}
                </h1>

                {/* Verified badge — design.md §6 */}
                {profile.isVerified && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-moss font-medium">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Verified Student</span>
                  </div>
                )}

                <p className="mt-1 text-xs text-ink/50 font-sans">
                  {profile.branch} • {profile.year}
                </p>
              </div>
            </div>

            {/* Fields list */}
            <div className="space-y-1">
              {/* Email (Editable) */}
              <ProfileField
                label="College email"
                value={draftProfile.email}
                type="email"
                isEditable={true}
                onChange={(val) =>
                  setDraftProfile((prev) => ({ ...prev, email: val }))
                }
                validate={validateEmail}
                notice="Note: Changing your college email will re-trigger OTP verification to maintain student verification status."
              />

              {/* Mobile Number (Editable) */}
              <ProfileField
                label="Mobile number"
                value={draftProfile.mobile}
                type="tel"
                isEditable={true}
                onChange={(val) =>
                  setDraftProfile((prev) => ({ ...prev, mobile: val }))
                }
                validate={validateMobile}
              />

              {/* PRN (Read-only, locked, literal data in IBM Plex Mono) */}
              <ProfileField
                label="PRN (Permanent Registration No.)"
                value={profile.prn}
                isEditable={false}
                isLocked={true}
                isMono={true}
              />

              {/* Branch (Read-only, locked) */}
              <ProfileField
                label="Branch / Department"
                value={profile.branch}
                isEditable={false}
                isLocked={true}
              />

              {/* Year (Read-only, locked) */}
              <ProfileField
                label="Academic year"
                value={profile.year}
                isEditable={false}
                isLocked={true}
              />

              {/* Address (Read-only, locked) */}
              <ProfileField
                label="Campus address"
                value={profile.address}
                isEditable={false}
                isLocked={true}
              />
            </div>

            {/* Hairline divider */}
            <div className="my-5 border-t border-clay" />

            {/* Bio Box */}
            <BioBox
              value={draftProfile.bio}
              onChange={(val) =>
                setDraftProfile((prev) => ({ ...prev, bio: val }))
              }
              maxLength={300}
              disabled={saving}
            />

            {/* Save Changes Button — design.md §5 primary button spec */}
            <div className="mt-6 pt-2">
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={!isDirty || saving}
                className={`
                  group relative w-full rounded-sm px-4 py-2.5
                  font-sans text-sm font-medium
                  transition-[background-color,transform] duration-150 ease-out
                  ${
                    !isDirty || saving
                      ? 'cursor-not-allowed border border-clay bg-clay text-ink/40'
                      : 'cursor-pointer bg-moss text-bone hover:bg-moss-hover active:scale-[0.97] active:duration-100'
                  }
                `}
              >
                <span className="relative z-10">
                  {saving ? 'Saving changes…' : 'Save changes'}
                </span>

                {/* Underline accent grows from center on hover — 150ms */}
                {isDirty && !saving && (
                  <span
                    className="
                      absolute bottom-2 left-1/2 h-px w-3/5
                      -translate-x-1/2 scale-x-0
                      bg-bone/50
                      transition-transform duration-150 ease-out
                      group-hover:scale-x-100
                    "
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Toast Notification ── */}
      {/* design.md §5: Enter slide-up 12px + fade 180ms; Exit fade only 150ms */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <div
            className={`
              flex items-center gap-2 rounded-sm border border-moss bg-bone px-4 py-2.5
              font-sans text-sm font-medium text-ink shadow-sm
              ${
                toast.exiting
                  ? 'animate-[toast-exit_150ms_ease-out_forwards]'
                  : 'animate-[toast-enter_180ms_ease-out_forwards]'
              }
            `}
          >
            {/* Moss confirmation checkmark */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3F6B3E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
