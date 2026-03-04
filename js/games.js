// ==========================================
// js/games.js - ABA DE JOGOS E MODAL
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Array simulando o seu banco de jogos (Pode até vir do Firebase depois!)
    const gamesList = [
        {
            title: "Paranordle",
            thumb: "https://paranordle.com.br/icon.png?icon.be9a7220.png",
            // Aqui vai o link que você pegou do 'src' no botão Embed da CrazyGames:
            embedUrl: "https://paranordle.com.br/modos"
        },
        {
            title: "Marveldle",
            thumb: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/003190fe-69ae-4c44-a103-4af411c991ca/ddh31xj-d2ac43af-8cec-4e21-9a8e-cdcf1fb53ba1.png/v1/fill/w_400,h_420/marvel_m_icon_by_ljest2004_ddh31xj-fullview.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9NDIwIiwicGF0aCI6Ii9mLzAwMzE5MGZlLTY5YWUtNGM0NC1hMTAzLTRhZjQxMWM5OTFjYS9kZGgzMXhqLWQyYWM0M2FmLThjZWMtNGUyMS05YThlLWNkY2YxZmI1M2JhMS5wbmciLCJ3aWR0aCI6Ijw9NDAwIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmltYWdlLm9wZXJhdGlvbnMiXX0.nlNZSzUi6JBbRn_2AbSRyIdteA7MRwq--1-y2B2MMzY",
            embedUrl: "https://marveldle.com"
        },
        {
            title: "Termo",
            thumb: "https://play-lh.googleusercontent.com/HMqznNZmnuR2wmipfZUaPcqrZnkWT9xOoV7QepkuMM5F7NiMviYzqmC-IWlzwFbUew",
            embedUrl: "https://term.ooo"
        },
        {
            title: "Master Chess",
            thumb: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=300&q=80", // Coloquei uma foto bonita de xadrez aqui!
            embedUrl: "https://www.crazygames.com/embed/master-chess"
        },
        {
            title: "Desafios Diários",
            thumb: "https://desafiosdiarios.net/template/images/desafios_diarios_big.jpg",
            embedUrl: "https://desafiosdiarios.com"
        },
        {
            title: "Level Devil",
            thumb: "https://play-lh.googleusercontent.com/VqY_7ZNxG91KHaZguRP3khXdlTR1yQr45RCoiNu6MO41UhN-jlN31YWTQImWFRTw5r0",
            embedUrl: "https://gamecollections.me/game/owner/level-devil-2/"
        }
    ];

    const gamesArea = document.getElementById('games-render-area');

    // 1. Renderizar os cards de jogos
    if (gamesArea) {
        gamesArea.innerHTML = gamesList.map(game => `
            <div class="game-card" onclick="window.openGameModal('${game.embedUrl}', '${game.title}')" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05);" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="height: 150px; width: 100%; background: url('${game.thumb}') center/cover;"></div>
                <div style="padding: 12px; text-align: center;">
                    <h4 style="color: var(--text-main); margin: 0; font-size: 1rem;">${window.escapeHTML(game.title)}</h4>
                    <span style="color: var(--brand-color); font-size: 0.85rem; font-weight: bold;">Jogar agora 🎮</span>
                </div>
            </div>
        `).join('');

        // Aplica um grid dinâmico à área dos jogos
        gamesArea.style.display = 'grid';
        gamesArea.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        gamesArea.style.gap = '15px';
    }
});

// 2. Mágica do Popup (Modal) para jogar sem sair do site
window.openGameModal = function (gameUrl, gameTitle) {
    let modal = document.getElementById('game-embed-modal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'game-embed-modal';

        // Estilo ecrã inteiro escurecido
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.95); z-index: 99999;
            display: flex; align-items: center; justify-content: center; flex-direction: column;
            opacity: 0; transition: opacity 0.3s ease;
        `;

        modal.innerHTML = `
            <div style="width: 100%; max-width: 1000px; display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; box-sizing: border-box;">
                <h3 id="modal-game-title" style="color: white; margin: 0; font-size: 1.2rem;">Jogando...</h3>
                <span class="material-symbols-outlined" id="close-game-modal" style="color:white; font-size:35px; cursor:pointer; background:rgba(255,255,255,0.1); border-radius:50%; padding:4px; transition: 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.8)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">close</span>
            </div>
            <div style="width: 90vw; max-width: 1000px; height: 80vh; background: #000; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.8); position: relative;">
                <iframe id="modal-game-iframe" src="" style="width: 100%; height: 100%; border: none;"></iframe>
            </div>
        `;
        document.body.appendChild(modal);

        // Lógica para fechar (MUITO IMPORTANTE: Limpar o src para calar o áudio do jogo!)
        document.getElementById('close-game-modal').onclick = () => {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                document.getElementById('modal-game-iframe').src = ''; // Corta o jogo/áudio
            }, 300);
        };
    }

    // Atualiza título e URL
    document.getElementById('modal-game-title').textContent = gameTitle;
    document.getElementById('modal-game-iframe').src = gameUrl;

    // Animação de entrada
    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);
};