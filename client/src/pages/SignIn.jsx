import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/auth/AuthCard';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import FormField from '../components/auth/FormField';
import AuthSuccessOverlay from '../components/auth/AuthSuccessOverlay';
import { getAuthGifs } from '../services/authGifs';

/**
 * SignIn page — email + password form with Google OAuth option.
 *
 * Follows Phase 1 auth spec (phases.md) and design.md §5 motion.
 * Backend auth logic is assumed to be wired up separately.
 */
export default function SignIn() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Enter your college email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!password) {
      newErrors.password = 'Enter your password.';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);

    try {
      // Stub: replace with actual API call to POST /api/auth/login
      // const res = await fetch('/api/auth/login', { ... });
      // Simulate success for now:
      await new Promise((resolve) => setTimeout(resolve, 400));

      setShowSuccess(true);
    } catch {
      setErrors({ email: 'Sign-in failed — check your credentials and try again.' });
      setSubmitting(false);
    }
  };

  /** Stub — wire to actual Google OAuth redirect when backend is ready */
  const handleGoogleAuth = () => {
    // Will call the OAuth service; for now, just log intent
    console.log('Google OAuth flow triggered');
  };

  const handleSuccessComplete = () => {
    navigate('/dashboard');
  };

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to CampusXchange."
      footer={
        <span>
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="font-medium text-moss hover:underline"
          >
            Sign up
          </Link>
        </span>
      }
    >
      {/* Wrapper for success overlay positioning */}
      <div className="relative">
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
            id="signin-email"
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
            id="signin-password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          {/* Primary submit button — design.md §5 buttons spec */}
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
              {submitting ? 'Signing in…' : 'Sign in'}
            </span>

            {/* Underline accent grows from center on hover — 150ms */}
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
