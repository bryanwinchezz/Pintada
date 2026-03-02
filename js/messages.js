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
            // FUNÇÃO DE RENDERIZAR CONTEÚDO (MÍDIAS)
            // ==========================================
            function renderContent(m) {
                if (m.type === 'image') {
                    // A imagem agora chama a função openImageModal em vez de abrir nova aba
                    return `<img src="${m.fileUrl}" onclick="window.openImageModal('${m.fileUrl}')" style="width: 100%; max-width: 280px; height: auto; border-radius: 8px; cursor: pointer; object-fit: cover; display: block;">`;
                }
                if (m.type === 'audio') return `
            <div class="audio-player" style="display: flex; align-items: center; gap: 5px;">
                <span class="material-symbols-outlined">play_circle</span>
                <audio controls src="${m.fileUrl}" style="height:35px; width:200px; outline:none;"></audio>
            </div>`;
                return window.escapeHTML ? window.escapeHTML(m.text) : m.text;
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
                btnConfirmDelete.addEventListener('click', async() => {
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

            if (currentStatusUnsubscribe) currentStatusUnsubscribe();

            currentStatusUnsubscribe = window.AuthService.listenToUserStatus(activeContactId, (isOnline, lastSeen) => {
                if (isOnline) {
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
                        ${renderContent(m)} 
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
            if (!activeContactId) return safeToast("Selecione um chat primeiro!", "error");
            
            safeToast("A enviar foto para o ImgBB...", "success");
            
            try {
                // Prepara o arquivo para o ImgBB
                const formData = new FormData();
                formData.append('image', file);
                
                // Faz o upload direto pra API do ImgBB
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const imageUrl = data.data.url; // Pega o link direto da imagem
                    console.log("Upload no ImgBB concluído! URL:", imageUrl);
                    
                    // Salva a mensagem no Firebase Database com o link do ImgBB
                    await window.MessageService.sendMessage(chatUser, activeContactId, "", imageUrl, 'image');
                    fileInput.value = ''; 
                } else {
                    throw new Error("Erro na resposta do ImgBB");
                }
                
            } catch (err) {
                console.error("ERRO IMGBB:", err);
                safeToast("Erro ao fazer upload da imagem.", "error");
            }
        };
    }

// 3. Gravar e Enviar Áudio (SEM API - Convertendo para Base64)
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
                        safeToast("A processar áudio...", "success");
                        
                        // --- A MÁGICA DO BASE64 AQUI ---
                        const reader = new FileReader();
                        reader.readAsDataURL(audioBlob); 
                        reader.onloadend = async () => {
                            const base64Audio = reader.result; // Vira um texto gigante
                            
                            try {
                                console.log("Enviando áudio convertido pro banco de dados...");
                                // Manda o texto Base64 no lugar do link da URL
                                await window.MessageService.sendMessage(chatUser, activeContactId, "", base64Audio, 'audio');
                                console.log("Áudio enviado com sucesso!");
                            } catch (err) {
                                console.error("ERRO AO SALVAR ÁUDIO:", err);
                                safeToast("Erro ao enviar áudio. Ele pode estar muito longo.", "error");
                            }
                        };
                    };

                    mediaRecorder.start();
                    audioBtn.classList.add('recording-active');
                    audioBtn.querySelector('span').textContent = 'stop_circle';
                    audioBtn.style.color = "#EF4444"; 
                } catch (err) {
                    safeToast("Microfone bloqueado ou indisponível.", "error");
                }
            } else {
                mediaRecorder.stop();
                audioBtn.classList.remove('recording-active');
                audioBtn.querySelector('span').textContent = 'mic';
                audioBtn.style.color = ""; 
            }
        };
    }

// ==========================================
    // POPUP DE IMAGEM EM TELA CHEIA (LIGHTBOX)
    // ==========================================
    window.openImageModal = function(imgSrc) {
        // Verifica se o popup já existe para não criar duplicado
        let modal = document.getElementById('chat-image-modal');
        
        if (!modal) {
            // Cria o fundo escuro do popup
            modal = document.createElement('div');
            modal.id = 'chat-image-modal';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0, 0, 0, 0.9); z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                opacity: 0; transition: opacity 0.3s ease;
            `;

            // Cria o botão X
            const closeBtn = document.createElement('span');
            closeBtn.innerHTML = 'close';
            closeBtn.className = 'material-symbols-outlined';
            closeBtn.style.cssText = `
                position: absolute; top: 20px; right: 20px;
                color: white; font-size: 36px; cursor: pointer;
                background: rgba(0,0,0,0.5); border-radius: 50%; padding: 4px;
            `;
            
            // Função para fechar suavemente
            const closeModal = () => {
                modal.style.opacity = '0';
                setTimeout(() => modal.style.display = 'none', 300); // Aguarda a transição
            };

            closeBtn.onclick = closeModal;

            // Cria a imagem em tamanho grande
            const img = document.createElement('img');
            img.id = 'modal-large-image';
            img.style.cssText = `
                max-width: 90vw; max-height: 90vh;
                object-fit: contain; border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            `;

            // Monta tudo e joga no corpo da página
            modal.appendChild(closeBtn);
            modal.appendChild(img);
            document.body.appendChild(modal);

            // Fecha o popup se o usuário clicar fora da imagem (no fundo preto)
            modal.onclick = (e) => {
                if (e.target === modal) closeModal();
            };
        }

        // Atualiza a imagem, mostra o popup e faz o efeito de fade-in
        document.getElementById('modal-large-image').src = imgSrc;
        modal.style.display = 'flex';
        // Um pequeno atraso para o navegador registrar a mudança e rodar a transição CSS
        setTimeout(() => modal.style.opacity = '1', 10);
    };

    // Inicialização
    renderContacts();
    if (activeContactId) loadChatRealTime();
});