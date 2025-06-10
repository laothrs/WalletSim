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

    const { username } = req.body;
    const db = admin.firestore();

    // Input Validation
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return res.status(400).send({
        status: "error",
        message: "Geçerli bir kullanıcı adı sağlamalısınız."
      });
    }

    try {
      await db.collection("users").doc(userId).set({
        username: username,
        userId: userId,
      });
      return res.status(200).send({ status: "success", message: "Kullanıcı adı başarıyla kaydedildi." });
    } catch (error) {
      console.error("Kullanıcı adı kaydedilirken hata oluştu:", error);
      return res.status(500).send({
        status: "error",
        message: error.message || "Kullanıcı adı kaydedilirken bilinmeyen bir hata oluştu."
      });
    }
  });
}; 