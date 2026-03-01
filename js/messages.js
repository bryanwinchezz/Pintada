// ==========================================
// js/messages.js - CHAT REAL NO FIREBASE
// ==========================================

document.addEventListener('DOMContentLoaded', async() => {
            const chatUser = window.AuthService.getCurrentUser();
            if (!chatUser) { window.location.href = 'auth.html'; return; }

            let activeContactId = new URLSearchParams(window.location.search).get('chat');
            const chatHistoryContainer = document.getElementById('chat-history-render');
            const contactListContainer = document.getElementById('contacts-list-render');

            // 1. Busca os dados de todo mundo para listar os contatos
            const currentUserData = await window.AuthService.getUserData(chatUser);
            const allUsers = await window.AuthService.getUsers();

            // Mostra as pessoas que você segue E a pessoa que você clicou em "Mensagem"
            let contactUsernames = new Set(currentUserData.followingList || []);
            if (activeContactId) contactUsernames.add(activeContactId);

            let contacts = allUsers.filter(u => contactUsernames.has(u.username) && u.username !== chatUser);

            if (contacts.length === 0 && !activeContactId) {
                contactListContainer.innerHTML = "<p style='padding:20px; color:var(--text-muted); text-align: center;'>Siga alguém ou abra um perfil para conversar!</p>";
                chatHistoryContainer.innerHTML = "";
                return;
            }

            if (!activeContactId && contacts.length > 0) activeContactId = contacts[0].username;

            // 2. Renderiza a barra lateral de contatos
            const renderContacts = () => {
                    contactListContainer.innerHTML = contacts.map(c => `
            <div class="contact-item ${c.username === activeContactId ? 'active' : ''}" data-id="${c.username}" style="cursor: pointer;">
                <img src="${c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=F4B41A&color=fff`}" class="contact-avatar">
                <div class="contact-info">
                    <span class="contact-name" style="font-weight: bold;">${c.name}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">@${c.username}</span>
                </div>
            </div>
        `).join('');
        
        contactListContainer.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', () => {
                activeContactId = item.getAttribute('data-id');
                renderContacts();
                loadChat();
            });
        });
    };

    // 3. Carrega o histórico de mensagens direto do Firebase
    const loadChat = async () => {
        const target = contacts.find(c => c.username === activeContactId);
        if (!target) return;
        
        const contactNameEl = document.getElementById('chat-contact-name');
        if(contactNameEl) contactNameEl.textContent = target.name;
        
        const headerAvatar = document.querySelector('.chat-header-avatar');
        if(headerAvatar) headerAvatar.src = target.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(target.name)}&background=F4B41A&color=fff`;
        
        // Evita piscar "Carregando" na tela toda vez se o chat já estiver aberto
        if (chatHistoryContainer.innerHTML === "") {
            chatHistoryContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">Carregando mensagens...</div>`;
        }
        
        const msgs = await window.MessageService.getMessages(chatUser, activeContactId);
        
        if (msgs.length === 0) {
            chatHistoryContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">Mande o primeiro "Oi" para ${target.name}! 🐆</div>`;
        } else {
            const isAtBottom = chatHistoryContainer.scrollHeight - chatHistoryContainer.scrollTop <= chatHistoryContainer.clientHeight + 100;
            
            chatHistoryContainer.innerHTML = msgs.map(m => `
                <div class="chat-bubble ${m.sender === chatUser ? 'sent' : 'received'}">
                    ${window.escapeHTML(m.text)}
                </div>
            `).join('');

            // Só rola para baixo automaticamente se a pessoa já estiver lá embaixo lendo
            if(isAtBottom) chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
        }
    };

    // 4. Envia mensagem para o Firebase
    async function sendMessage() {
        const inputox = document.getElementById('chat-input-box');
        const text = inputox.value.trim();
        if (!text || !activeContactId) return;

        inputox.value = '';
        
        // Adiciona bolha provisória na tela para não parecer lento
        chatHistoryContainer.innerHTML += `<div class="chat-bubble sent" style="opacity: 0.6;">${window.escapeHTML(text)}</div>`;
        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;

        await window.MessageService.sendMessage(chatUser, activeContactId, text);
        await loadChat(); // Sincroniza o chat real
    }

    renderContacts();
    if(activeContactId) await loadChat();

    // Eventos de clique e tecla Enter
    document.getElementById('send-msg-btn')?.addEventListener('click', sendMessage);
    document.getElementById('chat-input-box')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });
    
    // "Gambiarra" inteligente: Recarrega o chat a cada 5 segundos para verificar novas mensagens
    setInterval(() => {
        if(activeContactId) loadChat();
    }, 5000);
});