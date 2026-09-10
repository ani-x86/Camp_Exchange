import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';

/**
 * Root application shell.
 * Only auth routes exist at this stage (Phase 1).
 * Additional routes will be added as phases land.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Placeholder dashboard route — will be replaced by actual pages later */}
      <Route
        path="/dashboard"
        element={
          <div className="flex min-h-screen items-center justify-center bg-bone font-sans text-ink">
            <h1 className="font-heading text-3xl font-bold">
              Welcome to CampusXchange
            </h1>
          </div>
        }
      />

      {/* Default redirect to sign-in */}
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  );
}
