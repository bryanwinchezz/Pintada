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
window.showToast = showToast; // Garante que o HTML consegue usar o Toast

// 2. ALTERNAR VISIBILIDADE DA SENHA (O OLHO)
function initPasswordToggle() {
    const toggles = document.querySelectorAll('.toggle-password');
    toggles.forEach(btn => {
        // Remove botões antigos clonando para evitar cliques duplicados
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            const input = newBtn.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                newBtn.textContent = 'visibility';
            } else {
                input.type = 'password';
                newBtn.textContent = 'visibility_off';
            }
        });
    });
}

// 3. ALTERNAR ENTRE LOGIN E CADASTRO
function initAuthToggles() {
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');

    if (showRegisterBtn && showLoginBtn && loginSection && registerSection) {
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

// 4. ENVIAR FORMULÁRIO DE LOGIN
function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async(e) => {
            e.preventDefault();
            const identifier = document.getElementById('login-identifier').value.trim();
            const password = document.getElementById('login-password').value;

            try {
                // Adicionado window. para forçar a procura correta
                await window.AuthService.login(identifier, password);
                window.location.href = 'index.html';
            } catch (error) {
                showToast("Erro ao entrar: " + error.message, "error");
            }
        };
    }
}

// 5. ENVIAR FORMULÁRIO DE REGISTRO
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
                await window.AuthService.register(userData);
                showToast("Conta criada com sucesso! 🐆");
                window.location.href = 'index.html';
            } catch (error) {
                showToast("Erro no registo: O e-mail já pode estar em uso!", "error");
                console.error(error);
            }
        };
    }
}

// 6. CARREGAR DADOS DO USUÁRIO NO PERFIL E CONFIGURAÇÕES
async function loadUserDataUI() {
    const activeUsername = window.AuthService.getCurrentUser();
    if (!activeUsername) return;

    const user = await window.AuthService.getUserData(activeUsername);
    if (!user) return;

    document.querySelectorAll('.profile-name').forEach(el => el.textContent = user.name || "Utilizador");
    document.querySelectorAll('.profile-handle').forEach(el => el.textContent = `@${user.username}`);
    document.querySelectorAll('.profile-bio').forEach(el => el.textContent = user.bio || "Membro da Pintada 🐆");

    if (document.getElementById('edit-name')) document.getElementById('edit-name').value = user.name || "";
    if (document.getElementById('edit-username')) document.getElementById('edit-username').value = user.username || "";
    if (document.getElementById('edit-bio')) document.getElementById('edit-bio').value = user.bio || "";

    const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=F4B41A&color=fff`;
    document.querySelectorAll('.profile-pic img, .profile-page-avatar, #settings-avatar-preview, .post-avatar').forEach(img => img.src = avatarUrl);
}

// 7. SALVAR ALTERAÇÕES DO PERFIL
function initProfileForm() {
    const formProfile = document.getElementById('form-profile');
    if (formProfile) {
        formProfile.onsubmit = async(e) => {
            e.preventDefault();
            const activeUsername = window.AuthService.getCurrentUser();

            const updatedData = {
                name: document.getElementById('edit-name').value.trim(),
                username: document.getElementById('edit-username').value.trim(),
                bio: document.getElementById('edit-bio').value.trim()
            };

            try {
                await window.AuthService.saveUserData(activeUsername, updatedData);
                showToast('Perfil atualizado com sucesso! 🐆');

                if (updatedData.username !== activeUsername) {
                    localStorage.setItem('pintada_active_user', updatedData.username);
                }

                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                showToast('Erro ao salvar: ' + error.message, 'error');
            }
        };
    }
}

// 8. INICIALIZAÇÃO GERAL LIMPA E ÚNICA
document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggle();
    initAuthToggles();
    initLoginForm();
    initRegisterForm();
    initProfileForm();

    if (typeof window.AuthService !== 'undefined' && window.AuthService.getCurrentUser()) {
        loadUserDataUI();
    }
});