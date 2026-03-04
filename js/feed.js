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

    // === GERA O HTML DO SELO (Se o autor do post tiver um) ===
    const badgeHTML = typeof window.getBadgeHTML === 'function' ? window.getBadgeHTML(post.authorBadge) : '';

    const commentsHTML = post.comments ? post.comments.map(c => {
        let cAvatar = c.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&background=F4B41A&color=fff`;
        return `<div class="comment"><img src="${cAvatar}" alt="Foto" class="comment-avatar"><div class="comment-content"><span class="comment-author">${c.authorName}</span><p>${window.escapeHTML(c.text)}</p></div></div>`;
    }).join('') : '';

    const isAuthor = currentUser.username === post.authorUsername;
    const isLiked = post.likedBy && post.likedBy.includes(currentUser.username);
    const isReposted = post.repostedBy && post.repostedBy.includes(currentUser.username);

    let displayTime = post.timestamp ? timeAgo(post.timestamp) : post.time;
    // Garante que o conteúdo não seja undefined
    const safeContent = post.content || "";
    let parsedContent = window.escapeHTML(safeContent)
        .replace(/#[a-zA-Z0-9_À-ÿ]+/gi, '<span style="color: #1d9bf0; font-weight: 500; cursor: pointer;">$&</span>')
        .replace(/@([a-zA-Z0-9_.]+)/g, '<a href="profile.html?user=$1" style="color: #1d9bf0; font-weight: 600; text-decoration: none;">@$1</a>')
        .replace(/\n/g, '<br>');

    let editedTag = post.isEdited ? `<span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 5px;">(Editado)</span>` : '';
    // === LÓGICA DE MÍDIAS (IMAGEM, GIF E ÁUDIO) ===
    let mediaHTML = '';

    // Verifica se há Imagem ou GIF
    // Dentro de generatePostHTML, na parte da mediaHTML:
    if (post.image) {
        mediaHTML = `<div class="post-media-container" style="margin-top: 12px;">
                    <img src="${post.image}" 
                         onclick="window.openImageModal('${post.image}')" 
                         style="border-radius: 12px; max-width: 100%; border: 1px solid var(--border-color); cursor: pointer; display: block;">
                 </div>`;
    } else if (post.gif) {
        mediaHTML = `<div class="post-media-container" style="margin-top: 12px;">
                        <img src="${post.gif}" style="border-radius: 12px; max-width: 100%; border: 1px solid var(--border-color);">
                     </div>`;
    }

    // Verifica se há Áudio
    if (post.audio) {
        mediaHTML += `
            <div class="post-audio-container" style="margin-top: 12px; background: var(--hover-bg); padding: 12px; border-radius: 12px; border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="material-symbols-outlined" style="color: var(--brand-color);">play_circle</span>
                    <audio controls src="${post.audio}" style="height: 35px; flex-grow: 1; outline: none;"></audio>
                </div>
            </div>`;
    }

    let pollHTML = '';
    if (post.poll) {
        const totalVotes = Object.keys(post.poll.voters || {}).length;
        const userVote = post.poll.voters ? post.poll.voters[currentUser.username] : undefined;
        pollHTML = `<div class="poll-container" data-post-id="${post.id}" style="margin-top: 15px; border: 1px solid var(--border-color); border-radius: 16px; padding: 16px; background: rgba(0,0,0,0.02);">`;
        if (post.poll.question) pollHTML += `<h4 style="margin-bottom: 16px; font-size: 1.15rem; color: var(--text-main); font-weight: 600;">${window.escapeHTML(post.poll.question)}</h4>`;

        post.poll.options.forEach(opt => {
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
            const isVoted = userVote === opt.id ? 'voted' : '';
            pollHTML += `
                <div class="poll-option-result ${isVoted}" data-option-id="${opt.id}" style="position: relative; margin-bottom: 10px; border-radius: 10px; overflow: hidden; background: var(--card-bg); cursor: pointer; border: 1px solid ${isVoted ? '#F4B41A' : 'var(--border-color)'}; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: 0.2s;">
                    <div class="poll-bar" style="position: absolute; left: 0; top: 0; height: 100%; width: ${userVote !== undefined ? percent : 0}%; background: ${isVoted ? 'rgba(244, 180, 26, 0.25)' : 'rgba(0,0,0,0.05)'}; transition: width 0.6s ease;"></div>
                    <div style="position: relative; padding: 12px 16px; display: flex; justify-content: space-between; font-weight: ${isVoted ? 'bold' : '500'}; color: var(--text-main); align-items: center; width: 100%; box-sizing: border-box;">
                        <span class="poll-text" style="z-index: 1;">${window.escapeHTML(opt.text)}</span>
                        <span class="poll-percent" style="z-index: 1; font-size: 0.9rem; color: var(--text-muted);">${userVote !== undefined ? percent + '%' : ''}</span>
                    </div>
                </div>`;
        });
        pollHTML += `<div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 10px; text-align: right;">${totalVotes} votos registrados</div></div>`;
    }

    let followBtnHTML = '';
    if (!isAuthor && post.authorUsername !== 'admin_pintada') {
        const isFollowing = currentUser.followingList && currentUser.followingList.includes(post.authorUsername);
        followBtnHTML = `<button class="btn-outline follow-btn ${isFollowing ? 'following' : ''}" data-target-user="${post.authorUsername}">${isFollowing ? 'Seguindo' : 'Seguir'}</button>`;
    }

    const commentSectionClass = openCommentBoxes.includes(post.id.toString()) ? 'active' : '';

    return `
        <article class="post-card" data-post-id="${post.id}" style="background: var(--card-bg); border-radius: 16px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <header class="post-header" style="display: flex; align-items: center; margin-bottom: 12px;">
                <a href="profile.html?user=${post.authorUsername}">
                    <img src="${displayAvatar}" alt="Avatar" class="post-avatar" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; margin-right: 12px;">
                </a>
                <div class="post-info" style="flex-grow: 1; display: flex; flex-direction: column; min-width: 0; padding-right: 10px;">
                    <div style="line-height: 1.3; display: block; word-wrap: break-word;">
                        <a href="profile.html?user=${post.authorUsername}" style="text-decoration: none; color: var(--text-main); font-weight: bold; font-size: 1.05rem; display: inline;">
                            <span style="vertical-align: middle;">${window.escapeHTML(post.authorName)}</span>
                        </a>
                        ${badgeHTML}
                    </div>
                    <span class="post-meta" style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">@${post.authorUsername} • ${displayTime} ${editedTag}</span>
                </div>
                ${followBtnHTML}
                ${isAuthor ? `<div class="post-options-wrapper" style="position: relative; margin-left: 8px;"><button class="icon-btn more-options" style="background: none; border: none; cursor: pointer; color: var(--text-muted);"><span class="material-symbols-outlined">more_horiz</span></button><div class="post-dropdown"><button class="dropdown-item edit-post-btn">Editar</button><button class="dropdown-item text-danger delete-post-btn">Apagar</button></div></div>` : ''}
            </header>
            
            <div class="post-content" style="color: var(--text-main); font-size: 1rem; line-height: 1.5; margin-bottom: 16px;">
                <p style="margin: 0;">${parsedContent}</p>
                ${mediaHTML}
                ${pollHTML}
            </div>
            
            <footer class="post-actions" style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 12px;">
                <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" style="display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: ${isLiked ? '#EF4444' : 'var(--text-muted)'}; transition: 0.2s;"><span class="material-symbols-outlined">${isLiked ? 'favorite' : 'favorite_border'}</span> <span>${post.likes || 0}</span></button>
                <button class="action-btn comment-toggle-btn" style="display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: var(--text-muted); transition: 0.2s;"><span class="material-symbols-outlined">chat_bubble_outline</span> <span>${post.comments ? post.comments.length : 0}</span></button>
                <button class="action-btn repost-btn ${isReposted ? 'reposted' : ''}" style="display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: ${isReposted ? '#10B981' : 'var(--text-muted)'}; transition: 0.2s;"><span class="material-symbols-outlined">repeat</span> <span>${post.reposts || 0}</span></button>
                <button class="action-btn share-btn" style="display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: var(--text-muted); transition: 0.2s;"><span class="material-symbols-outlined">share</span></button>
            </footer>
            
            <div class="comments-section ${commentSectionClass}">
                <div class="comments-list">${commentsHTML}</div>
                <div class="comment-input-area">
                    <img src="${currentUserAvatar}" alt="Perfil" class="comment-avatar">
                    <input type="text" class="comment-input" placeholder="Escreva um comentário...">
                    <button class="icon-btn send-comment-btn"><span class="material-symbols-outlined">send</span></button>
                </div>
            </div>
        </article>
    `;
}

async function renderAllFeeds() {
    // 1. Verifica se está na página do post isolado
    const isSinglePostPage = window.location.pathname.includes('post.html');
    
    // 2. Tenta pegar o usuário ativo
    const activeUsername = window.AuthService.getCurrentUser();
    
    // 3. Bloqueio para visitantes (quem não tem conta logada)
    if (!activeUsername) {
        if (isSinglePostPage) {
            alert("Faça login na Pintada para ver esta publicação! 🐆");
            window.location.href = "index.html"; // Manda para a tela de login
        }
        return; // Interrompe a execução
    }

    const currentUser = await window.AuthService.getUserData(activeUsername);
    if (!currentUser) return;

    // ==========================================
    // LÓGICA DA PÁGINA DE POST ISOLADO (post.html)
    // ==========================================
    const singlePostArea = document.getElementById('single-post-render-area');

    if (isSinglePostPage && singlePostArea) {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');

        if (postId) {
            const allPosts = await window.PostService.getPosts();
            // Comparação segura garantindo que ambos são Strings
            const thePost = allPosts.find(p => String(p.id) === String(postId));

            if (thePost) {
                // Renderiza o post e força a caixa de comentários a ficar aberta
                singlePostArea.innerHTML = generatePostHTML(thePost, currentUser);
                const commentsSection = singlePostArea.querySelector('.comments-section');
                if(commentsSection) commentsSection.classList.add('active');
            } else {
                singlePostArea.innerHTML = `<div style="text-align:center; padding: 40px;"><h2>Post não encontrado 🐆</h2><p style="color:var(--text-muted); margin-top:10px;">Ele pode ter sido apagado pelo autor.</p><a href="index.html" class="btn-primary" style="display:inline-block; margin-top:20px; text-decoration:none;">Ir para a Home</a></div>`;
            }
        }
        return; // Interrompe o resto da função para não dar erro procurando a home
    }

    const homeArea = document.getElementById('posts-render-area');
    const profileArea = document.getElementById('profile-posts-render-area');
    const isProfilePage = window.location.pathname.includes('profile.html');

    // ANIMAÇÃO DE CARREGAMENTO (SKELETON) EXCLUSIVA PARA O PERFIL
    if (isProfilePage && profileArea && !window.hasClearedFakePosts) {
        const skeletonHTML = `
            <div class="post-card" style="padding: 16px; margin-bottom: 20px; border-radius: 16px; background: var(--card-bg);">
                <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                    <div class="skeleton" style="width: 48px; height: 48px; border-radius: 50%;"></div>
                    <div><div class="skeleton" style="width: 120px; height: 16px; margin-bottom: 6px; border-radius: 4px;"></div><div class="skeleton" style="width: 80px; height: 12px; border-radius: 4px;"></div></div>
                </div>
                <div class="skeleton" style="width: 100%; height: 60px; border-radius: 8px;"></div>
            </div>`.repeat(3);

        profileArea.innerHTML = skeletonHTML;
        window.hasClearedFakePosts = true;
        await new Promise(r => setTimeout(r, 1500));
    }

    const allPosts = await window.PostService.getPosts();
    const createAvatar = document.querySelector('.create-post-header .post-avatar');
    if (createAvatar) createAvatar.src = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=F4B41A&color=fff`;

    // Renderiza a Home Instantaneamente
    if (homeArea) homeArea.innerHTML = allPosts.map(p => generatePostHTML(p, currentUser)).join('');

    const urlParams = new URLSearchParams(window.location.search);
    const viewedUsername = urlParams.get('user') || currentUser.username;
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
        exploreArea.innerHTML = trendingPosts.length === 0 ? `<p style="text-align: center; color: var(--text-muted); padding: 40px;">Nenhuma publicação em alta.</p>` : trendingPosts.map(p => generatePostHTML(p, currentUser)).join('');
    }

    if (typeof window.renderSuggestedUsers === 'function') window.renderSuggestedUsers();
    if (typeof window.renderTrendingTopics === 'function') await window.renderTrendingTopics();
}

window.renderTrendingTopics = async function () {
    const trendingContainer = document.querySelector('.sidebar-right .widget');
    if (!trendingContainer) return;
    const allPosts = await window.PostService.getPosts();
    let hashtagCounts = {};
    allPosts.forEach(post => { const words = post.content.match(/#[a-zA-Z0-9_À-ÿ]+/gi) || []; words.forEach(w => { hashtagCounts[w] = (hashtagCounts[w] || 0) + 1; }); });
    const sortedHashtags = Object.entries(hashtagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    let topics = sortedHashtags.length > 0 ? sortedHashtags.map(h => ({ category: 'Em Alta na Pintada', title: h[0], stats: `${h[1]} publicações` })) : [{ category: 'Bem-vindo', title: '#NovaPintada', stats: 'Recomendado' }];
    trendingContainer.innerHTML = `<h3 class="widget-title">O que está acontecendo</h3>` + topics.map(t => `<div class="trending-item"><span class="trending-meta">${t.category}</span><h4 class="trending-title" style="color: #D97A00;">${t.title}</h4><span class="trending-stats">${t.stats}</span></div>`).join('');
};

document.addEventListener('DOMContentLoaded', () => {
    renderAllFeeds();

    const postInput = document.getElementById('post-input');
    const btnEmoji = document.getElementById('add-emoji-btn');
    const btnGif = document.getElementById('add-gif-btn');
    const btnPoll = document.getElementById('add-poll-btn');
    const panelEmoji = document.getElementById('emoji-panel');
    const panelGif = document.getElementById('gif-panel');
    const panelPoll = document.getElementById('poll-panel');
    const previewContainer = document.getElementById('selected-gif-preview');

    function hideAllPanels() {
        if (panelEmoji) panelEmoji.style.display = 'none';
        if (panelGif) panelGif.style.display = 'none';
        if (panelPoll) panelPoll.style.display = 'none';
    }

    // CORREÇÃO DOS EMOJIS (Nativo no HTML, nunca falha)
    const nativeEmojis = ["😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤩", "🥳", "😏", "😒", "😔", "😕", "🥺", "😢", "😭", "😤", "😠", "😡", "🤯", "😳", "😱", "😨", "🤔", "🤭", "🤫", "😶", "😐", "🙄", "😲", "😴", "🤤", "🤠", "😈", "💩", "👻", "💀", "👽", "👾", "🤖", "😺", "😻", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "💕", "💖", "👍", "👎", "👏", "🙌", "🤲", "🤝", "🙏", "💪", "👀", "🔥", "✨", "🐆", "⚽", "☕"];
    if (panelEmoji) {
        panelEmoji.innerHTML = '<div style="display:flex; flex-wrap:wrap; gap:10px; padding:10px; max-height:200px; overflow-y:auto;">' +
            nativeEmojis.map(e => `<span class="emoji-btn" style="cursor:pointer; font-size:1.6rem; transition:0.2s;" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'">${e}</span>`).join('') +
            '</div>';
    }

    if (btnEmoji) { btnEmoji.addEventListener('click', () => { const isHidden = panelEmoji.style.display === 'none' || panelEmoji.style.display === ''; hideAllPanels(); if (isHidden) panelEmoji.style.display = 'block'; }); }

    // Captura o clique no emoji e adiciona no input
    if (panelEmoji) {
        panelEmoji.addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji-btn') && postInput) {
                postInput.value += e.target.textContent;
            }
        });
    }

    if (btnGif) { btnGif.addEventListener('click', () => { const isHidden = panelGif.style.display === 'none' || panelGif.style.display === ''; hideAllPanels(); if (isHidden) panelGif.style.display = 'block'; }); }
    if (btnPoll) { btnPoll.addEventListener('click', () => { const isHidden = panelPoll.style.display === 'none' || panelPoll.style.display === ''; hideAllPanels(); if (isHidden) panelPoll.style.display = 'block'; }); }

    const gifInput = document.getElementById('gif-search-input');
    const GIPHY_API_KEY = "k1rI7vq3jlZ37VjBIlpGcgbVCndPwghP";

    if (gifInput) {
        gifInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            const resultsDiv = document.getElementById('gif-results');
            if (query.length < 2) return;
            resultsDiv.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">A pesquisar...</p>';
            try {
                const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=15&lang=pt`);
                const json = await res.json();
                resultsDiv.innerHTML = json.data.map(gif => `<img src="${gif.images.fixed_height_small.url}" data-full="${gif.images.downsized_medium.url}" style="height:80px; margin:2px; cursor:pointer; border-radius:4px;">`).join('');
                resultsDiv.querySelectorAll('img').forEach(img => {
                    img.addEventListener('click', () => {
                        window.selectedGifUrl = img.getAttribute('data-full');
                        let previewImg = previewContainer.querySelector('img');
                        if (!previewImg) { previewImg = document.createElement('img'); previewImg.style.maxWidth = '100%'; previewImg.style.borderRadius = '8px'; previewContainer.insertBefore(previewImg, previewContainer.firstChild); }
                        previewImg.src = window.selectedGifUrl;
                        previewContainer.style.display = 'block';
                        hideAllPanels();
                    });
                });
            } catch (err) { resultsDiv.innerHTML = '<p style="color:red; font-size:12px;">Erro ao buscar GIFs.</p>'; }
        });
    }

    document.getElementById('remove-gif-btn')?.addEventListener('click', () => { window.selectedGifUrl = null; if (previewContainer) previewContainer.style.display = 'none'; });
    document.getElementById('add-poll-opt-btn')?.addEventListener('click', () => {
        const cont = document.getElementById('poll-options-container');
        const inputs = cont.querySelectorAll('.poll-opt-input');
        if (inputs.length < 5) {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;';
            row.innerHTML = `<input type="text" class="poll-opt-input" placeholder="Opção ${inputs.length + 1}" style="flex-grow: 1; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; background: transparent; color: var(--text-main); outline: none;"><button type="button" class="icon-btn remove-opt-btn"><span class="material-symbols-outlined" style="color: var(--text-muted);">close</span></button>`;
            cont.appendChild(row);
        }
    });

    // ==========================================
    // MONITOR DO CONTADOR DE CARACTERES (FIX)
    // ==========================================
    const postInputText = document.getElementById('post-input');
    const charCountDisplay = document.getElementById('char-counter');

    if (postInputText && charCountDisplay) {
        postInputText.addEventListener('input', () => {
            const currentLength = postInputText.value.length;
            charCountDisplay.textContent = `${currentLength} / 1000`;

            // Busca o botão atual no DOM (caso tenha sido clonado)
            const currentBtn = document.getElementById('publish-btn');

            if (currentLength > 1000) {
                charCountDisplay.style.color = '#EF4444'; // Vermelho
                if (currentBtn) currentBtn.style.opacity = "0.5";
                if (currentBtn) currentBtn.style.cursor = "not-allowed";
            } else {
                charCountDisplay.style.color = 'var(--text-muted)';
                if (currentBtn) currentBtn.style.opacity = "1";
                if (currentBtn) currentBtn.style.cursor = "pointer";
            }
        });
    }

    // ==========================================
    // MOTOR DE POSTAGEM ÚNICO (SEM DUPLICIDADE)
    // ==========================================
    const finalPublishBtn = document.getElementById('publish-btn');

    if (finalPublishBtn) {
        // Removemos qualquer listener anterior por segurança antes de adicionar o novo
        finalPublishBtn.replaceWith(finalPublishBtn.cloneNode(true));
        const newPublishBtn = document.getElementById('publish-btn');

        newPublishBtn.addEventListener('click', async () => {
            const postInput = document.getElementById('post-input');
            const content = postInput.value.trim();
            const activeUsername = window.AuthService.getCurrentUser();

            // TRANCA DE SEGURANÇA EXTRA
            if (content.length > 1000) {
                showToast("O limite é de 1000 caracteres! Reduza o texto para postar.", "error");
                return; // Interrompe a postagem aqui
            }

            // Mídias
            const imageFile = document.getElementById('post-image-input').files[0];
            const audioBase64 = window.lastRecordedAudioBase64;
            const gifUrl = window.selectedGifUrl;

            // Poll (Enquete)
            const pollQuestion = document.getElementById('poll-question-input')?.value.trim();
            const pollInputs = Array.from(document.querySelectorAll('.poll-opt-input')).map(i => i.value.trim()).filter(v => v);
            let pollData = null;
            if (pollInputs.length >= 2) {
                pollData = {
                    question: pollQuestion || '',
                    options: pollInputs.map((opt, idx) => ({ id: idx, text: opt, votes: 0 })),
                    voters: {}
                };
            }

            if (!content && !imageFile && !audioBase64 && !gifUrl && !pollData) return;

            newPublishBtn.disabled = true;
            newPublishBtn.textContent = "...";

            try {
                const user = await window.AuthService.getUserData(activeUsername);
                let finalImageUrl = null;

                // 1. Upload Imagem se houver
                if (imageFile) {
                    const formData = new FormData();
                    formData.append('image', imageFile);
                    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.success) finalImageUrl = data.data.url;
                }

                // 2. ENVIO ÚNICO PARA O BANCO
                await window.PostService.addPost(content, user, gifUrl, pollData, {
                    image: finalImageUrl,
                    audio: audioBase64
                });

                // 3. LIMPEZA TOTAL
                postInput.value = '';
                document.getElementById('char-counter').textContent = '0 / 1000';
                document.getElementById('post-image-input').value = '';
                window.lastRecordedAudioBase64 = null;
                window.selectedGifUrl = null;

                // Esconde Paineis e Previews
                document.querySelectorAll('.media-panel').forEach(p => p.style.display = 'none');
                document.getElementById('post-preview-container').style.display = 'none';
                document.getElementById('post-audio-preview').style.display = 'none';
                document.getElementById('selected-gif-preview').style.display = 'none';
                document.getElementById('mic-icon').style.color = 'var(--text-muted)';
                if (document.getElementById('poll-options-container')) document.getElementById('poll-options-container').innerHTML = '';

                showToast("Publicado com sucesso! 🐆");
                renderAllFeeds();
            } catch (err) {
                showToast("Erro ao publicar", "error");
            } finally {
                newPublishBtn.disabled = false;
                newPublishBtn.textContent = "Postar";
            }
        });
    }

    // Pressionar ENTER para enviar comentário
    document.addEventListener('keypress', (e) => {
        if (e.target.classList.contains('comment-input') && e.key === 'Enter') {
            e.preventDefault();
            const btn = e.target.closest('.comment-input-area').querySelector('.send-comment-btn');
            if (btn) btn.click();
        }
    });

    document.addEventListener('click', async (e) => {
        const activeUsername = window.AuthService.getCurrentUser();
        if (e.target.closest('.remove-opt-btn')) e.target.closest('div').remove();

        const postCard = e.target.closest('.post-card');
        const postId = postCard ? postCard.getAttribute('data-post-id') : null;
        const pollOption = e.target.closest('.poll-option-result');

        if (pollOption && activeUsername) {
            const pollPostId = pollOption.closest('.poll-container').getAttribute('data-post-id');
            await window.PostService.votePoll(pollPostId, activeUsername, parseInt(pollOption.getAttribute('data-option-id')));
            renderAllFeeds();
            return;
        }

        if (e.target.closest('.follow-btn')) {
            const btn = e.target.closest('.follow-btn');
            const targetUser = btn.getAttribute('data-target-user');
            const isFollowing = btn.classList.toggle('following');
            btn.textContent = isFollowing ? 'Seguindo' : 'Seguir';
            if (isFollowing) { btn.style.background = 'transparent'; btn.style.color = 'var(--text-main)'; btn.style.border = '1px solid var(--border-color)'; }
            else { btn.style.background = 'var(--brand-gradient)'; btn.style.color = 'white'; btn.style.border = 'none'; }

            // Trava o botão rapidinho para evitar cliques duplos (o erro da contagem)
            btn.style.pointerEvents = 'none';
            await window.AuthService.toggleFollow(targetUser);
            btn.style.pointerEvents = 'auto';

            const followersCountEl = document.getElementById('profile-followers-count');
            const urlParams = new URLSearchParams(window.location.search);
            if (followersCountEl && (urlParams.get('user') === targetUser || (!urlParams.get('user') && targetUser === activeUsername))) {
                // Faz a contagem matemática baseada em quem REALMENTE está na lista!
                const allUsersNow = await window.AuthService.getUsers();
                const actualFollowersCount = allUsersNow.filter(u => u.followingList && u.followingList.includes(targetUser)).length;
                followersCountEl.textContent = actualFollowersCount;
            }
            return;
        }

        if (e.target.closest('.like-btn')) { await window.PostService.toggleReaction(postId, activeUsername, 'like'); renderAllFeeds(); }
        if (e.target.closest('.repost-btn')) { await window.PostService.toggleReaction(postId, activeUsername, 'repost'); renderAllFeeds(); }

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

        if (e.target.closest('.more-options')) {
            const dropdown = e.target.closest('.more-options').nextElementSibling;
            document.querySelectorAll('.post-dropdown').forEach(d => { if (d !== dropdown) d.classList.remove('active'); });
            dropdown.classList.toggle('active');
        }

        if (e.target.closest('.edit-post-btn')) {
            const pTag = postCard.querySelector('.post-content p');
            const currentContent = pTag.innerHTML.replace(/<br>/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            const newContent = prompt("Edite a sua publicação:", currentContent);
            if (newContent !== null && newContent.trim() !== "") {
                await window.PostService.editPost(postId, newContent.trim());
                renderAllFeeds();
                showToast("Publicação editada!");
            }
        }

        if (e.target.closest('.delete-post-btn') && confirm("Apagar permanentemente?")) { await window.PostService.deletePost(postId); renderAllFeeds(); }

// ==========================================
        // NOVO SISTEMA DE COMPARTILHAMENTO (WHATSAPP + NATIVO)
        // ==========================================
        if (e.target.closest('.share-btn')) {
            const shareBtn = e.target.closest('.share-btn');
            const postCard = shareBtn.closest('.post-card');
            const postId = postCard.getAttribute('data-post-id');
            
            // Pega as informações do post
            const authorNameElement = postCard.querySelector('.post-info span');
            const authorName = authorNameElement ? authorNameElement.textContent : "um usuário";
            const contentElement = postCard.querySelector('.post-content p');
            const contentText = contentElement ? contentElement.innerText.substring(0, 100) : "Mídia";
            
            // Link exclusivo do Post
            const postUrl = `${window.location.origin}/post.html?id=${postId}`;
            
            // Texto formatado para o WhatsApp e outros locais
            const shareTitle = `Publicação de ${authorName} na Pintada 🐆`;
            const shareText = `"${contentText}..."\n\nConfira na íntegra:`;

            // 1. Tenta usar o compartilhamento nativo do celular (Abre aquela gaveta do Android/iOS)
            if (navigator.share) {
                navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: postUrl
                }).catch((error) => console.log('Erro ao compartilhar', error));
            } else {
                // 2. Fallback para PC: Abre uma janela perguntando se quer ir pro WhatsApp
                const whatsappMsg = encodeURIComponent(`*${shareTitle}*\n\n${shareText}\n${postUrl}`);
                const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMsg}`;

                if (confirm("Deseja compartilhar no WhatsApp?\n(Clique em Cancelar para apenas copiar o link)")) {
                    window.open(whatsappUrl, '_blank');
                } else {
                    // Copia o link para a área de transferência
                    navigator.clipboard.writeText(postUrl).then(() => {
                        showToast("Link copiado! 🔗", "success");
                    });
                }
            }
        }
    });

    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            await renderAllFeeds();
        });
    });
});

