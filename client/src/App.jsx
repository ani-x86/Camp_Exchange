import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Cart from './pages/Cart';
import Help from './pages/Help';

export default function App() {
  return (
    <Routes>
      <Route path="/signin"    element={<SignIn />} />
      <Route path="/signup"    element={<SignUp />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile"   element={<Profile />} />
      <Route path="/cart"      element={<Cart />} />
      <Route path="/help"      element={<Help />} />
      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  );
}
