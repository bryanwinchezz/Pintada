// ==========================================
// js/ui.js - INTERFACE, TOASTS, AUTH E PERFIL
// ==========================================

// ==========================================
// 0. ESCUDO DE AUTENTICAÇÃO (PROTEÇÃO DE PÁGINAS)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // CORREÇÃO: PERMITIR SELECIONAR A MESMA IMAGEM DUAS VEZES
    // ==========================================
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('click', function () {
            this.value = ''; // Esvazia o input sempre que clica, forçando o navegador a ler a imagem de novo!
        });
    });
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

// ==========================================
// SISTEMA DE NOTIFICAÇÃO GLOBAL (Bolinha Vermelha no PC e Mobile)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const activeUsername = window.AuthService ? window.AuthService.getCurrentUser() : null;
    if (!activeUsername) return;

    // 1. BOLINHA DE MENSAGENS PRIVADAS
    if (window.MessageService) {
        window.MessageService.listenToAllMyMessages(activeUsername, (count) => {
            const msgLinks = document.querySelectorAll('a[href*="messages.html"], .mobile-item[href*="messages.html"]');
            const isMessagesPage = window.location.pathname.includes('messages.html');
            const savedCount = parseInt(localStorage.getItem(`pintada_msg_count_${activeUsername}`)) || 0;

            // Guarda a contagem real na memória para usarmos no clique
            localStorage.setItem(`pintada_msg_count_realtime_${activeUsername}`, count);

            if (isMessagesPage) {
                localStorage.setItem(`pintada_msg_count_${activeUsername}`, count);
                msgLinks.forEach(el => {
                    let dot = el.querySelector('.msg-dot');
                    if (dot) dot.remove();
                });
            } else if (count > savedCount) {
                // MENSAGEM NOVA! Apaga a memória de "chat lido" para a bolinha aparecer nos contatos
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('pintada_chat_read_')) localStorage.removeItem(key);
                });

                msgLinks.forEach(el => {
                    if (!el.querySelector('.msg-dot')) {
                        el.style.position = 'relative';
                        el.insertAdjacentHTML('beforeend', '<span class="msg-dot" style="position: absolute; top: 5px; right: 5px; width: 10px; height: 10px; background: #EF4444; border-radius: 50%; border: 2px solid var(--card-bg);"></span>');
                    }
                });
            } else {
                msgLinks.forEach(el => {
                    let dot = el.querySelector('.msg-dot');
                    if (dot) dot.remove();
                });
            }
        });
    }

    // 2. BOLINHA DE NOTIFICAÇÕES GERAIS
    const isNotifPage = window.location.pathname.includes('notifications.html');
    const notifLinks = document.querySelectorAll('a[href*="notifications.html"], .mobile-item[href*="notifications.html"]');

    if (isNotifPage) {
        localStorage.setItem(`pintada_notif_time_${activeUsername}`, Date.now());
        notifLinks.forEach(el => {
            let dot = el.querySelector('.notif-dot');
            if (dot) dot.remove();
        });
    } else {
        setInterval(async () => {
            try {
                const lastCheck = parseInt(localStorage.getItem(`pintada_notif_time_${activeUsername}`)) || 0;
                const posts = await window.PostService.getPosts();
                let hasNew = false;

                for (let p of posts) {
                    if (p.timestamp > lastCheck && p.content && p.content.includes(`@${activeUsername}`)) hasNew = true;
                    if (p.authorUsername === activeUsername && p.likesData) {
                        for (let user in p.likesData) {
                            if (user !== activeUsername && p.likesData[user] > lastCheck) hasNew = true;
                        }
                    }
                    if (p.comments) {
                        for (let c of p.comments) {
                            if (c.timestamp > lastCheck && c.authorUsername !== activeUsername) {
                                if (p.authorUsername === activeUsername || c.text.includes(`@${activeUsername}`)) hasNew = true;
                            }
                        }
                    }
                    if (hasNew) break;
                }

                if (hasNew) {
                    notifLinks.forEach(el => {
                        if (!el.querySelector('.notif-dot')) {
                            el.style.position = 'relative';
                            el.insertAdjacentHTML('beforeend', '<span class="notif-dot" style="position: absolute; top: 5px; right: 5px; width: 10px; height: 10px; background: #EF4444; border-radius: 50%; border: 2px solid var(--card-bg);"></span>');
                        }
                    });
                }
            } catch (e) { }
        }, 10000);
    }
});