// ==========================================
// PARTE 2 FINAL: MÍDIAS (IMGBB + AUDIO BASE64)
// ==========================================

const IMGBB_API_KEY = '02d34ec2cd7054a202c57bf35f17bc5a'; // Chave que você usa no messages.js
let mediaRecorder;
let audioChunks = [];
window.lastRecordedAudioBase64 = null; // Armazena o áudio convertido

// 1. Preview e Preparação de Imagem
document.getElementById('post-image-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('post-preview-img').src = event.target.result;
            document.getElementById('post-preview-container').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// 2. Gravação de Áudio (Lógica idêntica ao messages.js)
document.getElementById('post-audio-btn')?.addEventListener('click', async () => {
    const micIcon = document.getElementById('mic-icon');
    const audioPreview = document.getElementById('post-audio-preview');
    const audioPlayer = document.getElementById('post-audio-player-preview');

    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    window.lastRecordedAudioBase64 = reader.result;
                    if (audioPlayer) audioPlayer.src = reader.result; // PERMITE OUVIR ANTES!
                    audioPreview.style.display = 'flex';
                    showToast("Áudio gravado! Você pode ouvir antes de postar.");
                };
            };

            mediaRecorder.start();
            micIcon.style.color = "#EF4444";
            micIcon.textContent = "stop_circle";
        } catch (err) {
            showToast("Erro ao acessar microfone", "error");
        }
    } else {
        mediaRecorder.stop();
        micIcon.style.color = "var(--text-muted)";
        micIcon.textContent = "mic";
    }
});

