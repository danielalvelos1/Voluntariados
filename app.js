import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDwrwqmp-LshZjFDsykgwKanf1SDO11O0E",
  authDomain: "plataforma-de-voluntariados.firebaseapp.com",
  projectId: "plataforma-de-voluntariados",
  storageBucket: "plataforma-de-voluntariados.firebasestorage.app",
  messagingSenderId: "695935091498",
  appId: "1:695935091498:web:4106f54eaaaf75f0925453",
  measurementId: "G-E93YQR75XQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);