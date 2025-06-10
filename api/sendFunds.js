const admin = require("firebase-admin");
const FieldValue = admin.firestore.FieldValue;
const cors = require('cors')({ origin: true });

// Firebase Admin SDK'sını zaten başlatılıp başlatılmadığını kontrol edin
if (!admin.apps.length) {
  admin.initializeApp();
}

module.exports = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return res.status(401).send({
        status: "error",
        message: "Yetkilendirme başlığı eksik veya geçersiz."
      });
    }

    const idToken = authorizationHeader.split('Bearer ')[1];
    let userId;

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (error) {
      console.error("Kimlik doğrulama hatası:", error);
      return res.status(401).send({
        status: "error",
        message: "Geçersiz kimlik belirteci."
      });
    }

    const { senderWalletId, receiverWalletId, amount, currency } = req.body;
    const db = admin.firestore();

    // Input Validation
    if (!senderWalletId || !receiverWalletId || !amount || typeof amount !== 'number' || amount <= 0 || !currency) {
      return res.status(400).send({
        status: "error",
        message: "Eksik veya geçersiz argümanlar sağlandı."
      });
    }

    try {
      const result = await db.runTransaction(async (transaction) => {
        const senderWalletRef = db.collection("wallets").doc(senderWalletId);
        const receiverWalletRef = db.collection("wallets").doc(receiverWalletId);

        const senderDoc = await transaction.get(senderWalletRef);
        const receiverDoc = await transaction.get(receiverWalletRef);

        // Check if sender wallet exists and belongs to the provided userId
        if (!senderDoc.exists || senderDoc.data().userId !== userId) {
          throw new Error("Gönderen cüzdan bulunamadı veya size ait değil.");
        }

        // Check if receiver wallet exists
        if (!receiverDoc.exists) {
          throw new Error("Alıcı cüzdan bulunamadı.");
        }

        // Check if currencies match
        if (senderDoc.data().currency !== currency || receiverDoc.data().currency !== currency) {
          throw new Error("Cüzdan para birimleri eşleşmiyor.");
        }

        const senderBalance = senderDoc.data().balance;

        // Check for sufficient balance
        if (senderBalance < amount) {
          throw new Error("Yetersiz bakiye.");
        }

        // Update balances
        transaction.update(senderWalletRef, { balance: senderBalance - amount });
        transaction.update(receiverWalletRef, { balance: receiverDoc.data().balance + amount });

        // Record transaction
        const transactionRef = db.collection("transactions").doc();
        transaction.set(transactionRef, {
          senderId: userId,
          receiverId: receiverDoc.data().userId,
          senderWalletId: senderWalletId,
          receiverWalletId: receiverWalletId,
          amount: amount,
          currency: currency,
          timestamp: FieldValue.serverTimestamp(),
        });

        return { status: "success", message: "Fonlar başarıyla gönderildi." };
      });
      return res.status(200).send(result);
    } catch (error) {
      console.error("Fon gönderilirken hata oluştu:", error);
      return res.status(500).send({
        status: "error",
        message: error.message || "Fon gönderilirken bilinmeyen bir hata oluştu."
      });
    }
  });
}; 