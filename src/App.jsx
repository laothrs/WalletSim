import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';

// Sayfa Bileşenleri
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import WalletPage from './pages/WalletPage';
import SendPage from './pages/SendPage';
import HistoryPage from './pages/HistoryPage';

// Simgeler
import { IoWalletOutline, IoSendOutline, IoTimeOutline } from 'react-icons/io5';

// Bileşenler
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register')) {
        navigate('/dashboard');
      } else if (!isAuthenticated && location.pathname !== '/register') {
        navigate('/login');
      }
    }
  }, [loading, isAuthenticated, navigate, location.pathname]);


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#121827] text-white">Yükleniyor...</div>;
  }

  const showNavBar = isAuthenticated || location.pathname === '/register' || location.pathname === '/login';

  return (
    <div className="min-h-screen flex flex-col bg-[#121827]">
      <main className="flex-grow">
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
          <Route path="/send" element={<ProtectedRoute><SendPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/" element={isAuthenticated ? <ProtectedRoute><WalletPage /></ProtectedRoute> : <LoginPage />} />
        </Routes>
      </main>

      {showNavBar && (
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex justify-around p-2 shadow-lg z-50">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center p-2 rounded-lg ${location.pathname === '/dashboard' ? 'text-blue-400' : 'text-gray-400'} hover:text-blue-300 transition-colors duration-200`}
          >
            <IoWalletOutline className="text-2xl" />
            <span className="text-xs">Cüzdan</span>
          </button>
          <button
            onClick={() => navigate('/send')}
            className={`flex flex-col items-center p-2 rounded-lg ${location.pathname === '/send' ? 'text-blue-400' : 'text-gray-400'} hover:text-blue-300 transition-colors duration-200`}
          >
            <IoSendOutline className="text-2xl" />
            <span className="text-xs">Gönder</span>
          </button>
          <button
            onClick={() => navigate('/history')}
            className={`flex flex-col items-center p-2 rounded-lg ${location.pathname === '/history' ? 'text-blue-400' : 'text-gray-400'} hover:text-blue-300 transition-colors duration-200`}
          >
            <IoTimeOutline className="text-2xl" />
            <span className="text-xs">Geçmiş</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
