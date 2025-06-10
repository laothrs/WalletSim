import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase';
import { query, collection, where, orderBy, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

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
      const transactionsRef = collection(db, "transactions");

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
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-dark-modern text-white">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-dark-modern text-white flex flex-col items-center p-4">
      <div className="w-full max-w-4xl bg-gray-800 p-8 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">İşlem Geçmişi</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Geri
          </button>
        </div>

        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

        {transactions.length === 0 ? (
          <p>Henüz hiç işlem yok.</p>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-gray-700 p-4 rounded-lg shadow">
                <p className="text-lg font-bold">{tx.type === 'sent' ? 'Gönderilen' : 'Alınan'} {tx.currency}</p>
                <p>Miktar: {tx.amount.toFixed(2)}</p>
                <p>Gönderen: {tx.senderUsername}</p>
                <p>Alıcı: {tx.receiverUsername}</p>
                <p className="text-sm text-gray-400">Tarih: {tx.timestamp.toDate().toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage; 