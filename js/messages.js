// ==========================================
// js/messages.js - CHAT REAL-TIME E EXCLUSÃO
// ==========================================
document.addEventListener('DOMContentLoaded', async() => {
            const chatUser = window.AuthService.getCurrentUser();
            if (!chatUser) { window.location.href = 'auth.html'; return; }

            let activeContactId = new URLSearchParams(window.location.search).get('chat');
            const chatHistoryContainer = document.getElementById('chat-history-render');
            const contactListContainer = document.getElementById('contacts-list-render');

            let isDeleteMode = false;
            let selectedChatsToDelete = new Set();
            let currentUnsubscribe = null;

            const currentUserData = await window.AuthService.getUserData(chatUser);
            const allUsers = await window.AuthService.getUsers();

            let contactUsernames = new Set(currentUserData.followingList || []);
            if (activeContactId) contactUsernames.add(activeContactId);
            let contacts = allUsers.filter(u => contactUsernames.has(u.username) && u.username !== chatUser);

            if (contacts.length === 0 && !activeContactId) {
                if (contactListContainer) contactListContainer.innerHTML = "<p style='padding:20px; color:var(--text-muted); text-align: center;'>Siga alguém ou abra um perfil para conversar!</p>";
                if (chatHistoryContainer) chatHistoryContainer.innerHTML = "";
                return;
            }
            if (!activeContactId && contacts.length > 0) activeContactId = contacts[0].username;

            // 1 e 2. MODO EXCLUIR CHATS (Reescrito no formato clássico sem o símbolo '?')
            const btnEditChats = document.getElementById('edit-chats-btn');
            if (btnEditChats) {
                btnEditChats.addEventListener('click', () => {
                    isDeleteMode = !isDeleteMode;
                    selectedChatsToDelete.clear();
                    const delBtn = document.getElementById('confirm-delete-chats-btn');
                    if (delBtn) delBtn.style.display = isDeleteMode ? 'block' : 'none';
                    renderContacts();
                });
            }

            const btnConfirmDelete = document.getElementById('confirm-delete-chats-btn');
            if (btnConfirmDelete) {
                btnConfirmDelete.addEventListener('click', async() => {
                    if (selectedChatsToDelete.size === 0) return showToast("Nenhum chat selecionado.", "error");
                    if (confirm(`Apagar ${selectedChatsToDelete.size} conversa(s) permanentemente?`)) {
                        for (let targetUser of selectedChatsToDelete) {
                            await window.MessageService.deleteChat(chatUser, targetUser);
                        }
                        showToast("Conversas apagadas com sucesso!");
                        isDeleteMode = false;
                        const delBtn = document.getElementById('confirm-delete-chats-btn');
                        if (delBtn) delBtn.style.display = 'none';
                        if (selectedChatsToDelete.has(activeContactId) && chatHistoryContainer) {
                            chatHistoryContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">Chat excluído.</div>`;
                        }
                        renderContacts();
                    }
                });
            }

            const renderContacts = () => {
                    if (!contactListContainer) return;
                    contactListContainer.innerHTML = contacts.map(c => {
                                const checkboxHTML = isDeleteMode ? `<input type="checkbox" style="width:18px; height:18px; margin-right:10px;" class="delete-chat-cb" data-id="${c.username}" ${selectedChatsToDelete.has(c.username) ? 'checked' : ''}>` : '';
                                return `
            <div class="contact-item ${c.username === activeContactId && !isDeleteMode ? 'active' : ''}" data-id="${c.username}" style="cursor: pointer; display: flex; align-items: center;">
                ${checkboxHTML}
                <img src="${c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=F4B41A&color=fff`}" class="contact-avatar">
                <div class="contact-info">
                    <span class="contact-name" style="font-weight: bold;">${c.name}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">@${c.username}</span>
                </div>
            </div>`;
        }).join('');
        
        contactListContainer.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const id = item.getAttribute('data-id');
                if (isDeleteMode) {
                    const cb = item.querySelector('.delete-chat-cb');
                    if (e.target !== cb) cb.checked = !cb.checked;
                    if (cb.checked) selectedChatsToDelete.add(id);
                    else selectedChatsToDelete.delete(id);
                } else {
                    activeContactId = id;
                    renderContacts();
                    loadChatRealTime();
                }
            });
        });
    };

    // CHAT AO VIVO
    const loadChatRealTime = () => {
        const target = contacts.find(c => c.username === activeContactId);
        if (!target || !chatHistoryContainer) return;
        
        const contactNameEl = document.getElementById('chat-contact-name');
        if (contactNameEl) contactNameEl.textContent = target.name;
        
        const headerAvatar = document.querySelector('.chat-header-avatar');
        if (headerAvatar) headerAvatar.src = target.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(target.name)}&background=F4B41A&color=fff`;
        
        if (currentUnsubscribe) currentUnsubscribe(); 
        
        currentUnsubscribe = window.MessageService.listenToMessages(chatUser, activeContactId, (msgs) => {
            if (msgs.length === 0) {
                chatHistoryContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">Mande o primeiro "Oi" para ${target.name}! 🐆</div>`;
            } else {
                const isAtBottom = chatHistoryContainer.scrollHeight - chatHistoryContainer.scrollTop <= chatHistoryContainer.clientHeight + 100;
                chatHistoryContainer.innerHTML = msgs.map(m => `
                    <div class="chat-bubble ${m.sender === chatUser ? 'sent' : 'received'}">
                        ${window.escapeHTML(m.text)}
                    </div>`).join('');
                
                if(isAtBottom || (msgs.length > 0 && msgs[msgs.length-1].sender === chatUser)) {
                    chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
                }
            }
        });
    };

    async function sendMessage() {
        if(isDeleteMode) return showToast("Saia do modo de exclusão para enviar mensagens", "error");
        
        const inputox = document.getElementById('chat-input-box');
        if (!inputox) return;
        
        const text = inputox.value.trim();
        if (!text || !activeContactId) return;

        inputox.value = '';
        await window.MessageService.sendMessage(chatUser, activeContactId, text);
    }

    renderContacts();
    if(activeContactId) loadChatRealTime();

    // 3 e 4. Conecta os botões (Reescrito no formato clássico sem o símbolo '?')
    const btnSendMsg = document.getElementById('send-msg-btn');
    if (btnSendMsg) {
        btnSendMsg.addEventListener('click', sendMessage);
    }

    const inputChatBox = document.getElementById('chat-input-box');
    if (inputChatBox) {
        inputChatBox.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
        });
    }
});