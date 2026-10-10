import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthCard from '../components/auth/AuthCard';
import FormField from '../components/auth/FormField';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import { readApiResponse } from '../services/apiResponse';
import { loginWithGoogle, logoutUser } from '../services/firebase';
import { connectSocket } from '../features/chat/socket';

export default function SignIn() {
  const navigate = useNavigate();
  const [prn, setPrn] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prn, password }),
      });
      const data = await readApiResponse(
        response,
        'Could not verify those student credentials.'
      );

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('verificationStatus', data.user.verificationStatus);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userEmail', data.user.collegeEmail);
      connectSocket(data.accessToken);
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.message || 'Could not verify those student credentials.');
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    let firebaseUser;

    try {
      firebaseUser = await loginWithGoogle();
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await readApiResponse(
        response,
        'Google sign-in could not be verified.'
      );

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('verificationStatus', data.user.verificationStatus);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userEmail', data.user.collegeEmail);
      connectSocket(data.accessToken);
      navigate('/dashboard');
    } catch (signInError) {
      if (firebaseUser) {
        try {
          await logoutUser();
        } catch {
          setError('Google sign-in failed, and the Firebase session could not be cleared. Reload this page and try again.');
          return;
        }
      }

      if (signInError.code === 'auth/popup-closed-by-user'
        || signInError.code === 'auth/cancelled-popup-request') {
        return;
      }

      const messages = {
        'auth/invalid-api-key': 'Firebase API key is invalid. Check client/.env.',
        'auth/unauthorized-domain': 'This site is not authorized for Firebase sign-in. Add its hostname in Firebase Authentication settings.',
        'auth/operation-not-allowed': 'Google sign-in is not enabled for this Firebase project.',
        'auth/popup-blocked': 'The browser blocked the Google sign-in popup. Allow popups and try again.',
      };
      setError(messages[signInError.code] || signInError.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthCard
      title="Student access"
      subtitle="Sign in with your registered Google account or student PRN and password."
    >
      <GoogleAuthButton
        onClick={handleGoogleSignIn}
        loading={googleLoading}
        disabled={submitting || googleLoading}
      />

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-clay" />
        <span className="text-xs text-clay select-none">or</span>
        <div className="h-px flex-1 bg-clay" />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="student-prn"
          label="PRN"
          value={prn}
          onChange={(event) => setPrn(event.target.value)}
          placeholder="Enter your PRN"
          autoComplete="username"
          mono
          required
        />

        <FormField
          id="student-password"
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={submitting || googleLoading || !prn.trim() || !password}
          className={`
            group relative mt-2 w-full rounded-sm px-4 py-2.5
            font-sans text-sm font-medium
            transition-[background-color,transform] duration-150 ease-out
            ${
              submitting || googleLoading || !prn.trim() || !password
                ? 'cursor-not-allowed border border-clay bg-clay text-ink/40'
                : 'cursor-pointer bg-moss text-bone hover:bg-moss-hover active:scale-[0.97] active:duration-100'
            }
          `}
        >
          <span className="relative z-10">
            {submitting ? 'Checking…' : 'Continue'}
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
      {error && (
        <p className="mt-4 text-sm text-rust" role="alert">
          {error}
        </p>
      )}
    </AuthCard>
  );
}
