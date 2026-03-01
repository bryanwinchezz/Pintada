import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    doc,
    updateDoc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const PostService = {
    async getPosts() {
        const postsCol = collection(window.db, "posts");
        const q = query(postsCol, orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async addPost(content, user, gifUrl = null, pollData = null) {
        try {
            await addDoc(collection(window.db, "posts"), {
                authorName: user.name || "Utilizador",
                authorUsername: user.username || "anonimo",
                authorAvatar: user.avatar || "",
                content: content || "",
                gif: gifUrl || null,
                poll: pollData || null,
                likes: 0,
                likedBy: [],
                reposts: 0,
                repostedBy: [],
                comments: [],
                timestamp: Date.now(),
                time: "Agora mesmo"
            });
        } catch (e) { console.error("Erro ao salvar post:", e); }
    },

    async toggleReaction(postId, username, type) {
        const postRef = doc(window.db, "posts", postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
            const postData = postSnap.data();
            const listField = type === 'like' ? 'likedBy' : 'repostedBy';
            const countField = type === 'like' ? 'likes' : 'reposts';
            let newList = postData[listField] || [];
            let newCount = postData[countField] || 0;
            if (newList.includes(username)) {
                newList = newList.filter(u => u !== username);
                newCount = Math.max(0, newCount - 1);
            } else {
                newList.push(username);
                newCount++;
            }
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
    }
};

const AuthService = {
    // Nova função de Login
    async login(identifier, password) {
        const users = await this.getUsers();
        // Procura o utilizador pelo username ou email no Firestore
        const userData = users.find(u => u.email === identifier || u.username === identifier);

        if (!userData) throw new Error("Utilizador não encontrado.");

        // Autentica no Firebase usando o email encontrado
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
        const docRef = doc(window.db, "users", username);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    },

    async saveUserData(username, data) {
        await setDoc(doc(window.db, "users", username), data, { merge: true });
    },

    async register(userData) {
        // 1. Cria a conta no Firebase Authentication
        await createUserWithEmailAndPassword(window.auth, userData.email, userData.password);

        // 2. Guarda os dados extras no Firestore
        await setDoc(doc(window.db, "users", userData.username), {
            name: userData.name,
            username: userData.username,
            email: userData.email,
            followers: 0,
            followingList: [],
            hobbies: {},
            banner: "",
            avatar: "",
            bio: userData.bio || "Novo membro da Pintada! 🐆"
        });
        localStorage.setItem('pintada_active_user', userData.username);
    },

    getCurrentUser() {
        return localStorage.getItem('pintada_active_user');
    },

    async logout() {
        localStorage.removeItem('pintada_active_user');
        if (window.auth) await signOut(window.auth);
    }
};

function escapeHTML(str) {
    return str.replace(/[&<>"']/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[tag] || tag));
}

window.PostService = PostService;
window.AuthService = AuthService;
window.escapeHTML = escapeHTML;