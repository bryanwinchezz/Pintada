// ==========================================
// js/explore.js - SUGESTÕES DE USUÁRIOS (FIREBASE)
// ==========================================

// 1. Declaramos a função do lado de fora para existir no mundo todo (Global)
window.renderSuggestedUsers = async function () {
    const activeUsername = window.AuthService.getCurrentUser();
    const suggestedArea = document.getElementById('suggested-users-area');

    if (!activeUsername || !suggestedArea) return;

    try {
        const currentUser = await window.AuthService.getUserData(activeUsername);
        const allUsers = await window.AuthService.getUsers();

        if (!currentUser || !allUsers) return;

        const myFollowing = currentUser.followingList || [];

        let suggested = allUsers.filter(u => u.username !== currentUser.username && !myFollowing.includes(u.username));
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
                <a href="profile.html?user=${u.username}" style="text-decoration: none; color: var(--text-main); font-weight: bold; font-size: 1.05rem; display: flex; align-items: center; justify-content: center;">
                    ${window.escapeHTML(u.name)} ${window.getBadgeHTML(u.badge)}
                </a>
                <span style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px;">@${u.username}</span>
                <button class="btn-outline follow-btn" data-target-user="${u.username}" style="width: 100%;">Seguir</button>
            </div>`;
        }).join('');
    } catch (error) {
        console.error("Erro ao carregar sugestões:", error);
    }
};

// 2. Quando a tela carregar, a gente chama a função
document.addEventListener('DOMContentLoaded', () => {
    window.renderSuggestedUsers();
});