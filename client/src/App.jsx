import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Cart from './pages/Cart';
import Help from './pages/Help';
import ProductDetail from './pages/ProductDetail';
import MessagesPage from './pages/MessagesPage';
import { connectSocket } from './features/chat/socket';

export default function App() {
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      connectSocket(token);
    }
  }, []);
  return (
    <Routes>
      <Route path="/"            element={<Navigate to="/dashboard" replace />} />
      <Route path="/signin"      element={<SignIn />} />
      <Route path="/signup"      element={<SignUp />} />
      <Route path="/dashboard"   element={<Dashboard />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/profile"          element={<Profile />} />
      <Route path="/profile/add-item" element={<Profile />} />
      <Route path="/cart"        element={<Cart />} />
      <Route path="/help"        element={<Help />} />
      <Route path="/messages"    element={<MessagesPage />} />
      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  );
}
