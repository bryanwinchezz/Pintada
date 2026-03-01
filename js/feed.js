// ==========================================
// js/feed.js - RENDERIZAÇÃO E FERRAMENTAS
// ==========================================
let openCommentBoxes = [];

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
        return `<div class="comment"><img src="${cAvatar}" alt="Foto" class="comment-avatar"><div class="comment-content"><span class="comment-author">${c.authorName}</span><p>${window.escapeHTML(c.text)}</p></div></div>`;
    }).join('');

    const isAuthor = currentUser.username === post.authorUsername;
    const isLiked = post.likedBy && post.likedBy.includes(currentUser.username);
    const isReposted = post.repostedBy && post.repostedBy.includes(currentUser.username);

    let followBtnHTML = '';
    if (!isAuthor && post.authorUsername !== 'admin_pintada') {
        const isFollowing = currentUser.followingList && currentUser.followingList.includes(post.authorUsername);
        followBtnHTML = `<button class="btn-outline follow-btn ${isFollowing ? 'following' : ''}" data-target-user="${post.authorUsername}">${isFollowing ? 'Seguindo' : 'Seguir'}</button>`;
    }

    const optionsMenuHTML = isAuthor ? `<div class="post-options-wrapper"><button class="icon-btn more-options" title="Mais opções"><span class="material-symbols-outlined">more_horiz</span></button><div class="post-dropdown"><button class="dropdown-item text-danger delete-post-btn">Apagar publicação</button></div></div>` : ``;
    const commentSectionClass = openCommentBoxes.includes(post.id.toString()) ? 'active' : '';
    let displayTime = post.timestamp ? timeAgo(post.timestamp) : post.time;
    let parsedContent = window.escapeHTML(post.content);
    let mediaHTML = post.gif ? `<img src="${post.gif}" class="post-image" style="margin-top: 10px; border-radius: 8px; width: 100%;">` : '';

    let pollHTML = '';
    if (post.poll) {
        const totalVotes = Object.keys(post.poll.voters || {}).length;
        const userVote = post.poll.voters ? post.poll.voters[currentUser.username] : undefined;
        pollHTML = `<div class="poll-container" data-post-id="${post.id}">`;
        if (post.poll.question) pollHTML += `<h4 style="margin-bottom: 12px; font-size: 1.05rem;">${window.escapeHTML(post.poll.question)}</h4>`;

        post.poll.options.forEach(opt => {
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
            const isVoted = userVote === opt.id ? 'voted' : '';
            pollHTML += `
                <div class="poll-option-result ${isVoted}" data-option-id="${opt.id}">
                    <div class="poll-bar" style="width: ${userVote !== undefined ? percent : 0}%;"></div>
                    <span class="poll-text">${window.escapeHTML(opt.text)}</span>
                    <span class="poll-percent">${userVote !== undefined ? percent + '%' : ''}</span>
                </div>`;
        });
        pollHTML += `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">${totalVotes} votos</div></div>`;
    }

    return `
        <article class="post-card" data-post-id="${post.id}">
            <header class="post-header">
                <a href="profile.html?user=${post.authorUsername}"><img src="${displayAvatar}" alt="Foto" class="post-avatar"></a>
                <div class="post-info">
                    <a href="profile.html?user=${post.authorUsername}" style="text-decoration: none; color: inherit;"><span class="post-author-name">${post.authorName}</span></a>
                    <span class="post-meta">@${post.authorUsername} • <span class="post-time">${displayTime}</span></span>
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
    const activeUsername = window.AuthService.getCurrentUser();
    if (!activeUsername) return;

    const currentUser = await window.AuthService.getUserData(activeUsername);
    if (!currentUser) return;

    const allPosts = await window.PostService.getPosts();
    const createAvatar = document.querySelector('.create-post-header .post-avatar');
    if (createAvatar) createAvatar.src = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=F4B41A&color=fff`;

    const homeArea = document.getElementById('posts-render-area');
    if (homeArea) homeArea.innerHTML = allPosts.map(p => generatePostHTML(p, currentUser)).join('');

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

    const exploreArea = document.getElementById('explore-posts-render-area');
    if (exploreArea) {
        const trendingPosts = [...allPosts].sort((a, b) => ((b.likes || 0) + (b.reposts || 0)) - ((a.likes || 0) + (a.reposts || 0))).slice(0, 10);
        exploreArea.innerHTML = trendingPosts.length === 0 ? `<p style="text-align: center; color: var(--text-muted); padding: 40px;">Nenhum post em alta.</p>` : trendingPosts.map(p => generatePostHTML(p, currentUser)).join('');
    }

    if (typeof window.renderSuggestedUsers === 'function') window.renderSuggestedUsers();
    if (typeof window.renderTrendingTopics === 'function') await window.renderTrendingTopics();
}

