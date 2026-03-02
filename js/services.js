// ==========================================
// js/services.js - SERVIÇOS DO FIREBASE
// ==========================================
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, setDoc, getDoc, deleteDoc, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const PostService = {
    async getPosts() {
        const snapshot = await getDocs(query(collection(window.db, "posts"), orderBy("timestamp", "desc")));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async addPost(content, user, gifUrl = null, pollData = null) {
        try {
            await addDoc(collection(window.db, "posts"), { authorName: user.name || "Utilizador", authorUsername: user.username || "anonimo", authorAvatar: user.avatar || "", content: content || "", gif: gifUrl || null, poll: pollData || null, likes: 0, likedBy: [], reposts: 0, repostedBy: [], comments: [], timestamp: Date.now(), time: "Agora", isEdited: false });
        } catch (e) { console.error("Erro ao salvar:", e); }
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
    async saveUserData(username, data) { await setDoc(doc(window.db, "users", username), data, { merge: true }); },
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

        if (oldUsername !== updatedData.username) {
            await setDoc(doc(window.db, "users", updatedData.username), updatedData);
            await deleteDoc(userRef);
            localStorage.setItem('pintada_active_user', updatedData.username);
        } else {
            await setDoc(userRef, updatedData, { merge: true });
        }
        const postsSnap = await getDocs(query(collection(window.db, "posts"), where("authorUsername", "==", oldUsername)));
        postsSnap.forEach(async(postDoc) => { await updateDoc(doc(window.db, "posts", postDoc.id), { authorName: updatedData.name, authorAvatar: finalAvatar }); });
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
    }
};

const MessageService = {
    async sendMessage(sender, receiver, text) {
        await addDoc(collection(window.db, "messages"), { sender, receiver, text, timestamp: Date.now() });
    },
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
    }
};

function escapeHTML(str) { return str.replace(/[&<>"']/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[tag] || tag)); }

window.PostService = PostService;
window.AuthService = AuthService;
window.MessageService = MessageService;
window.escapeHTML = escapeHTML;