// ==========================================
// DESTRUIDOR DE BOLINHAS (Limpeza ao clicar)
// ==========================================
document.addEventListener('click', (e) => {
    const activeUsername = window.AuthService ? window.AuthService.getCurrentUser() : null;

    // 1. Apaga a bolinha do chat clicado e avisa o sistema que foi lido
    const chatLink = e.target.closest('li, .contact-item, div[onclick*="loadChatRealTime"]');
    if (chatLink) {
        const onclickAttr = chatLink.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/'([^']+)'/);
            if (match && match[1]) {
                // Grava que ESTE usuário foi lido!
                localStorage.setItem('pintada_chat_read_' + match[1], 'true');
            }
        }

        const dot = chatLink.querySelector('.msg-dot-chat, span[style*="background: #EF4444"]');
        if (dot) dot.remove();
    }

    // 2. Limpa bolinhas da barra inferior ao clicar nos ícones
    const navBtn = e.target.closest('a[href*="messages.html"], a[href*="notifications.html"], .mobile-item');
    if (navBtn) {
        const navDot = navBtn.querySelector('.msg-dot, .notif-dot');
        if (navDot) navDot.remove();

        // Se clicou nas mensagens, sincroniza a contagem para não voltar a bolinha do nada
        if (navBtn.href && navBtn.href.includes('messages.html') && activeUsername) {
            const realCount = localStorage.getItem(`pintada_msg_count_realtime_${activeUsername}`) || 0;
            localStorage.setItem(`pintada_msg_count_${activeUsername}`, realCount);
        }
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

    // ==========================================
    // MÁGICA: Atualiza o título da aba e as Meta Tags para compartilhamento!
    // ==========================================
    if (isProfilePage) {
        document.title = `${user.name} | Pintada`;

        // Tenta achar a meta tag de título de compartilhamento (OG:Title) ou cria uma nova
        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (!ogTitle) {
            ogTitle = document.createElement('meta');
            ogTitle.setAttribute('property', 'og:title');
            document.head.appendChild(ogTitle);
        }
        ogTitle.setAttribute('content', `Perfil de ${user.name} na Pintada 🐆`);

        // Tenta achar a meta tag de descrição (OG:Description) ou cria uma nova
        let ogDesc = document.querySelector('meta[property="og:description"]');
        if (!ogDesc) {
            ogDesc = document.createElement('meta');
            ogDesc.setAttribute('property', 'og:description');
            document.head.appendChild(ogDesc);
        }
        ogDesc.setAttribute('content', user.bio ? user.bio : `Venha ver o perfil de ${user.name} na Pintada!`);
    }
    // ==========================================

    // Preenche textos principais (AGORA COM O SELO!)
    const badgeHTML = typeof window.getBadgeHTML === 'function' ? window.getBadgeHTML(user.badge) : '';
    document.querySelectorAll('.profile-name').forEach(el => {
        el.innerHTML = `${window.escapeHTML(user.name || "Utilizador")} ${badgeHTML}`;
    });
    document.querySelectorAll('.profile-handle').forEach(el => { el.textContent = `@${user.username}`; });
    document.querySelectorAll('.profile-bio').forEach(el => {
        el.innerHTML = window.escapeHTML(user.bio || "").replace(/\n/g, '<br>');
    });

    // === CORREÇÃO DOS SEGUIDORES: MATEMÁTICA REAL ===
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
        followersEl.textContent = realFollowersCount;
        followersEl.parentElement.style.cursor = 'pointer';
        followersEl.parentElement.onclick = () => openConnectionsModal('followers', targetUsername, user);
    }

    // Preenche os campos do modal (Se for você mesmo editando)
    if (document.getElementById('edit-name')) document.getElementById('edit-name').value = user.name || "";
    if (document.getElementById('edit-username')) document.getElementById('edit-username').value = user.username || "";
    if (document.getElementById('edit-bio')) document.getElementById('edit-bio').value = user.bio || "";
    if (document.getElementById('edit-phone')) document.getElementById('edit-phone').value = user.phone || "";
    if (document.getElementById('edit-website')) document.getElementById('edit-website').value = user.website || "";

    // Carrega as imagens para a pré-visualização no modal
    if (document.getElementById('edit-avatar-preview')) {
        document.getElementById('edit-avatar-preview').src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=F4B41A&color=fff`;
    }
    if (document.getElementById('edit-banner-preview')) {
        document.getElementById('edit-banner-preview').src = user.banner || 'var(--brand-gradient)';
    }

    // Carrega os outros dados
    if (document.getElementById('edit-birthdate')) {
        document.getElementById('edit-birthdate').value = user.birthdate || '';
    }
    if (document.getElementById('edit-profile-border')) {
        document.getElementById('edit-profile-border').value = user.profileBorder || '';
    }
    if (document.getElementById('edit-gender')) document.getElementById('edit-gender').value = user.gender || "";
    if (document.getElementById('edit-pronouns')) document.getElementById('edit-pronouns').value = user.pronouns || "";
    if (document.getElementById('edit-relationship')) document.getElementById('edit-relationship').value = user.relationship || "";

    const targetAvatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=F4B41A&color=fff`;
    document.querySelectorAll('.profile-page-avatar, #settings-avatar-preview').forEach(img => {
        img.src = targetAvatarUrl;
        // MÁGICA: Apaga qualquer moldura antiga automaticamente
        Array.from(img.classList).forEach(c => { if (c.startsWith('moldura-')) img.classList.remove(c); });
        // Adiciona a moldura escolhida ou a padrão preta!
        // Adiciona a moldura escolhida de forma segura!
        const molduraEscolhida = user.profileBorder || 'moldura-padrao';
        if (molduraEscolhida && molduraEscolhida.trim() !== '') {
            img.classList.add(molduraEscolhida.trim());
        }
        img.style.border = 'none';

        // NOVO: Clique para abrir a foto de perfil em tela cheia
        if (img.classList.contains('profile-page-avatar')) {
            img.style.cursor = 'pointer';
            img.onclick = () => window.openImageModal(targetAvatarUrl);
        }
    });

    const activeUserData = await window.AuthService.getUserData(activeUsername);
    if (activeUserData) {
        const myAvatarUrl = activeUserData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUserData.name)}&background=F4B41A&color=fff`;

        document.querySelectorAll('.profile-pic img, .create-post-header .post-avatar').forEach(img => {
            img.src = myAvatarUrl;
            img.classList.remove('skeleton');
            Array.from(img.classList).forEach(c => { if (c.startsWith('moldura-')) img.classList.remove(c); });
            // Adiciona a moldura escolhida de forma segura!
            const molduraEscolhida = activeUserData.profileBorder || 'moldura-padrao';
            if (molduraEscolhida && molduraEscolhida.trim() !== '') {
                img.classList.add(molduraEscolhida.trim());
            }
            img.style.border = 'none';
        });
    }

    const bannerUrl = user.banner || 'var(--brand-gradient)';
    const profileBanner = document.getElementById('profile-page-banner');
    if (profileBanner) {
        profileBanner.style.background = user.banner ? `url(${user.banner}) center/cover` : bannerUrl;

        // NOVO: Clique para abrir o banner se o usuário tiver um
        if (user.banner) {
            profileBanner.style.cursor = 'pointer';
            profileBanner.onclick = () => window.openImageModal(user.banner);
        } else {
            profileBanner.style.cursor = 'default';
            profileBanner.onclick = null;
        }
    }

    if (document.getElementById('settings-banner-preview')) document.getElementById('settings-banner-preview').style.background = user.banner ? `url(${user.banner}) center/cover` : bannerUrl;

    // RENDERIZAÇÃO DAS TAGS DE INFORMAÇÕES
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

    // NOVO DESIGN DOS HOBBIES
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

    // BOTÕES DE SEGUIR E MENSAGEM
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
                    <button class="icon-btn" onclick="window.shareProfile('${targetUsername}')" title="Compartilhar Perfil" style="background: var(--hover-bg); border-radius: 50%; width: 38px; height: 38px; min-width: 38px; min-height: 38px; flex-shrink: 0; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color);">
                        <span class="material-symbols-outlined" style="font-size: 20px; color: var(--text-main);">share</span>
                    </button>
                `;
                actionContainer.appendChild(btnGroup);
            }
        }
    }

    // DESLIGA O CARREGAMENTO
    document.querySelectorAll('.skeleton').forEach(el => {
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
            if (!activeUsername) return;

            const submitBtn = formProfile.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'A guardar...';

            try {
                // 1. Puxa os dados que já estão no banco para NÃO APAGAR nada (como os hobbies)
                const activeUserData = await window.AuthService.getUserData(activeUsername);

                // 2. Lê a tela. Se o campo existir, pega o texto. Se não, mantém o antigo!
                const newName = document.getElementById('edit-name') ? document.getElementById('edit-name').value.trim() : activeUserData.name;
                const newBio = document.getElementById('edit-bio') ? document.getElementById('edit-bio').value.trim() : (activeUserData.bio || "");
                const newPhone = document.getElementById('edit-phone') ? document.getElementById('edit-phone').value.trim() : (activeUserData.phone || "");
                const newWebsite = document.getElementById('edit-website') ? document.getElementById('edit-website').value.trim() : (activeUserData.website || "");
                const newBirthdate = document.getElementById('edit-birthdate') ? document.getElementById('edit-birthdate').value.trim() : (activeUserData.birthdate || "");
                const newGender = document.getElementById('edit-gender') ? document.getElementById('edit-gender').value : (activeUserData.gender || "");
                const newPronouns = document.getElementById('edit-pronouns') ? document.getElementById('edit-pronouns').value : (activeUserData.pronouns || "");
                const newRelationship = document.getElementById('edit-relationship') ? document.getElementById('edit-relationship').value : (activeUserData.relationship || "");
                const newBorder = document.getElementById('edit-profile-border') ? document.getElementById('edit-profile-border').value : (activeUserData.profileBorder || "");

                // 3. Monta o pacote com TUDO MISTURADO (Novo + Antigo)
                const updatedData = {
                    ...activeUserData, // Traz os hobbies, data de criação, etc!
                    name: newName,
                    username: activeUserData.username, // Trava o arroba para não estragar o login!
                    email: activeUserData.email,       // Trava o email para não estragar o login!
                    bio: newBio,
                    phone: newPhone,
                    website: newWebsite,
                    birthdate: newBirthdate,
                    gender: newGender,
                    pronouns: newPronouns,
                    relationship: newRelationship,
                    profileBorder: newBorder
                };

                // Imagens (Se recortou alguma nova)
                if (window.tempAvatarBase64) updatedData.avatar = window.tempAvatarBase64;
                if (window.tempBannerBase64) updatedData.banner = window.tempBannerBase64;

                // 4. Manda para a base de dados
                await window.AuthService.updateUser(activeUsername, updatedData);
                showToast('Perfil atualizado com sucesso! 🐆');
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                showToast('Erro ao guardar: ' + error.message, 'error');
            } finally {
                if (submitBtn) submitBtn.textContent = 'Salvar Alterações';
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

        // 1. Verifica se clicou no Cancelar OU no X (ícone close)
        const clickedCancel = e.target.id === 'cancel-adjust-btn' || e.target.id === 'cancel-adjust-btn-2';
        const clickedX = e.target.classList.contains('material-symbols-outlined') && e.target.textContent.trim() === 'close' && e.target.closest('#modal-adjust-image');

        if (clickedCancel || clickedX) {
            modalAdjust.classList.remove('active');

            // MÁGICA 1: Limpa o input de arquivo para você conseguir selecionar a mesma foto novamente
            document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
        }

        // 2. Verifica se clicou em Confirmar
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

            // MÁGICA 2: Limpa o input aqui também para não bugar a próxima seleção
            document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
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
                // Agora usamos a função nova que SUBSTITUI tudo e apaga de vez!
                await window.AuthService.updateUserHobbies(activeUser, savedHobbies);
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
        // Pessoas que seguem o usuário
        list = allUsers.filter(u => u.followingList && u.followingList.includes(targetUsername));
    }

    if (list.length === 0) {
        body.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 20px;">Nenhum usuário encontrado.</p>';
        return;
    }

    // Desenha a lista com as MOLDURAS e SELOS DE VERIFICAÇÃO!
    body.innerHTML = list.map(u => {
        // Puxa o selo (se tiver)
        const badgeHTML = typeof window.getBadgeHTML === 'function' ? window.getBadgeHTML(u.badge) : '';
        // Puxa a moldura salva ou a padrão preta
        const userBorder = u.profileBorder || 'moldura-padrao';
        // Puxa a foto ou a letra inicial
        const avatarUrl = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=F4B41A&color=fff`;

        return `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 10px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: 0.2s;" onmouseover="this.style.backgroundColor='var(--hover-bg)'" onmouseout="this.style.backgroundColor='transparent'" onclick="window.location.href='profile.html?user=${u.username}'">
            
            <div style="position: relative; display: flex; justify-content: center; align-items: center;">
                <img src="${avatarUrl}" class="${userBorder}" style="width: 48px; height: 48px; min-width: 48px; border-radius: 50%; object-fit: cover; border: none;">
            </div>
            
            <div style="flex-grow: 1; min-width: 0; overflow: hidden;">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <strong style="color: var(--text-main); font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${window.escapeHTML(u.name)}</strong>
                    ${badgeHTML}
                </div>
                <span style="color: var(--text-muted); font-size: 0.85rem; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">@${u.username}</span>
            </div>
            
        </div>
        `;
    }).join('');
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
window.openImageModal = function (imgSrc) {
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
window.getBadgeHTML = function (badgeType) {
    if (!badgeType || badgeType === 'none') return '';

    // Agora usamos regras CSS completas para suportar gradientes!
    const styles = {
        'blue': 'color: #1D9BF0;',
        'red': 'color: #EF4444;',
        'staff': 'color: #8B5CF6;',
        'green': 'color: #10B981;',
        'pink': 'color: #EC4899;',
        'black': 'color: #404040; text-shadow: 0px 0px 1px rgba(255,255,255,0.3);',
        'brown': 'color: #A0522D;',
        'rainbow': 'background: linear-gradient(to bottom, #E40303 0%, #E40303 16.6%, #FF8C00 16.6%, #FF8C00 33.3%, #FFED00 33.3%, #FFED00 50%, #008026 50%, #008026 66.6%, #004DFF 66.6%, #004DFF 83.3%, #750787 83.3%, #750787 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;',
        'owner': 'background: linear-gradient(135deg, #FFDF00 0%, #F4B41A 40%, #8B0000 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;',

        // NOVOS SELOS AQUI:
        'insta': 'background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;',
        'pb': 'background: linear-gradient(135deg, #111111 0%, #888888 50%, #dddddd 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;',
        'ocean': 'background: linear-gradient(135deg, #02b3e4 0%, #02dfb9 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;'
    };

    const styleString = styles[badgeType] || styles['blue'];

    return `<span class="material-symbols-outlined verified-badge" title="Conta Verificada" style="${styleString} font-size: 1.15em; vertical-align: middle; margin-left: 4px; font-variation-settings: 'FILL' 1;">verified</span>`;
};

// ==========================================
// APLICAR IMAGENS E MOLDURAS GLOBALMENTE (NAVBAR, SETTINGS, FEED)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const activeUserForBorder = window.AuthService ? window.AuthService.getCurrentUser() : null;
    if (activeUserForBorder) {
        try {
            const userData = await window.AuthService.getUserData(activeUserForBorder);
            if (userData) {
                const myAvatar = userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=F4B41A&color=fff`;
                const myBanner = userData.banner || 'var(--brand-gradient)';

                // 1. Força a foto na Navbar, Caixa de Postar, e na edição de Configurações!
                document.querySelectorAll('.profile-pic img, .post-input-area .post-avatar, .create-post-header .post-avatar, #edit-avatar-preview, #settings-avatar-preview').forEach(img => {
                    img.src = myAvatar;
                    img.classList.remove('skeleton');
                    // MÁGICA: Apaga qualquer moldura antiga automaticamente
                    Array.from(img.classList).forEach(c => { if (c.startsWith('moldura-')) img.classList.remove(c); });
                    // Adiciona a moldura escolhida de forma segura!
                    const molduraEscolhida = userData.profileBorder || 'moldura-padrao';
                    if (molduraEscolhida && molduraEscolhida.trim() !== '') {
                        img.classList.add(molduraEscolhida.trim());
                    }
                    img.style.border = 'none';
                });

                // 2. Força o Banner correto no Modal de Configurações!
                document.querySelectorAll('#edit-banner-preview, #settings-banner-preview').forEach(banner => {
                    banner.style.background = userData.banner ? `url(${userData.banner}) center/cover` : myBanner;
                });

                // 3. Aplica na foto grande do Perfil
                const profileAvatar = document.querySelector('.profile-page-avatar');
                if (profileAvatar) {
                    Array.from(profileAvatar.classList).forEach(c => { if (c.startsWith('moldura-')) profileAvatar.classList.remove(c); });
                    profileAvatar.classList.add(userData.profileBorder || 'moldura-padrao');
                    profileAvatar.style.border = 'none';
                }
            }
        } catch (error) {
            console.error("Erro ao carregar UI global:", error);
        }
    }
});

