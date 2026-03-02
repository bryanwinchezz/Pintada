// ==========================================
// js/messages.js - CHAT REAL-TIME E MEMÓRIA DE CONTATOS
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
            let currentStatusUnsubscribe = null;

            // 1. RECUPERA A MEMÓRIA DOS CHATS OCULTOS E RECENTES
            let hiddenChats = JSON.parse(localStorage.getItem(`pintada_hidden_chats_${chatUser}`)) || [];
            let recentChats = JSON.parse(localStorage.getItem(`pintada_recent_chats_${chatUser}`)) || [];

            // 2. SE ABRIU UM CHAT NOVO, SALVA NA MEMÓRIA PARA SEMPRE
            if (activeContactId) {
                if (!recentChats.includes(activeContactId)) {
                    recentChats.push(activeContactId);
                    localStorage.setItem(`pintada_recent_chats_${chatUser}`, JSON.stringify(recentChats));
                }
                // Se estava oculto, volta a aparecer
                if (hiddenChats.includes(activeContactId)) {
                    hiddenChats = hiddenChats.filter(id => id !== activeContactId);
                    localStorage.setItem(`pintada_hidden_chats_${chatUser}`, JSON.stringify(hiddenChats));
                }
            }

            const currentUserData = await window.AuthService.getUserData(chatUser);
            const allUsers = await window.AuthService.getUsers();

            // 3. JUNTA QUEM VOCÊ SEGUE COM TODOS OS SEUS CHATS RECENTES (Acumula!)
            let contactUsernames = new Set([...(currentUserData.followingList || []), ...recentChats]);

            // 4. FILTRA E PREPARA A LISTA DA BARRA LATERAL
            let contacts = allUsers.filter(u =>
                contactUsernames.has(u.username) &&
                u.username !== chatUser &&
                !hiddenChats.includes(u.username)
            );

            if (contacts.length === 0 && !activeContactId) {
                if (contactListContainer) contactListContainer.innerHTML = "<p style='padding:20px; color:var(--text-muted); text-align: center; font-size: 0.9rem;'>Siga alguém ou pesquise perfis para conversar!</p>";
                if (chatHistoryContainer) chatHistoryContainer.innerHTML = "";
                document.querySelectorAll('.skeleton').forEach(el => el.classList.remove('skeleton'));
                return;
            }

            // Se não tiver ninguém selecionado, seleciona o primeiro da lista
            if (!activeContactId && contacts.length > 0) activeContactId = contacts[0].username;

            // ==========================================
            // BOTÕES DE APAGAR (OCULTAR)
            // ==========================================
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
                    if (confirm(`Ocultar ${selectedChatsToDelete.size} conversa(s) da sua lista? (As mensagens não serão apagadas do banco de dados)`)) {

                        for (let targetUser of selectedChatsToDelete) {
                            if (!hiddenChats.includes(targetUser)) hiddenChats.push(targetUser);
                        }
                        localStorage.setItem(`pintada_hidden_chats_${chatUser}`, JSON.stringify(hiddenChats));

                        showToast("Conversas ocultadas da lista!");
                        isDeleteMode = false;
                        if (btnConfirmDelete) btnConfirmDelete.style.display = 'none';

                        if (selectedChatsToDelete.has(activeContactId)) {
                            if (chatHistoryContainer) chatHistoryContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">Chat ocultado.</div>`;
                            activeContactId = null;
                            const nameEl = document.getElementById('chat-contact-name');
                            if (nameEl) nameEl.textContent = "Selecione um chat";
                        }

                        contacts = allUsers.filter(u => contactUsernames.has(u.username) && u.username !== chatUser && !hiddenChats.includes(u.username));
                        if (contacts.length > 0 && !activeContactId) activeContactId = contacts[0].username;

                        renderContacts();
                        if (activeContactId) loadChatRealTime();
                    }
                });
            }

            // ==========================================
            // RENDERIZAR OS CONTATOS NA TELA
            // ==========================================
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
                    // Atualiza a barra de endereço para não dar bug se atualizar a página
                    window.history.pushState({}, '', `messages.html?chat=${id}`);
                    activeContactId = id;
                    
                    // Garante que, ao clicar, a pessoa vai direto para a memória!
                    if (!recentChats.includes(id)) {
                        recentChats.push(id);
                        localStorage.setItem(`pintada_recent_chats_${chatUser}`, JSON.stringify(recentChats));
                    }

                    renderContacts();
                    loadChatRealTime();
                }
            });
        });
    };

    // ==========================================
    // CARREGAR AS MENSAGENS E REMOVER SKELETON
    // ==========================================
    const loadChatRealTime = () => {
        const target = contacts.find(c => c.username === activeContactId);
        if (!target || !chatHistoryContainer) return;

        const contactNameEl = document.getElementById('chat-contact-name');
        const contactStatusEl = document.getElementById('chat-contact-status');
        const headerAvatar = document.querySelector('.chat-header-avatar');

        if (contactNameEl) {
            contactNameEl.textContent = target.name;
            contactNameEl.classList.remove('skeleton');
            contactNameEl.style.width = 'auto';
            contactNameEl.style.cursor = 'pointer';
            contactNameEl.style.textDecoration = 'underline';
            contactNameEl.style.textDecorationColor = 'transparent';
            contactNameEl.style.transition = '0.2s';
            contactNameEl.onmouseover = () => contactNameEl.style.textDecorationColor = 'var(--text-main)';
            contactNameEl.onmouseout = () => contactNameEl.style.textDecorationColor = 'transparent';
            contactNameEl.onclick = () => window.location.href = `profile.html?user=${target.username}`;
        }
        if (contactStatusEl) {
            contactStatusEl.classList.remove('skeleton');
            contactStatusEl.style.width = 'auto';
            contactStatusEl.textContent = "Carregando...";

            // Desliga a escuta do usuário anterior ao trocar de chat
            if (currentStatusUnsubscribe) currentStatusUnsubscribe();

            // Começa a ouvir o usuário atual em tempo real
            currentStatusUnsubscribe = window.AuthService.listenToUserStatus(activeContactId, (isOnline, lastSeen) => {
                if (isOnline) {
                    contactStatusEl.textContent = "Online agora";
                    contactStatusEl.style.color = "#10B981"; // Verde brilhante
                } else {
                    contactStatusEl.style.color = "var(--text-muted)"; // Cinza
                    
                    if (!lastSeen) {
                        contactStatusEl.textContent = "Offline";
                        return;
                    }

                    // Calcula o "Visto por último"
                    const date = new Date(lastSeen);
                    const now = new Date();
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    const timeString = `${hours}:${minutes}`;

                    const yesterday = new Date(now);
                    yesterday.setDate(now.getDate() - 1);

                    if (date.toDateString() === now.toDateString()) {
                        contactStatusEl.textContent = `Visto por último hoje às ${timeString}`;
                    } else if (date.toDateString() === yesterday.toDateString()) {
                        contactStatusEl.textContent = `Visto por último ontem às ${timeString}`;
                    } else {
                        const day = date.getDate().toString().padStart(2, '0');
                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                        contactStatusEl.textContent = `Visto por último em ${day}/${month} às ${timeString}`;
                    }
                }
            });
        }
        if (headerAvatar) {
            headerAvatar.src = target.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(target.name)}&background=F4B41A&color=fff`;
            headerAvatar.classList.remove('skeleton');
        }

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

                if (isAtBottom || (msgs.length > 0 && msgs[msgs.length - 1].sender === chatUser)) {
                    chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
                }
            }
        });
    };

    // Variáveis para o áudio
let mediaRecorder;
let audioChunks = [];

// --- ENVIO DE FOTO ---
document.getElementById('photo-btn').onclick = () => document.getElementById('chat-file-input').click();

document.getElementById('chat-file-input').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    showToast("A enviar foto...", "success");
    const url = await window.MessageService.uploadFile(file, 'chat_images');
    await window.MessageService.sendMessage(chatUser, activeContactId, "", url, 'image');
};

// --- ENVIO DE ÁUDIO ---
const audioBtn = document.getElementById('audio-btn');
audioBtn.onclick = async () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            showToast("A enviar áudio...", "success");
            const url = await window.MessageService.uploadFile(audioBlob, 'chat_audios');
            await window.MessageService.sendMessage(chatUser, activeContactId, "", url, 'audio');
        };

        mediaRecorder.start();
        audioBtn.classList.add('recording-active');
        audioBtn.querySelector('span').textContent = 'stop_circle';
    } else {
        mediaRecorder.stop();
        audioBtn.classList.remove('recording-active');
        audioBtn.querySelector('span').textContent = 'mic';
    }
};

// --- RENDERIZAÇÃO ATUALIZADA (DENTRO DO listenToMessages) ---
// No seu messages.js, dentro do innerHTML das mensagens, use este switch:
const renderContent = (m) => {
    if (m.type === 'image') return `<img src="${m.fileUrl}" onclick="window.open('${m.fileUrl}')">`;
    if (m.type === 'audio') return `
        <div class="audio-player">
            <span class="material-symbols-outlined">play_circle</span>
            <audio controls src="${m.fileUrl}" style="height:30px; width:150px;"></audio>
        </div>`;
    return window.escapeHTML(m.text);
};

    // ==========================================
    // ENVIAR MENSAGEM
    // ==========================================
    async function sendMessage() {
        if (isDeleteMode) return showToast("Saia do modo de exclusão para enviar mensagens", "error");

        const inputox = document.getElementById('chat-input-box');
        if (!inputox) return;

        const text = inputox.value.trim();
        if (!text || !activeContactId) return;

        inputox.value = '';
        await window.MessageService.sendMessage(chatUser, activeContactId, text);
    }

    renderContacts();
    if (activeContactId) loadChatRealTime();

    const btnSendMsg = document.getElementById('send-msg-btn');
    if (btnSendMsg) btnSendMsg.addEventListener('click', sendMessage);

    const inputChatBox = document.getElementById('chat-input-box');
    if (inputChatBox) {
        inputChatBox.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
        });
    }
});