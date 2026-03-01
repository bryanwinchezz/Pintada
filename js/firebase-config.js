// ==========================================
// js/firebase-config.js - CONEXÃO COM A NUVEM
// ==========================================

// Importa os módulos do Firebase direto da internet (Versão 10 Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// COLOQUE AS SUAS CHAVES REAIS AQUI DENTRO:
const firebaseConfig = {
    apiKey: "AIzaSyBrUo5blAyhqLCohH39kUUar_NcALJI9Kg",
    authDomain: "pintada-f311b.firebaseapp.com",
    projectId: "pintada-f311b",
    storageBucket: "pintada-f311b.firebasestorage.app",
    messagingSenderId: "504384396946",
    appId: "1:504384396946:web:e0886800c51920102cd04b"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Cria e "exporta" os motores para os outros arquivos conseguirem usar
window.auth = getAuth(app);
window.db = getFirestore(app);
window.storage = getStorage(app);

console.log("🔥 Firebase conectado com sucesso!");