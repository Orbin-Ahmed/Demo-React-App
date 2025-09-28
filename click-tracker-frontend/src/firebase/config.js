import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBB4Tw7Nf4kEWgK_cKs8NkxkhGNDj8PHH4",
  authDomain: "click-tracker-firebase.firebaseapp.com",
  projectId: "click-tracker-firebase",
  storageBucket: "click-tracker-firebase.firebasestorage.app",
  messagingSenderId: "85721164485",
  appId: "1:85721164485:web:509deb840feb50eb955eac",
  measurementId: "G-J9EM71T2B5"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);