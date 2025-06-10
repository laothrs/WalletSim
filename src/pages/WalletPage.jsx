import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { IoSend, IoArrowDown, IoWallet, IoTrendingUp, IoMenu } from 'react-icons/io5';

const WalletPage = () => {
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState(null);

  const [error, setError] = useState(null);
  const [sendError, setSendError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(null);

  const [senderWallet, setSenderWallet] = useState('');
  const [receiverUsername, setReceiverUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');

  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  const getWalletsFunction = httpsCallable(functions, 'getWallets');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchWallets();
      } else {
        navigate('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchWallets = async () => {
    if (!userId) {
      setLoading(false);
      setError('Kullanıcı oturum açmamış.');
      return;
    }

    try {
      const response = await getWalletsFunction({ userId });
      setWallets(response.data);
      if (response.data.length > 0) {
        setSenderWallet(response.data[0].id);
        setSelectedCurrency(response.data[0].currency);
      }
    } catch (err) {
      console.error("Cüzdanlar getirilirken hata oluştu: ", err);
      setError('Cüzdanlar getirilirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketData = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum');
      if (!response.ok) {
        throw new Error(`HTTP hata durumu: ${response.status}`);
      }
      const data = await response.json();
      const formattedData = {};
      data.forEach(coin => {
        formattedData[coin.id] = coin;
      });
      setMarketData(formattedData);
    } catch (err) {
      console.error("Piyasa verileri getirilirken hata oluştu: ", err);
      setError('Piyasa verileri getirilirken hata oluştu.');
    }
  };

  useEffect(() => {
    fetchWallets();
    fetchMarketData();
  }, [userId]);

  const calculateTotalPortfolioValue = () => {
    let total = 0;
    wallets.forEach(wallet => {
      const coinId = wallet.currency.toLowerCase();
      if (marketData[coinId]) {
        total += wallet.balance * marketData[coinId].current_price;
      }
    });
    return total.toFixed(2);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getDailyChange = () => {
    // Simplistic placeholder for daily change, real implementation would compare current price with 24h ago price
    // For now, let's assume a fixed positive change for demonstration
    return { value: 2.5, positive: true };
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
        fetchWallets(); // Refresh wallets after successful send
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#121827] text-white p-4">
        <div className="w-full max-w-md bg-gray-800 rounded-lg p-6 animate-pulse">
          <div className="h-10 bg-gray-700 rounded w-3/4 mb-4 mx-auto"></div>
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-8 mx-auto"></div>
          <div className="flex justify-around mb-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-700 rounded-full mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-16"></div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-700 rounded-full mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-16"></div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-700 rounded-full mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-16"></div>
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-700 rounded-lg p-4 flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
                <div className="flex-grow space-y-2">
                  <div className="h-4 bg-gray-600 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                </div>
                <div className="text-right space-y-2">
                  <div className="h-4 bg-gray-600 rounded w-20"></div>
                  <div className="h-3 bg-gray-600 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-[#121827] text-red-400">Hata: {error}</div>;
  }

  const dailyChange = getDailyChange();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-[#0A0A0A] border-b border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <IoWallet className="text-2xl text-blue-500" />
            <h1 className="text-xl font-bold text-white">Wallet</h1>
          </div>
          <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <IoMenu className="text-2xl text-white" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-24 px-4 max-w-7xl mx-auto">
        {/* Portfolio Value Card */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl p-6 mb-8 backdrop-blur-xl border border-gray-800">
          <p className="text-gray-400 mb-2">Portfolio Değeri</p>
          <h2 className="text-4xl font-bold text-white mb-4">
            ${calculateTotalPortfolioValue()}
          </h2>
          <div className="flex space-x-3">
            <button className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-2xl font-medium flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors">
              <IoArrowDown className="text-xl" />
              <span>Al</span>
            </button>
            <button className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-2xl font-medium flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors">
              <IoSend className="text-xl" />
              <span>Gönder</span>
            </button>
          </div>
        </div>

        {/* Tokens List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Tokens</h3>
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-[#1A1A1A] rounded-2xl p-4 flex items-center hover:bg-[#242424] transition-colors cursor-pointer"
              onClick={() => setSelectedWallet(wallet)}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mr-4">
                <img
                  src={`/icons/${wallet.currency.toLowerCase()}.svg`}
                  alt={wallet.currency}
                  className="w-8 h-8"
                />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">{wallet.currency}</h4>
                <p className="text-sm text-gray-400">
                  {wallet.balance} {wallet.currency}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">
                  ${(wallet.balance * marketData[wallet.currency.toLowerCase()]?.current_price || 0).toFixed(2)}
                </p>
                <p className="text-sm text-green-500 flex items-center justify-end">
                  <IoTrendingUp className="mr-1" />
                  +2.5%
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-around">
          <button className="text-white opacity-60 hover:opacity-100 transition-opacity flex flex-col items-center">
            <IoWallet className="text-2xl" />
            <span className="text-xs mt-1">Wallet</span>
          </button>
          <button className="text-white opacity-60 hover:opacity-100 transition-opacity flex flex-col items-center">
            <IoSend className="text-2xl" />
            <span className="text-xs mt-1">Send</span>
          </button>
          <button className="text-white opacity-60 hover:opacity-100 transition-opacity flex flex-col items-center">
            <IoArrowDown className="text-2xl" />
            <span className="text-xs mt-1">Receive</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default WalletPage;