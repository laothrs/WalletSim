import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import { useNavigate } from 'react-router-dom';

// Simgeler
import { IoSend, IoArrowDown, IoAddCircle } from 'react-icons/io5';

// Bileşenler
import AssetCard from '../components/AssetCard';

const WalletPage = () => {
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(true);
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
    <div className="min-h-screen flex flex-col items-center bg-[#121827] text-white p-4 pb-20">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-6 mt-8">
        <h2 className="text-center text-lg font-semibold text-gray-400 mb-2">Toplam Portföy Bakiyesi</h2>
        <p className="text-center text-4xl font-bold mb-1">{formatCurrency(calculateTotalPortfolioValue())}</p>
        <p className={`text-center text-sm ${dailyChange.positive ? 'text-green-400' : 'text-red-400'}`}>
          Bugün {dailyChange.positive ? '+' : '-'}{dailyChange.value}%
        </p>

        <div className="flex justify-around items-center my-8">
          <button onClick={() => navigate('/send')} className="flex flex-col items-center text-blue-400 hover:text-blue-300 transition-colors duration-200">
            <div className="bg-blue-600 p-3 rounded-full mb-1">
              <IoSend className="text-2xl text-white" />
            </div>
            <span className="text-xs">Gönder</span>
          </button>
          <button className="flex flex-col items-center text-blue-400 hover:text-blue-300 transition-colors duration-200">
            <div className="bg-green-600 p-3 rounded-full mb-1">
              <IoArrowDown className="text-2xl text-white" />
            </div>
            <span className="text-xs">Al</span>
          </button>
          <button className="flex flex-col items-center text-blue-400 hover:text-blue-300 transition-colors duration-200">
            <div className="bg-purple-600 p-3 rounded-full mb-1">
              <IoAddCircle className="text-2xl text-white" />
            </div>
            <span className="text-xs">Satın Al</span>
          </button>
        </div>

        <h3 className="text-lg font-semibold text-gray-300 mb-4">Varlıklarım</h3>
        <div className="space-y-4">
          {wallets.length === 0 ? (
            <p className="text-gray-400 text-center">Henüz cüzdanınız yok.</p>
          ) : (
            wallets.map((wallet) => {
              const coinId = wallet.currency.toLowerCase();
              const coinData = marketData[coinId];
              const priceChangePercentage = coinData ? coinData.price_change_percentage_24h : 0;

              return (
                <AssetCard
                  key={wallet.currency}
                  icon={coinData ? coinData.image : 'https://via.placeholder.com/40'}
                  name={wallet.currency}
                  symbol={coinData ? coinData.symbol : ''}
                  price={coinData ? coinData.current_price : 0}
                  userBalance={wallet.balance}
                  priceChangePercentage={priceChangePercentage}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletPage; 