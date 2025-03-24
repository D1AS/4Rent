import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBno8bdaiMCgkklL06TTVUHSF0NThj0BD0",
  authDomain: "uberbiketoronto.firebaseapp.com",
  projectId: "uberbiketoronto",
  storageBucket: "uberbiketoronto.firebasestorage.app",
  messagingSenderId: "109932802218",
  appId: "1:109932802218:web:f87eee61a8ff9a066120d3",
  measurementId: "G-E5RDN2BHLK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 