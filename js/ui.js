// ==========================================
// js/ui.js - INTERFACE, TOASTS E AUTENTICAÇÃO
// ==========================================
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 1. FUNÇÃO GLOBAL DE NOTIFICAÇÃO (TOAST)
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    const iconName = type === 'success' ? 'check_circle' : 'error';
    toast.innerHTML = `<span class="material-symbols-outlined toast-icon">${iconName}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// 2. ALTERNAR ENTRE LOGIN E CADASTRO
function initAuthToggles() {
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');

    if (showRegisterBtn && showLoginBtn) {
        showRegisterBtn.onclick = (e) => {
            e.preventDefault();
            loginSection.style.display = 'none';
            registerSection.style.display = 'block';
        };
        showLoginBtn.onclick = (e) => {
            e.preventDefault();
            registerSection.style.display = 'none';
            loginSection.style.display = 'block';
        };
    }
}

// 3. ENVIAR FORMULÁRIO DE LOGIN
function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async(e) => {
            e.preventDefault();
            const identifier = document.getElementById('login-identifier').value.trim();
            const password = document.getElementById('login-password').value;

            try {
                await AuthService.login(identifier, password);
                window.location.href = 'index.html';
            } catch (error) {
                showToast("Erro ao entrar: " + error.message, "error");
            }
        };
    }
}

// 4. ENVIAR FORMULÁRIO DE REGISTRO
function initRegisterForm() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.onsubmit = async(e) => {
            e.preventDefault();
            const userData = {
                name: document.getElementById('reg-name').value.trim(),
                username: document.getElementById('reg-username').value.trim(),
                email: document.getElementById('reg-email').value.trim(),
                password: document.getElementById('reg-password').value
            };

            try {
                await AuthService.register(userData);
                showToast("Conta criada com sucesso! 🐆");
                window.location.href = 'index.html';
            } catch (error) {
                showToast("Erro no cadastro: " + error.message, "error");
            }
        };
    }
}

// 5. INICIALIZAÇÃO GERAL
document.addEventListener('DOMContentLoaded', () => {
    initAuthToggles();
    initLoginForm();
    initRegisterForm();

    // Se estiver em outra página, carrega a UI do usuário
    if (typeof AuthService !== 'undefined' && AuthService.getCurrentUser()) {
        if (typeof loadUserDataUI === 'function') loadUserDataUI();
    }
});

// Exporta para o window para outros scripts usarem
window.showToast = showToast;