// ==========================================
// COMPARTILHAR PERFIL
// ==========================================
window.shareProfile = function (usernameTarget) {
    // Se não passar um alvo, ele tenta pegar o usuário da URL ou o usuário logado
    const target = usernameTarget || new URLSearchParams(window.location.search).get('user') || window.AuthService.getCurrentUser();

    // Monta o link completo (ex: https://seusite.com/profile.html?user=bryan)
    const url = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/') + 'profile.html?user=' + target;

    navigator.clipboard.writeText(url).then(() => {
        window.showToast('Link do perfil copiado! 📋', 'success');
    }).catch(err => {
        window.showToast('Erro ao copiar o link.', 'error');
    });
};

const logoutSettingsBtn = document.getElementById('logout-settings-card');
if (logoutSettingsBtn) {
    logoutSettingsBtn.addEventListener('click', () => {
        if (confirm("Deseja realmente sair da sua conta? 🐆")) {
            if (window.AuthService && window.AuthService.logout) {
                window.AuthService.logout();
                alert("RECARREGUE A PÁGINA 🐆");
            } else {
                console.error("Serviço de autenticação não carregado.");
            }
        }
    });
};

// ==========================================
// LOGICA DE NOTIFICAÇÕES (CHATS E COMUNIDADES)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const activeUser = window.AuthService ? window.AuthService.getCurrentUser() : null;

    if (activeUser) {
        const addDot = (el) => {
            if (!el || el.querySelector('.msg-dot')) return;
            const dot = document.createElement('span');
            dot.className = 'msg-dot';
            el.appendChild(dot);
        };

        const storageKeyPrivate = `pintada_msg_count_${activeUser}`;
        const storageKeyComm = `pintada_comm_msg_count_${activeUser}`;
        const hiddenChatsKey = `pintada_hidden_chats_${activeUser}`;

        // 1. MONITORAR MENSAGENS PRIVADAS, DESOCULTAR E JOGAR PRO TOPO
        window.MessageService.listenToInbox(activeUser, (allMsgs) => {
            const currentCount = allMsgs.length;
            const storedCount = parseInt(localStorage.getItem(storageKeyPrivate) || "0");

            let hiddenChats = JSON.parse(localStorage.getItem(hiddenChatsKey)) || [];
            let recentChats = JSON.parse(localStorage.getItem(`pintada_recent_chats_${activeUser}`)) || [];
            let mudou = false;

            allMsgs.forEach(msg => {
                // Se a pessoa mandou mensagem e estava oculta, volta pra lista
                if (hiddenChats.includes(msg.sender)) {
                    hiddenChats = hiddenChats.filter(id => id !== msg.sender);
                    mudou = true;
                }

                // Se for uma mensagem NOVA, joga o remetente pro topo da lista!
                if (currentCount > storedCount) {
                    recentChats = recentChats.filter(id => id !== msg.sender);
                    recentChats.push(msg.sender);
                    mudou = true;
                }
            });

            if (mudou) {
                localStorage.setItem(hiddenChatsKey, JSON.stringify(hiddenChats));
                localStorage.setItem(`pintada_recent_chats_${activeUser}`, JSON.stringify(recentChats));

                // Reorganiza a tela na mesma hora, sem precisar dar F5!
                if (window.location.pathname.includes('messages.html')) {
                    if (typeof window.renderContacts === 'function') window.renderContacts();
                }
            }

            // Adiciona a bolinha no menu se a mensagem for nova
            if (currentCount > storedCount) {
                document.querySelectorAll('a[href="messages.html"], .mobile-item[href="messages.html"]').forEach(addDot);
            }
        });

        // 2. MONITORAR COMUNIDADES
        const checkCommNotifs = async () => {
            try {
                const myComms = await window.CommunityService.getMyCommunities(activeUser);
                const commIds = myComms.map(c => c.id);
                if (commIds.length > 0) {
                    window.MessageService.listenToAllJoinedCommunities(commIds, (commMsgs) => {
                        const currentCommCount = commMsgs.length;
                        const storedCommCount = parseInt(localStorage.getItem(storageKeyComm) || "0");
                        if (currentCommCount > storedCommCount) {
                            document.querySelectorAll('a[href="messages.html"], .mobile-item[href="messages.html"]').forEach(addDot);
                        }
                    });
                }
            } catch (e) { console.error("Erro notif comm:", e); }
        };
        checkCommNotifs();
    }
});

