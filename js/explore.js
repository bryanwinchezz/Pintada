// ==========================================
// js/explore.js - SUGESTÕES COM SCROLL INFINITO
// ==========================================

window.renderSuggestedUsers = async function (loadMore = false) {
    const activeUsername = window.AuthService.getCurrentUser();
    const suggestedArea = document.getElementById('suggested-users-area');

    if (!activeUsername || !suggestedArea) return;

    try {
        if (!loadMore) {
            suggestedArea.innerHTML = '<p style="text-align:center; grid-column: 1 / -1; color: var(--text-muted);">A procurar novos perfis... 🐆</p>';
        } else {
            const loaderId = 'loading-more-users';
            if (!document.getElementById(loaderId)) {
                suggestedArea.insertAdjacentHTML('beforeend', `<p id="${loaderId}" style="text-align:center; grid-column: 1 / -1; padding: 20px; color: var(--text-muted);">A carregar mais sugestões... 🐆</p>`);
            }
        }

        const currentUser = await window.AuthService.getUserData(activeUsername);

        // Busca os utilizadores usando o nosso novo motor!
        const recentUsers = await window.AuthService.getExploreUsers(loadMore);

        document.getElementById('loading-more-users')?.remove();

        if (!currentUser || !recentUsers) return;

        const myFollowing = currentUser.followingList || [];

        // Filtra quem você já segue e você mesmo
        let suggested = recentUsers.filter(u =>
            u.username !== currentUser.username &&
            !myFollowing.includes(u.username)
        );

        if (suggested.length === 0 && !loadMore) {
            suggestedArea.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">Não há novas sugestões no momento! 🐆</p>';
            return;
        } else if (suggested.length === 0 && loadMore) {
            if (!document.getElementById('no-more-users')) {
                suggestedArea.insertAdjacentHTML('beforeend', `<p id="no-more-users" style="text-align:center; grid-column: 1 / -1; padding: 20px; color: var(--text-muted);">Chegou ao fim das sugestões!</p>`);
            }
            return;
        }

        const html = suggested.map(u => {
            const avatar = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=F4B41A&color=fff`;
            const badgeHTML = typeof window.getBadgeHTML === 'function' ? window.getBadgeHTML(u.badge) : '';

            return `
            <div class="suggested-card" style="display: flex; flex-direction: column; align-items: center; padding: 16px; border: 1px solid var(--border-color); border-radius: 12px; background: var(--card-bg); text-align: center; transition: 0.2s;">
                <a href="profile.html?user=${u.username}" style="text-decoration: none;">
                    <img src="${avatar}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin-bottom: 8px; border: 2px solid var(--border-color);">
                </a>
                <a href="profile.html?user=${u.username}" style="text-decoration: none; color: var(--text-main); font-weight: bold; font-size: 1.05rem; display: flex; align-items: center; justify-content: center;">
                    ${window.escapeHTML(u.name)} ${badgeHTML}
                </a>
                <span style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px;">@${u.username}</span>
                <button class="btn-outline follow-btn" data-target-user="${u.username}" style="width: 100%;">Seguir</button>
            </div>`;
        }).join('');

        if (!loadMore) {
            suggestedArea.innerHTML = html;
        } else {
            suggestedArea.insertAdjacentHTML('beforeend', html);
        }

    } catch (error) {
        console.error("Erro ao carregar sugestões:", error);
        if (!loadMore) suggestedArea.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">Erro ao carregar sugestões.</p>';
    } finally {
        setTimeout(() => window.isFetchingMoreUsers = false, 1000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.renderSuggestedUsers();
});

// ==========================================
// SENSOR DE SCROLL INFINITO PARA A ABA EXPLORAR
// ==========================================
window.addEventListener('scroll', async () => {
    const exploreArea = document.getElementById('suggested-users-area');

    // Verifica se a aba explorar está visível na tela
    if (!exploreArea || exploreArea.offsetParent === null) return;

    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
        if (window.isFetchingMoreUsers) return;
        window.isFetchingMoreUsers = true;

        await window.renderSuggestedUsers(true);
    }
});