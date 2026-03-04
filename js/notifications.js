// ==========================================
// js/notifications.js - LÓGICA DE NOTIFICAÇÕES (FIREBASE)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const activeUsername = AuthService.getCurrentUser();
    if (!activeUsername) {
        window.location.href = 'auth.html';
        return;
    }

    const notifArea = document.getElementById('notifications-render-area');
    if (!notifArea) return;

    try {
        // 1. Busca os dados necessários no Firebase
        const currentUser = await AuthService.getUserData(activeUsername);
        const allPosts = await PostService.getPosts();
        const allNetworkUsers = await AuthService.getUsers();

        // Filtra apenas os posts que VOCÊ criou
        const myPosts = allPosts.filter(p => p.authorUsername === activeUsername);
        let notifications = [];

        // --- Notificação Fixa de Boas-vindas ---
        notifications.push({
            type: 'welcome',
            icon: 'waving_hand',
            color: '#10B981',
            text: `<strong>Equipe Pintada</strong> deu as boas-vindas à rede! Fique à vontade para postar. 🐆`,
            time: 'Recente'
        });

        // --- Varre seus posts para achar curtidas e comentários ---
        myPosts.forEach(post => {
            // Curtidas
            if (post.likedBy) {
                post.likedBy.forEach(username => {
                    if (username !== activeUsername) {
                        notifications.push({
                            type: 'like',
                            icon: 'favorite',
                            color: '#E0245E',
                            text: `<strong>@${username}</strong> curtiu sua publicação: <em>"${post.content.substring(0, 30)}..."</em>`,
                            time: post.time || 'Recente'
                        });
                    }
                });
            }

            // Comentários
            if (post.comments) {
                post.comments.forEach(comment => {
                    if (comment.authorUsername !== activeUsername) {
                        notifications.push({
                            type: 'comment',
                            icon: 'chat_bubble',
                            color: '#3B82F6',
                            text: `<strong>${comment.authorName}</strong> comentou na sua publicação.`,
                            time: 'Recente'
                        });
                    }
                });
            }
        });

        // --- Varre TODOS OS POSTS para achar menções a você ---
        allPosts.forEach(post => {
            if (post.content && post.content.includes(`@${activeUsername}`)) {
                if (post.authorUsername !== activeUsername) { // Não notifica se você mencionar a si mesmo
                    notifications.push({
                        type: 'mention',
                        icon: 'alternate_email',
                        color: '#1D9BF0',
                        text: `<strong>${window.escapeHTML(post.authorName)}</strong> mencionou você numa publicação.`,
                        time: post.time || 'Recente'
                    });
                }
            }
        });

        // --- Varre seguidores ---
        allNetworkUsers.forEach(u => {
            if (u.followingList && u.followingList.includes(activeUsername)) {
                notifications.push({
                    type: 'follow',
                    icon: 'person_add',
                    color: '#8B5CF6',
                    text: `<strong>@${u.username}</strong> começou a seguir você.`,
                    time: 'Recente'
                });
            }
        });

        notifications.reverse();

        // Renderiza na tela
        notifArea.innerHTML = notifications.map(n => `
            <div class="notification-card" style="display: flex; gap: 15px; background: var(--card-bg); padding: 16px; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 12px; align-items: center; cursor: pointer; transition: 0.2s;" onmouseover="this.style.transform='translateX(5px)'; this.style.borderColor='${n.color}'" onmouseout="this.style.transform='none'; this.style.borderColor='var(--border-color)'">
                <div style="background: ${n.color}20; width: 48px; height: 48px; min-width: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <span class="material-symbols-outlined" style="color: ${n.color}; font-variation-settings: 'FILL' 1; font-size: 24px;">${n.icon}</span>
                </div>
                <div style="flex-grow: 1;">
                    <p style="margin: 0; color: var(--text-main); font-size: 0.95rem; line-height: 1.4;">${n.text}</p>
                    <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 4px;">${n.time}</span>
                </div>
            </div>`).join('');

    } catch (error) {
        console.error("Erro ao carregar notificações:", error);
        notifArea.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Erro ao carregar notificações.</p>';
    }

    // ==========================================
    // AGORA SIM! ESTÁ FORA DO CATCH E VAI RODAR SEMPRE!
    // ==========================================

    // Pede para o sistema desenhar os Assuntos do Momento na lateral
    if (typeof window.renderTrendingTopics === 'function') {
        await window.renderTrendingTopics();
    }

    // Tira todos os esqueletos cinzas da tela de notificações
    document.querySelectorAll('.skeleton').forEach(el => {
        el.classList.remove('skeleton');
    });
});