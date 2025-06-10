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

    // userId now comes from the authenticated token, not from req.body
    // const { userId } = req.body; 
    const db = admin.firestore();

    // Input Validation (no need to check userId from body anymore)
    // if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    //   return res.status(400).send({
    //     status: "error",
    //     message: "Geçerli bir kullanıcı kimliği sağlamalısınız."
    //   });
    // }

    try {
      const walletsRef = db.collection("wallets");
      const snapshot = await walletsRef.where("userId", "==", userId).get();

      if (snapshot.empty) {
        return res.status(200).send({ wallets: [] }); // Cüzdan bulunamadı
      } else {
        const wallets = [];
        snapshot.forEach(doc => {
          wallets.push({ id: doc.id, ...doc.data() });
        });
        return res.status(200).send({ wallets: wallets });
      }
    } catch (error) {
      console.error("Cüzdanlar alınırken hata oluştu:", error);
      return res.status(500).send({
        status: "error",
        message: error.message || "Cüzdanlar alınırken bilinmeyen bir hata oluştu."
      });
    }
  });
}; 