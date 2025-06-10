import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(null);

  const [senderWallet, setSenderWallet] = useState('');
  const [receiverUsername, setReceiverUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchWallets(currentUser.uid);
      } else {
        navigate('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchWallets = async (userId) => {
    try {
      const getWalletsFunction = httpsCallable(functions, 'getWallets');
      const result = await getWalletsFunction({ userId: userId });
      if (result.data && result.data.wallets) {
        setWallets(result.data.wallets);
        if (result.data.wallets.length > 0) {
          setSenderWallet(result.data.wallets[0].id);
          setSelectedCurrency(result.data.wallets[0].currency);
        }
      }
    } catch (error) {
      console.error("Cüzdanları alırken hata oluştu:", error);
    }
  };

  const handleSendFunds = async (e) => {
    e.preventDefault();
    setSendError(null);
    setSendSuccess(null);

    try {
      const findUserByUsernameFunction = httpsCallable(functions, 'findUserByUsername');
      const userResult = await findUserByUsernameFunction({ username: receiverUsername });
      
      if (!userResult.data || !userResult.data.userId) {
        throw new Error("Alıcı kullanıcı bulunamadı.");
      }
      const receiverUserId = userResult.data.userId;

      // Find receiver's wallet for the selected currency
      const getWalletsForReceiverFunction = httpsCallable(functions, 'getWallets');
      const receiverWalletsResult = await getWalletsForReceiverFunction({ userId: receiverUserId });

      const receiverWallet = receiverWalletsResult.data.wallets.find(
        (wallet) => wallet.currency === selectedCurrency
      );

      if (!receiverWallet) {
        throw new Error("Alıcıda bu para biriminde bir cüzdan bulunamadı.");
      }

      const sendFundsFunction = httpsCallable(functions, 'sendFunds');
      const result = await sendFundsFunction({
        senderWalletId: senderWallet,
        receiverWalletId: receiverWallet.id,
        amount: parseFloat(amount),
        currency: selectedCurrency,
      });

      if (result.data.status === "success") {
        setSendSuccess(result.data.message);
        fetchWallets(user.uid); // Refresh wallets after successful send
      } else {
        setSendError(result.data.message);
      }
    } catch (error) {
      console.error("Fon gönderilirken hata oluştu:", error);
      setSendError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Çıkış yaparken hata oluştu:", error.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-dark-modern text-white">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-dark-modern text-white flex flex-col items-center p-4">
      <div className="w-full max-w-4xl bg-gray-800 p-8 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Hoş Geldiniz, {user.email}</h2>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Çıkış Yap
          </button>
        </div>

        <h3 className="text-2xl font-semibold mb-4">Cüzdanlarım</h3>
        {wallets.length === 0 ? (
          <p>Hiç cüzdanınız yok.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {wallets.map((wallet) => (
              <div key={wallet.id} className="bg-gray-700 p-4 rounded-lg shadow">
                <p className="text-lg font-bold">{wallet.currency}</p>
                <p className="text-xl">Bakiye: {wallet.balance.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}

        <h3 className="text-2xl font-semibold mb-4">Fon Gönder</h3>
        <form onSubmit={handleSendFunds} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="senderWallet">
              Gönderen Cüzdan
            </label>
            <select
              id="senderWallet"
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600"
              value={senderWallet}
              onChange={(e) => {
                setSenderWallet(e.target.value);
                const selectedWallet = wallets.find(w => w.id === e.target.value);
                if (selectedWallet) {
                  setSelectedCurrency(selectedWallet.currency);
                }
              }}
              required
            >
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.currency} ({wallet.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="receiverUsername">
              Alıcı Kullanıcı Adı
            </label>
            <input
              type="text"
              id="receiverUsername"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600"
              value={receiverUsername}
              onChange={(e) => setReceiverUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="amount">
              Miktar
            </label>
            <input
              type="number"
              id="amount"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              required
            />
          </div>
          {sendError && <p className="text-red-500 text-xs italic">{sendError}</p>}
          {sendSuccess && <p className="text-green-500 text-xs italic">{sendSuccess}</p>}
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
          >
            Fon Gönder
          </button>
        </form>

        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => navigate('/send')}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Fon Gönder Sayfası
          </button>
          <button
            onClick={() => navigate('/history')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            İşlem Geçmişi Sayfası
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 