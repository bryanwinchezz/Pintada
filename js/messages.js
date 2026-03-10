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
    let activeCommunityId = null; // NOVO: Guarda a comunidade ativa
    let currentCommunityUnsubscribe = null; // NOVO: Desliga o ouvinte antigo

    // 1. RECUPERA A MEMÓRIA DOS CHATS OCULTOS E RECENTES
    let hiddenChats = JSON.parse(localStorage.getItem(`pintada_hidden_chats_${chatUser}`)) || [];
    let recentChats = JSON.parse(localStorage.getItem(`pintada_recent_chats_${chatUser}`)) || [];

    // 2. SE ABRIU UM CHAT NOVO OU ANTIGO, JOGA ELE PRO TOPO
    if (activeContactId) {
        recentChats = recentChats.filter(id => id !== activeContactId); // Tira da posição velha
        recentChats.push(activeContactId); // Joga no final do array (que é o Topo da tela)
        localStorage.setItem(`pintada_recent_chats_${chatUser}`, JSON.stringify(recentChats));

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

    // ==================================================================
    // MÁGICA: ORDENA OS CONTACTOS ANTES DE ESCOLHER QUEM FICA ATIVO
    // ==================================================================
    contacts.sort((a, b) => {
        const indexA = recentChats.indexOf(a.username);
        const indexB = recentChats.indexOf(b.username);
        if (indexA > -1 && indexB > -1) return indexB - indexA; // Ambos recentes: o mais novo ganha
        if (indexA > -1) return -1; // Só A é recente
        if (indexB > -1) return 1;  // Só B é recente
        return 0; // Nenhum é recente
    });

    if (contacts.length === 0 && !activeContactId) {
        if (contactListContainer) contactListContainer.innerHTML = "<p style='padding:20px; color:var(--text-muted); text-align: center; font-size: 0.9rem;'>Siga alguém ou pesquise perfis para conversar!</p>";
        if (chatHistoryContainer) chatHistoryContainer.innerHTML = "";
        document.querySelectorAll('.skeleton').forEach(el => el.classList.remove('skeleton'));
        return;
    }

    // Agora o contacts[0] é sempre a sua conversa mais recente!
    if (!activeContactId && contacts.length > 0) activeContactId = contacts[0].username;

    // 👻 O EXORCISTA DE NOTIFICAÇÕES FANTASMAS 👻
    // Ao abrir a tela, obriga a memória a saber que este chat visível foi lido!
    if (activeContactId) {
        localStorage.setItem('pintada_chat_read_' + activeContactId, 'true');
        setTimeout(() => {
            const activeContactDiv = document.querySelector(`.contact-item[data-id="${activeContactId}"]`);
            if (activeContactDiv) {
                const dot = activeContactDiv.querySelector('span[style*="background: #EF4444"]');
                if (dot) dot.remove();
            }
        }, 100);
    }

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
    window.renderContacts = () => {
        // Reorganiza a lista: Chats que estão no 'recentChats' (do mais novo pro mais velho) vão pro topo
        contacts.sort((a, b) => {
            const indexA = recentChats.indexOf(a.username);
            const indexB = recentChats.indexOf(b.username);
            if (indexA > -1 && indexB > -1) return indexB - indexA; // Ambos recentes: o mais novo ganha
            if (indexA > -1) return -1; // Só A é recente
            if (indexB > -1) return 1;  // Só B é recente
            return 0; // Nenhum é recente, mantém ordem alfabética/seguir
        });
        if (!contactListContainer) return;
        contactListContainer.innerHTML = contacts.map(c => {
            const checkboxHTML = isDeleteMode ? `<input type="checkbox" style="width:18px; height:18px; margin-right:8px; flex-shrink: 0;" class="delete-chat-cb" data-id="${c.username}" ${selectedChatsToDelete.has(c.username) ? 'checked' : ''}>` : '';
            const isReadLocally = localStorage.getItem('pintada_chat_read_' + c.username) === 'true';
            const isUnread = c.username !== activeContactId && recentChats[recentChats.length - 1] === c.username && !isReadLocally;
            const unreadDotHTML = isUnread && !isDeleteMode ? `<span style="position: absolute; top: 0; right: 0; width: 12px; height: 12px; background: #EF4444; border-radius: 50%; border: 2px solid var(--card-bg);"></span>` : '';

            // Selo ligeiramente menor para encaixar perfeito no Mobile
            const seloPequeno = typeof window.getBadgeHTML === 'function' ? window.getBadgeHTML(c.badge).replace('1.15em', '0.95em') : '';

            // MÁGICA: Pega apenas a primeira palavra do nome da pessoa!
            const primeiroNome = window.escapeHTML(c.name.trim().split(' ')[0]);

            return `
                <div class="contact-item ${c.username === activeContactId && !isDeleteMode ? 'active' : ''}" 
         data-id="${c.username}" 
         style="cursor: pointer; padding: 4px; min-width: 70px; text-align: center;">
                    ${checkboxHTML}
                    <div style="position: relative; display: flex; justify-content: center;">
                        <img src="${c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=F4B41A&color=fff`}" class="contact-avatar" style="margin: 0 auto;">
                        ${unreadDotHTML}
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

                    // TRAVA A BOLINHA NA MEMÓRIA IMEDIATAMENTE!
                    localStorage.setItem('pintada_chat_read_' + id, 'true');

                    // MÁGICA: Tira a pessoa da posição antiga e joga pro topo da lista!
                    recentChats = recentChats.filter(chatId => chatId !== id);
                    recentChats.push(id);
                    localStorage.setItem(`pintada_recent_chats_${chatUser}`, JSON.stringify(recentChats));

                    renderContacts();
                    loadChatRealTime();
                }
            });
        });
    };

    // ==========================================
    // CARREGAR AS MENSAGENS REAL-TIME (PRIVADO)
    // ==========================================
    const loadChatRealTime = () => {
        activeCommunityId = null; // DESLIGA O MODO GRUPO
        if (currentCommunityUnsubscribe) { currentCommunityUnsubscribe(); currentCommunityUnsubscribe = null; }

        const target = contacts.find(c => c.username === activeContactId);
        if (!target || !chatHistoryContainer) return;

        const contactNameEl = document.getElementById('chat-contact-name');
        const contactStatusEl = document.getElementById('chat-contact-status');
        const headerAvatar = document.querySelector('.chat-header-avatar');

        if (contactNameEl) {
            contactNameEl.removeAttribute('style');
            contactNameEl.classList.remove('skeleton'); // <-- DESTRÓI O CARREGAMENTO INFINITO
            const badgeHTML = typeof window.getBadgeHTML === 'function' ? window.getBadgeHTML(target.badge) : '';
            contactNameEl.innerHTML = `<span style="font-weight: 600; color: var(--text-main);">${window.escapeHTML(target.name)}</span> ${badgeHTML}`;
            contactNameEl.style.cursor = 'pointer';
            contactNameEl.style.display = 'flex';
            contactNameEl.style.alignItems = 'center';
            contactNameEl.style.gap = '4px';
            contactNameEl.onclick = () => window.location.href = `profile.html?user=${target.username}`;
        }

        if (contactStatusEl) {
            contactStatusEl.removeAttribute('style');
            contactStatusEl.classList.remove('skeleton'); // <-- DESTRÓI O CARREGAMENTO INFINITO
            contactStatusEl.textContent = "Carregando...";
            contactStatusEl.style.display = 'block';
            contactStatusEl.style.fontSize = '0.8rem';
            contactStatusEl.style.marginTop = '2px';

            if (currentStatusUnsubscribe) currentStatusUnsubscribe();

            currentStatusUnsubscribe = window.AuthService.listenToUserStatus(activeContactId, (isOnline, lastSeen) => {
                // Verifica se esteve online nos últimos 5 minutos
                const isReallyOnline = isOnline && lastSeen && (Date.now() - lastSeen < 300000);

                if (isReallyOnline) {
                    contactStatusEl.textContent = "Online agora";
                    contactStatusEl.style.color = "#10B981";
                } else {
                    contactStatusEl.style.color = "var(--text-muted)";

                    // Se a pessoa nunca teve o status registrado
                    if (!lastSeen) {
                        contactStatusEl.textContent = "Offline";
                        return;
                    }

                    // Pega as datas para comparar
                    const date = new Date(lastSeen);
                    const hoje = new Date();
                    const ontem = new Date();
                    ontem.setDate(hoje.getDate() - 1);

                    const horas = date.getHours().toString().padStart(2, '0');
                    const min = date.getMinutes().toString().padStart(2, '0');

                    // Lógica inteligente de exibição
                    if (date.toDateString() === hoje.toDateString()) {
                        contactStatusEl.textContent = `Visto por último hoje às ${horas}:${min}`;
                    } else if (date.toDateString() === ontem.toDateString()) {
                        contactStatusEl.textContent = `Visto por último ontem às ${horas}:${min}`;
                    } else {
                        const dia = date.getDate().toString().padStart(2, '0');
                        const mes = (date.getMonth() + 1).toString().padStart(2, '0');
                        contactStatusEl.textContent = `Visto por último dia ${dia}/${mes} às ${horas}:${min}`;
                    }
                }
            });
        }

        if (headerAvatar) {
            headerAvatar.src = target.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(target.name)}&background=F4B41A&color=fff`;
            headerAvatar.classList.remove('skeleton');
            headerAvatar.style.borderRadius = '50%';
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
                            ${m.sender === chatUser ? `<span class="material-symbols-outlined delete-msg-btn" data-msg-id="${m.id}" title="Apagar para todos" style="font-size: 16px; cursor: pointer; color: rgba(255, 255, 255, 0.7); transition: 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='rgba(255, 255, 255, 0.7)'">delete</span>` : ''}
                        </div>
                    </div>`).join('');
                if (isAtBottom || (msgs.length > 0 && msgs[msgs.length - 1].sender === chatUser)) chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
            }
        });
    };

    // ==========================================
    // CARREGAR AS MENSAGENS DA COMUNIDADE (GRUPO)
    // ==========================================
    window.openCommunityChat = async function (commId) {
        activeContactId = null;
        activeCommunityId = commId;

        chatHistoryContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Abrindo grupo...</p>';

        try {
            const comm = await window.CommunityService.getCommunity(commId);
            if (!comm) {
                chatHistoryContainer.innerHTML = '<p style="text-align: center; color: #EF4444; padding: 20px;">Grupo não encontrado.</p>';
                return;
            }

            const contactNameEl = document.getElementById('chat-contact-name');
            const contactStatusEl = document.getElementById('chat-contact-status');
            const headerAvatar = document.querySelector('.chat-header-avatar');

            if (contactNameEl) {
                contactNameEl.removeAttribute('style');
                contactNameEl.classList.remove('skeleton'); // <-- DESTRÓI O CARREGAMENTO INFINITO
                contactNameEl.innerHTML = `<span style="font-weight: bold; color: var(--text-main);">${window.escapeHTML(comm.name)}</span>`;
                contactNameEl.style.cursor = 'pointer';
                contactNameEl.style.display = 'inline-block';
                contactNameEl.onclick = () => window.openCommunityInfoModal(commId);
            }

            if (contactStatusEl) {
                contactStatusEl.removeAttribute('style');
                contactStatusEl.classList.remove('skeleton'); // <-- DESTRÓI O CARREGAMENTO INFINITO
                contactStatusEl.textContent = `${comm.members.length} membros`;
                contactStatusEl.style.color = "var(--text-muted)";
                contactStatusEl.style.display = 'block';
                contactStatusEl.style.fontSize = '0.8rem';
                contactStatusEl.style.marginTop = '2px';
            }

            if (headerAvatar) {
                headerAvatar.src = comm.avatar;
                headerAvatar.classList.remove('skeleton');
                headerAvatar.style.borderRadius = '12px';
            }

            if (currentUnsubscribe) { currentUnsubscribe(); currentUnsubscribe = null; }
            if (currentStatusUnsubscribe) { currentStatusUnsubscribe(); currentStatusUnsubscribe = null; }
            if (currentCommunityUnsubscribe) { currentCommunityUnsubscribe(); currentCommunityUnsubscribe = null; }

            currentCommunityUnsubscribe = window.MessageService.listenToCommunityMessages(commId, (msgs) => {
                if (msgs.length === 0) {
                    chatHistoryContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">Seja o primeiro a mandar mensagem em ${comm.name}! 🐆</div>`;
                } else {
                    const isAtBottom = chatHistoryContainer.scrollHeight - chatHistoryContainer.scrollTop <= chatHistoryContainer.clientHeight + 100;
                    chatHistoryContainer.innerHTML = msgs.map(m => `
                        <div class="chat-bubble ${m.sender === chatUser ? 'sent' : 'received'}" style="flex-direction: column; align-items: ${m.sender === chatUser ? 'flex-end' : 'flex-start'};">
                            
                            ${m.sender !== chatUser ? `<span style="font-size: 0.75rem; color: #10B981; margin-bottom: 4px; font-weight: bold; cursor: pointer;" onclick="window.location.href='profile.html?user=${m.sender}'">@${m.sender}</span>` : ''}
                            
                            <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; width: 100%;">
                                <div style="flex-grow: 1;">${renderContent(m)}</div>
                                
                                ${m.sender === chatUser || chatUser === comm.owner ? `
                                    <span class="material-symbols-outlined delete-comm-msg-btn" data-msg-id="${m.id}" title="Apagar" style="font-size: 16px; cursor: pointer; color: rgba(255, 255, 255, 0.7); transition: 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='rgba(255, 255, 255, 0.7)'">delete</span>
                                ` : ''}
                            </div>
                        </div>`).join('');
                    if (isAtBottom || (msgs.length > 0 && msgs[msgs.length - 1].sender === chatUser)) chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
                }
            });
        } catch (error) {
            chatHistoryContainer.innerHTML = '<p style="text-align: center; color: #EF4444; padding: 20px;">Erro ao carregar o grupo.</p>';
        }
    };

    // ==========================================
    // CONTROLES DE MENSAGEM (TEXTO, FOTO E ÁUDIO)
    // ==========================================
    const inputChatBox = document.getElementById('chat-input-box');
    const btnSendMsg = document.getElementById('send-msg-btn');
    const photoBtn = document.getElementById('photo-btn');
    const fileInput = document.getElementById('chat-file-input');
    const audioBtn = document.getElementById('audio-btn');
    const IMGBB_API_KEY = '02d34ec2cd7054a202c57bf35f17bc5a';

    const safeToast = (msg, type = 'success') => {
        if (typeof showToast === 'function') window.showToast(msg, type);
        else if (window.showToast) window.showToast(msg, type);
    };

    // 1. Enviar Texto
    async function sendMessage() {
        if (isDeleteMode) return safeToast("Saia do modo de exclusão", "error");
        const text = inputChatBox ? inputChatBox.value.trim() : '';
        if (!text || (!activeContactId && !activeCommunityId)) return;

        inputChatBox.value = '';
        try {
            if (activeCommunityId) await window.MessageService.sendCommunityMessage(chatUser, activeCommunityId, text);
            else await window.MessageService.sendMessage(chatUser, activeContactId, text);
        } catch (err) { safeToast("Erro ao enviar mensagem", "error"); }
    }

    if (btnSendMsg) btnSendMsg.addEventListener('click', sendMessage);
    if (inputChatBox) inputChatBox.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } });

    // 2. Enviar Foto via ImgBB (CORRIGIDO)
    if (photoBtn && fileInput) {
        photoBtn.onclick = () => fileInput.click();
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            safeToast("A enviar foto...", "success");

            try {
                const formData = new FormData();
                formData.append('image', file);
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                const data = await response.json();

                if (data.success) {
                    const imageUrl = data.data.url;
                    if (activeCommunityId) await window.MessageService.sendCommunityMessage(chatUser, activeCommunityId, "", imageUrl, 'image');
                    else await window.MessageService.sendMessage(chatUser, activeContactId, "", imageUrl, 'image');
                } else { throw new Error("Erro na resposta do ImgBB"); }
            } catch (err) { safeToast("Erro ao carregar imagem.", "error"); }
            finally { fileInput.value = ''; }
        };
    }

    // 3. Gravar e Enviar Áudio
    let mediaRecorder;
    let audioChunks = [];

    if (audioBtn) {
        audioBtn.onclick = async () => {
            if (!activeContactId && !activeCommunityId) return;

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

                            const existingPreview = document.getElementById('chat-audio-preview-container');
                            if (existingPreview) existingPreview.remove();

                            const previewContainer = document.createElement('div');
                            previewContainer.id = 'chat-audio-preview-container';
                            previewContainer.style.cssText = `
                                position: absolute; bottom: 100%; left: 0; width: 100%;
                                background: var(--card-bg); padding: 12px 20px;
                                border-top: 1px solid var(--border-color);
                                display: flex; align-items: center; gap: 12px;
                                z-index: 10; box-shadow: 0 -4px 15px rgba(0,0,0,0.08);
                            `;

                            const inputArea = document.querySelector('.chat-input-area');
                            inputArea.style.position = 'relative';
                            inputArea.appendChild(previewContainer);

                            previewContainer.innerHTML = `
                                <audio controls src="${base64Audio}" style="height: 40px; flex-grow: 1; outline: none; border-radius: 20px;"></audio>
                                <button id="cancel-chat-audio" class="icon-btn" style="color: #EF4444; background: var(--hover-bg); padding: 10px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="Apagar gravação">
                                    <span class="material-symbols-outlined">delete</span>
                                </button>
                                <button id="send-chat-audio" class="icon-btn" style="color: white; background: #10B981; padding: 10px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="Enviar áudio">
                                    <span class="material-symbols-outlined">send</span>
                                </button>
                            `;

                            document.getElementById('cancel-chat-audio').onclick = () => {
                                previewContainer.remove();
                                safeToast("Gravação descartada.");
                            };

                            document.getElementById('send-chat-audio').onclick = async () => {
                                const sendBtn = document.getElementById('send-chat-audio');
                                sendBtn.disabled = true;
                                sendBtn.innerHTML = '<span class="material-symbols-outlined" style="animation: pulse 1s infinite;">sync</span>';

                                try {
                                    if (activeCommunityId) await window.MessageService.sendCommunityMessage(chatUser, activeCommunityId, "", base64Audio, 'audio');
                                    else await window.MessageService.sendMessage(chatUser, activeContactId, "", base64Audio, 'audio');
                                    previewContainer.remove();
                                } catch (err) {
                                    safeToast("Erro ao enviar áudio.", "error");
                                    sendBtn.disabled = false;
                                    sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
                                }
                            };
                        };
                    };

                    mediaRecorder.start();
                    audioBtn.style.color = "#EF4444";
                    audioBtn.innerHTML = '<span class="material-symbols-outlined">stop_circle</span>';

                } catch (err) { safeToast("Erro ao acessar o microfone.", "error"); }
            } else {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
                audioBtn.style.color = "var(--text-muted)";
                audioBtn.innerHTML = '<span class="material-symbols-outlined">mic</span>';
            }
        };
    }

    // ==========================================
    // DELETAR MENSAGENS E LÓGICA DE ABAS
    // ==========================================
    if (chatHistoryContainer) {
        chatHistoryContainer.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-msg-btn');
            const deleteCommBtn = e.target.closest('.delete-comm-msg-btn');

            if (deleteBtn && confirm("Quer mesmo apagar esta mensagem para todos?")) {
                await window.MessageService.deleteMessage(deleteBtn.getAttribute('data-msg-id'));
            }
            if (deleteCommBtn && confirm("Apagar mensagem do grupo?")) {
                await window.MessageService.deleteCommunityMessage(deleteCommBtn.getAttribute('data-msg-id'));
            }
        });
    }

    const tabChats = document.getElementById('tab-chats');
    const tabComms = document.getElementById('tab-communities');
    const listChats = document.getElementById('contacts-list-render');
    const listComms = document.getElementById('communities-list-render');

    if (tabChats && tabComms) {
        tabChats.addEventListener('click', () => {
            tabChats.classList.add('active'); tabChats.style.borderBottom = '3px solid #D97A00'; tabChats.style.color = '#D97A00';
            tabComms.classList.remove('active'); tabComms.style.borderBottom = '3px solid transparent'; tabComms.style.color = 'var(--text-muted)';
            listChats.style.setProperty('display', 'flex', 'important');
            listComms.style.setProperty('display', 'none', 'important');
        });

        tabComms.addEventListener('click', async () => {
            tabComms.classList.add('active'); tabComms.style.borderBottom = '3px solid #D97A00'; tabComms.style.color = '#D97A00';
            tabChats.classList.remove('active'); tabChats.style.borderBottom = '3px solid transparent'; tabChats.style.color = 'var(--text-muted)';
            listChats.style.setProperty('display', 'none', 'important');
            listComms.style.setProperty('display', 'flex', 'important');

            listComms.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px; width: 100%;">Buscando grupos...</p>';

            try {
                const comms = await window.CommunityService.getAllCommunities();
                if (comms.length === 0) {
                    listComms.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.85rem; width: 100%;">Nenhuma comunidade criada.</p>';
                    return;
                }

                listComms.innerHTML = comms.map(c => {
                    const isMember = c.members.includes(chatUser);
                    const lockIcon = c.isPrivate
                        ? '<span class="material-symbols-outlined" style="font-size:12px; color:#EF4444; background: var(--card-bg); border-radius: 50%; padding: 2px;">lock</span>'
                        : '<span class="material-symbols-outlined" style="font-size:12px; color:#10B981; background: var(--card-bg); border-radius: 50%; padding: 2px;">public</span>';

                    let clickAction = isMember ? `onclick="window.openCommunityChat('${c.id}')"` : (!c.isPrivate ? `onclick="window.joinPublicCommunity('${c.id}', '${window.escapeHTML(c.name)}');"` : `onclick="window.openPrivateCommunityModal();"`);

                    return `
                    <div class="contact-item" ${clickAction} style="cursor:pointer; text-align: center;">
                        <div style="position: relative; display: flex; justify-content: center;">
                            <img src="${c.avatar}" class="contact-avatar" style="margin: 0 auto; object-fit: cover; border-radius: 12px; ${!isMember ? 'opacity: 0.5; filter: grayscale(50%);' : ''}">
                            <div style="position: absolute; top: -5px; right: -5px;">${!isMember ? lockIcon : ''}</div>
                        </div>
                        <div class="contact-info" style="margin-top: 4px; overflow: hidden;">
                            <div class="contact-name-wrapper" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;">
                                <span class="contact-name" style="font-weight: 600; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: clip; max-width: 60px;">${window.escapeHTML(c.name.split(' ')[0])}</span>
                                <span style="font-size: 0.65rem; color: var(--text-muted);">${c.members.length} 👤</span>
                            </div>
                        </div>
                    </div>`;
                }).join('');
            } catch (e) {
                listComms.innerHTML = '<p style="text-align: center; color: #EF4444; padding: 20px; width: 100%;">Erro ao buscar.</p>';
            }
        });

        tabChats.click();
    }

    // ==========================================
    // LÓGICA DO MODAL DA COMUNIDADE (NOVO)
    // ==========================================
    window.openCommunityInfoModal = async function (commId) {
        const comm = await window.CommunityService.getCommunity(commId);
        if (!comm) return;

        const isOwner = comm.owner === chatUser;
        document.getElementById('comm-info-avatar').src = comm.avatar;
        document.getElementById('comm-info-name').value = comm.name;
        document.getElementById('comm-info-desc').value = comm.description || "";
        document.getElementById('comm-members-count').textContent = comm.members.length;

        // --- CARREGAR MEMBROS ---
        const membersList = document.getElementById('comm-members-list');
        const allUsers = await window.AuthService.getUsers();
        const membersData = allUsers.filter(u => comm.members.includes(u.username));
        membersList.innerHTML = membersData.map(m => `
            <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="window.location.href='profile.html?user=${m.username}'">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="${m.avatar || 'https://ui-avatars.com/api/?name=' + m.name}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;">
                    <span style="font-size: 0.85rem; color: var(--text-main);">@${m.username}</span>
                </div>
                ${m.username === comm.owner ? '<span style="font-size: 0.65rem; color: #D97A00; font-weight: bold;">Dono</span>' : ''}
            </div>
        `).join('');

        // --- PERMISSÕES DO DONO ---
        document.getElementById('comm-info-name').disabled = !isOwner;
        document.getElementById('comm-info-desc').disabled = !isOwner;
        document.getElementById('comm-info-code').disabled = !isOwner; // AGORA O DONO PODE EDITAR!
        document.getElementById('comm-info-type').disabled = !isOwner;

        document.getElementById('comm-info-type-group').style.display = isOwner ? 'block' : 'none';
        document.getElementById('comm-avatar-overlay').style.display = isOwner ? 'flex' : 'none';
        document.getElementById('comm-info-footer').style.display = isOwner ? 'block' : 'none';
        document.getElementById('btn-delete-comm').style.display = isOwner ? 'block' : 'none';
        document.getElementById('btn-leave-comm').style.display = isOwner ? 'none' : 'block';

        if (comm.isPrivate) {
            document.getElementById('comm-info-type').value = "fechada";
            document.getElementById('comm-info-code-group').style.display = 'block';
            document.getElementById('comm-info-code').value = comm.code || "";
        } else {
            document.getElementById('comm-info-type').value = "aberta";
            document.getElementById('comm-info-code-group').style.display = 'none';
            document.getElementById('comm-info-code').value = "";
        }

        // --- LÓGICA DOS NOVOS BOTÕES ---
        document.getElementById('btn-leave-comm').onclick = async () => {
            if (confirm("Deseja sair deste grupo?")) {
                await window.CommunityService.leaveCommunity(commId, chatUser);
                location.reload();
            }
        };

        document.getElementById('btn-delete-comm').onclick = async () => {
            if (confirm("⚠️ AVISO: Isso apagará o grupo para sempre. Continuar?")) {
                await window.CommunityService.deleteCommunity(commId);
                location.reload();
            }
        };

        document.getElementById('form-update-community').setAttribute('data-comm-id', commId);
        document.getElementById('modal-community-info').classList.add('active');
    };

    // Upload de Imagem para o grupo
    const commAvatarInput = document.getElementById('comm-avatar-input');
    if (commAvatarInput) {
        commAvatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            safeToast("Carregando imagem...", "success");
            try {
                const formData = new FormData(); formData.append('image', file);
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    window.tempCommAvatarUrl = data.data.url;
                    document.getElementById('comm-info-avatar').src = data.data.url;
                    safeToast("Foto salva temporariamente! Clique em 'Salvar Alterações'.", "success");
                }
            } catch (err) { safeToast("Erro ao enviar imagem", "error"); }
            commAvatarInput.value = '';
        });
    }

    // Salvar Edição do Grupo (Agora salva o Status: Aberta ou Fechada!)
    const formUpdateComm = document.getElementById('form-update-community');
    if (formUpdateComm) {
        formUpdateComm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const commId = formUpdateComm.getAttribute('data-comm-id');
            const btn = formUpdateComm.querySelector('button');
            btn.textContent = "Salvando..."; btn.disabled = true;

            try {
                const typeSelect = document.getElementById('comm-info-type');
                const isPrivateNow = typeSelect ? typeSelect.value === 'fechada' : false;

                let updates = {
                    name: document.getElementById('comm-info-name').value.trim(),
                    description: document.getElementById('comm-info-desc').value.trim(),
                    isPrivate: isPrivateNow
                };

                if (isPrivateNow) {
                    updates.code = document.getElementById('comm-info-code').value.trim();
                } else {
                    updates.code = ""; // Se virou pública, apaga a senha do banco
                }

                if (window.tempCommAvatarUrl) {
                    updates.avatar = window.tempCommAvatarUrl;
                }

                await window.CommunityService.updateCommunity(commId, updates);
                safeToast("Grupo atualizado!", "success");
                document.getElementById('modal-community-info').classList.remove('active');

                window.tempCommAvatarUrl = null; // Limpa variável

                window.openCommunityChat(commId); // Recarrega o grupo instantaneamente na tela
            } catch (err) { safeToast("Erro ao salvar", "error"); }
            finally { btn.textContent = "Salvar Alterações"; btn.disabled = false; }
        });
    }

    // ==========================================
    // FUNÇÕES GLOBAIS PARA ENTRAR NAS COMUNIDADES
    // ==========================================
    window.joinPublicCommunity = async function (commId, commName) {
        if (confirm(`Esta comunidade é aberta! Deseja entrar em "${commName}"?`)) {
            try {
                await window.CommunityService.joinCommunity(commId, chatUser);
                window.showToast(`Você entrou em: ${commName} 🎉`, "success");
                tabComms.click(); // Recarrega a aba para tirar a opacidade
            } catch (e) {
                window.showToast(e.message, "error");
            }
        }
    };

    window.openPrivateCommunityModal = function () {
        document.getElementById('join-comm-code').value = '';
        document.getElementById('modal-join-community').classList.add('active');
        window.showToast("Esta comunidade é fechada. Insira o código!", "error");
    };

    // Formulário de Criar Comunidade
    const formCreateComm = document.getElementById('form-create-community');
    if (formCreateComm) {
        formCreateComm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formCreateComm.querySelector('button');
            const name = document.getElementById('comm-name').value;
            const desc = document.getElementById('comm-desc').value;
            const type = document.getElementById('comm-type').value;
            const code = document.getElementById('comm-code').value;

            if (type === 'fechada' && !code) return window.showToast("Crie um código de acesso!", "error");

            try {
                btn.textContent = "Criando...";
                btn.disabled = true;
                await window.CommunityService.createCommunity(name, desc, type === 'fechada', code, chatUser);
                window.showToast("Comunidade criada! 🐆", "success");
                formCreateComm.reset();
                document.getElementById('modal-create-community').classList.remove('active');
                tabComms.click(); // Recarrega a aba de comunidades
            } catch (err) {
                window.showToast("Erro ao criar comunidade.", "error");
            } finally {
                btn.textContent = "Criar Comunidade";
                btn.disabled = false;
            }
        });
    }

    // Formulário de Entrar na Comunidade
    const btnJoinComm = document.getElementById('btn-join-community');
    if (btnJoinComm) {
        btnJoinComm.addEventListener('click', async () => {
            const codeInput = document.getElementById('join-comm-code').value.trim();
            if (!codeInput) return window.showToast("Digite um código ou ID.", "error");

            try {
                btnJoinComm.textContent = "Procurando...";
                btnJoinComm.disabled = true;
                const commName = await window.CommunityService.joinCommunity(codeInput, chatUser);
                window.showToast(`Você entrou em: ${commName} 🎉`, "success");
                document.getElementById('modal-join-community').classList.remove('active');
                tabComms.click(); // Atualiza a lista
            } catch (err) {
                window.showToast(err.message, "error");
            } finally {
                btnJoinComm.textContent = "Procurar e Entrar";
                btnJoinComm.disabled = false;
            }
        });
    }

    // Inicialização
    renderContacts();
    if (activeContactId) loadChatRealTime();
}); // <-- AQUI FECHA O DOMContentLoaded CORRETAMENTE