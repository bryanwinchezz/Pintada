// ==========================================
// js/ui.js - INTERFACE, TOASTS, AUTH E PERFIL
// ==========================================

// ==========================================
// 0. ESCUDO DE AUTENTICAÇÃO (PROTEÇÃO DE PÁGINAS)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Descobre em que página o utilizador está no momento
    let currentPage = window.location.pathname.split('/').pop();

    // Se aceder apenas ao domínio (sem o nome do ficheiro), assume que é o index
    if (currentPage === '') currentPage = 'index.html';

    // Puxa o utilizador ativo do sistema
    const activeUser = window.AuthService ? window.AuthService.getCurrentUser() : null;

    // REGRA 1: Não tem conta/login e tenta aceder ao site -> Vai para o Auth (Login)
    if (!activeUser && currentPage !== 'auth.html') {
        window.location.replace('auth.html');
    }

    // REGRA 2: Já tem login feito e tenta abrir a página de Login -> Vai para o Feed (Index)
    if (activeUser && currentPage === 'auth.html') {
        window.location.replace('index.html');
    }
});

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
    }, 6000);
}
window.showToast = showToast;

// SISTEMA DE NOTIFICAÇÃO GLOBAL (Bolinha Vermelha no Menu)
document.addEventListener('DOMContentLoaded', () => {
    const activeUsername = window.AuthService ? window.AuthService.getCurrentUser() : null;
    if (activeUsername && window.MessageService) {
        window.MessageService.listenToAllMyMessages(activeUsername, (count) => {
            const menuMsgs = Array.from(document.querySelectorAll('.menu-item')).find(el => el.href && el.href.includes('messages.html'));
            const mobileMsgs = Array.from(document.querySelectorAll('.mobile-item')).find(el => el.href && el.href.includes('messages.html'));

            const addDot = (el) => {
                if (!el) return;
                let dot = el.querySelector('.msg-dot');
                if (!dot) {
                    dot = document.createElement('span');
                    dot.className = 'msg-dot';
                    dot.style.cssText = 'background: #EF4444; width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-left: 5px;';
                    el.appendChild(dot);
                }
            };

            const removeDot = (el) => {
                if (!el) return;
                let dot = el.querySelector('.msg-dot');
                if (dot) dot.remove();
            };

            const isMessagesPage = window.location.pathname.includes('messages.html');

            if (isMessagesPage) {
                // Se está na aba de mensagens, atualiza a memória para o número atual de mensagens e limpa a bolinha
                localStorage.setItem(`pintada_msg_count_${activeUsername}`, count);
                removeDot(menuMsgs);
                removeDot(mobileMsgs);
            } else {
                // Se está em outra aba, só mostra a bolinha se o número de mensagens for MAIOR que o que está na memória
                const savedCount = parseInt(localStorage.getItem(`pintada_msg_count_${activeUsername}`)) || 0;
                if (count > savedCount) {
                    addDot(menuMsgs);
                    addDot(mobileMsgs);
                } else {
                    removeDot(menuMsgs);
                    removeDot(mobileMsgs);
                }
            }
        });
    }
});

