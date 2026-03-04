// ==========================================
// js/messages.js - CHAT REAL-TIME E MEMÓRIA DE CONTATOS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
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

    // 2. SE ABRIU UM CHAT NOVO, SALVA NA MEMÓRIA
    if (activeContactId) {
        if (!recentChats.includes(activeContactId)) {
            recentChats.push(activeContactId);
            localStorage.setItem(`pintada_recent_chats_${chatUser}`, JSON.stringify(recentChats));
        }
        if (hiddenChats.includes(activeContactId)) {
            hiddenChats = hiddenChats.filter(id => id !== activeContactId);
            localStorage.setItem(`pintada_hidden_chats_${chatUser}`, JSON.stringify(hiddenChats));
        }
    }

    const currentUserData = await window.AuthService.getUserData(chatUser);
    const allUsers = await window.AuthService.getUsers();

    // 3. JUNTA QUEM VOCÊ SEGUE COM SEUS CHATS RECENTES
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

    if (!activeContactId && contacts.length > 0) activeContactId = contacts[0].username;

    // ==========================================
    // FUNÇÃO DE RENDERIZAR CONTEÚDO (MÍDIAS E LINKS)
    // ==========================================
    function renderContent(m) {
        if (m.type === 'image') return `<img src="${m.fileUrl}" onclick="window.openImageModal('${m.fileUrl}')" style="width: 100%; max-width: 280px; height: auto; border-radius: 8px; cursor: pointer; object-fit: cover; display: block;">`;
        if (m.type === 'audio') return `<div class="audio-player" style="display: flex; align-items: center; gap: 5px;"><span class="material-symbols-outlined">play_circle</span><audio controls src="${m.fileUrl}" style="height:35px; width:200px; outline:none;"></audio></div>`;

        let text = window.escapeHTML ? window.escapeHTML(m.text) : m.text;
        // Mágica que acha o link e transforma num botão azul clicável
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
    }

    // ==========================================
    // BOTÕES DE APAGAR (OCULTAR)
    // ==========================================
    const btnEditChats = document.getElementById('edit-chats-btn');
    const btnConfirmDelete = document.getElementById('confirm-delete-chats-btn');

    if (btnEditChats) {
        btnEditChats.addEventListener('click', () => {
            isDeleteMode = !isDeleteMode;
            selectedChatsToDelete.clear();
            if (btnConfirmDelete) btnConfirmDelete.style.display = isDeleteMode ? 'block' : 'none';
            renderContacts();
        });
    }

    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async () => {
            if (selectedChatsToDelete.size === 0) return window.showToast("Nenhum chat selecionado.", "error");
            if (confirm(`Ocultar ${selectedChatsToDelete.size} conversa(s) da sua lista? (As mensagens não serão apagadas)`)) {

                for (let targetUser of selectedChatsToDelete) {
                    if (!hiddenChats.includes(targetUser)) hiddenChats.push(targetUser);
                }
                localStorage.setItem(`pintada_hidden_chats_${chatUser}`, JSON.stringify(hiddenChats));

                window.showToast("Conversas ocultadas da lista!");
                isDeleteMode = false;
                btnConfirmDelete.style.display = 'none';

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
            const checkboxHTML = isDeleteMode ? `<input type="checkbox" style="width:18px; height:18px; margin-right:8px; flex-shrink: 0;" class="delete-chat-cb" data-id="${c.username}" ${selectedChatsToDelete.has(c.username) ? 'checked' : ''}>` : '';

            // Selo ligeiramente menor para encaixar perfeito no Mobile
            const seloPequeno = typeof window.getBadgeHTML === 'function' ? window.getBadgeHTML(c.badge).replace('1.15em', '0.95em') : '';

            // MÁGICA: Pega apenas a primeira palavra do nome da pessoa!
            const primeiroNome = window.escapeHTML(c.name.trim().split(' ')[0]);

            return `
                <div class="contact-item ${c.username === activeContactId && !isDeleteMode ? 'active' : ''}" data-id="${c.username}" style="cursor: pointer; padding: 6px; min-width: 75px; text-align: center;">
                    ${checkboxHTML}
                    <div style="position: relative; display: flex; justify-content: center;">
                        <img src="${c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=F4B41A&color=fff`}" class="contact-avatar" style="margin: 0 auto;">
                    </div>
                    <div class="contact-info" style="margin-top: 6px; overflow: hidden;">
                        <div class="contact-name-wrapper" style="display: flex; align-items: center; justify-content: center; gap: 2px;">
                            <span class="contact-name" style="font-weight: 600; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: clip;">${primeiroNome}</span>
                            ${seloPequeno}
                        </div>
                        <span class="contact-handle" style="font-size: 0.75rem; color: var(--text-muted); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">@${c.username}</span>
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
                    window.history.pushState({}, '', `messages.html?chat=${id}`);
                    activeContactId = id;

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
    // CARREGAR AS MENSAGENS REAL-TIME
    // ==========================================
    const loadChatRealTime = () => {
        const target = contacts.find(c => c.username === activeContactId);
        if (!target || !chatHistoryContainer) return;

        const contactNameEl = document.getElementById('chat-contact-name');
        const contactStatusEl = document.getElementById('chat-contact-status');
        const headerAvatar = document.querySelector('.chat-header-avatar');

        // Dentro de loadChatRealTime no messages.js
        if (contactNameEl) {
            const badgeHTML = typeof window.getBadgeHTML === 'function' ? window.getBadgeHTML(target.badge) : '';
            contactNameEl.innerHTML = `<span style="vertical-align: middle; color: var(--text-main);">${window.escapeHTML(target.name)}</span> ${badgeHTML}`;
            contactNameEl.style.display = 'inline-block';
            contactNameEl.style.color = 'var(--text-main)'; // Força a cor correta para não ficar verde
            contactNameEl.style.wordWrap = 'break-word';
            contactNameEl.style.lineHeight = '1.3';
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

            if (currentStatusUnsubscribe) currentStatusUnsubscribe();

            currentStatusUnsubscribe = window.AuthService.listenToUserStatus(activeContactId, (isOnline, lastSeen) => {
                // Considera offline se passou mais de 5 minutos (300000 milissegundos) sem sinal de vida
                const isReallyOnline = isOnline && lastSeen && (Date.now() - lastSeen < 300000);

                if (isReallyOnline) {
                    contactStatusEl.textContent = "Online agora";
                    contactStatusEl.style.color = "#10B981";
                } else {
                    contactStatusEl.style.color = "var(--text-muted)";
                    if (!lastSeen) {
                        contactStatusEl.textContent = "Offline";
                        return;
                    }
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
                        <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 8px;">
                            <div style="flex-grow: 1;">${renderContent(m)}</div>
                            
                            ${m.sender === chatUser ? `
                                <span class="material-symbols-outlined delete-msg-btn" data-msg-id="${m.id}" title="Apagar para todos" style="font-size: 16px; cursor: pointer; color: rgba(255, 255, 255, 0.7); transition: 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='rgba(255, 255, 255, 0.7)'">delete</span>
                            ` : ''}
                        </div>
                    </div>`).join('');

                if (isAtBottom || (msgs.length > 0 && msgs[msgs.length - 1].sender === chatUser)) {
                    chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
                }
            }
        });
    };

    // ==========================================
    // CONTROLES DE MENSAGEM (TEXTO, FOTO E ÁUDIO)
    // ==========================================
    const inputChatBox = document.getElementById('chat-input-box');
    const btnSendMsg = document.getElementById('send-msg-btn');
    const photoBtn = document.getElementById('photo-btn');
    const fileInput = document.getElementById('chat-file-input');
    const audioBtn = document.getElementById('audio-btn');

    // Chave da sua API do ImgBB (Crie uma conta lá e pegue a chave)
    const IMGBB_API_KEY = '02d34ec2cd7054a202c57bf35f17bc5a';

    const safeToast = (msg, type = 'success') => {
        console.log(`[${type.toUpperCase()}] ${msg}`);
        if (typeof showToast === 'function') {
            showToast(msg, type);
        } else if (window.showToast) {
            window.showToast(msg, type);
        }
    };

    // 1. Enviar Texto
    async function sendMessage() {
        if (isDeleteMode) return safeToast("Saia do modo de exclusão para enviar mensagens", "error");
        if (!inputChatBox) return;

        const text = inputChatBox.value.trim();
        if (!text || !activeContactId) return;

        inputChatBox.value = '';
        try {
            await window.MessageService.sendMessage(chatUser, activeContactId, text);
        } catch (err) {
            console.error("Erro ao enviar texto:", err);
            safeToast("Erro ao enviar mensagem", "error");
        }
    }

    if (btnSendMsg) btnSendMsg.addEventListener('click', sendMessage);
    if (inputChatBox) {
        inputChatBox.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
        });
    }

    // 2. Enviar Foto via ImgBB
    if (photoBtn && fileInput) {
        photoBtn.onclick = () => fileInput.click();

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!activeContactId) {
                fileInput.value = ''; // Limpa caso não tenha chat selecionado
                return safeToast("Selecione um chat primeiro!", "error");
            }

            safeToast("A enviar foto...", "success");

            try {
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    const imageUrl = data.data.url;
                    console.log("Upload no ImgBB concluído! URL:", imageUrl);
                    await window.MessageService.sendMessage(chatUser, activeContactId, "", imageUrl, 'image');
                } else {
                    throw new Error("Erro na resposta do ImgBB");
                }

            } catch (err) {
                console.error("ERRO IMGBB:", err);
                safeToast("Erro ao carregar imagem. Ela pode ser muito grande.", "error");
            } finally {
                // O SEGREDO ESTÁ AQUI! 
                // Independentemente de dar erro ou sucesso, limpamos o input para não "travar"
                fileInput.value = '';
            }
        };
    }

    // 3. Gravar e Enviar Áudio (COM PREVIEW CORRIGIDO)
    let mediaRecorder;
    let audioChunks = [];

    if (audioBtn) {
        audioBtn.onclick = async () => {
            if (!activeContactId) return safeToast("Selecione um chat primeiro!", "error");

            if (!mediaRecorder || mediaRecorder.state === "inactive") {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];

                    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

                    mediaRecorder.onstop = async () => {
                        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                        safeToast("Áudio gravado! Pode ouvir antes de enviar.", "success");

                        const reader = new FileReader();
                        reader.readAsDataURL(audioBlob);
                        reader.onloadend = async () => {
                            const base64Audio = reader.result;

                            // 1. Remove qualquer preview antigo
                            const existingPreview = document.getElementById('chat-audio-preview-container');
                            if (existingPreview) existingPreview.remove();

                            // 2. Cria o container do player dinamicamente
                            const previewContainer = document.createElement('div');
                            previewContainer.id = 'chat-audio-preview-container';
                            previewContainer.style.cssText = `
                                position: absolute; bottom: 100%; left: 0; width: 100%;
                                background: var(--card-bg); padding: 12px 20px;
                                border-top: 1px solid var(--border-color);
                                display: flex; align-items: center; gap: 12px;
                                z-index: 10; box-shadow: 0 -4px 15px rgba(0,0,0,0.08);
                                transition: opacity 0.2s ease;
                            `;

                            const inputArea = document.querySelector('.chat-input-area');
                            inputArea.style.position = 'relative';
                            inputArea.appendChild(previewContainer);

                            // 3. Desenha o player
                            previewContainer.innerHTML = `
                                <audio controls src="${base64Audio}" style="height: 40px; flex-grow: 1; outline: none; border-radius: 20px;"></audio>
                                <button id="cancel-chat-audio" class="icon-btn" style="color: #EF4444; background: var(--hover-bg); padding: 10px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;" title="Apagar gravação">
                                    <span class="material-symbols-outlined">delete</span>
                                </button>
                                <button id="send-chat-audio" class="icon-btn" style="color: white; background: #10B981; padding: 10px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;" title="Enviar áudio">
                                    <span class="material-symbols-outlined">send</span>
                                </button>
                            `;

                            const closePreview = () => {
                                previewContainer.style.opacity = '0';
                                setTimeout(() => previewContainer.remove(), 200);
                            };

                            // AÇÃO: Cancelar Áudio
                            document.getElementById('cancel-chat-audio').onclick = () => {
                                closePreview();
                                safeToast("Gravação descartada.");
                            };

                            // AÇÃO: Enviar Áudio
                            document.getElementById('send-chat-audio').onclick = async () => {
                                const sendBtn = document.getElementById('send-chat-audio');
                                const cancelBtn = document.getElementById('cancel-chat-audio');

                                sendBtn.disabled = true;
                                cancelBtn.disabled = true;
                                sendBtn.innerHTML = '<span class="material-symbols-outlined" style="animation: pulse 1s infinite;">sync</span>';

                                try {
                                    await window.MessageService.sendMessage(chatUser, activeContactId, "", base64Audio, 'audio');
                                    closePreview();
                                } catch (err) {
                                    console.error("ERRO AO SALVAR ÁUDIO:", err);
                                    safeToast("Erro ao enviar áudio. A gravação pode ser muito longa.", "error");
                                    sendBtn.disabled = false;
                                    cancelBtn.disabled = false;
                                    sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
                                }
                            };
                        };
                    };

                    // Inicia a gravação
                    mediaRecorder.start();
                    audioBtn.style.color = "#EF4444";
                    audioBtn.textContent = "stop_circle";

                } catch (err) {
                    console.error("Erro no microfone:", err);
                    safeToast("Erro ao acessar o microfone.", "error");
                }
            } else {
                // Para a gravação
                mediaRecorder.stop();
                // Desliga o hardware do microfone!
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
                audioBtn.style.color = "var(--text-muted)";
                audioBtn.textContent = "mic";
            }
        };
    }

    // ==========================================
    // DELETAR MENSAGEM ESPECÍFICA (AGORA NO LUGAR CERTO)
    // ==========================================
    if (chatHistoryContainer) {
        chatHistoryContainer.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-msg-btn');
            if (deleteBtn) {
                const msgId = deleteBtn.getAttribute('data-msg-id');
                if (confirm("Quer mesmo apagar esta mensagem para todos?")) {
                    try {
                        await window.MessageService.deleteMessage(msgId);
                        safeToast("Mensagem apagada.", "success");
                    } catch (err) {
                        console.error("Erro ao apagar:", err);
                        safeToast("Erro ao apagar a mensagem.", "error");
                    }
                }
            }
        });
    }

    // Inicialização
    renderContacts();
    if (activeContactId) loadChatRealTime();
}); // <-- AQUI FECHA O DOMContentLoaded CORRETAMENTE

// ==========================================
// DELETAR MENSAGEM ESPECÍFICA (CORRIGIDO)
// ==========================================
if (chatHistoryContainer) {
    chatHistoryContainer.addEventListener('click', async (e) => {
        // O closest() procura o botão mesmo que você clique no centro do ícone
        const deleteBtn = e.target.closest('.delete-msg-btn');

        if (deleteBtn) {
            const msgId = deleteBtn.getAttribute('data-msg-id');

            if (confirm("Quer mesmo apagar esta mensagem para todos?")) {
                try {
                    await window.MessageService.deleteMessage(msgId);
                    safeToast("Mensagem apagada.", "success");
                } catch (err) {
                    console.error("Erro ao apagar:", err);
                    safeToast("Erro ao apagar a mensagem.", "error");
                }
            }
        }
    });
}