// ==========================================
// js/ui.js - INTERFACE, TOASTS E AUTENTICAÇÃO
// ==========================================
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 1. Função para alternar visibilidade da senha
function initPasswordToggle() {
    const toggles = document.querySelectorAll('.toggle-password');

    toggles.forEach(btn => {
        btn.addEventListener('click', () => {
            // O input de senha está logo antes do ícone (span) no seu HTML
            const input = btn.previousElementSibling;

            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'visibility'; // Muda o ícone para "olho aberto"
            } else {
                input.type = 'password';
                btn.textContent = 'visibility_off'; // Volta para "olho cortado"
            }
        });
    });
}

// 2. Adicione a chamada dentro do seu DOMContentLoaded já existente:
document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggle(); // <--- Adicione esta linha aqui!
    initAuthToggles();
    initLoginForm();
    initRegisterForm();

    if (typeof AuthService !== 'undefined' && AuthService.getCurrentUser()) {
        if (typeof loadUserDataUI === 'function') loadUserDataUI();
    }
});

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

// No final do ui.js, dentro do DOMContentLoaded
const formProfile = document.getElementById('form-profile');
if (formProfile) {
    formProfile.onsubmit = async(e) => {
        e.preventDefault();
        const activeUsername = AuthService.getCurrentUser();
        const user = await AuthService.getUserData(activeUsername);

        if (user) {
            const oldUsername = user.username;
            user.name = document.getElementById('edit-name').value;
            user.username = document.getElementById('edit-username').value;
            user.bio = document.getElementById('edit-bio').value;

            try {
                await AuthService.updateUser(oldUsername, user);
                showToast('Perfil atualizado com sucesso! 🐆');
                location.reload(); // Recarrega para aplicar as mudanças
            } catch (error) {
                showToast('Erro ao atualizar: ' + error.message, 'error');
            }
        }
    };
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