const admin = require("firebase-admin");
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

    const { userId } = req.body;
    const db = admin.firestore();

    // Input Validation
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return res.status(400).send({
        status: "error",
        message: "Geçerli bir kullanıcı kimliği sağlamalısınız."
      });
    }

    try {
      const batch = db.batch();

      const btcWalletRef = db.collection("wallets").doc();
      batch.set(btcWalletRef, {
        userId: userId,
        currency: "Görsel BTC",
        balance: 0,
      });

      const ethWalletRef = db.collection("wallets").doc();
      batch.set(ethWalletRef, {
        userId: userId,
        currency: "Görsel ETH",
        balance: 0,
      });

      await batch.commit();
      return res.status(200).send({ status: "success", message: "Başlangıç cüzdanları başarıyla oluşturuldu." });
    } catch (error) {
      console.error("Başlangıç cüzdanları oluşturulurken hata oluştu:", error);
      return res.status(500).send({
        status: "error",
        message: error.message || "Başlangıç cüzdanları oluşturulurken bilinmeyen bir hata oluştu."
      });
    }
  });
}; 