// Lógica de Ferramentas de Criação e Interação
document.addEventListener('DOMContentLoaded', () => {
    renderAllFeeds();

    const container = document.querySelector('.feed-container');
    if (!container) return;

    const postInput = document.getElementById('post-input');
    const emojiPanel = document.getElementById('emoji-panel');
    const gifPanel = document.getElementById('gif-panel');
    const pollPanel = document.getElementById('poll-panel');
    const previewContainer = document.getElementById('selected-gif-preview');

    function closeAllPanels() {
        if (emojiPanel) emojiPanel.style.display = 'none';
        if (gifPanel) gifPanel.style.display = 'none';
        if (pollPanel) pollPanel.style.display = 'none';
    }

    // GIPHY API
    document.getElementById('add-gif-btn') ? .addEventListener('click', () => {
        const isHidden = gifPanel.style.display === 'none';
        closeAllPanels();
        if (isHidden) gifPanel.style.display = 'block';
    });

    const gifInput = document.getElementById('gif-search-input');
    const GIPHY_API_KEY = "k1rI7vq3jlZ37VjBIlpGcgbVCndPwghP"; // A sua chave

    if (gifInput) {
        gifInput.addEventListener('input', async(e) => {
            const query = e.target.value.trim();
            const resultsDiv = document.getElementById('gif-results');
            if (query.length < 2) return;

            resultsDiv.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">Buscando...</p>';
            try {
                const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=15&lang=pt`);
                const json = await res.json();
                resultsDiv.innerHTML = json.data.map(gif => `<img src="${gif.images.fixed_height_small.url}" data-full="${gif.images.downsized_medium.url}" style="height:80px; margin:2px; cursor:pointer; border-radius:4px;">`).join('');

                resultsDiv.querySelectorAll('img').forEach(img => {
                    img.addEventListener('click', () => {
                        window.selectedGifUrl = img.getAttribute('data-full');
                        let previewImg = previewContainer.querySelector('img');
                        if (!previewImg) {
                            previewImg = document.createElement('img');
                            previewImg.style.maxWidth = '100%';
                            previewImg.style.borderRadius = '8px';
                            previewContainer.insertBefore(previewImg, previewContainer.firstChild);
                        }
                        previewImg.src = window.selectedGifUrl;
                        previewContainer.style.display = 'block';
                        closeAllPanels();
                    });
                });
            } catch (err) { resultsDiv.innerHTML = '<p style="color:red; font-size:12px;">Erro ao buscar GIFs.</p>'; }
        });
    }

    document.getElementById('remove-gif-btn') ? .addEventListener('click', () => {
        window.selectedGifUrl = null;
        previewContainer.style.display = 'none';
    });

    // Enquete
    document.getElementById('add-poll-btn') ? .addEventListener('click', () => {
        const isHidden = pollPanel.style.display === 'none';
        closeAllPanels();
        if (isHidden) pollPanel.style.display = 'block';
    });

    document.getElementById('add-poll-opt-btn') ? .addEventListener('click', () => {
        const cont = document.getElementById('poll-options-container');
        const inputs = cont.querySelectorAll('.poll-opt-input');
        if (inputs.length < 5) {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;';
            row.innerHTML = `<input type="text" class="poll-opt-input" placeholder="Opção ${inputs.length + 1}" style="flex-grow: 1; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; background: transparent; color: var(--text-main); outline: none;"><button type="button" class="icon-btn remove-opt-btn"><span class="material-symbols-outlined" style="color: var(--text-muted);">close</span></button>`;
            cont.appendChild(row);
        }
    });

    // Publicar Post
    const publishBtn = document.getElementById('publish-btn');
    if (publishBtn) {
        publishBtn.addEventListener('click', async() => {
            const activeUsername = window.AuthService.getCurrentUser();
            if (!activeUsername) return showToast("Sessão expirada!", "error");

            const content = postInput ? postInput.value.trim() : '';
            const pollInputs = Array.from(document.querySelectorAll('.poll-opt-input')).map(i => i.value.trim()).filter(v => v);
            let pollData = null;
            if (pollInputs.length >= 2) {
                pollData = {
                    question: document.getElementById('poll-question-input') ? document.getElementById('poll-question-input').value.trim() : '',
                    options: pollInputs.map((opt, idx) => ({ id: idx, text: opt, votes: 0 })),
                    voters: {}
                };
            }

            if (!content && !window.selectedGifUrl && !pollData) return;

            const userFullData = await window.AuthService.getUserData(activeUsername);
            await window.PostService.addPost(content, userFullData, window.selectedGifUrl, pollData);

            if (postInput) postInput.value = '';
            window.selectedGifUrl = null;
            if (previewContainer) previewContainer.style.display = 'none';
            closeAllPanels();
            await renderAllFeeds();
            showToast("Postado com sucesso! 🐆");
        });
    }

    // Interações Globais (Feed e Enquetes)
    document.addEventListener('click', async(e) => {
        const activeUsername = window.AuthService.getCurrentUser();
        if (e.target.closest('.remove-opt-btn')) e.target.closest('div').remove();

        const postCard = e.target.closest('.post-card');
        const postId = postCard ? postCard.getAttribute('data-post-id') : null;

        // Votar Enquete
        const pollOption = e.target.closest('.poll-option-result');
        if (pollOption && activeUsername) {
            const pollPostId = pollOption.closest('.poll-container').getAttribute('data-post-id');
            const optionId = parseInt(pollOption.getAttribute('data-option-id'));
            await window.PostService.votePoll(pollPostId, activeUsername, optionId);
            renderAllFeeds();
            return;
        }

        // Like / Repost / Follow
        if (e.target.closest('.like-btn')) { await window.PostService.toggleReaction(postId, activeUsername, 'like');
            renderAllFeeds(); }
        if (e.target.closest('.repost-btn')) { await window.PostService.toggleReaction(postId, activeUsername, 'repost');
            renderAllFeeds(); }
        if (e.target.closest('.follow-btn')) { await window.AuthService.toggleFollow(e.target.closest('.follow-btn').getAttribute('data-target-user'));
            renderAllFeeds(); }

        // Comentários
        if (e.target.closest('.comment-toggle-btn')) {
            openCommentBoxes.includes(postId) ? openCommentBoxes = openCommentBoxes.filter(id => id !== postId) : openCommentBoxes.push(postId);
            renderAllFeeds();
        }
        if (e.target.closest('.send-comment-btn')) {
            const input = e.target.closest('.comment-input-area').querySelector('.comment-input');
            if (input.value.trim()) {
                const user = await window.AuthService.getUserData(activeUsername);
                await window.PostService.addComment(postId, { authorName: user.name, authorUsername: user.username, authorAvatar: user.avatar || '', text: input.value.trim() });
                if (!openCommentBoxes.includes(postId.toString())) openCommentBoxes.push(postId.toString());
                renderAllFeeds();
            }
        }

        // Deletar e Compartilhar
        if (e.target.closest('.more-options')) {
            const dropdown = e.target.closest('.more-options').nextElementSibling;
            document.querySelectorAll('.post-dropdown').forEach(d => { if (d !== dropdown) d.classList.remove('active'); });
            dropdown.classList.toggle('active');
        }
        if (e.target.closest('.delete-post-btn') && confirm("Apagar permanentemente?")) { await window.PostService.deletePost(postId);
            renderAllFeeds(); }
        if (e.target.closest('.share-btn')) postCard.querySelector('.share-section').classList.toggle('active');
        if (e.target.closest('.copy-btn')) {
            const btn = e.target.closest('.copy-btn');
            navigator.clipboard.writeText(btn.previousElementSibling.value).then(() => { btn.textContent = 'Copiado!';
                setTimeout(() => btn.textContent = 'Copiar', 2000); });
        }
    });
});

window.renderTrendingTopics = async function() {
    const trendingContainer = document.querySelector('.sidebar-right .widget');
    if (!trendingContainer) return;
    const topics = [
        { category: 'Tecnologia', title: '#PintadaNoAr', stats: '1.2K posts' },
        { category: 'Futebol', title: 'Corinthians', stats: '25.4K posts' },
        { category: 'Design', title: '#UIUX', stats: '4.2K posts' }
    ];
    trendingContainer.innerHTML = `<h3 class="widget-title">O que está acontecendo</h3>` + topics.map(t => `<div class="trending-item"><span class="trending-meta">${t.category} • Assunto do Momento</span><h4 class="trending-title">${t.title}</h4><span class="trending-stats">${t.stats}</span></div>`).join('');
};

document.querySelectorAll('.profile-tab').forEach(btn => {
    btn.addEventListener('click', async() => {
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        await renderAllFeeds();
    });
});