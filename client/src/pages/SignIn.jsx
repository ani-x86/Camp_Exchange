import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/auth/AuthCard';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import FormField from '../components/auth/FormField';

import { loginWithGoogle } from '../services/firebase';
import { connectSocket } from '../features/chat/socket';

/**
 * SignIn page — email + password form with Google OAuth option.
 *
 * Follows Phase 1 auth spec (phases.md) and design.md §5 motion.
 * On sign-in submission, navigates directly to /dashboard.
 */
export default function SignIn() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address.';
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collegeEmail: email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sign-in failed.');
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('verificationStatus', data.user.verificationStatus);
      localStorage.setItem('userName', data.user.name);
      connectSocket(data.accessToken);
      navigate('/dashboard');
    } catch (err) {
      setErrors({ email: err.message || 'Sign-in failed — check your credentials and try again.' });
      setSubmitting(false);
    }
  };

  /** Firebase Google Sign-In */
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setErrors((prev) => ({ ...prev, google: null }));

    try {
      const user = await loginWithGoogle();
      const idToken = await user.getIdToken();

      // Store authenticated user session in localStorage
      localStorage.setItem('accessToken', idToken);
      localStorage.setItem('userId', user.uid);
      localStorage.setItem('userName', user.displayName || user.email?.split('@')[0] || 'CampX User');
      localStorage.setItem('userEmail', user.email || '');
      if (user.photoURL) {
        localStorage.setItem('userPhoto', user.photoURL);
      }
      localStorage.setItem('verificationStatus', 'verified');

      // Attempt optional backend user sync/lookup
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collegeEmail: user.email,
            firebaseUid: user.uid,
          }),
        });
        const data = await res.json();
        if (res.ok && data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          if (data.user?.id) localStorage.setItem('userId', data.user.id);
          if (data.user?.verificationStatus) localStorage.setItem('verificationStatus', data.user.verificationStatus);
          if (data.user?.name) localStorage.setItem('userName', data.user.name);
          connectSocket(data.accessToken);
        } else {
          connectSocket(idToken);
        }
      } catch {
        // Fallback to client-side Firebase session
        connectSocket(idToken);
      }

      navigate('/dashboard');
    } catch (err) {
      // Ignore user-initiated popup cancellation
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }

      let errorMsg = 'Google sign-in failed. Please try again.';
      if (err.code === 'auth/unauthorized-domain') {
        errorMsg = 'This domain is not authorized in Firebase Console (Authentication > Settings > Authorized domains).';
      } else if (err.code === 'auth/popup-blocked') {
        errorMsg = 'Popup blocked by browser. Please allow popups for this site.';
      } else if (err.message) {
        errorMsg = err.message;
      }

      setErrors((prev) => ({ ...prev, google: errorMsg }));
    } finally {
      setGoogleLoading(false);
    }
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
      <div className="relative">
        {/* Google OAuth — above the form per spec */}
        <GoogleAuthButton
          onClick={handleGoogleAuth}
          loading={googleLoading}
          disabled={submitting || googleLoading}
        />

        {errors.google && (
          <p className="mt-2 text-center text-xs text-rust font-sans" role="alert">
            {errors.google}
          </p>
        )}

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
      </div>
    </AuthCard>
  );
}
