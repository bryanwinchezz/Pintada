// ==========================================
// js/services.js - SERVIÇOS DO FIREBASE
// ==========================================
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, setDoc, getDoc, deleteDoc, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
            if (newList.includes(username)) { newList = newList.filter(u => u !== username);
                newCount = Math.max(0, newCount - 1); } else { newList.push(username);
                newCount++; }
            await updateDoc(postRef, {
                [listField]: newList, [countField]: newCount });
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
        await createUserWithEmailAndPassword(window.auth, userData.email, userData.password);
        await setDoc(doc(window.db, "users", userData.username), { name: userData.name, username: userData.username, email: userData.email, followers: 0, followingList: [], hobbies: {}, banner: "", avatar: "", bio: userData.bio || "Novo membro da Pintada! 🐆" });
        localStorage.setItem('pintada_active_user', userData.username);
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
            if (index === -1) { followingList.push(targetUsername);
                targetFollowers++; } else { followingList.splice(index, 1);
                targetFollowers = Math.max(0, targetFollowers - 1); }
            await updateDoc(userRef, { followingList: followingList });
            await updateDoc(targetRef, { followers: targetFollowers });
        }
    },
    getCurrentUser() { return localStorage.getItem('pintada_active_user'); },
    async logout() { localStorage.removeItem('pintada_active_user'); if (window.auth) await signOut(window.auth); }
};

const MessageService = {
    async sendMessage(sender, receiver, text) {
        await addDoc(collection(window.db, "messages"), { sender, receiver, text, timestamp: Date.now() });
    },
    // Ouve mensagens em tempo real
    listenToMessages(user1, user2, callback) {
        const q = query(collection(window.db, "messages"), orderBy("timestamp", "asc"));
        return onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(m => (m.sender === user1 && m.receiver === user2) || (m.sender === user2 && m.receiver === user1));
            callback(msgs);
        });
    },
    // Ouve TODAS as mensagens que você recebe (Para a bolinha vermelha)
    listenToAllMyMessages(username, callback) {
        const q = query(collection(window.db, "messages"), where("receiver", "==", username));
        return onSnapshot(q, (snapshot) => { callback(snapshot.docs.length); });
    },
    // Exclui chats selecionados
    async deleteChat(user1, user2) {
        const snapshot = await getDocs(collection(window.db, "messages"));
        snapshot.docs.forEach(async(d) => {
            const m = d.data();
            if ((m.sender === user1 && m.receiver === user2) || (m.sender === user2 && m.receiver === user1)) {
                await deleteDoc(doc(window.db, "messages", d.id));
            }
        });
    }
};

function escapeHTML(str) { return str.replace(/[&<>"']/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[tag] || tag)); }

window.PostService = PostService;
window.AuthService = AuthService;
window.MessageService = MessageService;
window.escapeHTML = escapeHTML;