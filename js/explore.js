// ==========================================
// js/explore.js - SUGESTÕES DE USUÁRIOS (FIREBASE)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    // Transformamos numa função global assíncrona
    window.renderSuggestedUsers = async function() {
        const activeUsername = AuthService.getCurrentUser();
        const suggestedArea = document.getElementById('suggested-users-area');

        if (!activeUsername || !suggestedArea) return;

        try {
            // 1. Busca os dados do usuário logado e de todos os usuários na nuvem
            const currentUser = await AuthService.getUserData(activeUsername);
            const allUsers = await AuthService.getUsers();

            if (!currentUser || !allUsers) return;

            const myFollowing = currentUser.followingList || [];

            // 2. Filtra: Tira você mesmo E tira quem você já segue
            let suggested = allUsers.filter(u => u.username !== currentUser.username && !myFollowing.includes(u.username));

            // 3. Pega no máximo 4 sugestões aleatórias
            suggested = suggested.sort(() => 0.5 - Math.random()).slice(0, 4);

            if (suggested.length === 0) {
                suggestedArea.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">Você já segue todas as pessoas da rede! 🐆</p>';
                return;
            }

            suggestedArea.innerHTML = suggested.map(u => {
                const avatar = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=F4B41A&color=fff`;
                return `
                <div style="display: flex; flex-direction: column; align-items: center; padding: 16px; border: 1px solid var(--border-color); border-radius: 12px; background: var(--card-bg); text-align: center; transition: 0.2s;" onmouseover="this.style.borderColor='#D97A00'" onmouseout="this.style.borderColor='var(--border-color)'">
                    <a href="profile.html?user=${u.username}" style="text-decoration: none;">
                        <img src="${avatar}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin-bottom: 8px; border: 2px solid var(--border-color);">
                    </a>
                    <a href="profile.html?user=${u.username}" style="text-decoration: none; color: var(--text-main); font-weight: bold; font-size: 1.05rem;">${u.name}</a>
                    <span style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px;">@${u.username}</span>
                    <button class="btn-outline follow-btn" data-target-user="${u.username}" style="width: 100%;">Seguir</button>
                </div>`;
            }).join('');
        } catch (error) {
            console.error("Erro ao carregar sugestões:", error);
        }
    };

    window.renderSuggestedUsers();
});