// ==========================================
// js/messages.js - LÓGICA DO CHAT (DINÂMICO)
// ==========================================

// Envolvemos tudo dentro do evento de carregamento para proteger as variáveis (Scoping)
document.addEventListener('DOMContentLoaded', () => {

    // Mudamos o nome para 'chatUser' para não dar conflito com o 'currentUser' do ui.js
    const chatUser = AuthService.getCurrentUser();
    if (!chatUser) {
        window.location.href = 'auth.html';
        return;
    }

    const CHAT_STORAGE_KEY = `pintada_chats_${chatUser.username}`;
    let chats = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || [];
    let activeContactId = null;

    // Se for a primeira vez, adiciona a conta oficial da Pintada pra não ficar vazio
    if (chats.length === 0) {
        chats.push({
            id: 'admin_pintada',
            name: 'Equipe Pintada',
            avatar: 'https://ui-avatars.com/api/?name=Pintada&background=F4B41A&color=fff',
            history: [
                { type: 'received', text: `Olá ${chatUser.name}! Bem-vindo(a) à Pintada. Pode testar o chat comigo! 🐆`, time: 'Agora' }
            ],
            lastSeen: 'Online agora',
            isOnline: true
        });
        saveChats();
    }

    function saveChats() {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
    }

    // LÊ A URL: Verifica se viemos do botão "Mensagem" no Perfil
    const urlParams = new URLSearchParams(window.location.search);
    const chatWith = urlParams.get('chat');

    if (chatWith && chatWith !== chatUser.username) {
        let existingChat = chats.find(c => c.id === chatWith);

        if (!existingChat) {
            const allUsers = AuthService.getUsers();
            const targetUser = allUsers.find(u => u.username === chatWith);

            const targetName = targetUser ? targetUser.name : chatWith;
            const targetAvatar = targetUser ? (targetUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=8B5CF6&color=fff`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=8B5CF6&color=fff`;

            const isOnline = Math.random() > 0.4;
            const randomHour = Math.floor(Math.random() * 23).toString().padStart(2, '0');
            const randomMin = Math.floor(Math.random() * 59).toString().padStart(2, '0');
            const lastSeen = isOnline ? 'Online agora' : `Visto por último hoje às ${randomHour}:${randomMin}`;

            chats.unshift({
                id: chatWith,
                name: targetName,
                avatar: targetAvatar,
                history: [],
                lastSeen: lastSeen,
                isOnline: isOnline
            });
            saveChats();
        }
        activeContactId = chatWith;
    } else {
        activeContactId = chats[0].id;
    }

    function renderContacts() {
        const list = document.getElementById('contacts-list-render');
        if (!list) return;

        list.innerHTML = chats.map(contact => {
            const lastMsg = contact.history.length > 0 ? contact.history[contact.history.length - 1] : { type: '', text: 'Diga oi...' };
            const isActive = contact.id === activeContactId ? 'active' : '';

            return `
                <div class="contact-item ${isActive}" data-id="${contact.id}">
                    <img src="${contact.avatar}" alt="${contact.name}" class="contact-avatar">
                    <div class="contact-info">
                        <span class="contact-name">${contact.name}</span>
                        <span class="contact-preview" style="color: ${lastMsg.text === 'Diga oi...' ? 'var(--brand-color)' : 'var(--text-muted)'}">${lastMsg.type === 'sent' ? 'Você: ' : ''}${lastMsg.text}</span>
                    </div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', () => {
                activeContactId = item.getAttribute('data-id');
                window.history.replaceState({}, document.title, window.location.pathname);
                renderContacts();
                renderChat();
            });
        });
    }

    function renderChat() {
        const chatHistory = document.getElementById('chat-history-render');
        const contact = chats.find(c => c.id === activeContactId);
        if (!chatHistory || !contact) return;

        document.getElementById('chat-contact-name').textContent = contact.name;
        document.querySelector('.chat-header-avatar').src = contact.avatar;

        const statusEl = document.getElementById('chat-contact-status');
        statusEl.textContent = contact.lastSeen;
        statusEl.style.color = contact.isOnline ? '#10B981' : 'var(--text-muted)';

        if (contact.history.length === 0) {
            chatHistory.innerHTML = `<div style="text-align: center; color: var(--text-muted); margin-top: 50px;">Comece a conversar com ${contact.name}!</div>`;
        } else {
            // Usa o escapeHTML que vem do services.js
            chatHistory.innerHTML = contact.history.map(msg => `
                <div class="chat-bubble ${msg.type}">
                    ${escapeHTML(msg.text)}
                    <span class="chat-time">${msg.time}</span>
                </div>
            `).join('');
        }

        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Substitua a função sendMessage no messages.js
    async function sendMessage() {
        const inputox = document.getElementById('chat-input-box');
        const text = inputox.value.trim();
        const activeUsername = AuthService.getCurrentUser(); // Pega o logado

        if (!text || !activeContactId) return;

        try {
            // Salva a mensagem no Firebase em uma coleção 'direct_messages'
            await addDoc(collection(window.db, "messages"), {
                sender: activeUsername,
                receiver: activeContactId,
                text: text,
                timestamp: Date.now()
            });
            inputox.value = '';
        } catch (e) {
            showToast("Erro ao enviar mensagem", "error");
        }
    }

    // Renderiza a tela pela primeira vez
    renderContacts();
    renderChat();

    // Conecta os botões
    const sendBtn = document.getElementById('send-msg-btn');
    const inputox = document.getElementById('chat-input-box');

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (inputox) {
        inputox.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});