// ==========================================
// MONITOR DE NOTIFICAÇÕES GLOBAIS (BOLINHA VERMELHA)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const activeUser = window.AuthService ? window.AuthService.getCurrentUser() : null;
    if (!activeUser || window.location.pathname.includes('notifications.html')) return;

    setTimeout(async () => {
        try {
            const lastRead = parseInt(localStorage.getItem(`pintada_notif_read_${activeUser}`)) || 0;
            let hasNew = false;

            // Puxa as últimas postagens para ver se foi mencionado ou tem comentários novos
            const recentPosts = await window.PostService.getPosts();
            for (let p of recentPosts) {
                if (p.timestamp > lastRead && p.content && p.content.includes(`@${activeUser}`)) hasNew = true;
                if (p.comments) {
                    for (let c of p.comments) {
                        if (c.timestamp > lastRead && (c.text.includes(`@${activeUser}`) || p.authorUsername === activeUser)) hasNew = true;
                    }
                }
                if (hasNew) break;
            }

            if (hasNew) {
                document.querySelectorAll('a[href="notifications.html"], .mobile-item[href="notifications.html"]').forEach(el => {
                    if (!el.querySelector('.notif-dot')) {
                        const dot = document.createElement('span');
                        dot.className = 'notif-dot';
                        dot.style.cssText = 'background:#EF4444; border-radius:50%; width:10px; height:10px; position:absolute; top:5px; right:5px;';
                        el.style.position = 'relative';
                        el.appendChild(dot);
                    }
                });
            }
        } catch (e) { console.log("Erro ao checar notificações", e); }
    }, 2000); // Aguarda 2s para não pesar o carregamento inicial
});

