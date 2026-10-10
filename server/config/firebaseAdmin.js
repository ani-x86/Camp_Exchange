import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let firebaseAuth;

export function verifyFirebaseIdToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    const error = new Error('FIREBASE_PROJECT_ID is not configured on the server.');
    error.status = 503;
    throw error;
  }

  if (!firebaseAuth) {
    const app = getApps()[0] || initializeApp({ projectId });
    if (app.options.projectId !== projectId) {
      const error = new Error('Firebase Admin is configured for a different project.');
      error.status = 503;
      throw error;
    }
    firebaseAuth = getAuth(app);
  }

  return firebaseAuth.verifyIdToken(idToken);
}
