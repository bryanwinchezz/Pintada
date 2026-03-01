// ==========================================
// js/ui.js - INTERFACE, TOASTS, AUTH E PERFIL
// ==========================================

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

function initSearch() {
    document.querySelectorAll('.nav-search input').forEach(input => {
        input.addEventListener('keypress', async(e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim().toLowerCase();
                if (!query) return;
                showToast('A pesquisar...', 'success');
                const users = await window.AuthService.getUsers();
                const found = users.find(u => u.username.toLowerCase().includes(query) || u.name.toLowerCase().includes(query));
                if (found) window.location.href = `profile.html?user=${found.username}`;
                else showToast('Utilizador não encontrado!', 'error');
            }
        });
    });
}

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

function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async(e) => {
            e.preventDefault();
            try {
                await window.AuthService.login(document.getElementById('login-identifier').value.trim(), document.getElementById('login-password').value);
                window.location.href = 'index.html';
            } catch (error) { showToast("Erro ao entrar: " + error.message, "error"); }
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
            } catch (error) { showToast("Erro no registo: O email pode já estar em uso.", "error"); }
        };
    }
}

async function loadUserDataUI() {
    const activeUsername = window.AuthService.getCurrentUser();
    if (!activeUsername) return;

    let targetUsername = activeUsername;
    const urlParams = new URLSearchParams(window.location.search);
    const isProfilePage = window.location.pathname.includes('profile.html');

    if (isProfilePage && urlParams.get('user')) {
        targetUsername = urlParams.get('user');
    }

    const user = await window.AuthService.getUserData(targetUsername);
    if (!user) {
        showToast("Perfil não encontrado.", "error");
        return;
    }

    // Preenche os dados
    document.querySelectorAll('.profile-name').forEach(el => { el.textContent = user.name || "Utilizador";
        el.classList.remove('skeleton');
        el.style.width = 'auto'; });
    document.querySelectorAll('.profile-handle').forEach(el => { el.textContent = `@${user.username}`;
        el.classList.remove('skeleton');
        el.style.width = 'auto'; });
    document.querySelectorAll('.profile-bio').forEach(el => { el.textContent = user.bio || "";
        el.classList.remove('skeleton');
        el.style.height = 'auto'; });

    // Atualiza Seguidores e Remove Skeleton
    const followingEl = document.getElementById('profile-following-count');
    const followersEl = document.getElementById('profile-followers-count');
    if (followingEl) { followingEl.textContent = user.followingList ? user.followingList.length : 0;
        followingEl.classList.remove('skeleton'); }
    if (followersEl) { followersEl.textContent = user.followers || 0;
        followersEl.classList.remove('skeleton'); }

    // Preenche Configurações
    if (document.getElementById('edit-name')) document.getElementById('edit-name').value = user.name || "";
    if (document.getElementById('edit-username')) document.getElementById('edit-username').value = user.username || "";
    if (document.getElementById('edit-bio')) document.getElementById('edit-bio').value = user.bio || "";

    const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=F4B41A&color=fff`;
    document.querySelectorAll('.profile-pic img, .profile-page-avatar, #settings-avatar-preview, .post-avatar').forEach(img => img.src = avatarUrl);

    const bannerUrl = user.banner || 'var(--brand-gradient)';
    if (document.getElementById('profile-page-banner')) document.getElementById('profile-page-banner').style.background = user.banner ? `url(${user.banner}) center/cover` : bannerUrl;
    if (document.getElementById('settings-banner-preview')) document.getElementById('settings-banner-preview').style.background = user.banner ? `url(${user.banner}) center/cover` : bannerUrl;

    // LÓGICA DO BOTÃO SEGUIR E MENSAGEM NO PERFIL
    if (isProfilePage) {
        const actionContainer = document.querySelector('.profile-avatar-row');
        const existingBtn = actionContainer.querySelector('.btn-outline, .btn-primary');

        if (targetUsername !== activeUsername) {
            const activeUserFull = await window.AuthService.getUserData(activeUsername);
            const isFollowing = activeUserFull.followingList && activeUserFull.followingList.includes(targetUsername);

            if (existingBtn) existingBtn.remove(); // Remove o "Editar Perfil"

            if (!document.getElementById('btn-group-others')) {
                const btnGroup = document.createElement('div');
                btnGroup.id = 'btn-group-others';
                btnGroup.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-bottom: 20px;';
                btnGroup.innerHTML = `
                    <button class="btn-primary follow-btn ${isFollowing ? 'following' : ''}" data-target-user="${targetUsername}" style="padding: 8px 20px; font-weight: bold; border-radius: 9999px; ${isFollowing ? 'background: transparent; color: var(--text-main); border: 1px solid var(--border-color);' : 'background: var(--brand-gradient); color: white; border: none;'}">
                        ${isFollowing ? 'Seguindo' : 'Seguir'}
                    </button>
                    <button class="btn-outline msg-btn" onclick="window.location.href='messages.html?chat=${targetUsername}'" style="padding: 8px 20px; border-radius: 9999px;">
                        Mensagem
                    </button>
                `;
                actionContainer.appendChild(btnGroup);
            }
        }
    }
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
            } catch (error) { showToast('Erro ao guardar: ' + error.message, 'error'); }
        };
    }
}

let pendingImageType = '';
let cropper = null;

function processImageUpload(file, type) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        pendingImageType = type;
        const imagePreview = document.getElementById('adjust-preview-img');
        imagePreview.src = e.target.result;
        document.getElementById('modal-adjust-image').classList.add('active');
        if (cropper) cropper.destroy();
        cropper = new Cropper(imagePreview, { aspectRatio: type === 'avatar' ? 1 / 1 : 3 / 1, viewMode: 1, background: false });
    };
    reader.readAsDataURL(file);
}

document.addEventListener('DOMContentLoaded', async() => {

    // SISTEMA DE SEGURANÇA: Redireciona quem não tem login para a tela de Auth
    const activeUsername = window.AuthService ? window.AuthService.getCurrentUser() : null;
    const isAuthPage = window.location.pathname.includes('auth.html');

    if (!activeUsername && !isAuthPage) {
        localStorage.setItem('pintada_needs_login', 'true');
        window.location.href = 'auth.html';
        return;
    }

    if (isAuthPage && localStorage.getItem('pintada_needs_login')) {
        showToast("Você precisa fazer login primeiro! 🐆", "error");
        localStorage.removeItem('pintada_needs_login');
    }

    initSearch();
    initPasswordToggle();
    initAuthToggles();
    initLoginForm();
    initRegisterForm();
    initProfileForm();

    if (activeUsername) await loadUserDataUI();

    if (document.getElementById('avatar-upload')) document.getElementById('avatar-upload').addEventListener('change', (e) => processImageUpload(e.target.files[0], 'avatar'));
    if (document.getElementById('banner-upload')) document.getElementById('banner-upload').addEventListener('change', (e) => processImageUpload(e.target.files[0], 'banner'));

    document.addEventListener('click', (e) => {
        const modalAdjust = document.getElementById('modal-adjust-image');
        if (e.target.id === 'cancel-adjust-btn' || e.target.id === 'cancel-adjust-btn-2') modalAdjust.classList.remove('active');
        if (e.target.id === 'confirm-adjust-btn') {
            if (cropper) {
                const canvas = cropper.getCroppedCanvas({ width: 500 });
                const base64Cropped = canvas.toDataURL('image/jpeg', 0.8);
                if (pendingImageType === 'avatar') {
                    document.getElementById('settings-avatar-preview').src = base64Cropped;
                    window.tempAvatarBase64 = base64Cropped;
                } else {
                    document.getElementById('settings-banner-preview').style.background = `url(${base64Cropped}) center/cover`;
                    window.tempBannerBase64 = base64Cropped;
                }
            }
            modalAdjust.classList.remove('active');
        }
    });

    const saveHobbiesBtn = document.getElementById('save-hobbies-btn');
    if (saveHobbiesBtn) {
        const activeUser = window.AuthService.getCurrentUser();
        const userData = await window.AuthService.getUserData(activeUser);
        let savedHobbies = userData ? userData.hobbies || {} : {};

        function renderFinalHobbiesList() {
            const list = document.getElementById('hobbies-list-render');
            if (!list) return;
            list.innerHTML = Object.keys(savedHobbies).map(theme => `
                <div class="hobby-card"><div class="hobby-card-info"><h4>${theme}</h4><p>${savedHobbies[theme].join(', ')}</p></div><div class="hobby-card-actions"><span class="material-symbols-outlined" style="cursor:pointer;" onclick="deleteHobbyTheme('${theme}')">delete</span></div></div>`).join('');
        }
        window.deleteHobbyTheme = function(theme) {
            delete savedHobbies[theme];
            renderFinalHobbiesList();
        };

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
                    if (!savedHobbies[theme].includes(val)) {
                        savedHobbies[theme].push(val);
                        renderFinalHobbiesList();
                    }
                    hobbyInput.value = '';
                }
            });
        }
        saveHobbiesBtn.addEventListener('click', async() => {
            try {
                await window.AuthService.saveUserData(activeUser, { hobbies: savedHobbies });
                showToast('Interesses atualizados!');
                saveHobbiesBtn.closest('.modal-overlay').classList.remove('active');
            } catch (e) { showToast('Erro ao guardar.', 'error'); }
        });
        renderFinalHobbiesList();
    }
});

document.querySelectorAll('.open-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const modal = document.getElementById(btn.getAttribute('data-modal'));
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });
});

document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal && modal.id !== 'modal-adjust-image') {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', async(e) => {
    e.preventDefault();
    await window.AuthService.logout();
    window.location.href = 'auth.html';
});