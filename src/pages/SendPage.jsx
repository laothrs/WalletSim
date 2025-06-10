import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

const SendPage = () => {
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receiverUsername, setReceiverUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [senderWalletId, setSenderWalletId] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);

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
          setSenderWalletId(result.data.wallets[0].id);
          setSelectedCurrency(result.data.wallets[0].currency);
        }
      }
    } catch (error) {
      console.error("Cüzdanları alırken hata oluştu:", error);
      setMessage("Cüzdanlar yüklenirken bir hata oluştu.");
      setIsError(true);
    }
  };

  const handleSendFunds = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsError(false);

    if (!senderWalletId || !receiverUsername || !amount || parseFloat(amount) <= 0) {
      setMessage("Lütfen tüm alanları doldurun ve geçerli bir miktar girin.");
      setIsError(true);
      return;
    }

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
        senderWalletId: senderWalletId,
        receiverWalletId: receiverWallet.id,
        amount: parseFloat(amount),
        currency: selectedCurrency,
      });

      if (result.data.status === "success") {
        setMessage(result.data.message);
        setIsError(false);
        setReceiverUsername('');
        setAmount('');
        fetchWallets(user.uid); // Refresh wallets after successful send
      } else {
        setMessage(result.data.message);
        setIsError(true);
      }
    } catch (error) {
      console.error("Fon gönderilirken hata oluştu:", error);
      setMessage(error.message || "Fon gönderilirken bir hata oluştu.");
      setIsError(true);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-dark-modern text-white">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-dark-modern text-white flex flex-col items-center p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Fon Gönder</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Geri
          </button>
        </div>

        <form onSubmit={handleSendFunds} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="senderWallet">
              Gönderen Cüzdan
            </label>
            <select
              id="senderWallet"
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600"
              value={senderWalletId}
              onChange={(e) => {
                setSenderWalletId(e.target.value);
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

          {message && (
            <p className={`text-sm italic ${isError ? 'text-red-500' : 'text-green-500'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
          >
            Fon Gönder
          </button>
        </form>
      </div>
    </div>
  );
};

export default SendPage; 