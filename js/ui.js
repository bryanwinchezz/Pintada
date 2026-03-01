// ==========================================
// js/ui.js - INTERFACE, TOASTS E MODAIS (FIREBASE)
// ==========================================
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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

// 2. CARREGAR DADOS DO USUÁRIO (FIREBASE)
async function loadUserDataUI() {
    const activeUsername = AuthService.getCurrentUser();
    if (!activeUsername) return;

    // Busca dados no Firestore
    const user = await AuthService.getUserData(activeUsername);
    if (!user) return;

    // Atualiza nomes e bio na interface
    document.querySelectorAll('.profile-name').forEach(el => el.textContent = user.name);
    document.querySelectorAll('.profile-handle').forEach(el => el.textContent = `@${user.username}`);
    document.querySelectorAll('.profile-bio').forEach(el => el.textContent = user.bio || "Membro da Pintada 🐆");

    // Atualiza contadores
    if (document.getElementById('profile-following-count'))
        document.getElementById('profile-following-count').textContent = user.followingList ? user.followingList.length : 0;
    if (document.getElementById('profile-followers-count'))
        document.getElementById('profile-followers-count').textContent = user.followers || 0;

    // Atualiza Avatares
    const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=F4B41A&color=fff`;
    document.querySelectorAll('.profile-pic img, .profile-page-avatar, #settings-avatar-preview, .create-post-header .post-avatar').forEach(img => {
        img.src = avatarUrl;
    });

    // Preenche formulários de configurações
    if (document.getElementById('edit-name')) document.getElementById('edit-name').value = user.name;
    if (document.getElementById('edit-username')) document.getElementById('edit-username').value = user.username;
    if (document.getElementById('edit-bio')) document.getElementById('edit-bio').value = user.bio || "";

    const emailInput = document.querySelector('#modal-email input[disabled]');
    if (emailInput) emailInput.value = user.email || "";

    // Atualiza Banner
    if (document.getElementById('profile-page-banner')) {
        document.getElementById('profile-page-banner').style.background = user.banner ? `url(${user.banner}) center/cover` : 'var(--brand-gradient)';
    }
}

// 3. PESQUISA GLOBAL (ASSÍNCRONA)
async function initGlobalSearch() {
    const searchInput = document.querySelector('.nav-search input');
    const searchContainer = document.querySelector('.nav-search');
    if (!searchInput || !searchContainer) return;

    const resultsBox = document.createElement('div');
    resultsBox.className = 'search-dropdown';
    resultsBox.style.cssText = 'position: absolute; top: 100%; left: 0; width: 100%; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: none; z-index: 1000; max-height: 350px; overflow-y: auto;';
    searchContainer.appendChild(resultsBox);

    searchInput.addEventListener('input', async(e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length < 2) { resultsBox.style.display = 'none'; return; }

        const allUsers = await AuthService.getUsers(); // Espera o Firebase
        const filtered = allUsers.filter(u => u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query));

        if (filtered.length === 0) {
            resultsBox.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted);">Ninguém encontrado 🐆</div>';
        } else {
            resultsBox.innerHTML = filtered.slice(0, 5).map(u => `
                <a href="profile.html?user=${u.username}" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; text-decoration: none; color: var(--text-main); border-bottom: 1px solid var(--border-color);">
                    <img src="${u.avatar || 'https://ui-avatars.com/api/?name='+u.name}" style="width: 36px; height: 36px; border-radius: 50%;">
                    <div><div style="font-weight:600;">${u.name}</div><div style="font-size:0.8rem;color:var(--text-muted);">@${u.username}</div></div>
                </a>`).join('');
        }
        resultsBox.style.display = 'block';
    });

    document.addEventListener('click', (e) => { if (!searchContainer.contains(e.target)) resultsBox.style.display = 'none'; });
}

// 4. MÁGICA DO UPLOAD IMGBB
async function uploadToImgBB(base64String) {
    const apiKey = '02d34ec2cd7054a202c57bf35f17bc5a';
    const base64Data = base64String.split(',')[1];
    const formData = new FormData();
    formData.append('image', base64Data);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
        const data = await response.json();
        return data.data.url;
    } catch (e) { return null; }
}

// 5. EVENTOS DE INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    loadUserDataUI();
    initGlobalSearch();

    // Gerenciamento de Modais
    document.querySelectorAll('.open-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = document.getElementById(btn.getAttribute('data-modal'));
            if (modal) modal.classList.add('active');
        });
    });

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) modal.classList.remove('active');
        });
    });
});

// 6. FORMULÁRIO DE PERFIL (SALVAR NO FIREBASE)
const formProfile = document.getElementById('form-profile');
if (formProfile) {
    formProfile.addEventListener('submit', async(e) => {
        e.preventDefault();
        const activeUsername = AuthService.getCurrentUser();
        const submitBtn = formProfile.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Salvando na nuvem... ⏳';
        submitBtn.disabled = true;

        try {
            let userData = await AuthService.getUserData(activeUsername);
            userData.name = document.getElementById('edit-name').value;
            userData.bio = document.getElementById('edit-bio').value;

            if (window.tempAvatarBase64) userData.avatar = await uploadToImgBB(window.tempAvatarBase64);
            if (window.tempBannerBase64) userData.banner = await uploadToImgBB(window.tempBannerBase64);

            await AuthService.saveUserData(activeUsername, userData);
            showToast('Perfil atualizado globalmente! 🐆');
            loadUserDataUI();
            e.target.closest('.modal-overlay').classList.remove('active');
        } catch (err) {
            showToast('Erro ao salvar no Firebase', 'error');
        } finally {
            submitBtn.textContent = 'Salvar Alterações';
            submitBtn.disabled = false;
        }
    });
}

// 7. APAGAR CONTA (ZONA DE PERIGO)
const confirmDeleteBtn = document.getElementById('confirm-delete-account-btn');
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async() => {
        const activeUsername = AuthService.getCurrentUser();
        const typed = document.getElementById('delete-username-input').value.trim();

        if (typed !== activeUsername) return showToast('Nome de usuário incorreto!', 'error');

        try {
            // Remove do Firestore
            await deleteDoc(doc(window.db, "users", activeUsername));
            showToast('Conta apagada permanentemente. Até mais! 🐆');
            await AuthService.logout();
            window.location.href = 'auth.html';
        } catch (e) {
            showToast('Erro ao apagar conta.', 'error');
        }
    });
}

// 8. LOGOUT E OUTROS
document.querySelectorAll('#logout-btn').forEach(btn => {
    btn.addEventListener('click', async(e) => {
        e.preventDefault();
        await AuthService.logout();
        window.location.href = 'auth.html';
    });
});

// Exporta funções para uso global
window.showToast = showToast;
window.loadUserDataUI = loadUserDataUI;