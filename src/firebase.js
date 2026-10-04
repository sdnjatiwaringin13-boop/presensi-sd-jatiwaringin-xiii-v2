// ==========================================
// FIREBASE CONFIGURATION
// Presensi SD Negeri Jatiwaringin XIII
// ==========================================

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ==========================================
// KONFIGURASI FIREBASE
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyCOKwd4l-fXxKj329GL8zv1sFLMMj3NmTs",
  authDomain: "presensi-sdn-jatiwaringin-13.firebaseapp.com",
  projectId: "presensi-sdn-jatiwaringin-13",
  storageBucket: "presensi-sdn-jatiwaringin-13.firebasestorage.app",
  messagingSenderId: "927428288362",
  appId: "1:927428288362:web:06878a7f62ac47fba24f13",
};

// ==========================================
// FIREBASE APP UTAMA
// ==========================================

const app = initializeApp(firebaseConfig);

// Firebase Authentication utama
export const auth = getAuth(app);

// Firestore utama
export const db = getFirestore(app);

// ==========================================
// FIREBASE APP KEDUA
// ==========================================
//
// Digunakan ketika ADMIN membuat akun GURU.
//
// Tujuannya:
// Admin tetap login di aplikasi utama,
// sementara akun Guru dibuat melalui instance
// Firebase Authentication kedua.
//
// Dengan demikian:
// createUserWithEmailAndPassword(secondaryAuth, ...)
// tidak membuat akun Admin ikut logout.
//

const secondaryApp = initializeApp(
  firebaseConfig,
  "SecondaryApp"
);

// Firebase Authentication kedua
export const secondaryAuth = getAuth(secondaryApp);

// ==========================================
// EXPORT DEFAULT
// ==========================================

export default app;