// ==========================================
// 1. TEMA MODO ESCURO
// ==========================================
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function setTheme(theme) {
    document.body.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
    if (themeIcon) themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    localStorage.setItem('pintada_theme', theme);
}

// ==========================================
// FUNÇÃO GLOBAL DE NOTIFICAÇÃO (TOAST)
// ==========================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');

    // Adiciona a classe principal e a classe da cor (toast-success ou toast-error)
    toast.className = `toast-notification toast-${type}`;

    // Escolhe o ícone do Google Icons que você já usa no projeto
    const iconName = type === 'success' ? 'check_circle' : 'error';

    // Constrói o HTML dentro do Toast (Ícone + Texto)
    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon">${iconName}</span>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Mostra o toast (animação de entrada)
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove depois de 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Espera a animação de saída acabar
    }, 3000);
}

const savedTheme = localStorage.getItem('pintada_theme');
if (savedTheme) setTheme(savedTheme);
else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => setTheme(document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
}

// ==========================================
// 2. SERVIÇO DE DADOS E AUTENTICAÇÃO (Múltiplos Usuários)
// ==========================================
const AuthService = {
    getUsers() {
        return JSON.parse(localStorage.getItem('pintada_users')) || [];
    },
    saveUsers(users) {
        localStorage.setItem('pintada_users', JSON.stringify(users));
    },
    getCurrentUser() {
        const activeUsername = localStorage.getItem('pintada_active_user');
        if (!activeUsername) return null;
        const users = this.getUsers();
        return users.find(u => u.username === activeUsername) || null;
    },
    async register(userData) {
        const users = this.getUsers();
        // Verifica se o email ou usuário já existem
        if (users.find(u => u.username === userData.username || u.email === userData.email)) {
            throw new Error('Nome de usuário ou e-mail já estão em uso.');
        }

        if (userData.followers === undefined) userData.followers = 15;
        if (userData.followingList === undefined) userData.followingList = [];
        if (!userData.hobbies) userData.hobbies = {};

        users.push(userData);
        this.saveUsers(users);
        localStorage.setItem('pintada_active_user', userData.username);
        return userData;
    },
    async login(identifier, password) {
        const users = this.getUsers();
        // Verifica se o 'identifier' bate com o email OU com o username
        const user = users.find(u => (u.email === identifier || u.username === identifier) && u.password === password);
        if (user) {
            localStorage.setItem('pintada_active_user', user.username);
            return user;
        }
        throw new Error('Usuário/E-mail ou senha incorretos.');
    },
    async logout() {
        localStorage.removeItem('pintada_active_user');
    },
    updateUser(oldUsername, updatedData) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.username === oldUsername);
        if (index !== -1) {
            users[index] = updatedData;
            this.saveUsers(users);
            // Atualiza a sessão caso ele tenha mudado o próprio username
            localStorage.setItem('pintada_active_user', updatedData.username);
        }
    },
    toggleFollow(targetUsername) {
        let user = this.getCurrentUser();
        if (user) {
            if (!user.followingList) user.followingList = [];
            const index = user.followingList.indexOf(targetUsername);
            if (index === -1) user.followingList.push(targetUsername);
            else user.followingList.splice(index, 1);
            this.updateUser(user.username, user);
        }
    }
};

function enforceAuth() {
    const user = AuthService.getCurrentUser();
    let page = window.location.pathname.split('/').pop() || 'index.html';
    if (!user && page !== 'auth.html') window.location.replace('auth.html');
    else if (user && page === 'auth.html') window.location.replace('index.html');
}
enforceAuth();

// ==========================================
// 3. SERVIÇO DE POSTAGENS E TEMPO REAL
// ==========================================
const defaultPosts = [
    { id: 1, authorName: "Ana Costa", authorUsername: "anacodes", authorAvatar: "https://ui-avatars.com/api/?name=Ana+Costa&background=8B5CF6&color=fff", time: "há 15 min", content: "Bom dia rede! ☕ Ambiente configurado. Alguém fã de tema escuro? 🌙💻", likes: 42, likedBy: [], reposts: 5, repostedBy: [], comments: [], isEdited: false },
    { id: 2, authorName: "João Silva", authorUsername: "joaosilva", authorAvatar: "https://ui-avatars.com/api/?name=João+Silva&background=D97A00&color=fff", time: "há 2 horas", content: "Acabei de entrar na Pintada! Design incrível. 🐆💻", likes: 128, likedBy: [], reposts: 12, repostedBy: [], comments: [{ authorName: "Maria", authorAvatar: "https://ui-avatars.com/api/?name=Maria&background=E0245E&color=fff", text: "Ficou muito bom mesmo! 🐆" }], isEdited: false }
];

function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Agora mesmo";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    return `há ${days} d`;
}

// Atualiza o tempo na tela a cada 1 minuto automaticamente
setInterval(() => {
    document.querySelectorAll('.post-time').forEach(el => {
        const ts = parseInt(el.getAttribute('data-timestamp'));
        if (ts > 10000) el.textContent = timeAgo(ts);
    });
}, 60000);

