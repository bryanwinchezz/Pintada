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

// 5. CARREGAR DADOS DO USUÁRIO NO PERFIL E CONFIGURAÇÕES
async function loadUserDataUI() {
    const activeUsername = AuthService.getCurrentUser();
    if (!activeUsername) return;

    // Busca os dados atualizados direto do Firebase
    const user = await AuthService.getUserData(activeUsername);
    if (!user) return;

    // Preenche nomes e bios nas páginas (Index, Profile, Settings)
    document.querySelectorAll('.profile-name').forEach(el => el.textContent = user.name || "Utilizador");
    document.querySelectorAll('.profile-handle').forEach(el => el.textContent = `@${user.username}`);
    document.querySelectorAll('.profile-bio').forEach(el => el.textContent = user.bio || "Membro da Pintada 🐆");

    // Preenche os campos de edição nas Configurações
    if (document.getElementById('edit-name')) document.getElementById('edit-name').value = user.name || "";
    if (document.getElementById('edit-username')) document.getElementById('edit-username').value = user.username || "";
    if (document.getElementById('edit-bio')) document.getElementById('edit-bio').value = user.bio || "";

    // Atualiza as fotos de perfil em toda a rede
    const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=F4B41A&color=fff`;
    document.querySelectorAll('.profile-pic img, .profile-page-avatar, #settings-avatar-preview, .post-avatar').forEach(img => img.src = avatarUrl);
}

// 6. SALVAR ALTERAÇÕES DO PERFIL
function initProfileForm() {
    const formProfile = document.getElementById('form-profile');
    if (formProfile) {
        formProfile.onsubmit = async(e) => {
            e.preventDefault();
            const activeUsername = AuthService.getCurrentUser();

            const updatedData = {
                name: document.getElementById('edit-name').value.trim(),
                username: document.getElementById('edit-username').value.trim(),
                bio: document.getElementById('edit-bio').value.trim()
            };

            try {
                // Usa a função saveUserData que já existe no seu services.js
                await AuthService.saveUserData(activeUsername, updatedData);
                showToast('Perfil atualizado com sucesso! 🐆');

                // Se o nome de usuário mudou, precisamos atualizar a sessão
                if (updatedData.username !== activeUsername) {
                    localStorage.setItem('pintada_active_user', updatedData.username);
                }

                setTimeout(() => location.reload(), 1000); // Recarrega para aplicar as mudanças
            } catch (error) {
                showToast('Erro ao salvar: ' + error.message, 'error');
            }
        };
    }
}

// 7. INICIALIZAÇÃO GERAL (Atualizada)
document.addEventListener('DOMContentLoaded', () => {
    initAuthToggles();
    initLoginForm();
    initRegisterForm();
    initPasswordToggle();
    initProfileForm(); // Ativa o formulário de edição

    if (typeof AuthService !== 'undefined' && AuthService.getCurrentUser()) {
        loadUserDataUI();
    }
});

window.showToast = showToast;