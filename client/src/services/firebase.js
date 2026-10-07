import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'camp-x.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'camp-x',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'camp-x.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase app singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth & Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Register with Email and Password
 */
export async function registerWithEmailPassword(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  return cred.user;
}

/**
 * Sign in with Email and Password
 */
export async function loginWithEmailPassword(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/**
 * Setup RecaptchaVerifier for Phone Authentication
 * @param {string} containerOrButtonId - DOM element ID or button ID
 * @param {object} options - Recaptcha parameters
 */
export function initPhoneRecaptcha(containerOrButtonId = 'recaptcha-container', options = {}) {
  // Clear any existing verifier on window if necessary
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      // ignore
    }
  }

  const verifier = new RecaptchaVerifier(auth, containerOrButtonId, {
    size: options.size || 'invisible',
    callback: options.callback,
    'expired-callback': options.onExpired,
  });

  window.recaptchaVerifier = verifier;
  return verifier;
}

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - Full phone number in E.164 format (+919876543210)
 * @param {RecaptchaVerifier} verifier
 */
export async function sendPhoneOtp(phoneNumber, verifier) {
  const appVerifier = verifier || window.recaptchaVerifier || initPhoneRecaptcha();
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  window.confirmationResult = confirmationResult;
  return confirmationResult;
}

/**
 * Confirm Phone OTP code
 * @param {string} code - 6-digit code
 * @param {object} confirmation - ConfirmationResult from signInWithPhoneNumber
 */
export async function verifyPhoneOtp(code, confirmation) {
  const confirmationResult = confirmation || window.confirmationResult;
  if (!confirmationResult) {
    throw new Error('No pending phone verification session found.');
  }
  const result = await confirmationResult.confirm(code);
  return result.user;
}

/**
 * Sign out
 */
export async function logoutUser() {
  await signOut(auth);
}

/**
 * Observe auth state changes
 */
export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}