// ==========================================
// AUTO-EXPANSÃO DE TEXTAREAS (BIO, POSTAGENS, ETC)
// ==========================================
document.addEventListener('input', function (e) {
    if (e.target.tagName.toLowerCase() === 'textarea') {
        e.target.style.height = 'auto'; // Reseta a altura
        e.target.style.height = (e.target.scrollHeight) + 'px'; // Define a nova altura baseada no conteúdo
    }
}, false);

document.addEventListener('DOMContentLoaded', () => {
    const bioInput = document.getElementById('edit-bio');
    if (bioInput) {
        bioInput.addEventListener('input', function () {
            this.style.height = 'auto'; // Reseta o tamanho
            this.style.height = this.scrollHeight + 'px'; // Estica pro tamanho do texto
        });
    }
});

// ==========================================
// DESTRUIDOR DE BOLINHAS (Limpeza ao clicar)
// ==========================================
document.addEventListener('click', (e) => {
    const activeUsername = window.AuthService ? window.AuthService.getCurrentUser() : null;

    // 1. Apaga a bolinha do chat clicado e avisa o sistema que foi lido
    const chatLink = e.target.closest('.contact-item');
    if (chatLink) {
        // Puxa o ID da pessoa através do data-id (AQUI ESTAVA O ERRO!)
        const userId = chatLink.getAttribute('data-id');
        if (userId) {
            localStorage.setItem('pintada_chat_read_' + userId, 'true');
        }

        // Destrói o visual da bolinha na mesma hora
        const dot = chatLink.querySelector('span[style*="background: #EF4444"]');
        if (dot) dot.remove();
    }

    // 2. Limpa bolinhas da barra inferior ao clicar nos ícones
    const navBtn = e.target.closest('a[href*="messages.html"], a[href*="notifications.html"], .mobile-item');
    if (navBtn) {
        const navDot = navBtn.querySelector('.msg-dot, .notif-dot');
        if (navDot) navDot.remove();

        if (navBtn.href && navBtn.href.includes('messages.html') && activeUsername) {
            const realCount = localStorage.getItem(`pintada_msg_count_realtime_${activeUsername}`) || 0;
            localStorage.setItem(`pintada_msg_count_${activeUsername}`, realCount);
        }
    }
});