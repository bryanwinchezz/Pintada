// ==========================================
// js/ui.js - INTERFACE, TOASTS, AUTH E PERFIL
// ==========================================

// 1. TOASTS E PASSWORD TOGGLE
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
window.showToast = showToast;

function initPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
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

// 2. AUTH E LOGIN/REGISTO
function initAuthToggles() {
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');

    if (showRegisterBtn && showLoginBtn && loginSection && registerSection) {
        showRegisterBtn.onclick = (e) => { e.preventDefault();
            loginSection.style.display = 'none';
            registerSection.style.display = 'block'; };
        showLoginBtn.onclick = (e) => { e.preventDefault();
            registerSection.style.display = 'none';
            loginSection.style.display = 'block'; };
    }
}

function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async(e) => {
            e.preventDefault();
            try {
                await window.AuthService.login(document.getElementById('login-identifier').value.trim(), document.getElementById('login-password').value);
                window.location.href = 'index.html';
            } catch (error) {
                showToast("Erro ao entrar: " + error.message, "error");
            }
        };
    }
}

function initRegisterForm() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.onsubmit = async(e) => {
            e.preventDefault();
            const pass = document.getElementById('reg-password').value;
            if (pass.length < 6) return showToast("A senha precisa ter pelo menos 6 caracteres.", "error");

            try {
                await window.AuthService.register({
                    name: document.getElementById('reg-name').value.trim(),
                    username: document.getElementById('reg-username').value.trim(),
                    email: document.getElementById('reg-email').value.trim(),
                    password: pass
                });
                showToast("Conta criada com sucesso! 🐆");
                window.location.href = 'index.html';
            } catch (error) {
                showToast("Erro no registo: " + error.message, "error");
            }
        };
    }
}

// 3. PERFIL, IMAGENS E HOBBIES
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

    const bannerUrl = user.banner || 'var(--brand-gradient)';
    if (document.getElementById('profile-page-banner')) document.getElementById('profile-page-banner').style.background = user.banner ? `url(${user.banner}) center/cover` : bannerUrl;
    if (document.getElementById('settings-banner-preview')) document.getElementById('settings-banner-preview').style.background = user.banner ? `url(${user.banner}) center/cover` : bannerUrl;
}

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
            if (window.tempAvatarBase64) updatedData.avatar = window.tempAvatarBase64;
            if (window.tempBannerBase64) updatedData.banner = window.tempBannerBase64;

            try {
                await window.AuthService.updateUser(activeUsername, updatedData);
                showToast('Perfil atualizado com sucesso! 🐆');
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                showToast('Erro ao salvar: ' + error.message, 'error');
            }
        };
    }
}

// Lógica de Upload de Imagem
let pendingImageType = '';
let pendingImageBase64 = '';

function processImageUpload(file, type) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        pendingImageBase64 = e.target.result;
        pendingImageType = type;
        document.getElementById('adjust-preview-img').src = pendingImageBase64;
        document.getElementById('modal-adjust-image').classList.add('active');
    };
    reader.readAsDataURL(file);
}

// 4. INICIALIZAÇÃO GERAL
document.addEventListener('DOMContentLoaded', async() => {
    initPasswordToggle();
    initAuthToggles();
    initLoginForm();
    initRegisterForm();
    initProfileForm();

    if (typeof window.AuthService !== 'undefined' && window.AuthService.getCurrentUser()) {
        await loadUserDataUI();
    }

    // Eventos de Imagem
    if (document.getElementById('avatar-upload')) document.getElementById('avatar-upload').addEventListener('change', (e) => processImageUpload(e.target.files[0], 'avatar'));
    if (document.getElementById('banner-upload')) document.getElementById('banner-upload').addEventListener('change', (e) => processImageUpload(e.target.files[0], 'banner'));

    document.addEventListener('click', (e) => {
        const modalAdjust = document.getElementById('modal-adjust-image');
        if (e.target.id === 'cancel-adjust-btn' || e.target.id === 'cancel-adjust-btn-2') modalAdjust.classList.remove('active');
        if (e.target.id === 'confirm-adjust-btn') {
            if (pendingImageType === 'avatar') {
                document.getElementById('settings-avatar-preview').src = pendingImageBase64;
                window.tempAvatarBase64 = pendingImageBase64;
            } else {
                document.getElementById('settings-banner-preview').style.background = `url(${pendingImageBase64}) center/cover`;
                window.tempBannerBase64 = pendingImageBase64;
            }
            modalAdjust.classList.remove('active');
        }
    });

    // Eventos de Hobbies
    const saveHobbiesBtn = document.getElementById('save-hobbies-btn');
    if (saveHobbiesBtn) {
        const activeUser = window.AuthService.getCurrentUser();
        const userData = await window.AuthService.getUserData(activeUser);
        let savedHobbies = userData ? userData.hobbies || {} : {};

        function renderFinalHobbiesList() {
            const list = document.getElementById('hobbies-list-render');
            if (!list) return;
            list.innerHTML = Object.keys(savedHobbies).map(theme => `
                <div class="hobby-card">
                    <div class="hobby-card-info"><h4>${theme}</h4><p>${savedHobbies[theme].join(', ')}</p></div>
                    <div class="hobby-card-actions"><span class="material-symbols-outlined" style="cursor:pointer;" onclick="deleteHobbyTheme('${theme}')">delete</span></div>
                </div>`).join('');
        }

        window.deleteHobbyTheme = function(theme) { delete savedHobbies[theme];
            renderFinalHobbiesList(); };

        const hobbyInput = document.getElementById('hobby-input');
        if (hobbyInput) {
            hobbyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const theme = document.getElementById('hobby-theme').value;
                    if (!theme) return showToast('Selecione um campo primeiro.', 'error');
                    const val = hobbyInput.value.trim().replace(',', '');
                    if (!val) return;
                    if (!savedHobbies[theme]) savedHobbies[theme] = [];
                    if (savedHobbies[theme].length >= 5) return showToast(`Limite de 5 itens.`, 'error');
                    if (!savedHobbies[theme].includes(val)) { savedHobbies[theme].push(val);
                        renderFinalHobbiesList(); }
                    hobbyInput.value = '';
                }
            });
        }

        saveHobbiesBtn.addEventListener('click', async() => {
            try {
                await window.AuthService.saveUserData(activeUser, { hobbies: savedHobbies });
                showToast('Interesses atualizados!');
                saveHobbiesBtn.closest('.modal-overlay').classList.remove('active');
            } catch (e) { showToast('Erro ao salvar.', 'error'); }
        });
        renderFinalHobbiesList();
    }
});

// Outros modais e logout
document.querySelectorAll('.open-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const modal = document.getElementById(btn.getAttribute('data-modal'));
        if (modal) { modal.classList.add('active');
            document.body.style.overflow = 'hidden'; }
    });
});

document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal && modal.id !== 'modal-adjust-image') { modal.classList.remove('active');
            document.body.style.overflow = ''; }
    });
});

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', async(e) => { e.preventDefault();
    await window.AuthService.logout();
    window.location.href = 'auth.html'; });