const PostService = {
    getPosts() {
        let posts = JSON.parse(localStorage.getItem('pintada_posts'));
        if (!posts) {
            posts = defaultPosts;
            this.savePosts(posts);
        }
        posts.forEach(p => {
            if (!p.likedBy) p.likedBy = [];
            if (!p.repostedBy) p.repostedBy = [];
            if (p.isEdited === undefined) p.isEdited = false;
        });
        return posts;
    },
    savePosts(posts) { localStorage.setItem('pintada_posts', JSON.stringify(posts)); },
    addPost(content, user, gifUrl = null, pollData = null) {
        const posts = this.getPosts();

        // Trava de segurança contra QuotaExceededError:
        // Evita salvar a foto gigante em Base64 dentro de cada post.
        let safeAvatar = user.avatar || '';
        if (safeAvatar.startsWith('data:image')) {
            safeAvatar = '';
        }

        posts.unshift({
            id: Date.now(),
            authorName: user.name,
            authorUsername: user.username,
            authorAvatar: safeAvatar,
            time: "Agora mesmo",
            content: content,
            gif: gifUrl,
            poll: pollData,
            likes: 0,
            likedBy: [],
            reposts: 0,
            repostedBy: [],
            comments: [],
            isEdited: false
        });

        this.savePosts(posts);
    },
    editPost(postId, newContent) {
        let posts = this.getPosts();
        let post = posts.find(p => p.id == postId);
        if (post) {
            post.content = newContent;
            post.isEdited = true;
        }
        this.savePosts(posts);
    },
    deletePost(postId) {
        let posts = this.getPosts();
        this.savePosts(posts.filter(p => p.id != postId));
    },
    addComment(postId, text, user) {
        const posts = this.getPosts();
        const post = posts.find(p => p.id == postId);
        if (post) {
            post.comments.push({ authorName: user.name, authorUsername: user.username, authorAvatar: user.avatar || '', text: text });
            this.savePosts(posts);
        }
    },
    toggleReaction(postId, username, type) {
        const posts = this.getPosts();
        const post = posts.find(p => p.id == postId);
        if (post) {
            const list = type === 'like' ? post.likedBy : post.repostedBy;
            const idx = list.indexOf(username);
            if (idx === -1) {
                list.push(username);
                type === 'like' ? post.likes++ : post.reposts++;
            } else {
                list.splice(idx, 1);
                type === 'like' ? post.likes-- : post.reposts--;
            }
            this.savePosts(posts);
        }
    },
    votePoll(postId, username, optionId) {
        const posts = this.getPosts();
        const post = posts.find(p => p.id == postId);
        if (post && post.poll) {
            const previousVoteId = post.poll.voters[username];
            if (previousVoteId !== undefined) {
                const oldOpt = post.poll.options.find(o => o.id === previousVoteId);
                if (oldOpt) oldOpt.votes--;
            }
            if (previousVoteId === optionId) {
                delete post.poll.voters[username];
            } else {
                post.poll.voters[username] = optionId;
                const newOpt = post.poll.options.find(o => o.id === optionId);
                if (newOpt) newOpt.votes++;
            }
            this.savePosts(posts);
        }
    }
};

function escapeHTML(str) { return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); }

// ==========================================
// 4. RENDERIZAÇÃO DO FEED
// ==========================================
let openCommentBoxes = [];