// 3. Botões de Remover Previews
document.getElementById('remove-preview')?.addEventListener('click', () => {
    document.getElementById('post-image-input').value = '';
    document.getElementById('post-preview-container').style.display = 'none';
});
document.getElementById('remove-audio-btn')?.addEventListener('click', () => {
    window.lastRecordedAudioBase64 = null;
    document.getElementById('post-audio-preview').style.display = 'none';
});

// 4. BOTÃO POSTAR (A LOGICA REAL AGORA)
document.getElementById('publish-btn')?.addEventListener('click', async () => {
    const postInput = document.getElementById('post-input');
    const charCounter = document.getElementById('char-counter');
    const imageInput = document.getElementById('post-image-input');
    const publishBtn = document.getElementById('publish-btn');

    const activeUsername = window.AuthService.getCurrentUser();
    const content = postInput.value.trim();
    const imageFile = imageInput.files[0];
    const audioBase64 = window.lastRecordedAudioBase64;
    const gifUrl = window.selectedGifUrl;

    if (!content && !imageFile && !audioBase64 && !gifUrl) return;

    publishBtn.disabled = true;
    publishBtn.textContent = "...";

    try {
        const user = await window.AuthService.getUserData(activeUsername);
        let finalImageUrl = null;

        // Upload ImgBB (idêntico ao messages.js)
        if (imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) finalImageUrl = data.data.url;
        }

        // Envia para o banco de dados
        await window.PostService.addPost(content, user, gifUrl, null, {
            image: finalImageUrl,
            audio: audioBase64
        });

        // --- RESET TOTAL ---
        postInput.value = '';
        charCounter.textContent = '0 / 1000'; // Reseta o contador
        charCounter.style.color = 'var(--text-muted)';
        imageInput.value = '';
        window.lastRecordedAudioBase64 = null;
        window.selectedGifUrl = null;

        // Esconde Previews
        document.getElementById('post-preview-container').style.display = 'none';
        document.getElementById('post-audio-preview').style.display = 'none';
        document.getElementById('selected-gif-preview').style.display = 'none';

        showToast("Publicado com sucesso! 🐆");
        renderAllFeeds();
    } catch (err) {
        showToast("Erro ao publicar", "error");
    } finally {
        publishBtn.disabled = false;
        publishBtn.textContent = "Postar";
    }
});