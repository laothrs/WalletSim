import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { IoSend, IoWallet, IoTrendingUp, IoMenu, IoAdd } from 'react-icons/io5';

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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <IoWallet className="w-6 h-6 text-primary" />
            </div>
            <h1 className="heading-1">Wallet</h1>
          </div>
          <button className="p-2 hover:bg-background-card rounded-full transition-colors">
            <IoMenu className="w-6 h-6 text-text-secondary" />
          </button>
        </header>

        {/* Portfolio Value Card */}
        <div className="card space-y-4">
          <p className="text-text-secondary">Toplam Portföy Değeri</p>
          <h2 className="text-4xl font-bold text-gradient">
            {formatCurrency(calculateTotalPortfolioValue())}
          </h2>
          <div className="flex items-center space-x-2 text-secondary">
            <IoTrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">+2.5%</span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button className="btn-primary flex items-center justify-center space-x-2">
            <IoSend className="w-5 h-5" />
            <span>Para Gönder</span>
          </button>
          <button className="btn-primary bg-secondary hover:bg-secondary/90 flex items-center justify-center space-x-2">
            <IoAdd className="w-5 h-5" />
            <span>Para Al</span>
          </button>
        </div>

        {/* Wallets */}
        <div className="space-y-4">
          <h2 className="heading-2">Cüzdanlarım</h2>
          <div className="grid gap-4">
            {wallets.map((wallet) => {
              const coinId = wallet.currency.toLowerCase();
              const marketInfo = marketData[coinId];
              const value = marketInfo ? wallet.balance * marketInfo.current_price : 0;

              return (
                <div key={wallet.id} className="card hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{wallet.currency}</h3>
                      <p className="text-text-secondary text-sm">{wallet.balance} {wallet.currency}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(value)}</p>
                      {marketInfo && (
                        <p className={`text-sm ${marketInfo.price_change_percentage_24h >= 0 ? 'text-secondary' : 'text-red-500'}`}>
                          {marketInfo.price_change_percentage_24h.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;