function initSearch() {
    document.querySelectorAll('.nav-search').forEach(searchContainer => {
        const input = searchContainer.querySelector('input');

        // Cria a caixinha do dropdown dinamicamente se ela não existir
        let dropdown = searchContainer.querySelector('.search-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'search-dropdown';
            searchContainer.appendChild(dropdown);
        }

        // Evento que dispara a cada letra digitada
        input.addEventListener('input', async (e) => {
            const query = e.target.value.replace('@', '').trim().toLowerCase();

            if (query.length < 1) {
                dropdown.style.display = 'none';
                return;
            }

            const users = await window.AuthService.getUsers();

            // Filtra os usuários (máximo de 5 resultados para não poluir a tela)
            const foundUsers = users.filter(u =>
                u.username.toLowerCase().includes(query) ||
                u.name.toLowerCase().includes(query)
            ).slice(0, 5);

            if (foundUsers.length > 0) {
                dropdown.innerHTML = foundUsers.map(u => `
                    <a href="profile.html?user=${u.username}" class="search-result-item">
                        <img src="${u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=F4B41A&color=fff`}" class="search-result-avatar">
                        <div>
                            <strong style="display:block; font-size:0.9rem;">${window.escapeHTML(u.name)}</strong>
                            <span style="color:var(--text-muted); font-size:0.8rem;">@${u.username}</span>
                        </div>
                    </a>
                `).join('');
                dropdown.style.display = 'flex';
            } else {
                dropdown.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-muted); font-size:0.9rem;">Nenhum usuário encontrado</div>';
                dropdown.style.display = 'flex';
            }
        });

        // Esconde o dropdown se o usuário clicar fora da barra de pesquisa
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        // Mantém a função do Enter (caso ele queira ir direto pro perfil exato)
        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = input.value.replace('@', '').trim().toLowerCase();
                if (!query) return;
                const users = await window.AuthService.getUsers();
                const exactMatch = users.find(u => u.username.toLowerCase() === query || u.name.toLowerCase() === query);
                if (exactMatch) window.location.href = `profile.html?user=${exactMatch.username}`;
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

// -----------------------------------------------------
// FUNÇÃO loadUserDataUI ATUALIZADA (CORREÇÃO DE FOTO E SEGUIDORES)
// -----------------------------------------------------
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
    if (!user) { showToast("Perfil não encontrado.", "error"); return; }

    // Preenche textos principais (AGORA COM O SELO!)
    const badgeHTML = typeof window.getBadgeHTML === 'function' ? window.getBadgeHTML(user.badge) : '';
    document.querySelectorAll('.profile-name').forEach(el => { 
        el.innerHTML = `${window.escapeHTML(user.name || "Utilizador")} ${badgeHTML}`; 
    });
    document.querySelectorAll('.profile-handle').forEach(el => { el.textContent = `@${user.username}`; });
    document.querySelectorAll('.profile-bio').forEach(el => { el.textContent = user.bio || ""; });

    // === CORREÇÃO DOS SEGUIDORES: MATEMÁTICA REAL ===
    // Conta exatamente quantas pessoas têm você na lista delas (ignora o número fantasma do Firebase)
    const allNetworkUsers = await window.AuthService.getUsers();
    const realFollowersCount = allNetworkUsers.filter(u => u.followingList && u.followingList.includes(targetUsername)).length;

    const followingEl = document.getElementById('profile-following-count');
    const followersEl = document.getElementById('profile-followers-count');

    if (followingEl) {
        followingEl.textContent = user.followingList ? user.followingList.length : 0;
        followingEl.parentElement.style.cursor = 'pointer';
        followingEl.parentElement.onclick = () => openConnectionsModal('following', targetUsername, user);
    }
    if (followersEl) {
        followersEl.textContent = realFollowersCount; // Usa a matemática real aqui!
        followersEl.parentElement.style.cursor = 'pointer';
        followersEl.parentElement.onclick = () => openConnectionsModal('followers', targetUsername, user);
    }

    // Preenche os campos do modal (Se for você mesmo editando)
    if (document.getElementById('edit-name')) document.getElementById('edit-name').value = user.name || "";
    if (document.getElementById('edit-username')) document.getElementById('edit-username').value = user.username || "";
    if (document.getElementById('edit-bio')) document.getElementById('edit-bio').value = user.bio || "";
    if (document.getElementById('edit-phone')) document.getElementById('edit-phone').value = user.phone || "";
    if (document.getElementById('edit-website')) document.getElementById('edit-website').value = user.website || "";
    if (document.getElementById('edit-birthdate')) document.getElementById('edit-birthdate').value = user.birthdate || "";
    if (document.getElementById('edit-gender')) document.getElementById('edit-gender').value = user.gender || "";
    if (document.getElementById('edit-pronouns')) document.getElementById('edit-pronouns').value = user.pronouns || "";
    if (document.getElementById('edit-relationship')) document.getElementById('edit-relationship').value = user.relationship || "";

    // === CORREÇÃO DA FOTO NA NAVBAR ===
    // 1. Aplica a foto do dono do perfil (targetUsername) APENAS no quadrado grande do perfil e no modal de edição
    const targetAvatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=F4B41A&color=fff`;
    document.querySelectorAll('.profile-page-avatar, #settings-avatar-preview').forEach(img => img.src = targetAvatarUrl);

    // 2. Aplica a SUA foto (activeUsername) na Navbar lá em cima e APENAS na caixinha de Criar Post!
    const activeUserData = await window.AuthService.getUserData(activeUsername);
    if (activeUserData) {
        const myAvatarUrl = activeUserData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUserData.name)}&background=F4B41A&color=fff`;
        
        // Agora usamos .create-post-header .post-avatar para não afetar os posts do feed
        document.querySelectorAll('.profile-pic img, .create-post-header .post-avatar').forEach(img => {
            img.src = myAvatarUrl;
            img.classList.remove('skeleton');
        });
    }

    const bannerUrl = user.banner || 'var(--brand-gradient)';
    if (document.getElementById('profile-page-banner')) document.getElementById('profile-page-banner').style.background = user.banner ? `url(${user.banner}) center/cover` : bannerUrl;
    if (document.getElementById('settings-banner-preview')) document.getElementById('settings-banner-preview').style.background = user.banner ? `url(${user.banner}) center/cover` : bannerUrl;

    // ========================================================
    // RENDERIZAÇÃO DAS TAGS DE INFORMAÇÕES
    // ========================================================
    const detailsRow = document.getElementById('profile-details-render');
    if (detailsRow) {
        detailsRow.innerHTML = '';

        const addTag = (icon, text, isLink = false, linkUrl = "") => {
            if (!text || text === 'Selecione...') return;

            if (isLink) {
                detailsRow.innerHTML += `<span style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;"><span class="material-symbols-outlined" style="font-size: 14px;">${icon}</span> <a href="${linkUrl}" target="_blank" style="color: #D97A00; text-decoration: none;">${window.escapeHTML(text)}</a></span>`;
            } else {
                let displayText = window.escapeHTML(text);
                if (icon === 'cake' && text.includes('-')) {
                    const [y, m, d] = text.split('-');
                    displayText = `${d}/${m}/${y}`;
                }
                detailsRow.innerHTML += `<span style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;"><span class="material-symbols-outlined" style="font-size: 14px;">${icon}</span> ${displayText}</span>`;
            }
        };

        addTag('account_circle', user.pronouns);
        addTag('wc', user.gender);
        addTag('favorite', user.relationship);
        addTag('cake', user.birthdate);

        if (user.website) {
            const link = user.website.startsWith('http') ? user.website : 'https://' + user.website;
            addTag('link', user.website.replace(/^https?:\/\//, ''), true, link);
        }
    }

    // ========================================================
    // NOVO DESIGN DOS HOBBIES (Estilo Pílula Marrom)
    // ========================================================
    const hobbiesRow = document.getElementById('profile-hobbies-render');
    if (hobbiesRow) {
        hobbiesRow.innerHTML = '';
        if (user.hobbies && Object.keys(user.hobbies).length > 0) {
            let hobbiesContent = '';
            Object.keys(user.hobbies).forEach(theme => {
                if (user.hobbies[theme].length > 0) {
                    hobbiesContent += `
                    <div style="margin-top: 18px;">
                        <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 10px; font-weight: bold;">${window.escapeHTML(theme)}</h3>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            ${user.hobbies[theme].map(item => `
                                <span style="background: var(--brand-gradient); color: #FFF; padding: 6px 16px; border-radius: 20px; font-size: 0.9rem; font-weight: bold; display: inline-block;">
                                    ${window.escapeHTML(item)}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                `;
                }
            });
            hobbiesRow.innerHTML = hobbiesContent;
        }
    }

    // ========================================================
    // BOTÕES DE SEGUIR E MENSAGEM (Para perfis de terceiros)
    // ========================================================
    if (isProfilePage) {
        const actionContainer = document.querySelector('.profile-avatar-row');
        const existingBtn = actionContainer.querySelector('.btn-outline, .btn-primary');

        if (targetUsername !== activeUsername) {
            const activeUserFull = await window.AuthService.getUserData(activeUsername);
            const isFollowing = activeUserFull.followingList && activeUserFull.followingList.includes(targetUsername);

            if (existingBtn) existingBtn.remove();

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

    // ========================================================
    // DESLIGA O CARREGAMENTO (Remove os esqueletos)
    // ========================================================
    document.querySelectorAll('.skeleton').forEach(el => {
        // Se o elemento já tiver texto ou src real, remove o skeleton
        if (el.innerText.trim() !== "" || el.src?.includes('http')) {
            el.classList.remove('skeleton');
        }
    });
}

// -----------------------------------------------------
// 1. SUBSTITUA A FUNÇÃO initProfileForm
// -----------------------------------------------------
function initProfileForm() {
    const formProfile = document.getElementById('form-profile');
    if (formProfile) {
        formProfile.onsubmit = async (e) => {
            e.preventDefault();
            const activeUsername = window.AuthService.getCurrentUser();

            // Dados básicos
            const updatedData = {
                name: document.getElementById('edit-name') ? document.getElementById('edit-name').value.trim() : "",
                username: document.getElementById('edit-username') ? document.getElementById('edit-username').value.trim() : "",
                bio: document.getElementById('edit-bio') ? document.getElementById('edit-bio').value.trim() : ""
            };

            // Dados Avançados do seu print (verifica se os campos existem antes de salvar)
            if (document.getElementById('edit-phone')) updatedData.phone = document.getElementById('edit-phone').value.trim();
            if (document.getElementById('edit-website')) updatedData.website = document.getElementById('edit-website').value.trim();
            if (document.getElementById('edit-birthdate')) updatedData.birthdate = document.getElementById('edit-birthdate').value.trim();
            if (document.getElementById('edit-gender')) updatedData.gender = document.getElementById('edit-gender').value;
            if (document.getElementById('edit-pronouns')) updatedData.pronouns = document.getElementById('edit-pronouns').value;
            if (document.getElementById('edit-relationship')) updatedData.relationship = document.getElementById('edit-relationship').value;

            // Imagens
            if (window.tempAvatarBase64) updatedData.avatar = window.tempAvatarBase64;
            if (window.tempBannerBase64) updatedData.banner = window.tempBannerBase64;

            try {
                await window.AuthService.updateUser(activeUsername, updatedData);
                showToast('Perfil atualizado com sucesso! 🐆');
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                showToast('Erro ao guardar: ' + error.message, 'error');
            }
        };
    }
}

let pendingImageType = '';
let cropper = null;

function processImageUpload(file, type) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        pendingImageType = type;
        const imagePreview = document.getElementById('adjust-preview-img');
        imagePreview.src = e.target.result;
        document.getElementById('modal-adjust-image').classList.add('active');
        if (cropper) cropper.destroy();
        cropper = new Cropper(imagePreview, { aspectRatio: type === 'avatar' ? 1 / 1 : 3 / 1, viewMode: 1, background: false });
    };
    reader.readAsDataURL(file);
}

document.addEventListener('DOMContentLoaded', async () => {

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
        window.deleteHobbyTheme = function (theme) {
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
        saveHobbiesBtn.addEventListener('click', async () => {
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

// 1. FECHAR MODAIS
document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal && modal.id !== 'modal-adjust-image') {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// 2. LOGOUT
document.querySelectorAll('#logout-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        await window.AuthService.logout();
        window.location.href = 'auth.html';
    });
});

// 3. APAGAR CONTA (ZONA DE PERIGO)
const confirmDeleteBtn = document.getElementById('confirm-delete-account-btn');
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        const activeUsername = window.AuthService.getCurrentUser();
        const typed = document.getElementById('delete-username-input').value.trim();

        if (typed !== activeUsername) return showToast('Nome de usuário incorreto!', 'error');

        try {
            confirmDeleteBtn.textContent = "Apagando...";
            await window.AuthService.deleteAccount(activeUsername);
            showToast('Conta apagada permanentemente. Até mais! 🐆');
            setTimeout(() => window.location.href = 'auth.html', 1500);
        } catch (e) {
            showToast('Erro: Faça login novamente para excluir a conta.', 'error');
            confirmDeleteBtn.textContent = "Excluir Conta";
        }
    });
}

// 4. INICIALIZAÇÃO AO CARREGAR A PÁGINA (DOMContentLoaded)
document.addEventListener('DOMContentLoaded', async () => {
    const activeUsername = window.AuthService.getCurrentUser();

    // ABRIR MODAL AUTOMATICAMENTE SE VIER DA TELA DE PERFIL (?openModal=...)
    const urlParams = new URLSearchParams(window.location.search);
    const modalToOpen = urlParams.get('openModal');
    if (modalToOpen) {
        const modal = document.getElementById(modalToOpen);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // EXIBE O NOME DO USUÁRIO NO MODAL DE APAGAR CONTA PARA ELE SABER O QUE DIGITAR
    const delDisplay = document.getElementById('delete-username-display');
    if (delDisplay && activeUsername) {
        delDisplay.textContent = activeUsername;
    }
});

// ==========================================
// FUNÇÃO PARA ABRIR LISTA DE SEGUIDORES/SEGUINDO
// ==========================================
window.openConnectionsModal = async function (type, targetUsername, userData) {
    const modal = document.getElementById('modal-connections');
    const title = document.getElementById('connections-modal-title');
    const body = document.getElementById('connections-modal-body');
    if (!modal || !body) return;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 20px;">Carregando...</p>';
    title.textContent = type === 'following' ? 'Seguindo' : 'Seguidores';

    const allUsers = await window.AuthService.getUsers();
    let list = [];

    if (type === 'following') {
        // Pessoas que o usuário segue
        const followingUsernames = userData.followingList || [];
        list = allUsers.filter(u => followingUsernames.includes(u.username));
    } else {
        // Pessoas que seguem o usuário (procura na lista dos outros se o nome dele está lá)
        list = allUsers.filter(u => u.followingList && u.followingList.includes(targetUsername));
    }

    if (list.length === 0) {
        body.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 20px;">Nenhum usuário encontrado.</p>';
        return;
    }

    // Desenha a lista
    body.innerHTML = list.map(u => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 10px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: 0.2s;" onmouseover="this.style.backgroundColor='var(--hover-bg)'" onmouseout="this.style.backgroundColor='transparent'" onclick="window.location.href='profile.html?user=${u.username}'">
            <img src="${u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=F4B41A&color=fff`}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">
            <div>
                <strong style="color: var(--text-main); display: block; font-size: 0.95rem;">${window.escapeHTML(u.name)}</strong>
                <span style="color: var(--text-muted); font-size: 0.85rem;">@${u.username}</span>
            </div>
        </div>
    `).join('');
};

// ==========================================
// 5. SISTEMA DE PRESENÇA (ONLINE / OFFLINE)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const activeUser = window.AuthService ? window.AuthService.getCurrentUser() : null;

    if (activeUser && window.AuthService.setOnlineStatus) {
        // 1. Fica ONLINE assim que entra no site
        window.AuthService.setOnlineStatus(activeUser, true);

        // 2. Atualiza de 3 em 3 minutos (se a tela estiver aberta)
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                window.AuthService.setOnlineStatus(activeUser, true);
            }
        }, 3 * 60 * 1000);

        // 3. O SEGREDO DOS TELEMÓVEIS: Fica offline na hora se minimizar o browser ou trocar de aba!
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                window.AuthService.setOnlineStatus(activeUser, true); // Voltou pro site
            } else {
                window.AuthService.setOnlineStatus(activeUser, false); // Minimizou
            }
        });

        // 4. Se fechar a aba de vez (Computador)
        window.addEventListener('pagehide', () => {
            window.AuthService.setOnlineStatus(activeUser, false);
        });
    }
});

// ==========================================
// FORMATAÇÃO E VALIDAÇÃO DE CADASTRO (AUTH)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Força o usuário a digitar minúsculo e sem espaços em tempo real!
    const regUsernameInput = document.getElementById('reg-username');
    if (regUsernameInput) {
        regUsernameInput.addEventListener('input', (e) => {
            // Pega o que foi digitado, joga para minúsculo e remove tudo que não for letra ou número
            e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        });
    }

    // ADICIONE ESTE BLOCO NOVO AQUI: Força minúsculas na edição de perfil
    const editUsernameInput = document.getElementById('edit-username');
    if (editUsernameInput) {
        editUsernameInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        });
    }

    // 2. Envio do formulário de cadastro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const password = document.getElementById('reg-password').value;
            const username = document.getElementById('reg-username').value;
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            if (password.length < 6) {
                return window.showToast("A senha deve conter no mínimo 6 caracteres.", "error");
            }
            if (username.length < 3) {
                return window.showToast("O usuário deve ter pelo menos 3 letras.", "error");
            }

            try {
                submitBtn.textContent = "Criando conta...";
                submitBtn.disabled = true;

                await window.AuthService.register({
                    name: document.getElementById('reg-name').value,
                    username: username,
                    email: document.getElementById('reg-email').value,
                    password: password,
                    bio: "Novo membro da Pintada! 🐆",
                    hobbies: {}
                });

                window.showToast("Conta criada com sucesso!");
                setTimeout(() => window.location.href = 'index.html', 1000);

            } catch (error) {
                // Mostra o erro exato na tela (ex: "Nome de usuário já em uso")
                window.showToast(error.message, "error");
                submitBtn.textContent = "Criar Conta";
                submitBtn.disabled = false;
            }
        });
    }

    // 3. Envio do formulário de Login (Já que você não usa mais o script.js)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            try {
                submitBtn.textContent = "Entrando...";
                submitBtn.disabled = true;

                // Força o identificador a ficar minúsculo caso ele tente logar com o nome de usuário
                const identifier = document.getElementById('login-identifier').value.toLowerCase();

                await window.AuthService.login(
                    identifier,
                    document.getElementById('login-password').value
                );
                window.location.href = 'index.html';
            } catch (error) {
                window.showToast("Erro ao fazer login. Verifique os dados.", "error");
                submitBtn.textContent = "Entrar";
                submitBtn.disabled = false;
            }
        });
    }

});

// ==========================================
// LÓGICA DE TROCA DE E-MAIL E SENHA
// ==========================================

// 1. Mostrar o e-mail atual no modal (UX)
const emailDisplay = document.getElementById('current-email-display');
if (emailDisplay && window.AuthService) {
    const activeUser = window.AuthService.getCurrentUser();
    window.AuthService.getUserData(activeUser).then(user => {
        if (user) emailDisplay.value = user.email; // Preenche o campo vazio!
    });
}

// 2. Lidar com a troca de E-mail
const formChangeEmail = document.getElementById('form-change-email');
if (formChangeEmail) {
    formChangeEmail.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newEmail = document.getElementById('new-email-input').value.trim();
        const currentPassword = document.getElementById('current-password-email').value;
        const btnSubmit = formChangeEmail.querySelector('button');

        try {
            btnSubmit.textContent = "A atualizar...";
            btnSubmit.disabled = true;

            await window.AuthService.changeEmail(newEmail, currentPassword);

            // Aviso de 7 segundos!
            window.showToast("Link de confirmação enviado! Verifique a caixa de entrada ou SPAM do novo e-mail.", "success", 7000);
            formChangeEmail.reset();
            document.getElementById('modal-email').classList.remove('active');
        } catch (error) {
            console.error("ERRO FIREBASE:", error);
            let msg = error.message;

            if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password")) {
                msg = "A senha atual está incorreta.";
            } else if (msg.includes("auth/email-already-in-use")) {
                msg = "Este e-mail já está a ser usado por outra conta.";
            } else if (msg.includes("Nenhum utilizador logado") || msg.includes("auth/user-not-found")) {
                msg = "Sessão fantasma! Clique em 'Sair' no menu e faça login novamente.";
            } else if (msg.includes("auth/requires-recent-login")) {
                msg = "Por segurança, faça logout e login novamente para alterar o e-mail.";
            }

            window.showToast(msg, "error");
        } finally {
            btnSubmit.textContent = "Atualizar E-mail";
            btnSubmit.disabled = false;
        }
    });
}

// 3. Lidar com a troca de Senha
const formChangePassword = document.getElementById('form-change-password');
if (formChangePassword) {
    formChangePassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('new-password-input').value;
        const currentPassword = document.getElementById('current-password-pass').value;
        const confirmPassword = document.getElementById('confirm-password-input').value;
        const btnSubmit = formChangePassword.querySelector('button');

        if (newPassword !== confirmPassword) {
            return window.showToast("As novas senhas não coincidem!", "error");
        }

        if (newPassword.length < 6) {
            return window.showToast("A nova senha deve ter no mínimo 6 caracteres.", "error");
        }

        try {
            btnSubmit.textContent = "A atualizar...";
            btnSubmit.disabled = true;

            await window.AuthService.changePassword(newPassword, currentPassword);

            window.showToast("Senha atualizada com sucesso! 🔐", "success");
            formChangePassword.reset();
            document.getElementById('modal-password').classList.remove('active');
        } catch (error) {
            console.error("ERRO FIREBASE:", error);
            let msg = error.message;

            if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password")) {
                msg = "A senha atual está incorreta.";
            } else if (msg.includes("Nenhum utilizador logado") || msg.includes("auth/user-not-found")) {
                msg = "Sessão fantasma! Clique em 'Sair' no menu e faça login novamente.";
            } else if (msg.includes("auth/requires-recent-login")) {
                msg = "Por segurança, faça logout e login novamente para alterar a senha.";
            }

            window.showToast(msg, "error");
        } finally {
            btnSubmit.textContent = "Atualizar Senha";
            btnSubmit.disabled = false;
        }
    });
}

// ==========================================
// REGISTRO DO SERVICE WORKER (PARA INSTALAR COMO APP)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('PWA: Service Worker registrado com sucesso!'))
            .catch(err => console.log('PWA: Falha ao registrar Service Worker', err));
    });
}

// Função Global para abrir imagens em tela cheia
window.openImageModal = function(imgSrc) {
    let modal = document.getElementById('chat-image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'chat-image-modal';
        
        // A MÁGICA ESTÁ AQUI: Adicionando os estilos para a tela inteira!
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.9); z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.3s ease;
        `;
        
        modal.innerHTML = `
            <span class="material-symbols-outlined" style="position:absolute; top:20px; right:20px; color:white; font-size:40px; cursor:pointer; background:rgba(0,0,0,0.5); border-radius:50%; padding:4px;">close</span>
            <img id="modal-large-image" src="" style="max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
        `;
        document.body.appendChild(modal);
        
        // Lógica para fechar com efeito
        modal.onclick = () => {
            modal.style.opacity = '0';
            setTimeout(() => modal.style.display = 'none', 300);
        };
    }
    
    document.getElementById('modal-large-image').src = imgSrc;
    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10); // Dispara o fade-in
};

// ==========================================
// GERADOR DE SELOS DE VERIFICAÇÃO
// ==========================================
window.getBadgeHTML = function(badgeType) {
    if (!badgeType || badgeType === 'none') return '';
    
    // Agora usamos regras CSS completas para suportar gradientes!
    const styles = {
        'blue': 'color: #1D9BF0;',
        'red': 'color: #EF4444;',
        'staff': 'color: #8B5CF6;',
        'green': 'color: #10B981;',
        'pink': 'color: #EC4899;',
        'black': 'color: #171717;',
        'brown': 'color: #A0522D;',
        'rainbow': 'background: linear-gradient(to bottom, #E40303 0%, #E40303 16.6%, #FF8C00 16.6%, #FF8C00 33.3%, #FFED00 33.3%, #FFED00 50%, #008026 50%, #008026 66.6%, #004DFF 66.6%, #004DFF 83.3%, #750787 83.3%, #750787 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;',
        'owner': 'background: linear-gradient(135deg, #FFDF00 0%, #F4B41A 40%, #8B0000 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;'
    };
    
    const styleString = styles[badgeType] || styles['blue'];
    
    return `<span class="material-symbols-outlined verified-badge" title="Conta Verificada" style="${styleString} font-size: 1.15em; vertical-align: middle; margin-left: 4px; font-variation-settings: 'FILL' 1;">verified</span>`;
};