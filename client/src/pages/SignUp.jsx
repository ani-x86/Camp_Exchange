import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/auth/AuthCard';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import FormField from '../components/auth/FormField';
import OtpInput from '../components/auth/OtpInput';
import AuthSuccessOverlay from '../components/auth/AuthSuccessOverlay';
import { getAuthGifs } from '../services/authGifs';

/**
 * SignUp page — two-step flow:
 *   Step 1: name, college email, PRN, password + Google OAuth
 *   Step 2: email OTP verification (6-digit code)
 *   → success GIF → redirect to /signin
 *
 * PRN field is rendered in IBM Plex Mono (design.md §2).
 * OTP digits are also monospace (literal data).
 *
 * Follows Phase 1 auth spec (phases.md) and design.md §5 motion.
 */
export default function SignUp() {
  const navigate = useNavigate();

  // ── Step 1: Registration form ──
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [prn, setPrn] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Step 2: OTP verification ──
  const [step, setStep] = useState(1); // 1 = form, 2 = OTP
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // ── Success overlay ──
  const [showSuccess, setShowSuccess] = useState(false);

  // ── Step 1 validation ──
  const validate = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Enter your full name.';
    }
    if (!email.trim()) {
      newErrors.email = 'Enter your college email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!prn.trim()) {
      newErrors.prn = 'Enter your PRN (Permanent Registration Number).';
    }
    if (!password) {
      newErrors.password = 'Choose a password.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }
    return newErrors;
  };

  // ── Step 1: Create account → sends OTP to email ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);

    try {
      // Stub: replace with actual API call to POST /api/auth/signup
      // This should create the account and send an OTP to the email
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Move to OTP step
      setStep(2);
      setSubmitting(false);
    } catch {
      setErrors({ email: 'Sign-up failed — try again or use a different email.' });
      setSubmitting(false);
    }
  };

  // ── Step 2: Verify OTP ──
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (otp.length < 6) {
      setOtpError('Enter the full 6-digit code.');
      return;
    }

    setVerifying(true);
    setOtpError('');

    try {
      // Stub: replace with actual API call to POST /api/auth/verify-otp
      await new Promise((resolve) => setTimeout(resolve, 400));

      // OTP verified — show success GIF
      setShowSuccess(true);
    } catch {
      setOtpError('Invalid code — check your email and try again.');
      setVerifying(false);
    }
  };

  // ── Resend OTP ──
  const handleResendOtp = async () => {
    setOtpError('');

    try {
      // Stub: replace with actual API call to POST /api/auth/resend-otp
      await new Promise((resolve) => setTimeout(resolve, 300));
      setOtp('');
      // Could show a toast here: "Code resent to your email."
    } catch {
      setOtpError('Could not resend — try again in a moment.');
    }
  };

  /** Stub — wire to actual Google OAuth redirect when backend is ready */
  const handleGoogleAuth = () => {
    console.log('Google OAuth flow triggered');
  };

  const handleSuccessComplete = () => {
    navigate('/signin');
  };

  // ── Dynamic card title/subtitle based on step ──
  const title = step === 1 ? 'Create account' : 'Verify your email';
  const subtitle =
    step === 1
      ? 'Join the CampusXchange community.'
      : `We sent a 6-digit code to ${email}`;

  return (
    <AuthCard
      title={title}
      subtitle={subtitle}
      footer={
        <span>
          Already have an account?{' '}
          <Link
            to="/signin"
            className="font-medium text-moss hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      {/* Wrapper for success overlay positioning */}
      <div className="relative">

        {/* ════════ Step 1: Registration form ════════ */}
        {step === 1 && (
          <>
            {/* Google OAuth — above the form per spec */}
            <GoogleAuthButton onClick={handleGoogleAuth} />

            {/* "or" divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-clay" />
              <span className="text-xs text-clay select-none">or</span>
              <div className="h-px flex-1 bg-clay" />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <FormField
                id="signup-name"
                label="Full name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                placeholder="Jane Doe"
                autoComplete="name"
                required
              />

              <FormField
                id="signup-email"
                label="College email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                placeholder="you@college.edu"
                autoComplete="email"
                required
              />

              <FormField
                id="signup-prn"
                label="PRN"
                type="text"
                value={prn}
                onChange={(e) => setPrn(e.target.value)}
                error={errors.prn}
                placeholder="e.g. 12210456"
                mono
                required
              />

              <FormField
                id="signup-password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
              />

              {/* Primary submit button — design.md §5 */}
              <button
                type="submit"
                disabled={submitting}
                className={`
                  group relative mt-2 w-full rounded-sm px-4 py-2.5
                  font-sans text-sm font-medium
                  transition-[background-color,transform] duration-150 ease-out
                  ${
                    submitting
                      ? 'cursor-not-allowed border border-clay bg-clay text-ink/40'
                      : 'cursor-pointer bg-moss text-bone hover:bg-moss-hover active:scale-[0.97] active:duration-100'
                  }
                `}
              >
                <span className="relative z-10">
                  {submitting ? 'Creating account…' : 'Create account'}
                </span>

                {!submitting && (
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
            </form>
          </>
        )}

        {/* ════════ Step 2: OTP Verification ════════ */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} noValidate>
            <div className="py-4">
              <OtpInput
                value={otp}
                onChange={setOtp}
                error={otpError}
                disabled={verifying}
              />
            </div>

            {/* Verify button — primary button spec */}
            <button
              type="submit"
              disabled={verifying}
              className={`
                group relative mt-2 w-full rounded-sm px-4 py-2.5
                font-sans text-sm font-medium
                transition-[background-color,transform] duration-150 ease-out
                ${
                  verifying
                    ? 'cursor-not-allowed border border-clay bg-clay text-ink/40'
                    : 'cursor-pointer bg-moss text-bone hover:bg-moss-hover active:scale-[0.97] active:duration-100'
                }
              `}
            >
              <span className="relative z-10">
                {verifying ? 'Verifying…' : 'Verify email'}
              </span>

              {!verifying && (
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

            {/* Resend link */}
            <p className="mt-4 text-center text-sm text-ink/60">
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={handleResendOtp}
                className="font-medium text-moss hover:underline cursor-pointer"
              >
                Resend
              </button>
            </p>
          </form>
        )}

        {/* Post-auth success GIF overlay */}
        <AuthSuccessOverlay
          gifs={getAuthGifs()}
          active={showSuccess}
          onComplete={handleSuccessComplete}
        />
      </div>
    </AuthCard>
  );
}
