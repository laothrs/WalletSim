import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import { query, collection, where, orderBy, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

// Simgeler
import { IoArrowBack, IoArrowUpCircleOutline, IoArrowDownCircleOutline } from 'react-icons/io5';

const HistoryPage = () => {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchTransactions(currentUser.uid);
      } else {
        navigate('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchTransactions = async (userId) => {
    try {
      const transactionsRef = collection(functions.app.firestore(), "transactions"); // Use firestore() from functions.app

      // Fetch sent transactions
      const sentQuery = query(transactionsRef, where("senderId", "==", userId), orderBy("timestamp", "desc"));
      const sentSnapshot = await getDocs(sentQuery);
      const sentTransactions = sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'sent' }));

      // Fetch received transactions
      const receivedQuery = query(transactionsRef, where("receiverId", "==", userId), orderBy("timestamp", "desc"));
      const receivedSnapshot = await getDocs(receivedQuery);
      const receivedTransactions = receivedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'received' }));

      const allTransactions = [...sentTransactions, ...receivedTransactions];
      allTransactions.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate()); // Sort by timestamp

      // Resolve usernames
      const getUserPublicDataFunction = httpsCallable(functions, 'getUserPublicData');
      const transactionsWithUsernames = await Promise.all(
        allTransactions.map(async (transaction) => {
          const senderUsernameResult = await getUserPublicDataFunction({ userId: transaction.senderId });
          const receiverUsernameResult = await getUserPublicDataFunction({ userId: transaction.receiverId });

          return {
            ...transaction,
            senderUsername: senderUsernameResult.data.username || 'Bilinmeyen Kullanıcı',
            receiverUsername: receiverUsernameResult.data.username || 'Bilinmeyen Kullanıcı',
          };
        })
      );

      setTransactions(transactionsWithUsernames);

    } catch (err) {
      console.error("İşlemler alınırken hata oluştu:", err);
      setError("İşlem geçmişi yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121827] text-white">
        <div className="text-center">
          <p className="text-xl">İşlemler Yükleniyor...</p>
          {/* Basit bir iskelet yükleyici eklenebilir */}
          <div className="animate-pulse mt-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#121827] text-white p-4 pb-20">
      <header className="flex justify-between items-center py-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white transition-colors duration-200"
        >
          <IoArrowBack className="text-2xl" />
        </button>
        <h1 className="text-2xl font-bold">İşlem Geçmişi</h1>
        <div className="w-6">{/* Spacer */}</div>
      </header>

      <main className="flex-grow w-full max-w-md mx-auto">
        {error && <p className="text-red-400 text-center mb-4">Hata: {error}</p>}

        {transactions.length === 0 ? (
          <p className="text-gray-400 text-center mt-8">Henüz hiç işlem yok.</p>
        ) : (
          <div className="space-y-4 mt-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-gray-800 rounded-lg p-4 shadow-md flex items-center space-x-4">
                {tx.type === 'sent' ? (
                  <IoArrowUpCircleOutline className="text-red-400 text-3xl flex-shrink-0" />
                ) : (
                  <IoArrowDownCircleOutline className="text-green-400 text-3xl flex-shrink-0" />
                )}
                <div className="flex-grow">
                  <p className="text-lg font-semibold">
                    {tx.type === 'sent' ? 'Gönderildi:' : 'Alındı:'} {tx.currency}
                  </p>
                  <p className="text-sm text-gray-400">
                    {tx.type === 'sent' ? `Kime: ${tx.receiverUsername}` : `Kimden: ${tx.senderUsername}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Tarih: {new Date(tx.timestamp.seconds * 1000).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${tx.type === 'sent' ? 'text-red-400' : 'text-green-400'}`}>
                    {tx.type === 'sent' ? '-' : '+'}{tx.amount.toFixed(2)} {tx.currency}
                  </p>
                  <p className="text-xs text-gray-500">ID: {tx.id.substring(0, 8)}...</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage; 