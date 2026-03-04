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
        // Pega o que foi digitado e arranca o "@" caso você tenha colocado sem querer
        const query = searchInput.value.trim().toLowerCase().replace('@', '');
        if (!query) return;

        searchBtn.textContent = "...";
        try {
            const user = await window.AuthService.getUserData(query);
            
            if (!user) {
                // Usando alert nativo para garantir que a mensagem apareça
                alert("Usuário não encontrado. Verifique se o @ está correto.");
                resultArea.style.display = 'none';
                return;
            }

            // Preenche o card do usuário
            currentUserBeingEdited = user.username;
            document.getElementById('admin-user-avatar').src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=F4B41A&color=fff`;
            
            // Renderiza o nome já com o selo atual (se ele tiver)
            // Se a função do selo não carregou, ele previne o erro e deixa em branco
            const badgeHTML = typeof window.getBadgeHTML === 'function' ? window.getBadgeHTML(user.badge) : '';
            
            document.getElementById('admin-user-name').innerHTML = `${window.escapeHTML(user.name)} ${badgeHTML}`;
            document.getElementById('admin-user-handle').textContent = `@${user.username}`;
            
            // Marca a caixa seletora com o selo que ele já tem
            badgeSelect.value = user.badge || 'none';
            
            resultArea.style.display = 'block';

        } catch (error) {
            console.error("Erro no Admin:", error);
            alert("Erro ao buscar usuário. Abra o console (F12) para ver os detalhes.");
        } finally {
            searchBtn.textContent = "Buscar";
        }
    });

    // 3. Salva o novo selo no banco de dados
    saveBtn.addEventListener('click', async () => {
        if (!currentUserBeingEdited) return;

        const selectedBadge = badgeSelect.value;
        saveBtn.textContent = "Salvando...";

        try {
            await window.AuthService.updateUserBadge(currentUserBeingEdited, selectedBadge);
            window.showToast("Selo atualizado com sucesso! 🐆", "success");
            
            // Esconde a área para buscar o próximo
            setTimeout(() => {
                resultArea.style.display = 'none';
                searchInput.value = '';
            }, 1000);
            
        } catch (error) {
            window.showToast("Erro ao salvar selo.", "error");
        } finally {
            saveBtn.textContent = "Salvar Alterações";
        }
    });
});