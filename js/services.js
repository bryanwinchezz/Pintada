// ==========================================
// js/services.js - SERVIÇOS DO FIREBASE
// ==========================================
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    deleteUser,
    verifyBeforeUpdateEmail, // <-- AQUI ESTÁ A NOVA FUNÇÃO
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, setDoc, getDoc, deleteDoc, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const PostService = {
    async getPosts() {
        const snapshot = await getDocs(query(collection(window.db, "posts"), orderBy("timestamp", "desc")));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async addPost(content, user, gifUrl = null, pollData = null, media = {}) {
        try {
            await addDoc(collection(window.db, "posts"), {
                authorName: user.name || "Utilizador",
                authorUsername: user.username || "anonimo",
                authorAvatar: user.avatar || "",
                authorBadge: user.badge || "",
                content: content || "",
                gif: gifUrl || null,
                image: media.image || null, // NOVO: Salva a URL da imagem do ImgBB
                audio: media.audio || null, // NOVO: Salva o áudio em Base64
                poll: pollData || null,
                likes: 0,
                likedBy: [],
                reposts: 0,
                repostedBy: [],
                comments: [],
                timestamp: Date.now(),
                isEdited: false
            });
        } catch (e) { console.error("Erro ao salvar post:", e); }
    },
    async deletePost(postId) { await deleteDoc(doc(window.db, "posts", postId)); },
    async editPost(postId, newContent) { await updateDoc(doc(window.db, "posts", postId), { content: newContent, isEdited: true }); },
    async toggleReaction(postId, username, type) {
        const postRef = doc(window.db, "posts", postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
            const data = postSnap.data();
            const listField = type === 'like' ? 'likedBy' : 'repostedBy';
            const countField = type === 'like' ? 'likes' : 'reposts';
            let newList = data[listField] || [];
            let newCount = data[countField] || 0;
            if (newList.includes(username)) {
                newList = newList.filter(u => u !== username);
                newCount = Math.max(0, newCount - 1);
            } else {
                newList.push(username);
                newCount++;
            }
            await updateDoc(postRef, {
                [listField]: newList,
                [countField]: newCount
            });
        }
    },
    async addComment(postId, comment) {
        const postRef = doc(window.db, "posts", postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
            const comments = postSnap.data().comments || [];
            comments.push(comment);
            await updateDoc(postRef, { comments: comments });
        }
    },
    async votePoll(postId, username, optionId) {
        const postRef = doc(window.db, "posts", postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
            let poll = postSnap.data().poll;
            if (!poll) return;
            if (!poll.voters) poll.voters = {};
            const prev = poll.voters[username];
            if (prev !== undefined) { const oldOpt = poll.options.find(o => o.id === prev); if (oldOpt) oldOpt.votes = Math.max(0, oldOpt.votes - 1); }
            if (prev === optionId) { delete poll.voters[username]; } else { poll.voters[username] = optionId; const newOpt = poll.options.find(o => o.id === optionId); if (newOpt) newOpt.votes++; }
            await updateDoc(postRef, { poll: poll });
        }
    }
};

const AuthService = {
    // 1. ADICIONE ESTAS DUAS FUNÇÕES AQUI
    async setOnlineStatus(username, isOnline) {
        if (!username) return;
        try {
            await updateDoc(doc(window.db, "users", username), {
                isOnline: isOnline,
                lastSeen: Date.now()
            });
        } catch (e) { console.error("Erro no status:", e); }
    },
    listenToUserStatus(username, callback) {
        return onSnapshot(doc(window.db, "users", username), (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data().isOnline, docSnap.data().lastSeen);
            }
        });
    },
    async login(identifier, password) {
        const users = await this.getUsers();
        const userData = users.find(u => u.email === identifier || u.username === identifier);
        if (!userData) throw new Error("Utilizador não encontrado.");
        await signInWithEmailAndPassword(window.auth, userData.email, password);
        localStorage.setItem('pintada_active_user', userData.username);
        return userData;
    },
    async getUsers() {
        const snapshot = await getDocs(collection(window.db, "users"));
        return snapshot.docs.map(doc => doc.data());
    },
    async getUserData(username) {
        if (!username) return null;
        const docSnap = await getDoc(doc(window.db, "users", username));
        return docSnap.exists() ? docSnap.data() : null;
    },
    // === NOVA FUNÇÃO: GERENCIAR SELOS ===
    async updateUserBadge(targetUsername, badgeType) {
        const userRef = doc(window.db, "users", targetUsername);
        const newBadge = badgeType === 'none' ? "" : badgeType;
        await updateDoc(userRef, { badge: newBadge });

        // Atualiza o selo em todos os posts antigos da pessoa na mesma hora!
        const postsSnap = await getDocs(query(collection(window.db, "posts"), where("authorUsername", "==", targetUsername)));
        postsSnap.forEach(async (postDoc) => {
            await updateDoc(doc(window.db, "posts", postDoc.id), { authorBadge: newBadge });
        });
    },
    async register(userData) {
        // 1. VERIFICA SE O NOME DE USUÁRIO JÁ EXISTE NO BANCO DE DADOS
        const userRef = doc(window.db, "users", userData.username);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            // Se já existir, interrompe tudo e lança um erro!
            throw new Error("Este nome de usuário já está em uso. Escolha outro!");
        }

        // 2. Se o nome estiver livre, cria a conta no Authentication
        const userCredential = await createUserWithEmailAndPassword(window.auth, userData.email, userData.password);

        // 3. Salva o perfil no Firestore
        await setDoc(userRef, {
            name: userData.name,
            username: userData.username,
            email: userData.email,
            avatar: "",
            banner: "",
            bio: userData.bio || "Novo membro da Pintada! 🐆",
            hobbies: userData.hobbies || {},
            followers: 0,
            followingList: [],
            createdAt: Date.now(),
            isOnline: true,
            lastSeen: Date.now()
        });

        localStorage.setItem('pintada_active_user', userData.username);
        return userCredential.user;
    },
    async updateUser(oldUsername, updatedData) {
        const userRef = doc(window.db, "users", oldUsername);
        const oldSnap = await getDoc(userRef);
        const oldData = oldSnap.exists() ? oldSnap.data() : {};
        const finalAvatar = updatedData.avatar || oldData.avatar || "";

        // SE ELE MUDOU O NOME DE USUÁRIO:
        if (oldUsername !== updatedData.username) {

            // 1. Verifica no banco de dados se esse novo nome já tem dono
            const newUsernameRef = doc(window.db, "users", updatedData.username);
            const newUsernameSnap = await getDoc(newUsernameRef);

            if (newUsernameSnap.exists()) {
                throw new Error("Este nome de usuário já está em uso por outra pessoa!");
            }

            // 2. Se estiver livre, cria o novo e apaga o velho
            await setDoc(newUsernameRef, updatedData);
            await deleteDoc(userRef);
            localStorage.setItem('pintada_active_user', updatedData.username);
        } else {
            // Se não mudou o nome, só atualiza os dados normais
            await setDoc(userRef, updatedData, { merge: true });
        }

        // Atualiza a foto, o nome e o @ em todas as postagens antigas dele!
        const postsSnap = await getDocs(query(collection(window.db, "posts"), where("authorUsername", "==", oldUsername)));
        postsSnap.forEach(async (postDoc) => {
            await updateDoc(doc(window.db, "posts", postDoc.id), {
                authorName: updatedData.name,
                authorUsername: updatedData.username, // Se ele mudou de @, atualiza nos posts também
                authorAvatar: finalAvatar
            });
        });
    },
    async toggleFollow(targetUsername) {
        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser === targetUsername) return;
        const userRef = doc(window.db, "users", currentUser);
        const targetRef = doc(window.db, "users", targetUsername);
        const userSnap = await getDoc(userRef);
        const targetSnap = await getDoc(targetRef);
        if (userSnap.exists() && targetSnap.exists()) {
            let followingList = userSnap.data().followingList || [];
            let targetFollowers = targetSnap.data().followers || 0;
            const index = followingList.indexOf(targetUsername);
            if (index === -1) {
                followingList.push(targetUsername);
                targetFollowers++;
            } else {
                followingList.splice(index, 1);
                targetFollowers = Math.max(0, targetFollowers - 1);
            }
            await updateDoc(userRef, { followingList: followingList });
            await updateDoc(targetRef, { followers: targetFollowers });
        }
    },
    getCurrentUser() { return localStorage.getItem('pintada_active_user'); },
    async logout() { localStorage.removeItem('pintada_active_user'); if (window.auth) await signOut(window.auth); },
    async deleteAccount(username) {
        // 1. Remove os dados do banco
        await deleteDoc(doc(window.db, "users", username));

        // 2. Remove o login do Firebase Authentication
        if (window.auth && window.auth.currentUser) {
            await deleteUser(window.auth.currentUser);
        }

        // 3. Limpa o navegador
        localStorage.removeItem('pintada_active_user');
    },
    // --- NOVAS FUNÇÕES DE SEGURANÇA ---

    // Função para confirmar a identidade do usuário (Reautenticação)
    async reauthenticate(currentPassword) {
        const user = window.auth.currentUser;
        if (!user) throw new Error("Nenhum utilizador logado.");
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
    },

    // Trocar o E-mail (No Auth e no Banco de Dados)
    async changeEmail(newEmail, currentPassword) {
        await this.reauthenticate(currentPassword); // Pede a senha atual

        // Dispara o e-mail de confirmação do Google para o NOVO e-mail
        await verifyBeforeUpdateEmail(window.auth.currentUser, newEmail);

        // Atualiza o e-mail no seu banco de dados público
        const activeUsername = this.getCurrentUser();
        await updateDoc(doc(window.db, "users", activeUsername), { email: newEmail });
    },

    // Trocar a Senha
    async changePassword(newPassword, currentPassword) {
        await this.reauthenticate(currentPassword); // Pede a senha atual
        await updatePassword(window.auth.currentUser, newPassword); // Atualiza a senha
    }
};

