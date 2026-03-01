// ==========================================
// js/feed.js - RENDERIZAÇÃO DO FEED E APIs
// ==========================================
let openCommentBoxes = [];

// Função auxiliar para formatar o tempo (Caso não esteja no services.js)
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

function generatePostHTML(post, currentUser) {
    const currentUserAvatar = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=F4B41A&color=fff`;
    let displayAvatar = post.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}&background=F4B41A&color=fff`;

    const commentsHTML = post.comments.map(c => {
        let cAvatar = c.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&background=F4B41A&color=fff`;
        return `<div class="comment"><img src="${cAvatar}" alt="Foto" class="comment-avatar"><div class="comment-content"><span class="comment-author">${c.authorName}</span><p>${escapeHTML(c.text)}</p></div></div>`;
    }).join('');

    const isAuthor = currentUser.username === post.authorUsername;
    const isLiked = post.likedBy && post.likedBy.includes(currentUser.username);
    const isReposted = post.repostedBy && post.repostedBy.includes(currentUser.username);

    let followBtnHTML = '';
    if (!isAuthor && post.authorUsername !== 'admin_pintada') {
        const isFollowing = currentUser.followingList && currentUser.followingList.includes(post.authorUsername);
        followBtnHTML = `<button class="btn-outline follow-btn ${isFollowing ? 'following' : ''}" data-target-user="${post.authorUsername}">${isFollowing ? 'Seguindo' : 'Seguir'}</button>`;
    }

    const optionsMenuHTML = isAuthor ? `<div class="post-options-wrapper"><button class="icon-btn more-options" title="Mais opções"><span class="material-symbols-outlined">more_horiz</span></button><div class="post-dropdown"><button class="dropdown-item edit-post-btn">Editar publicação</button><button class="dropdown-item text-danger delete-post-btn">Apagar publicação</button></div></div>` : ``;

    const editedTag = post.isEdited ? `<span class="edited-tag">(Editado)</span>` : '';
    const commentSectionClass = openCommentBoxes.includes(post.id.toString()) ? 'active' : '';

    // Formata o tempo usando o timestamp do Firebase
    let displayTime = post.time;
    if (post.timestamp) displayTime = timeAgo(post.timestamp);

    let parsedContent = escapeHTML(post.content);
    let mediaHTML = post.gif ? `<img src="${post.gif}" class="post-image" style="margin-top: 10px; border-radius: 8px; width: 100%;">` : '';

    let pollHTML = '';
    if (post.poll) {
        const totalVotes = Object.keys(post.poll.voters || {}).length;
        const userVote = post.poll.voters ? post.poll.voters[currentUser.username] : undefined;
        pollHTML = `<div class="poll-container" data-post-id="${post.id}">`;
        if (post.poll.question) pollHTML += `<h4 style="margin-bottom: 12px; color: var(--text-main); font-size: 1.05rem;">${escapeHTML(post.poll.question)}</h4>`;

        post.poll.options.forEach(opt => {
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
            const isVoted = userVote === opt.id ? 'voted' : '';
            pollHTML += `
                <div class="poll-option-result ${isVoted}" data-option-id="${opt.id}">
                    <div class="poll-bar" style="width: ${userVote !== undefined ? percent : 0}%;"></div>
                    <span class="poll-text">${escapeHTML(opt.text)}</span>
                    <span class="poll-percent">${userVote !== undefined ? percent + '%' : ''}</span>
                </div>`;
        });
        pollHTML += `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">${totalVotes} votos</div></div>`;
    }

    return `
        <article class="post-card" data-post-id="${post.id}">
            <header class="post-header">
                <a href="profile.html?user=${post.authorUsername}" style="text-decoration: none;">
                    <img src="${displayAvatar}" alt="Foto" class="post-avatar">
                </a>
                <div class="post-info">
                    <a href="profile.html?user=${post.authorUsername}" style="text-decoration: none; color: inherit;">
                        <span class="post-author-name">${post.authorName}</span>
                    </a>
                    <span class="post-meta">@${post.authorUsername} • <span class="post-time">${displayTime}</span> ${editedTag}</span>
                </div>
                ${followBtnHTML}${optionsMenuHTML}
            </header>
            <div class="post-content"><p>${parsedContent}</p>${mediaHTML}${pollHTML}</div>
            <footer class="post-actions">
                <button class="action-btn like-btn ${isLiked ? 'liked' : ''}"><span class="material-symbols-outlined">favorite</span><span class="like-count">${post.likes || 0}</span></button>
                <button class="action-btn comment-toggle-btn"><span class="material-symbols-outlined">chat_bubble</span><span class="comment-count">${post.comments ? post.comments.length : 0}</span></button>
                <button class="action-btn repost-btn ${isReposted ? 'reposted' : ''}"><span class="material-symbols-outlined">repeat</span><span class="repost-count">${post.reposts || 0}</span></button>
                <button class="action-btn share-btn"><span class="material-symbols-outlined">share</span></button>
            </footer>
            <div class="share-section"><div class="share-box"><span class="material-symbols-outlined">link</span><input type="text" readonly value="https://pintada.app/p/${post.id}"><button class="copy-btn">Copiar</button></div></div>
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

async function renderAllFeeds() {
    const activeUsername = AuthService.getCurrentUser();
    if (!activeUsername) return;

    const currentUser = await AuthService.getUserData(activeUsername);
    if (!currentUser) return;

    const allPosts = await PostService.getPosts();

    // Atualiza avatar da caixa de postagem
    const createAvatar = document.querySelector('.create-post-header .post-avatar');
    if (createAvatar) createAvatar.src = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=F4B41A&color=fff`;

    // Renderiza Feed Principal
    const homeArea = document.getElementById('posts-render-area');
    if (homeArea) homeArea.innerHTML = allPosts.map(p => generatePostHTML(p, currentUser)).join('');

    // Renderiza Feed de Perfil
    const urlParams = new URLSearchParams(window.location.search);
    const viewedUsername = urlParams.get('user') || currentUser.username;
    const profileArea = document.getElementById('profile-posts-render-area');
    const activeTab = document.querySelector('.profile-tab.active');

    if (profileArea && activeTab) {
        const tab = activeTab.getAttribute('data-tab');
        let filtered = [];
        if (tab === 'postagens') filtered = allPosts.filter(p => p.authorUsername === viewedUsername);
        else if (tab === 'republicados') filtered = allPosts.filter(p => p.repostedBy && p.repostedBy.includes(viewedUsername));
        else if (tab === 'curtidas') filtered = allPosts.filter(p => p.likedBy && p.likedBy.includes(viewedUsername));
        else if (tab === 'respostas') filtered = allPosts.filter(p => p.comments && p.comments.some(c => c.authorUsername === viewedUsername));

        profileArea.innerHTML = filtered.length === 0 ? `<p style="text-align: center; color: var(--text-muted); padding: 40px;">Nada encontrado aqui.</p>` : filtered.map(p => generatePostHTML(p, currentUser)).join('');
    }

    // Renderiza Explorar
    const exploreArea = document.getElementById('explore-posts-render-area');
    if (exploreArea) {
        const trendingPosts = [...allPosts].sort((a, b) => ((b.likes || 0) + (b.reposts || 0) + (b.comments ? b.comments.length : 0)) - ((a.likes || 0) + (a.reposts || 0) + (a.comments ? a.comments.length : 0))).slice(0, 10);
        exploreArea.innerHTML = trendingPosts.length === 0 ? `<p style="text-align: center; color: var(--text-muted); padding: 40px;">Nenhum post em alta.</p>` : trendingPosts.map(p => generatePostHTML(p, currentUser)).join('');
    }

    // Atualiza Widgets
    if (typeof window.renderSuggestedUsers === 'function') window.renderSuggestedUsers();
    if (typeof updateProfileHeader === 'function') updateProfileHeader(viewedUsername, allPosts, currentUser);
    if (typeof renderTrendingTopics === 'function') await renderTrendingTopics();
}

async function updateProfileHeader(username, allPosts, currentUser) {
    const profileNameEl = document.querySelector('.profile-name');
    if (!profileNameEl) return;

    let displayUser = await AuthService.getUserData(username);
    const isOwnProfile = username === currentUser.username;

    if (displayUser) {
        document.title = `${displayUser.name} | Pintada`;
        document.querySelector('.profile-name').textContent = displayUser.name;
        document.querySelector('.profile-handle').textContent = `@${displayUser.username}`;
        document.querySelector('.profile-bio').textContent = displayUser.bio || 'Membro da Pintada';
        document.querySelector('.profile-page-avatar').src = displayUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser.name)}&background=F4B41A&color=fff`;
        document.getElementById('profile-page-banner').style.background = displayUser.banner ? `url(${displayUser.banner}) center/cover` : 'var(--brand-gradient)';
        document.getElementById('profile-followers-count').textContent = displayUser.followers || 0;
        document.getElementById('profile-following-count').textContent = displayUser.followingList ? displayUser.followingList.length : 0;

        const avatarRow = document.querySelector('.profile-avatar-row');
        avatarRow.querySelectorAll('.btn-outline, .btn-primary, .profile-actions-wrapper').forEach(btn => btn.remove());

        if (isOwnProfile) {
            const editBtn = document.createElement('a');
            editBtn.href = "settings.html?openModal=modal-profile";
            editBtn.className = "btn-outline";
            editBtn.textContent = "Editar perfil";
            avatarRow.appendChild(editBtn);
        } else {
            const actionDiv = document.createElement('div');
            actionDiv.style.display = 'flex';
            actionDiv.style.gap = '10px';
            const isFollowing = currentUser.followingList && currentUser.followingList.includes(username);
            actionDiv.innerHTML = `
                <button class="btn-outline follow-btn ${isFollowing ? 'following' : ''}" data-target-user="${username}">${isFollowing ? 'Seguindo' : 'Seguir'}</button>
                <button class="btn-primary" onclick="window.location.href='messages.html?chat=${username}'" style="padding: 8px 16px;">Mensagem</button>
            `;
            avatarRow.appendChild(actionDiv);
        }
    }
}

// Inicialização e Eventos
document.addEventListener('DOMContentLoaded', renderAllFeeds);

document.querySelectorAll('.feed-container').forEach(container => {
    const publishBtn = container.querySelector('#publish-btn');
    const postInput = container.querySelector('#post-input');

    if (publishBtn) {
        publishBtn.addEventListener('click', async() => {
            const activeUsername = AuthService.getCurrentUser();
            if (!activeUsername) return showToast("Sessão expirada!", "error");

            const userFullData = await AuthService.getUserData(activeUsername);
            const content = postInput.value.trim();

            if (content || window.selectedGifUrl) {
                await PostService.addPost(content, userFullData, window.selectedGifUrl);
                postInput.value = '';
                window.selectedGifUrl = null;
                const preview = document.getElementById('selected-gif-preview');
                if (preview) preview.style.display = 'none';
                await renderAllFeeds();
                showToast("Postado com sucesso! 🐆");
            }
        });
    }

    container.addEventListener('click', async(event) => {
        const activeUsername = AuthService.getCurrentUser();
        const postCard = event.target.closest('.post-card');
        const postId = postCard ? postCard.getAttribute('data-post-id') : null;

        // Curtir e Republicar (Aguardando Firebase)
        if (event.target.closest('.like-btn') || event.target.closest('.repost-btn')) {
            const type = event.target.closest('.like-btn') ? 'like' : 'repost';
            await PostService.toggleReaction(postId, activeUsername, type);
            await renderAllFeeds();
        }

        // Seguir
        if (event.target.closest('.follow-btn')) {
            const target = event.target.closest('.follow-btn').getAttribute('data-target-user');
            AuthService.toggleFollow(target);
            await renderAllFeeds();
        }

        // Comentários
        if (event.target.closest('.comment-toggle-btn')) {
            openCommentBoxes.includes(postId) ? openCommentBoxes = openCommentBoxes.filter(id => id !== postId) : openCommentBoxes.push(postId);
            await renderAllFeeds();
        }

        if (event.target.closest('.send-comment-btn')) {
            const input = event.target.closest('.comment-input-area').querySelector('.comment-input');
            const text = input.value.trim();
            if (text) {
                const user = await AuthService.getUserData(activeUsername);
                await PostService.addComment(postId, { authorName: user.name, authorUsername: user.username, authorAvatar: user.avatar || '', text: text });
                if (!openCommentBoxes.includes(postId)) openCommentBoxes.push(postId);
                await renderAllFeeds();
            }
        }

        // Outros botões (Delete, Share, More)
        if (event.target.closest('.more-options')) {
            const dropdown = event.target.closest('.more-options').nextElementSibling;
            document.querySelectorAll('.post-dropdown').forEach(d => { if (d !== dropdown) d.classList.remove('active') });
            dropdown.classList.toggle('active');
        }

        if (event.target.closest('.delete-post-btn') && confirm("Apagar permanentemente?")) {
            await PostService.deletePost(postId);
            await renderAllFeeds();
        }

        if (event.target.closest('.share-btn')) postCard.querySelector('.share-section').classList.toggle('active');

        if (event.target.closest('.copy-btn')) {
            const btn = event.target.closest('.copy-btn');
            navigator.clipboard.writeText(btn.previousElementSibling.value).then(() => {
                btn.textContent = 'Copiado!';
                setTimeout(() => btn.textContent = 'Copiar', 2000);
            });
        }
    });
});

async function renderTrendingTopics() {
    const trendingContainer = document.querySelector('.sidebar-right .widget');
    if (!trendingContainer) return;

    // Assuntos estáticos para o widget
    const topics = [
        { category: 'Tecnologia', title: '#PintadaNoAr', stats: '1.2K posts' },
        { category: 'Futebol', title: 'Corinthians', stats: '25.4K posts' },
        { category: 'Design', title: '#UIUX', stats: '4.2K posts' }
    ];

    trendingContainer.innerHTML = `
        <h3 class="widget-title">O que está acontecendo</h3>
        ${topics.map(t => `
            <div class="trending-item">
                <span class="trending-meta">${t.category} • Assunto do Momento</span>
                <h4 class="trending-title">${t.title}</h4>
                <span class="trending-stats">${t.stats}</span>
            </div>
        `).join('')}
    `;
}

// Garante que a função fique disponível globalmente para ser chamada pelo renderAllFeeds
window.renderTrendingTopics = renderTrendingTopics;

document.querySelectorAll('.profile-tab').forEach(btn => {
    btn.addEventListener('click', async() => {
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        await renderAllFeeds();
    });
});