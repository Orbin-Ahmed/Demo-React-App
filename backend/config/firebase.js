const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function verifyFirebaseToken(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Unauthorized: No valid token provided' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    
    request.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };

  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    reply.code(401).send({ error: 'Unauthorized: Invalid token' });
    return;
  }
}

module.exports = {
  admin,
  db,
  auth,
  verifyFirebaseToken
};