function generatePostHTML(post, currentUser) {
    const currentUserAvatar = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=F4B41A&color=fff`;

    let displayAvatar = post.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}&background=F4B41A&color=fff`;
    if (post.authorUsername === currentUser.username) displayAvatar = currentUserAvatar;

    const commentsHTML = post.comments.map(c => {
        let cAvatar = c.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&background=F4B41A&color=fff`;
        if (c.authorUsername === currentUser.username) cAvatar = currentUserAvatar;
        return `
        <div class="comment">
            <img src="${cAvatar}" alt="Foto" class="comment-avatar">
            <div class="comment-content"><span class="comment-author">${c.authorName}</span><p>${escapeHTML(c.text)}</p></div>
        </div>`;
    }).join('');

    const isAuthor = currentUser.username === post.authorUsername;
    const isLiked = post.likedBy.includes(currentUser.username);
    const isReposted = post.repostedBy.includes(currentUser.username);

    let followBtnHTML = '';
    if (!isAuthor && post.authorUsername !== 'admin_pintada') {
        const isFollowing = currentUser.followingList && currentUser.followingList.includes(post.authorUsername);
        followBtnHTML = `<button class="btn-outline follow-btn ${isFollowing ? 'following' : ''}" data-target-user="${post.authorUsername}">${isFollowing ? 'Seguindo' : 'Seguir'}</button>`;
    }

    const optionsMenuHTML = isAuthor ? `
        <div class="post-options-wrapper">
            <button class="icon-btn more-options" title="Mais opções"><span class="material-symbols-outlined">more_horiz</span></button>
            <div class="post-dropdown">
                <button class="dropdown-item edit-post-btn">Editar publicação</button>
                <button class="dropdown-item text-danger delete-post-btn">Apagar publicação</button>
            </div>
        </div>` : ``;

    const editedTag = post.isEdited ? `<span class="edited-tag">(Editado)</span>` : '';
    const commentSectionClass = openCommentBoxes.includes(post.id.toString()) ? 'active' : '';

    let displayTime = post.time;
    if (post.id > 10000) displayTime = timeAgo(post.id);

    let parsedContent = escapeHTML(post.content);

    let mediaHTML = '';
    if (post.gif) mediaHTML = `<img src="${post.gif}" class="post-image" style="margin-top: 10px; border-radius: 8px;">`;

    let pollHTML = '';
    if (post.poll) {
        const totalVotes = Object.keys(post.poll.voters).length;
        const userVote = post.poll.voters[currentUser.username];
        pollHTML = `<div class="poll-container" data-post-id="${post.id}">`;
        post.poll.options.forEach(opt => {
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
            const isVoted = userVote === opt.id ? 'voted' : '';
            pollHTML += `
                <div class="poll-option-result ${isVoted}" data-option-id="${opt.id}">
                    <div class="poll-bar" style="width: ${userVote !== undefined ? percent : 0}%;"></div>
                    <span class="poll-text">${escapeHTML(opt.text)}</span>
                    <span class="poll-percent">${userVote !== undefined ? percent + '%' : ''}</span>
                </div>
            `;
        });
        pollHTML += `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">${totalVotes} votos</div></div>`;
    }

    return `
        <article class="post-card" data-post-id="${post.id}">
            <header class="post-header">
                <img src="${displayAvatar}" alt="Foto" class="post-avatar">
                <div class="post-info">
                    <span class="post-author-name">${post.authorName}</span>
                    <span class="post-meta">@${post.authorUsername} • <span class="post-time" data-timestamp="${post.id}">${displayTime}</span> ${editedTag}</span>
                </div>
                ${followBtnHTML}
                ${optionsMenuHTML}
            </header>
            <div class="post-content"><p>${parsedContent}</p>${mediaHTML}${pollHTML}</div>
            <footer class="post-actions">
                <button class="action-btn like-btn ${isLiked ? 'liked' : ''}"><span class="material-symbols-outlined">favorite</span><span class="like-count">${post.likes}</span></button>
                <button class="action-btn comment-toggle-btn"><span class="material-symbols-outlined">chat_bubble</span><span class="comment-count">${post.comments.length}</span></button>
                <button class="action-btn repost-btn ${isReposted ? 'reposted' : ''}"><span class="material-symbols-outlined">repeat</span><span class="repost-count">${post.reposts}</span></button>
                <button class="action-btn share-btn"><span class="material-symbols-outlined">share</span></button>
            </footer>
            
            <div class="share-section">
                <div class="share-box"><span class="material-symbols-outlined">link</span><input type="text" readonly value="https://pintada.app/p/${post.id}"><button class="copy-btn">Copiar</button></div>
            </div>

            <div class="comments-section ${commentSectionClass}">
                <div class="comments-list">${commentsHTML}</div>
                <div class="comment-input-area">
                    <img src="${currentUserAvatar}" alt="Perfil" class="comment-avatar">
                    <input type="text" class="comment-input" placeholder="Escreva um comentário...">
                    <button class="icon-btn send-comment-btn"><span class="material-symbols-outlined">send</span></button>
                </div>
            </div>
        </article>`;
}

function renderAllFeeds() {
    let currentUser = AuthService.getCurrentUser();
    if (!currentUser) return; // Se não estiver logado, nem tenta renderizar feed

    const allPosts = PostService.getPosts();

    const createAvatar = document.querySelector('.create-post-header .post-avatar');
    if (createAvatar) createAvatar.src = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=F4B41A&color=fff`;

    const homeArea = document.getElementById('posts-render-area');
    if (homeArea) homeArea.innerHTML = allPosts.map(p => generatePostHTML(p, currentUser)).join('');

    const profileArea = document.getElementById('profile-posts-render-area');
    const activeTab = document.querySelector('.profile-tab.active');
    if (profileArea && activeTab) {
        const tab = activeTab.getAttribute('data-tab');
        let filtered = [];
        if (tab === 'postagens') filtered = allPosts.filter(p => p.authorUsername === currentUser.username);
        else if (tab === 'republicados') filtered = allPosts.filter(p => p.repostedBy.includes(currentUser.username));
        else if (tab === 'curtidas') filtered = allPosts.filter(p => p.likedBy.includes(currentUser.username));
        else if (tab === 'respostas') filtered = allPosts.filter(p => p.comments.some(c => c.authorUsername === currentUser.username));

        if (filtered.length === 0) profileArea.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 40px;">Nada encontrado aqui.</p>`;
        else profileArea.innerHTML = filtered.map(p => generatePostHTML(p, currentUser)).join('');
    }
}
document.addEventListener('DOMContentLoaded', renderAllFeeds);

// ==========================================
// 5. EVENTOS GERAIS DO FEED E APIs
// ==========================================
window.selectedGifUrl = null;
const GIPHY_API_KEY = "COLE_SUA_CHAVE_GIPHY_AQUI"; // <-- COLOQUE SUA CHAVE AQUI

