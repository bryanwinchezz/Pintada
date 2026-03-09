// ==========================================
// js/notifications.js - LÓGICA DE NOTIFICAÇÕES (USANDO BOTÃO NATIVO)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const activeUsername = window.AuthService.getCurrentUser();
    if (!activeUsername) {
        window.location.href = 'auth.html';
        return;
    }

    localStorage.setItem(`pintada_notif_read_${activeUsername}`, Date.now());

    const notifArea = document.getElementById('notifications-render-area');
    if (!notifArea) return;

    // A MÁGICA AQUI: O JavaScript procura automaticamente o seu botão no HTML!
    const toggleBtn = document.querySelector('button[title="Marcar todas como lidas"]') ||
        Array.from(document.querySelectorAll('.icon-btn')).find(b => b.innerHTML.includes('checklist'));

    let isDeleteMode = false; // Guarda se estamos no modo de apagar ou não
    let deletedNotifs = JSON.parse(localStorage.getItem('pintada_deleted_notifs_' + activeUsername)) || [];

    function formatarDataNotificacao(timestamp) {
        if (!timestamp) return 'Recente';
        const data = new Date(timestamp);
        const hoje = new Date();
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);

        const horas = data.getHours().toString().padStart(2, '0');
        const minutos = data.getMinutes().toString().padStart(2, '0');
        const horaFormatada = `${horas}:${minutos}`;

        if (data.toDateString() === hoje.toDateString()) return `Hoje às ${horaFormatada}`;
        if (data.toDateString() === ontem.toDateString()) return `Ontem às ${horaFormatada}`;

        const dia = data.getDate().toString().padStart(2, '0');
        const mes = (data.getMonth() + 1).toString().padStart(2, '0');
        return `${dia}/${mes} às ${horaFormatada}`;
    }

    async function renderNotifications() {
        try {
            const currentUser = await window.AuthService.getUserData(activeUsername);
            const myPosts = await window.PostService.getMyPosts(activeUsername);
            const allPosts = await window.PostService.getPosts();
            const allNetworkUsers = await window.AuthService.getUsers();
            let notifications = [];

            const userCreationTime = currentUser.timestamp || Date.now() - 86400000;

            notifications.push({
                id: `welcome_${userCreationTime}`,
                type: 'welcome',
                icon: 'waving_hand',
                color: '#10B981',
                text: `<strong>Equipe Pintada</strong> deu as boas-vindas à rede! Fique à vontade para postar. 🐆`,
                time: formatarDataNotificacao(userCreationTime),
                rawTimestamp: userCreationTime
            });

            myPosts.forEach(post => {
                if (post.likedBy) {
                    post.likedBy.forEach(username => {
                        if (username !== activeUsername) {
                            const likeTime = (post.likesData && post.likesData[username]) ? post.likesData[username] : post.timestamp;
                            notifications.push({
                                id: `like_${post.id}_${username}`,
                                type: 'like',
                                icon: 'favorite',
                                color: '#E0245E',
                                text: `<strong>@${username}</strong> curtiu sua publicação: <em>"${post.content.substring(0, 30)}..."</em>`,
                                time: formatarDataNotificacao(likeTime),
                                rawTimestamp: likeTime
                            });
                        }
                    });
                }

                if (post.comments) {
                    post.comments.forEach(comment => {
                        if (comment.authorUsername !== activeUsername) {
                            const cTime = comment.timestamp || post.timestamp;
                            notifications.push({
                                id: `comment_${post.id}_${cTime}`,
                                type: 'comment',
                                icon: 'chat_bubble',
                                color: '#3B82F6',
                                text: `<strong>${window.escapeHTML(comment.authorName)}</strong> comentou na sua publicação.`,
                                time: formatarDataNotificacao(cTime),
                                rawTimestamp: cTime
                            });
                        }
                    });
                }
            });

            // 3. Menções e Respostas aos Comentários
            allPosts.forEach(post => {
                // Menções no Post Principal
                if (post.content && post.content.includes(`@${activeUsername}`)) {
                    if (post.authorUsername !== activeUsername) {
                        notifications.push({
                            id: `mention_${post.id}_${post.authorUsername}`,
                            type: 'mention',
                            icon: 'alternate_email',
                            color: '#1D9BF0',
                            text: `<strong>${window.escapeHTML(post.authorName)}</strong> mencionou você numa publicação.`,
                            time: formatarDataNotificacao(post.timestamp),
                            rawTimestamp: post.timestamp
                        });
                    }
                }

                // Respostas/Menções dentro dos Comentários!
                if (post.comments) {
                    post.comments.forEach(comment => {
                        if (comment.text && comment.text.includes(`@${activeUsername}`)) {
                            if (comment.authorUsername !== activeUsername) {
                                const cTime = comment.timestamp || post.timestamp;
                                notifications.push({
                                    id: `reply_${post.id}_${cTime}_${comment.authorUsername}`,
                                    type: 'reply',
                                    icon: 'reply',
                                    color: '#F4B41A', // Laranja Pintada
                                    text: `<strong>${window.escapeHTML(comment.authorName)}</strong> respondeu a você num comentário.`,
                                    time: formatarDataNotificacao(cTime),
                                    rawTimestamp: cTime
                                });
                            }
                        }
                    });
                }
            });

            allNetworkUsers.forEach(u => {
                if (u.followingList && u.followingList.includes(activeUsername)) {
                    const followTime = (u.followingData && u.followingData[activeUsername]) ? u.followingData[activeUsername] : (u.timestamp || userCreationTime + 1000);
                    notifications.push({
                        id: `follow_${u.username}`,
                        type: 'follow',
                        icon: 'person_add',
                        color: '#8B5CF6',
                        text: `<strong>@${u.username}</strong> começou a seguir você.`,
                        time: formatarDataNotificacao(followTime),
                        rawTimestamp: followTime
                    });
                }
            });

            // Filtra e Ordena
            notifications = notifications.filter(n => !deletedNotifs.includes(n.id));
            notifications.sort((a, b) => b.rawTimestamp - a.rawTimestamp);

            if (notifications.length === 0) {
                notifArea.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">Não tens novas notificações no momento! 🐆</p>';
                return;
            }

            // AQUI NÃO RENDERIZAMOS O H2 MAIS, APENAS O PAINEL DE CONTROLO ESCONDIDO
            notifArea.innerHTML = `
                <div id="notif-controls-bar" style="display: ${isDeleteMode ? 'flex' : 'none'}; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 12px 16px; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: 0.3s;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-main); font-weight: 500;">
                        <input type="checkbox" id="select-all-notifs" style="width: 18px; height: 18px; accent-color: var(--brand-color); cursor: pointer;"> 
                        Selecionar Todas
                    </label>
                    <button id="delete-selected-notifs" class="btn-outline" style="color: #EF4444; border-color: #EF4444; padding: 6px 16px; font-size: 0.85rem; border-radius: 8px; display: none; cursor: pointer; transition: 0.2s; font-weight: bold;">
                        Apagar
                    </button>
                </div>

                <div id="notifs-list-container">
                    ${notifications.map(n => `
                        <div class="notification-card" style="display: flex; gap: 15px; background: var(--card-bg); padding: 16px; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 12px; align-items: center; transition: 0.2s; cursor: pointer;" onmouseover="this.style.transform='translateX(5px)'; this.style.borderColor='${n.color}'" onmouseout="this.style.transform='none'; this.style.borderColor='var(--border-color)'">
                            <input type="checkbox" class="notif-checkbox" data-id="${n.id}" style="display: ${isDeleteMode ? 'block' : 'none'}; width: 18px; height: 18px; accent-color: var(--brand-color); cursor: pointer; transition: 0.3s;">
                            
                            <div style="background: ${n.color}20; width: 48px; height: 48px; min-width: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="color: ${n.color}; font-variation-settings: 'FILL' 1; font-size: 24px;">${n.icon}</span>
                            </div>
                            <div style="flex-grow: 1;">
                                <p style="margin: 0; color: var(--text-main); font-size: 0.95rem; line-height: 1.4;">${n.text}</p>
                                <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 4px;">${n.time}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            const controlsBar = document.getElementById('notif-controls-bar');
            const selectAllCb = document.getElementById('select-all-notifs');
            const deleteBtn = document.getElementById('delete-selected-notifs');
            const allCbs = document.querySelectorAll('.notif-checkbox');

            deleteBtn.onmouseover = () => { deleteBtn.style.background = '#EF4444'; deleteBtn.style.color = 'white'; };
            deleteBtn.onmouseout = () => { deleteBtn.style.background = 'transparent'; deleteBtn.style.color = '#EF4444'; };

            function toggleDeleteButton() {
                const anyChecked = Array.from(allCbs).some(cb => cb.checked);
                if (deleteBtn) deleteBtn.style.display = anyChecked ? 'block' : 'none';
            }
            toggleDeleteButton(); // Executa para garantir estado correto ao recarregar

            selectAllCb.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                allCbs.forEach(cb => cb.checked = isChecked);
                toggleDeleteButton();
            });

            allCbs.forEach(cb => {
                cb.addEventListener('change', () => {
                    const allChecked = Array.from(allCbs).every(c => c.checked);
                    selectAllCb.checked = allChecked;
                    toggleDeleteButton();
                });
            });

            document.querySelectorAll('.notification-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (isDeleteMode && e.target.tagName !== 'INPUT') {
                        const cb = card.querySelector('.notif-checkbox');
                        if (cb) {
                            cb.checked = !cb.checked;
                            cb.dispatchEvent(new Event('change'));
                        }
                    }
                });
            });

            deleteBtn.addEventListener('click', () => {
                const idsToDelete = Array.from(allCbs).filter(cb => cb.checked).map(cb => cb.getAttribute('data-id'));
                if (idsToDelete.length === 0) return;

                if (confirm(`Quer mesmo remover ${idsToDelete.length} notificação(ões) da lista?`)) {
                    deletedNotifs = [...deletedNotifs, ...idsToDelete];
                    localStorage.setItem('pintada_deleted_notifs_' + activeUsername, JSON.stringify(deletedNotifs));

                    window.showToast(`${idsToDelete.length} notificação(ões) removida(s)!`, 'success');

                    // Reseta o botão para o estado normal e recarrega
                    isDeleteMode = false;
                    if (toggleBtn) {
                        toggleBtn.style.color = 'var(--text-muted)';
                        toggleBtn.style.background = 'transparent';
                    }
                    renderNotifications();
                }
            });

        } catch (error) {
            console.error("Erro ao carregar notificações:", error);
            notifArea.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Erro ao carregar notificações.</p>';
        }
    }

    // === EVENTO DE CLIQUE DO SEU BOTÃO DO HTML ===
    if (toggleBtn) {
        toggleBtn.title = "Gerir Notificações";
        toggleBtn.style.transition = '0.3s';

        toggleBtn.addEventListener('click', () => {
            isDeleteMode = !isDeleteMode;

            const controlsBar = document.getElementById('notif-controls-bar');
            const allCbs = document.querySelectorAll('.notif-checkbox');
            const selectAllCb = document.getElementById('select-all-notifs');
            const deleteBtn = document.getElementById('delete-selected-notifs');

            if (isDeleteMode) {
                // Acende o seu botão (fica com a cor da marca)
                toggleBtn.style.color = 'var(--brand-color)';
                toggleBtn.style.background = 'rgba(244, 180, 26, 0.1)';
                toggleBtn.style.borderRadius = '50%';
                toggleBtn.style.transform = 'scale(1.1)';

                if (controlsBar) controlsBar.style.display = 'flex';
                allCbs.forEach(cb => cb.style.display = 'block');
            } else {
                // Desliga o botão
                toggleBtn.style.color = 'var(--text-muted)';
                toggleBtn.style.background = 'transparent';
                toggleBtn.style.transform = 'scale(1)';

                if (controlsBar) controlsBar.style.display = 'none';
                if (deleteBtn) deleteBtn.style.display = 'none';
                if (selectAllCb) selectAllCb.checked = false;
                allCbs.forEach(cb => {
                    cb.style.display = 'none';
                    cb.checked = false;
                });
            }
        });
    }

    await renderNotifications();

    if (typeof window.renderTrendingTopics === 'function') {
        await window.renderTrendingTopics();
    }

    document.querySelectorAll('.skeleton').forEach(el => el.classList.remove('skeleton'));
});