const MessageService = {
    listenToMessages(user1, user2, callback) {
        const q = query(collection(window.db, "messages"), orderBy("timestamp", "asc"));
        return onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(m => (m.sender === user1 && m.receiver === user2) || (m.sender === user2 && m.receiver === user1));
            callback(msgs);
        });
    },
    listenToAllMyMessages(username, callback) {
        const q = query(collection(window.db, "messages"), where("receiver", "==", username));
        return onSnapshot(q, (snapshot) => { callback(snapshot.docs.length); });
    },
    // NOVO: Busca todas as pessoas com quem você já conversou!
    async getChatPartners(username) {
        const q1 = query(collection(window.db, "messages"), where("sender", "==", username));
        const q2 = query(collection(window.db, "messages"), where("receiver", "==", username));
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const partners = new Set();
        snap1.docs.forEach(d => partners.add(d.data().receiver)); // Pessoas para quem você enviou
        snap2.docs.forEach(d => partners.add(d.data().sender)); // Pessoas que te enviaram
        partners.delete(username); // Remove o seu próprio nome da lista
        return Array.from(partners);
    },
    async deleteChat(user1, user2) {
        const snapshot = await getDocs(collection(window.db, "messages"));
        for (let d of snapshot.docs) {
            const m = d.data();
            if ((m.sender === user1 && m.receiver === user2) || (m.sender === user2 && m.receiver === user1)) {
                await deleteDoc(doc(window.db, "messages", d.id));
            }
        }
    },
    async uploadFile(file, folder) {
        const fileRef = ref(window.storage, `${folder}/${Date.now()}_${file.name || 'audio.mp3'}`);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    },

    // ATUALIZADO: Agora aceita foto ou áudio
    async sendMessage(sender, receiver, text, fileUrl = null, type = 'text') {
        await addDoc(collection(window.db, "messages"), {
            sender,
            receiver,
            text: text || "",
            fileUrl: fileUrl,
            type: type, // 'text', 'image' ou 'audio'
            timestamp: Date.now()
        });
    },
    // NOVA FUNÇÃO: Apagar mensagem específica
    async deleteMessage(messageId) {
        await deleteDoc(doc(window.db, "messages", messageId));
    }
};

function escapeHTML(str) { return str.replace(/[&<>"']/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[tag] || tag)); }

window.PostService = PostService;
window.AuthService = AuthService;
window.MessageService = MessageService;
window.escapeHTML = escapeHTML;