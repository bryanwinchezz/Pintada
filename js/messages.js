// ==========================================
// js/messages.js - LÓGICA DO CHAT
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const chatUser = AuthService.getCurrentUser();
    if (!chatUser) { window.location.href = 'auth.html'; return; }

    const CHAT_STORAGE_KEY = `pintada_chats_${chatUser}`;
    let chats = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || [];
    let activeContactId = null;

    if (chats.length === 0) {
        chats.push({
            id: 'admin_pintada',
            name: 'Equipe Pintada',
            avatar: 'https://ui-avatars.com/api/?name=Pintada&background=F4B41A&color=fff',
            history: [{ type: 'received', text: `Olá! Bem-vindo(a) à Pintada. Pode testar o chat comigo! 🐆`, time: 'Agora' }],
            lastSeen: 'Online agora',
            isOnline: true
        });
        saveChats();
    }

    function saveChats() { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats)); }

    const urlParams = new URLSearchParams(window.location.search);
    const chatWith = urlParams.get('chat');

    if (chatWith && chatWith !== chatUser) {
        let existingChat = chats.find(c => c.id === chatWith);
        if (!existingChat) {
            chats.unshift({
                id: chatWith,
                name: chatWith,
                avatar: `https://ui-avatars.com/api/?name=${chatWith}&background=8B5CF6&color=fff`,
                history: [],
                lastSeen: 'Online agora',
                isOnline: true
            });
            saveChats();
        }
        activeContactId = chatWith;
    } else { activeContactId = chats[0].id; }

    function renderContacts() {
        const list = document.getElementById('contacts-list-render');
        if (!list) return;
        list.innerHTML = chats.map(contact => {
            const lastMsg = contact.history.length > 0 ? contact.history[contact.history.length - 1] : { type: '', text: 'Diga oi...' };
            const isActive = contact.id === activeContactId ? 'active' : '';
            return `<div class="contact-item ${isActive}" data-id="${contact.id}"><img src="${contact.avatar}" class="contact-avatar"><div class="contact-info"><span class="contact-name">${contact.name}</span><span class="contact-preview">${lastMsg.type === 'sent' ? 'Você: ' : ''}${lastMsg.text}</span></div></div>`;
        }).join('');

        list.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', () => {
                activeContactId = item.getAttribute('data-id');
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
        document.getElementById('chat-contact-status').textContent = contact.lastSeen;

        if (contact.history.length === 0) chatHistory.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:50px;">Comece a conversar com ${contact.name}!</div>`;
        else chatHistory.innerHTML = contact.history.map(msg => `<div class="chat-bubble ${msg.type}">${window.escapeHTML(msg.text)}<span class="chat-time">${msg.time}</span></div>`).join('');
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    async function sendMessage() {
        const inputox = document.getElementById('chat-input-box');
        const text = inputox.value.trim();

        if (!text || !activeContactId) return;

        try {
            // 1. Atualiza visualmente na tela na mesma hora
            const contact = chats.find(c => c.id === activeContactId);
            if (contact) {
                contact.history.push({ type: 'sent', text: text, time: "Agora" });
                saveChats();
                renderContacts();
                renderChat();
            }
            inputox.value = '';

            // 2. Salva na nuvem silenciosamente
            if (window.MessageService) await window.MessageService.sendMessage(chatUser, activeContactId, text);
        } catch (e) { showToast("Erro ao enviar mensagem", "error"); }
    }

    renderContacts();
    renderChat();

    const sendBtn = document.getElementById('send-msg-btn');
    const inputox = document.getElementById('chat-input-box');
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (inputox) {
        inputox.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault();
                sendMessage(); }
        });
    }
});