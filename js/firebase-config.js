const FirebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const FirebaseApp = {
    app: null,
    auth: null,
    db: null,
    initialized: false,
    
    async init() {
        if (this.initialized) return;
        
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            this.app = initializeApp(FirebaseConfig);
            this.auth = getAuth(this.app);
            this.db = getFirestore(this.app);
            
            this.signInWithEmailAndPassword = signInWithEmailAndPassword;
            this.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
            this.signOut = signOut;
            this.onAuthStateChanged = onAuthStateChanged;
            this.collection = collection;
            this.doc = doc;
            this.setDoc = setDoc;
            this.getDoc = getDoc;
            this.getDocs = getDocs;
            this.updateDoc = updateDoc;
            this.deleteDoc = deleteDoc;
            this.query = query;
            this.where = where;
            this.orderBy = orderBy;
            this.onSnapshot = onSnapshot;
            
            this.initialized = true;
            console.log('Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            return false;
        }
    },
    
    getCurrentUser() {
        return this.auth?.currentUser;
    },
    
    isAuthenticated() {
        return !!this.auth?.currentUser;
    }
};

window.FirebaseApp = FirebaseApp;
