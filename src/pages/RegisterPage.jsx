import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import { useNavigate } from 'react-router-dom';

// Simgeler
import { IoPersonOutline, IoMailOutline, IoLockClosedOutline } from 'react-icons/io5';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic validation
    if (password.length < 6) {
      setError("Parola en az 6 karakter olmalıdır.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Call the saveUsername Cloud Function
      const saveUsernameFunction = httpsCallable(functions, 'saveUsername');
      await saveUsernameFunction({ username: username });

      navigate('/login', { state: { successMessage: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' } }); // Redirect to login page with success message

    } catch (error) {
      console.error("Kayıt hatası:", error.message);
      let errorMessage = "Kayıt başarısız oldu. Lütfen bilgilerinizi kontrol edin.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Bu e-posta adresi zaten kullanımda.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Geçersiz e-posta adresi.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Parola çok zayıf.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121827] text-white p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-4xl font-bold mb-8 text-center text-white font-['Montserrat']">Visual Wallet</h1> {/* Modern font örneği */}

        <h2 className="text-2xl font-semibold mb-6 text-center text-gray-300">Yeni Hesap Oluştur</h2>

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Username Input */}
          <div className="relative">
            <input
              type="text"
              id="username"
              className="peer shadow appearance-none border rounded w-full py-2 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder=" "
              required
            />
            <label
              htmlFor="username"
              className="absolute left-10 top-2 text-gray-400 text-sm transition-all transform -translate-y-1/2 scale-75 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:text-blue-400"
            >
              Kullanıcı Adı
            </label>
            <IoPersonOutline className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 peer-focus:text-blue-400" />
          </div>

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

          {error && <p className="text-red-400 text-sm italic text-center">{error}</p>}

          <button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            disabled={loading}
          >
            {loading ? 'Hesap Oluşturuluyor...' : 'Hesap Oluştur'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Zaten bir hesabınız var mı? <a href="/login" className="text-blue-400 hover:underline">Giriş Yap</a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage; 