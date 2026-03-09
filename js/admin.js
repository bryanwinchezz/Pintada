// ==========================================
// js/admin.js - LÓGICA DO PAINEL DE CONTROLE
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    const activeUsername = window.AuthService ? window.AuthService.getCurrentUser() : null;

    // 1. O ESCUDO DE SEGURANÇA!
    // Coloque o seu @ exato aqui (em minúsculas). Se alguém tentar entrar e não for você, é chutado para a home.
    const MASTER_ADMIN = "bryan";

    if (!activeUsername || activeUsername !== MASTER_ADMIN) {
        window.location.replace('index.html');
        return;
    }

    const searchInput = document.getElementById('admin-search-input');
    const searchBtn = document.getElementById('admin-search-btn');
    const resultArea = document.getElementById('admin-result-area');
    const saveBtn = document.getElementById('admin-save-btn');
    const badgeSelect = document.getElementById('admin-badge-select');

    let currentUserBeingEdited = null;

    // 2. Busca o usuário
    searchBtn.addEventListener('click', async () => {
        const query = searchInput.value.trim().toLowerCase().replace('@', '');
        if (!query) return;

        searchBtn.textContent = "...";
        try {
            const user = await window.AuthService.getUserData(query);
            if (!user) {
                window.showToast("Utilizador não encontrado.", "error");
                return;
            }

            currentUserBeingEdited = user.username;

            document.getElementById('admin-user-avatar').src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=F4B41A&color=fff`;

            const badgeHTML = typeof window.getBadgeHTML === 'function' ? window.getBadgeHTML(user.badge) : '';
            document.getElementById('admin-user-name').innerHTML = `${window.escapeHTML(user.name)} ${badgeHTML}`;
            document.getElementById('admin-user-handle').textContent = `@${user.username}`;

            badgeSelect.value = user.badge || 'none';
            resultArea.style.display = 'block';

        } catch (error) {
            console.error("Erro no Admin:", error);
            alert("Erro ao procurar utilizador. Abra a consola (F12) para ver os detalhes.");
        } finally {
            searchBtn.textContent = "Procurar";
        }
    });

    // 3. Salva o novo selo no banco de dados
    saveBtn.addEventListener('click', async () => {
        if (!currentUserBeingEdited) return;

        const selectedBadge = badgeSelect.value;
        saveBtn.textContent = "A guardar...";

        try {
            await window.AuthService.updateUserBadge(currentUserBeingEdited, selectedBadge);
            window.showToast("Selo atualizado com sucesso! 🐆", "success");

            setTimeout(() => {
                resultArea.style.display = 'none';
                searchInput.value = '';
            }, 1000);

        } catch (error) {
            window.showToast("Erro ao guardar selo.", "error");
        } finally {
            saveBtn.textContent = "Salvar Alterações";
        }
    });

    // ==========================================
    // SISTEMA DE ESTATÍSTICAS E PRESENÇA
    // ==========================================
    const totalUsersEl = document.getElementById('admin-total-users');
    const onlineUsersEl = document.getElementById('admin-online-users');
    const btnShowOnline = document.getElementById('btn-show-online');
    const modalUsersList = document.getElementById('modal-users-list');
    const closeUsersModal = document.getElementById('close-users-modal');
    const usersListRender = document.getElementById('users-list-render');

    let allUsersData = [];

    // Função que busca todos e conta quem está online
    async function loadPlatformStats() {
        try {
            allUsersData = await window.AuthService.getUsers();
            if (totalUsersEl) totalUsersEl.textContent = allUsersData.length;

            let onlineCount = 0;
            const now = Date.now();

            allUsersData.forEach(u => {
                // Checa se o status no banco de dados está online e se foi visto nos últimos 5 minutos
                const isReallyOnline = u.isOnline && u.lastSeen && (now - u.lastSeen < 300000);
                if (isReallyOnline) onlineCount++;
            });

            if (onlineUsersEl) onlineUsersEl.textContent = onlineCount;
        } catch (error) {
            console.error("Erro ao carregar estatísticas:", error);
        }
    }

    // Dispara a contagem assim que a página carrega
    loadPlatformStats();

    // Eventos do Modal
    if (btnShowOnline) {
        btnShowOnline.addEventListener('click', () => {
            modalUsersList.style.display = 'flex';
            renderDetailedUsersList();
        });
    }

    if (closeUsersModal) {
        closeUsersModal.addEventListener('click', () => {
            modalUsersList.style.display = 'none';
        });
    }

    // Desenha a lista rica com fotos e status
    function renderDetailedUsersList() {
        if (!usersListRender) return;
        const now = Date.now();

        // Ordena para quem está ONLINE ficar sempre no topo da lista
        const sortedUsers = [...allUsersData].sort((a, b) => {
            const aOnline = a.isOnline && a.lastSeen && (now - a.lastSeen < 300000) ? 1 : 0;
            const bOnline = b.isOnline && b.lastSeen && (now - b.lastSeen < 300000) ? 1 : 0;
            return bOnline - aOnline;
        });

        usersListRender.innerHTML = sortedUsers.map(u => {
            const isReallyOnline = u.isOnline && u.lastSeen && (now - u.lastSeen < 300000);
            const statusColor = isReallyOnline ? '#10B981' : 'var(--text-muted)';
            const statusText = isReallyOnline ? 'Online' : 'Offline';
            const avatarUrl = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=F4B41A&color=fff`;

            // Puxa o selo e a borda se existirem
            const badgeHTML = typeof window.getBadgeHTML === 'function' ? window.getBadgeHTML(u.badge).replace('1.15em', '1em') : '';
            const userBorder = u.profileBorder || 'moldura-padrao';

            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border-color); border-radius: 12px; background: var(--card-bg);">
                    
                    <div style="position: relative; display: flex; justify-content: center; align-items: center;">
                        <img src="${avatarUrl}" class="${userBorder}" style="width: 45px; height: 45px; min-width: 45px; border-radius: 50%; object-fit: cover; border: none;">
                    </div>
                    
                    <div style="flex-grow: 1; overflow: hidden;">
                        <div style="display: flex; align-items: center; gap: 4px; font-weight: bold; color: var(--text-main); font-size: 0.95rem; white-space: nowrap;">
                            <span style="overflow: hidden; text-overflow: ellipsis;">${window.escapeHTML(u.name)}</span> ${badgeHTML}
                        </div>
                        <div style="color: var(--text-muted); font-size: 0.8rem;">@${u.username}</div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: center; min-width: 60px;">
                        <div style="display: flex; align-items: center; gap: 4px; font-size: 0.85rem; color: ${statusColor}; font-weight: bold;">
                            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; box-shadow: ${isReallyOnline ? '0 0 5px #10B981' : 'none'};"></span>
                            ${statusText}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
});