document.querySelectorAll('.feed-container').forEach(container => {

    const publishBtn = container.querySelector('#publish-btn');
    const postInput = container.querySelector('#post-input');
    const emojiPanel = container.querySelector('#emoji-panel');
    const gifPanel = container.querySelector('#gif-panel');
    const pollPanel = container.querySelector('#poll-panel');
    const previewContainer = container.querySelector('#selected-gif-preview');

    function closeAllPanels() {
        if (emojiPanel) emojiPanel.style.display = 'none';
        if (gifPanel) gifPanel.style.display = 'none';
        if (pollPanel) pollPanel.style.display = 'none';
    }

    // --- API EMOJI ---
    if (container.querySelector('#add-emoji-btn')) {
        container.querySelector('#add-emoji-btn').addEventListener('click', async() => {
            const isHidden = emojiPanel.style.display === 'none';
            closeAllPanels();

            if (isHidden) {
                emojiPanel.style.display = 'block';
                const emojiList = emojiPanel.querySelector('#emoji-list');
                const emojiAccessKey = '9205b21ab0ab7be41d1b314b086999629d90532f'; // A sua chave de acesso

                // Dicionário para traduzir as categorias para Português
                const categoryTranslations = {
                    'smileys-emotion': 'Smileys e Emoções',
                    'people-body': 'Pessoas e Corpo',
                    'component': 'Componentes e Tons de Pele',
                    'animals-nature': 'Animais e Natureza',
                    'food-drink': 'Comidas e Bebidas',
                    'travel-places': 'Viagens e Lugares',
                    'activities': 'Atividades',
                    'objects': 'Objetos',
                    'symbols': 'Símbolos',
                    'flags': 'Bandeiras'
                };

                if (!emojiPanel.dataset.initialized) {
                    emojiPanel.dataset.initialized = "true";

                    const emojiControls = document.createElement('div');
                    emojiControls.className = 'emoji-controls';
                    emojiControls.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;';
                    emojiControls.innerHTML = `
                        <input type="text" id="emoji-search" placeholder="Pesquisar (em inglês, ex: cat, computer)..." style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--border-color, #ccc); background: var(--bg-secondary, #fff); color: var(--text-color, #000);">
                        <select id="emoji-category" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--border-color, #ccc); background: var(--bg-secondary, #fff); color: var(--text-color, #000);">
                            <option value="">Todas as Categorias</option>
                        </select>
                    `;
                    emojiPanel.insertBefore(emojiControls, emojiList);

                    const searchInput = emojiPanel.querySelector('#emoji-search');
                    const categorySelect = emojiPanel.querySelector('#emoji-category');

                    const renderEmojis = (emojis) => {
                        if (!emojis || emojis.length === 0 || emojis.status === 'error') {
                            emojiList.innerHTML = '<p style="text-align:center; font-size:14px; color:gray;">Nenhum emoji encontrado.</p>';
                            return;
                        }

                        // Forçando as fontes nativas de emoji para evitar "quadradinhos"
                        const emojiFontFamily = '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif';

                        emojiList.innerHTML = emojis.map(e => {
                            if (e.character) {
                                return `<span class="emoji-item" title="${e.unicodeName || e.slug}" style="cursor: pointer; font-size: 20px; padding: 5px; font-family: ${emojiFontFamily}; display: inline-block;">${e.character}</span>`;
                            }
                            return '';
                        }).join('');

                        emojiList.querySelectorAll('.emoji-item').forEach(el => {
                            el.addEventListener('click', () => {
                                postInput.value += el.textContent;
                                postInput.focus();
                            });
                        });
                    };

                    const fetchEmojis = async(url) => {
                        emojiList.innerHTML = '<p style="text-align:center; font-size:14px; color:gray;">A carregar...</p>';
                        try {
                            const res = await fetch(url);
                            const data = await res.json();
                            renderEmojis(data);
                        } catch (error) {
                            emojiList.innerHTML = '<p style="text-align:center; color:red;">Erro ao conectar com API.</p>';
                        }
                    };

                    try {
                        const catRes = await fetch(`https://emoji-api.com/categories?access_key=${emojiAccessKey}`);
                        const categories = await catRes.json();
                        categories.forEach(c => {
                            const option = document.createElement('option');
                            option.value = c.slug;
                            // Aplica a tradução, ou usa o nome original formatado se não houver tradução
                            option.textContent = categoryTranslations[c.slug] || c.slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            categorySelect.appendChild(option);
                        });
                    } catch (e) {
                        console.error("Erro ao carregar categorias de emojis:", e);
                    }

                    searchInput.addEventListener('input', (e) => {
                        const query = e.target.value.trim();
                        if (query.length > 0) {
                            fetchEmojis(`https://emoji-api.com/emojis?search=${query}&access_key=${emojiAccessKey}`);
                            categorySelect.value = "";
                        } else {
                            fetchEmojis(`https://emoji-api.com/emojis?access_key=${emojiAccessKey}`);
                        }
                    });

                    categorySelect.addEventListener('change', (e) => {
                        const cat = e.target.value;
                        searchInput.value = "";
                        if (cat) {
                            fetchEmojis(`https://emoji-api.com/categories/${cat}?access_key=${emojiAccessKey}`);
                        } else {
                            fetchEmojis(`https://emoji-api.com/emojis?access_key=${emojiAccessKey}`);
                        }
                    });

                    categorySelect.value = "smileys-emotion";
                    fetchEmojis(`https://emoji-api.com/categories/smileys-emotion?access_key=${emojiAccessKey}`);
                }
            }
        });
    }

    // --- API GIPHY ---

    // ⚠️ ATENÇÃO: COLE SUA CHAVE DE API AQUI DENTRO DAS ASPAS! ⚠️
    const GIPHY_API_KEY = "k1rI7vq3jlZ37VjBIlpGcgbVCndPwghP";

    if (container.querySelector('#add-gif-btn')) {
        container.querySelector('#add-gif-btn').addEventListener('click', () => {
            const isHidden = gifPanel.style.display === 'none';
            closeAllPanels();
            if (isHidden) gifPanel.style.display = 'block';
        });

        const gifInput = container.querySelector('#gif-search-input');
        const gifResults = container.querySelector('#gif-results');

        if (gifInput) {
            gifInput.addEventListener('input', async(e) => {
                const query = e.target.value.trim();
                if (query.length < 2) return;

                // Aviso visual na tela
                gifResults.innerHTML = '<p style="font-size:12px;color:gray;">Buscando GIFs na Giphy...</p>';
                console.log(`[GIPHY DEBUG] Iniciando busca por: "${query}"`);

                try {
                    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=15&lang=pt`;

                    const res = await fetch(url);

                    // Se a Giphy bloquear a chave, pegamos o erro aqui
                    if (!res.ok) {
                        console.error("[GIPHY DEBUG] Erro na API Giphy! Status:", res.status);
                        gifResults.innerHTML = `<p style="font-size:12px;color:red;">Erro na Giphy: Status ${res.status}</p>`;
                        return;
                    }

                    const json = await res.json();
                    console.log("[GIPHY DEBUG] Resposta recebida da Giphy:", json);

                    // Verifica se vieram GIFs
                    if (json.data && json.data.length > 0) {
                        let htmlGifs = '';
                        json.data.forEach(gif => {
                            const thumbUrl = gif.images.fixed_height_small.url;
                            const fullUrl = gif.images.downsized_medium.url;
                            // Forçando largura e altura no CSS inline para garantir que não fiquem invisíveis
                            htmlGifs += `<img src="${thumbUrl}" data-full="${fullUrl}" style="cursor:pointer; width:80px; height:80px; object-fit:cover; margin:4px; border-radius:4px;">`;
                        });

                        gifResults.innerHTML = htmlGifs;

                        // Evento de clique para pré-visualizar
                        gifResults.querySelectorAll('img').forEach(img => {
                            img.addEventListener('click', () => {
                                window.selectedGifUrl = img.getAttribute('data-full');
                                let previewImg = previewContainer.querySelector('img');
                                if (!previewImg) {
                                    previewImg = document.createElement('img');
                                    previewImg.style.maxWidth = '100%';
                                    previewImg.style.borderRadius = '8px';
                                    previewImg.style.marginTop = '10px';
                                    previewContainer.insertBefore(previewImg, previewContainer.firstChild);
                                }
                                previewImg.src = window.selectedGifUrl;
                                previewContainer.style.display = 'block';
                                closeAllPanels();
                            });
                        });
                    } else {
                        console.warn("[GIPHY DEBUG] A API respondeu com sucesso, mas a lista de GIFs veio vazia.");
                        gifResults.innerHTML = '<p style="font-size:12px;color:gray;">Nenhum GIF encontrado para esta palavra.</p>';
                    }
                } catch (error) {
                    console.error("[GIPHY DEBUG] Falha catastrófica no Fetch:", error);
                    gifResults.innerHTML = '<p style="font-size:12px;color:red;">Erro de conexão com a Giphy.</p>';
                }
            });
        }

        if (container.querySelector('#remove-gif-btn')) {
            container.querySelector('#remove-gif-btn').addEventListener('click', () => {
                window.selectedGifUrl = null;
                previewContainer.style.display = 'none';
                const img = previewContainer.querySelector('img');
                if (img) img.src = '';
            });
        }
    }

    // --- ENQUETE ---
    if (container.querySelector('#add-poll-btn')) {
        container.querySelector('#add-poll-btn').addEventListener('click', () => {
            const isHidden = pollPanel.style.display === 'none';
            closeAllPanels();
            if (isHidden) pollPanel.style.display = 'block';
        });

        if (container.querySelector('#add-poll-opt-btn')) {
            container.querySelector('#add-poll-opt-btn').addEventListener('click', () => {
                const cont = container.querySelector('#poll-options-container');
                const inputs = cont.querySelectorAll('.poll-opt-input');
                if (inputs.length < 5) {
                    const newInput = document.createElement('input');
                    newInput.type = 'text';
                    newInput.className = 'poll-opt-input';
                    newInput.placeholder = `Opção ${inputs.length + 1}`;
                    cont.appendChild(newInput);
                }
            });
        }
    }

    // --- BOTÃO DE POSTAR ---
    if (publishBtn) publishBtn.addEventListener('click', (e) => {
        e.preventDefault(); // <-- Trava de segurança: Impede a página de recarregar sozinha

        try {
            const content = postInput ? postInput.value.trim() : '';

            const pollInputs = Array.from(container.querySelectorAll('.poll-opt-input')).map(i => i.value.trim()).filter(v => v);
            let pollData = null;
            if (pollInputs.length >= 2) {
                pollData = {
                    options: pollInputs.map((opt, idx) => ({ id: idx, text: opt, votes: 0 })),
                    voters: {}
                };
            }

            // Se não tiver texto, nem GIF, nem Enquete, não faz nada
            if (!content && !window.selectedGifUrl && !pollData) return;

            // Pega o usuário. Se a sessão expirou, avisa e desloga.
            const currentUser = AuthService.getCurrentUser();
            if (!currentUser) {
                showToast('Sua sessão expirou. Faça login novamente!', 'error');
                window.location.href = 'auth.html';
                return;
            }

            // Salva a postagem no banco de dados local
            PostService.addPost(content, currentUser, window.selectedGifUrl, pollData);

            // Limpa o formulário após postar
            if (postInput) postInput.value = '';
            window.selectedGifUrl = null;

            if (previewContainer) {
                previewContainer.style.display = 'none';
                const previewImg = previewContainer.querySelector('img');
                if (previewImg) previewImg.src = ''; // Limpa a foto do GIF anterior
            }

            container.querySelectorAll('.poll-opt-input').forEach((input, index) => {
                if (index > 1) input.remove();
                else input.value = '';
            });

            closeAllPanels();
            renderAllFeeds(); // Atualiza a tela

        } catch (error) {
            console.error("[ERRO AO POSTAR]:", error);
            showToast("Erro interno ao postar. Veja o Console (F12) para mais detalhes.", "error");
        }
    });

    // --- EVENTOS DE INTERAÇÃO NO FEED ---
    container.addEventListener('click', (event) => {
        let currentUser = AuthService.getCurrentUser();
        const postCard = event.target.closest('.post-card');
        const postId = postCard ? postCard.getAttribute('data-post-id') : null;

        // Votar em Enquete
        const pollOption = event.target.closest('.poll-option-result');
        if (pollOption) {
            const pollPostId = pollOption.closest('.poll-container').getAttribute('data-post-id');
            const optionId = parseInt(pollOption.getAttribute('data-option-id'));
            if (currentUser) {
                PostService.votePoll(pollPostId, currentUser.username, optionId);
                renderAllFeeds();
            }
            return;
        }

        if (event.target.closest('.follow-btn')) {
            AuthService.toggleFollow(event.target.closest('.follow-btn').getAttribute('data-target-user'));
            loadUserDataUI();
            renderAllFeeds();
            return;
        }

        const moreBtn = event.target.closest('.more-options');
        if (moreBtn) {
            const dropdown = moreBtn.nextElementSibling;
            document.querySelectorAll('.post-dropdown').forEach(d => { if (d !== dropdown) d.classList.remove('active') });
            dropdown.classList.toggle('active');
            return;
        }

        if (event.target.closest('.delete-post-btn')) {
            if (confirm("Apagar permanentemente?")) {
                PostService.deletePost(postId);
                renderAllFeeds();
            }
        }
        if (event.target.closest('.edit-post-btn')) {
            const oldText = postCard.querySelector('.post-content p').textContent;
            const newText = prompt("Edite sua publicação:", oldText);
            if (newText && newText.trim() !== "") {
                PostService.editPost(postId, newText.trim());
                renderAllFeeds();
            }
        }

        const likeBtn = event.target.closest('.like-btn');
        if (likeBtn) {
            PostService.toggleReaction(postId, currentUser.username, 'like');

            // Atualiza apenas o botão visualmente (sem recarregar o feed inteiro)
            const wasLiked = likeBtn.classList.toggle('liked');
            const countSpan = likeBtn.querySelector('.like-count');
            let currentCount = parseInt(countSpan.textContent);
            countSpan.textContent = wasLiked ? currentCount + 1 : currentCount - 1;
            return;
        }

        const repostBtn = event.target.closest('.repost-btn');
        if (repostBtn) {
            PostService.toggleReaction(postId, currentUser.username, 'repost');

            // Atualiza apenas o botão visualmente
            const wasReposted = repostBtn.classList.toggle('reposted');
            const countSpan = repostBtn.querySelector('.repost-count');
            let currentCount = parseInt(countSpan.textContent);
            countSpan.textContent = wasReposted ? currentCount + 1 : currentCount - 1;
            return;
        }

        if (event.target.closest('.comment-toggle-btn')) {
            if (openCommentBoxes.includes(postId)) openCommentBoxes = openCommentBoxes.filter(id => id !== postId);
            else openCommentBoxes.push(postId);
            renderAllFeeds();
        }

        const sendCommentBtn = event.target.closest('.send-comment-btn');
        if (sendCommentBtn) {
            event.preventDefault(); // Previne comportamentos inesperados do botão
            const input = sendCommentBtn.closest('.comment-input-area').querySelector('.comment-input');
            const commentText = input.value.trim();

            if (!commentText) return;

            // Envia o comentário passando as informações
            PostService.addComment(postId, commentText, currentUser);

            // Força o ID a ser tratado como string para não bugar o array de caixas abertas
            const stringPostId = postId.toString();
            if (!openCommentBoxes.includes(stringPostId)) {
                openCommentBoxes.push(stringPostId);
            }

            renderAllFeeds();
        }
    });

    // Share logic was outside the container click event in your code block, 
    // it needs to be inside or it will throw an error since postCard isn't defined there.
    container.addEventListener('click', (event) => {
        const postCard = event.target.closest('.post-card');
        if (!postCard) return;

        if (event.target.closest('.share-btn')) {
            postCard.querySelector('.share-section').classList.toggle('active');
        }

        if (event.target.closest('.copy-btn')) {
            const btn = event.target.closest('.copy-btn');
            btn.previousElementSibling.select();
            navigator.clipboard.writeText(btn.previousElementSibling.value).then(() => {
                btn.textContent = 'Copiado!';
                btn.style.background = '#10B981';
                setTimeout(() => {
                    btn.textContent = 'Copiar';
                    btn.style.background = 'var(--brand-gradient)';
                }, 2000);
            });
        }
    });

    // Keypress for comments
    container.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('comment-input')) {
            e.preventDefault();
            e.target.closest('.comment-input-area').querySelector('.send-comment-btn').click();
        }
    });
}); // <--- Fechamento do forEach do .feed-container

document.addEventListener('click', (e) => {
    if (!e.target.closest('.more-options')) document.querySelectorAll('.post-dropdown').forEach(d => d.classList.remove('active'));
});

// Abas do Perfil
document.querySelectorAll('.profile-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        renderAllFeeds();
    });
});

// ==========================================
// ABRIR MODAL AUTOMATICAMENTE PELA URL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Lê a URL atual
    const urlParams = new URLSearchParams(window.location.search);

    // 2. Procura se existe o parâmetro 'openModal'
    const modalToOpen = urlParams.get('openModal');

    // 3. Se existir, procura o modal com esse ID e abre ele
    if (modalToOpen) {
        const modal = document.getElementById(modalToOpen);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Trava o scroll da página no fundo

            // Truque de mestre: Limpa a URL depois de abrir o modal. 
            // Assim, se o usuário apertar F5 para atualizar a página, o modal não abre de novo sem querer.
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
});

// ==========================================
// 6. UI DE USUÁRIO E AJUSTE DE IMAGEM
// ==========================================
function loadUserDataUI() {
    const user = AuthService.getCurrentUser();
    if (!user) return;

    document.querySelectorAll('.profile-name').forEach(el => el.textContent = user.name);
    document.querySelectorAll('.profile-handle').forEach(el => el.textContent = `@${user.username}`);
    document.querySelectorAll('.profile-bio').forEach(el => el.textContent = user.bio);

    if (document.getElementById('profile-following-count')) document.getElementById('profile-following-count').textContent = user.followingList ? user.followingList.length : 0;
    if (document.getElementById('profile-followers-count')) document.getElementById('profile-followers-count').textContent = user.followers;

    if (document.getElementById('edit-name')) document.getElementById('edit-name').value = user.name;
    if (document.getElementById('edit-username')) document.getElementById('edit-username').value = user.username;
    if (document.getElementById('edit-bio')) document.getElementById('edit-bio').value = user.bio;

    const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=F4B41A&color=fff`;
    document.querySelectorAll('.profile-pic img, .profile-page-avatar, #settings-avatar-preview, .create-post-header .post-avatar').forEach(img => img.src = avatarUrl);

    const bannerUrl = user.banner || 'var(--brand-gradient)';
    if (document.getElementById('profile-page-banner')) document.getElementById('profile-page-banner').style.background = user.banner ? `url(${user.banner}) center/cover` : bannerUrl;
    if (document.getElementById('settings-banner-preview')) document.getElementById('settings-banner-preview').style.background = user.banner ? `url(${user.banner}) center/cover` : bannerUrl;
}
document.addEventListener('DOMContentLoaded', loadUserDataUI);

// LÓGICA DE CONFIRMAÇÃO DE IMAGEM
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

if (document.getElementById('avatar-upload')) document.getElementById('avatar-upload').addEventListener('change', (e) => processImageUpload(e.target.files[0], 'avatar'));
if (document.getElementById('banner-upload')) document.getElementById('banner-upload').addEventListener('change', (e) => processImageUpload(e.target.files[0], 'banner'));

const modalAdjust = document.getElementById('modal-adjust-image');

function closeAdjustModal() {
    modalAdjust.classList.remove('active');
    document.getElementById('avatar-upload').value = '';
    document.getElementById('banner-upload').value = '';
}

if (document.getElementById('cancel-adjust-btn')) document.getElementById('cancel-adjust-btn').addEventListener('click', (e) => {
    e.preventDefault();
    closeAdjustModal();
});
if (document.getElementById('cancel-adjust-btn-2')) document.getElementById('cancel-adjust-btn-2').addEventListener('click', (e) => {
    e.preventDefault();
    closeAdjustModal();
});

if (document.getElementById('confirm-adjust-btn')) {
    document.getElementById('confirm-adjust-btn').addEventListener('click', (e) => {
        e.preventDefault();
        if (pendingImageType === 'avatar') {
            document.getElementById('settings-avatar-preview').src = pendingImageBase64;
            window.tempAvatarBase64 = pendingImageBase64;
        } else {
            document.getElementById('settings-banner-preview').style.background = `url(${pendingImageBase64}) center/cover`;
            window.tempBannerBase64 = pendingImageBase64;
        }
        closeAdjustModal();
    });
}

// ==========================================
// 7. LÓGICA DE INTERFACE: MODAIS, CONFIGURAÇÕES E HOBBIES
// ==========================================
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

document.querySelectorAll('.settings-form').forEach(form => {
    // Agora ele ignora o perfil, login e cadastro
    if (form.id === 'form-profile' || form.id === 'login-form' || form.id === 'register-form') return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Dados salvos com sucesso!');
        const modal = e.target.closest('.modal-overlay');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

const formProfile = document.getElementById('form-profile');
if (formProfile) {
    formProfile.addEventListener('submit', (e) => {
        e.preventDefault();
        let user = AuthService.getCurrentUser();
        if (user) {
            const oldUsername = user.username; // Salva o antigo para buscar no array

            user.name = document.getElementById('edit-name').value;
            user.username = document.getElementById('edit-username').value;
            user.bio = document.getElementById('edit-bio').value;

            if (window.tempAvatarBase64) user.avatar = window.tempAvatarBase64;
            if (window.tempBannerBase64) user.banner = window.tempBannerBase64;

            AuthService.updateUser(oldUsername, user);
            loadUserDataUI();
            renderAllFeeds();
            showToast('Perfil atualizado com sucesso!');
            const modal = e.target.closest('.modal-overlay');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    });
}

// Hobbies corrigido!
const currentUser = AuthService.getCurrentUser();
let savedHobbies = currentUser ? currentUser.hobbies || {} : {};
const hobbyThemeSelect = document.getElementById('hobby-theme');
const hobbyInput = document.getElementById('hobby-input');
const hobbiesListRender = document.getElementById('hobbies-list-render');
const saveHobbiesBtn = document.getElementById('save-hobbies-btn');

function renderFinalHobbiesList() {
    if (!hobbiesListRender) return;
    hobbiesListRender.innerHTML = Object.keys(savedHobbies).map(theme => {
        return `
            <div class="hobby-card">
                <div class="hobby-card-info">
                    <h4>${theme}</h4><p>${savedHobbies[theme].join(', ')}</p>
                </div>
                <div class="hobby-card-actions">
                    <span class="material-symbols-outlined" title="Deletar categoria" onclick="deleteHobbyTheme('${theme}')">delete</span>
                </div>
            </div>`;
    }).join('');
}

window.deleteHobbyTheme = function(theme) {
    delete savedHobbies[theme];
    renderFinalHobbiesList();
};

if (hobbyInput) {
    hobbyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const theme = hobbyThemeSelect.value;
            if (!theme) return showToast('Selecione um "Nome do campo" primeiro.', 'error');
            const val = hobbyInput.value.trim().replace(',', '');
            if (!val) return;
            if (!savedHobbies[theme]) savedHobbies[theme] = [];
            if (savedHobbies[theme].length >= 5) return showToast(`Limite de 5 itens em ${theme}.`, 'error');
            if (!savedHobbies[theme].includes(val)) {
                savedHobbies[theme].push(val);
                renderFinalHobbiesList();
            }
            hobbyInput.value = '';
        }
    });
}

if (saveHobbiesBtn) {
    saveHobbiesBtn.addEventListener('click', () => {
        let currentUser = AuthService.getCurrentUser();
        if (currentUser) {
            currentUser.hobbies = savedHobbies;
            AuthService.updateUser(currentUser.username, currentUser);
            showToast('Interesses atualizados com sucesso!');
            const modal = saveHobbiesBtn.closest('.modal-overlay');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    });
}
document.addEventListener('DOMContentLoaded', renderFinalHobbiesList);

// Login, Cadastre-se e Sair
const showRegisterBtn = document.getElementById('show-register');
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
if (showRegisterBtn && loginSection) {
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.style.display = 'none';
        registerSection.style.display = 'block';
    });
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.style.display = 'none';
        loginSection.style.display = 'block';
    });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const password = document.getElementById('reg-password').value;

        // Verificação extra via JS para garantir os 6 caracteres
        if (password.length < 6) {
            return showToast("A senha deve conter no mínimo 6 caracteres.", "error");
        }

        try {
            await AuthService.register({
                name: document.getElementById('reg-name').value,
                username: document.getElementById('reg-username').value,
                email: document.getElementById('reg-email').value,
                password: password,
                bio: "Novo membro da Pintada! 🐆",
                hobbies: {}
            });
            window.location.href = 'index.html';
        } catch (error) {
            showToast(error.message, "error");
        }
    });
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        try {
            // Alterado de 'login-email' para 'login-identifier'
            await AuthService.login(
                document.getElementById('login-identifier').value,
                document.getElementById('login-password').value
            );
            window.location.href = 'index.html';
        } catch (error) {
            showToast(error.message, "error");
        }
    });
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async(e) => {
        e.preventDefault();
        await AuthService.logout();
        window.location.href = 'auth.html';
    });
}