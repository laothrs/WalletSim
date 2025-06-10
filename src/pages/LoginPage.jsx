import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

// Simgeler
import { IoMailOutline, IoLockClosedOutline, IoLogoGoogle } from 'react-icons/io5';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard'); // Redirect to dashboard page
    } catch (error) {
      console.error("Giriş hatası:", error.message);
      let errorMessage = "Giriş başarısız oldu. Lütfen e-posta adresinizi ve şifrenizi kontrol edin.";
      if (error.code === 'auth/invalid-email') {
        errorMessage = "Geçersiz e-posta adresi.";
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Geçersiz e-posta veya parola.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Çok fazla hatalı giriş denemesi. Lütfen daha sonra tekrar deneyin.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log("Google ile devam et düğmesine tıklandı.");
    // Implement Google login with Firebase here
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121827] text-white p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center text-white">Giriş Yap</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email Input */}
          <div className="relative">
            <input
              type="email"
              id="email"
              className="peer shadow appearance-none border rounded w-full py-2 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              required
            />
            <label
              htmlFor="email"
              className="absolute left-10 top-2 text-gray-400 text-sm transition-all transform -translate-y-1/2 scale-75 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:text-blue-400"
            >
              E-posta
            </label>
            <IoMailOutline className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 peer-focus:text-blue-400" />
          </div>

          {/* Password Input */}
          <div className="relative">
            <input
              type="password"
              id="password"
              className="peer shadow appearance-none border rounded w-full py-2 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              required
            />
            <label
              htmlFor="password"
              className="absolute left-10 top-2 text-gray-400 text-sm transition-all transform -translate-y-1/2 scale-75 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:text-blue-400"
            >
              Parola
            </label>
            <IoLockClosedOutline className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 peer-focus:text-blue-400" />
          </div>

          <div className="text-right text-sm">
            <a href="#" className="text-blue-400 hover:underline">Parolayı mı Unuttun?</a>
          </div>

          {error && <p className="text-red-400 text-sm italic text-center">{error}</p>}

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="flex-shrink mx-4 text-gray-500">VEYA</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="bg-white hover:bg-gray-100 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full flex items-center justify-center space-x-2 shadow-md"
        >
          <IoLogoGoogle className="text-red-500 text-xl" />
          <span>Google ile Devam Et</span>
        </button>

        <p className="text-center text-gray-400 text-sm mt-6">
          Hesabın yok mu? <a href="/register" className="text-blue-400 hover:underline">Kaydol</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage; 