const FirebaseService = {
    initialized: false,
    db: null,
    auth: null,
    listeners: {},
    
    async init() {
        if (this.initialized) return;
        
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const app = initializeApp(window.FirebaseConfig || {
                apiKey: "YOUR_API_KEY",
                authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
                projectId: "YOUR_PROJECT_ID",
                storageBucket: "YOUR_PROJECT_ID.appspot.com",
                messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
                appId: "YOUR_APP_ID"
            });
            
            this.auth = getAuth(app);
            this.db = getFirestore(app);
            this.initialized = true;
            
            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    localStorage.setItem('currentUser', JSON.stringify({
                        uid: user.uid,
                        email: user.email
                    }));
                } else {
                    localStorage.removeItem('currentUser');
                }
            });
            
            console.log('Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            return false;
        }
    },
    
    async ensureInit() {
        if (!this.initialized) {
            await this.init();
        }
    },
    
    async signIn(username, password) {
        await this.ensureInit();
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        try {
            const users = await this.getUsers();
            const user = users.find(u => u.username === username);
            
            if (!user) {
                return { success: false, message: '用户不存在' };
            }
            
            const email = user.email || `${username}@class-system.local`;
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            
            const userData = await this.getUserById(user.id);
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            return { success: true, user: userData };
        } catch (error) {
            console.error('Sign in error:', error);
            if (error.code === 'auth/user-not-found') {
                return { success: false, message: '用户不存在' };
            } else if (error.code === 'auth/wrong-password') {
                return { success: false, message: '密码错误' };
            } else if (error.code === 'auth/invalid-email') {
                return { success: false, message: '账号格式错误' };
            }
            return { success: false, message: '登录失败: ' + error.message };
        }
    },
    
    async signOut() {
        await this.ensureInit();
        const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        try {
            await signOut(this.auth);
            localStorage.removeItem('currentUser');
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, message: error.message };
        }
    },
    
    async getCurrentUser() {
        const userJson = localStorage.getItem('currentUser');
        if (userJson) {
            return JSON.parse(userJson);
        }
        return null;
    },
    
    async getUsers() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'users'));
            const users = [];
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });
            return users;
        } catch (error) {
            console.error('Get users error:', error);
            return JSON.parse(localStorage.getItem('users') || '[]');
        }
    },
    
    async getUserById(id) {
        await this.ensureInit();
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const docRef = doc(this.db, 'users', String(id));
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    },
    
    async getUserByUsername(username) {
        const users = await this.getUsers();
        return users.find(u => u.username === username);
    },
    
    async addUser(userData) {
        await this.ensureInit();
        const { collection, addDoc, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        try {
            const users = await this.getUsers();
            const maxId = users.length > 0 ? Math.max(...users.map(u => parseInt(u.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const email = userData.email || `${userData.username}@class-system.local`;
            
            try {
                const userCredential = await createUserWithEmailAndPassword(
                    this.auth, 
                    email, 
                    userData.password || '123456'
                );
            } catch (authError) {
                if (authError.code !== 'auth/email-already-in-use') {
                    console.warn('Auth user creation warning:', authError.message);
                }
            }
            
            const newUser = {
                ...userData,
                id: newId,
                createdAt: new Date().toISOString(),
                status: userData.status || 'active'
            };
            
            await addDoc(collection(this.db, 'users'), newUser);
            
            return newUser;
        } catch (error) {
            console.error('Add user error:', error);
            throw error;
        }
    },
    
    async updateUser(id, updates) {
        await this.ensureInit();
        const { collection, query, where, getDocs, updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'users'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docRef = querySnapshot.docs[0].ref;
                await updateDoc(docRef, updates);
                return { id, ...updates };
            }
            return null;
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    },
    
    async deleteUser(id) {
        await this.ensureInit();
        const { collection, query, where, getDocs, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'users'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await deleteDoc(querySnapshot.docs[0].ref);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    },
    
    async getGroups() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'groups'));
            const groups = [];
            querySnapshot.forEach((doc) => {
                groups.push({ id: doc.id, ...doc.data() });
            });
            return groups;
        } catch (error) {
            console.error('Get groups error:', error);
            return JSON.parse(localStorage.getItem('groups') || '[]');
        }
    },
    
    async addGroup(groupData) {
        await this.ensureInit();
        const { collection, addDoc, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const groups = await this.getGroups();
            const maxId = groups.length > 0 ? Math.max(...groups.map(g => parseInt(g.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const newGroup = {
                ...groupData,
                id: newId,
                createdAt: new Date().toISOString()
            };
            
            await addDoc(collection(this.db, 'groups'), newGroup);
            return newGroup;
        } catch (error) {
            console.error('Add group error:', error);
            throw error;
        }
    },
    
    async updateGroup(id, updates) {
        await this.ensureInit();
        const { collection, query, where, getDocs, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'groups'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await updateDoc(querySnapshot.docs[0].ref, updates);
                return { id, ...updates };
            }
            return null;
        } catch (error) {
            console.error('Update group error:', error);
            throw error;
        }
    },
    
    async deleteGroup(id) {
        await this.ensureInit();
        const { collection, query, where, getDocs, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'groups'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await deleteDoc(querySnapshot.docs[0].ref);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete group error:', error);
            throw error;
        }
    },
    
    async getAttendances() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'attendances'));
            const attendances = [];
            querySnapshot.forEach((doc) => {
                attendances.push({ id: doc.id, ...doc.data() });
            });
            return attendances;
        } catch (error) {
            console.error('Get attendances error:', error);
            return JSON.parse(localStorage.getItem('attendances') || '[]');
        }
    },
    
    async addAttendance(attendanceData) {
        await this.ensureInit();
        const { collection, addDoc, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const attendances = await this.getAttendances();
            const maxId = attendances.length > 0 ? Math.max(...attendances.map(a => parseInt(a.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const newAttendance = {
                ...attendanceData,
                id: newId,
                createdAt: new Date().toISOString()
            };
            
            await addDoc(collection(this.db, 'attendances'), newAttendance);
            return newAttendance;
        } catch (error) {
            console.error('Add attendance error:', error);
            throw error;
        }
    },
    
    async updateAttendance(id, updates) {
        await this.ensureInit();
        const { collection, query, where, getDocs, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'attendances'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await updateDoc(querySnapshot.docs[0].ref, updates);
                return { id, ...updates };
            }
            return null;
        } catch (error) {
            console.error('Update attendance error:', error);
            throw error;
        }
    },
    
    async deleteAttendance(id) {
        await this.ensureInit();
        const { collection, query, where, getDocs, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'attendances'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await deleteDoc(querySnapshot.docs[0].ref);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete attendance error:', error);
            throw error;
        }
    },
    
    async getAttendanceRecords() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'attendanceRecords'));
            const records = [];
            querySnapshot.forEach((doc) => {
                records.push({ id: doc.id, ...doc.data() });
            });
            return records;
        } catch (error) {
            console.error('Get attendance records error:', error);
            return JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
        }
    },
    
    async addAttendanceRecord(recordData) {
        await this.ensureInit();
        const { collection, addDoc, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const records = await this.getAttendanceRecords();
            const maxId = records.length > 0 ? Math.max(...records.map(r => parseInt(r.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const newRecord = {
                ...recordData,
                id: newId,
                createdAt: new Date().toISOString()
            };
            
            await addDoc(collection(this.db, 'attendanceRecords'), newRecord);
            return newRecord;
        } catch (error) {
            console.error('Add attendance record error:', error);
            throw error;
        }
    },
    
    async getExams() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'exams'));
            const exams = [];
            querySnapshot.forEach((doc) => {
                exams.push({ id: doc.id, ...doc.data() });
            });
            return exams;
        } catch (error) {
            console.error('Get exams error:', error);
            return JSON.parse(localStorage.getItem('exams') || '[]');
        }
    },
    
    async addExam(examData) {
        await this.ensureInit();
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const exams = await this.getExams();
            const maxId = exams.length > 0 ? Math.max(...exams.map(e => parseInt(e.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const newExam = {
                ...examData,
                id: newId,
                createdAt: new Date().toISOString()
            };
            
            await addDoc(collection(this.db, 'exams'), newExam);
            return newExam;
        } catch (error) {
            console.error('Add exam error:', error);
            throw error;
        }
    },
    
    async updateExam(id, updates) {
        await this.ensureInit();
        const { collection, query, where, getDocs, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'exams'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await updateDoc(querySnapshot.docs[0].ref, updates);
                return { id, ...updates };
            }
            return null;
        } catch (error) {
            console.error('Update exam error:', error);
            throw error;
        }
    },
    
    async deleteExam(id) {
        await this.ensureInit();
        const { collection, query, where, getDocs, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'exams'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await deleteDoc(querySnapshot.docs[0].ref);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete exam error:', error);
            throw error;
        }
    },
    
    async getQuestions() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'questions'));
            const questions = [];
            querySnapshot.forEach((doc) => {
                questions.push({ id: doc.id, ...doc.data() });
            });
            return questions;
        } catch (error) {
            console.error('Get questions error:', error);
            return JSON.parse(localStorage.getItem('questions') || '[]');
        }
    },
    
    async addQuestion(questionData) {
        await this.ensureInit();
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const questions = await this.getQuestions();
            const maxId = questions.length > 0 ? Math.max(...questions.map(q => parseInt(q.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const newQuestion = {
                ...questionData,
                id: newId,
                createdAt: new Date().toISOString()
            };
            
            await addDoc(collection(this.db, 'questions'), newQuestion);
            return newQuestion;
        } catch (error) {
            console.error('Add question error:', error);
            throw error;
        }
    },
    
    async getExamRecords() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'examRecords'));
            const records = [];
            querySnapshot.forEach((doc) => {
                records.push({ id: doc.id, ...doc.data() });
            });
            return records;
        } catch (error) {
            console.error('Get exam records error:', error);
            return JSON.parse(localStorage.getItem('examRecords') || '[]');
        }
    },
    
    async addExamRecord(recordData) {
        await this.ensureInit();
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const records = await this.getExamRecords();
            const maxId = records.length > 0 ? Math.max(...records.map(r => parseInt(r.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const newRecord = {
                ...recordData,
                id: newId,
                submittedAt: new Date().toISOString()
            };
            
            await addDoc(collection(this.db, 'examRecords'), newRecord);
            return newRecord;
        } catch (error) {
            console.error('Add exam record error:', error);
            throw error;
        }
    },
    
    async getVotes() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'votes'));
            const votes = [];
            querySnapshot.forEach((doc) => {
                votes.push({ id: doc.id, ...doc.data() });
            });
            return votes;
        } catch (error) {
            console.error('Get votes error:', error);
            return JSON.parse(localStorage.getItem('votes') || '[]');
        }
    },
    
    async addVote(voteData) {
        await this.ensureInit();
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const votes = await this.getVotes();
            const maxId = votes.length > 0 ? Math.max(...votes.map(v => parseInt(v.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const newVote = {
                ...voteData,
                id: newId,
                createdAt: new Date().toISOString()
            };
            
            await addDoc(collection(this.db, 'votes'), newVote);
            return newVote;
        } catch (error) {
            console.error('Add vote error:', error);
            throw error;
        }
    },
    
    async updateVote(id, updates) {
        await this.ensureInit();
        const { collection, query, where, getDocs, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'votes'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await updateDoc(querySnapshot.docs[0].ref, updates);
                return { id, ...updates };
            }
            return null;
        } catch (error) {
            console.error('Update vote error:', error);
            throw error;
        }
    },
    
    async deleteVote(id) {
        await this.ensureInit();
        const { collection, query, where, getDocs, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'votes'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await deleteDoc(querySnapshot.docs[0].ref);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete vote error:', error);
            throw error;
        }
    },
    
    async getVoteRecords() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'voteRecords'));
            const records = [];
            querySnapshot.forEach((doc) => {
                records.push({ id: doc.id, ...doc.data() });
            });
            return records;
        } catch (error) {
            console.error('Get vote records error:', error);
            return JSON.parse(localStorage.getItem('voteRecords') || '[]');
        }
    },
    
    async addVoteRecord(recordData) {
        await this.ensureInit();
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const records = await this.getVoteRecords();
            const maxId = records.length > 0 ? Math.max(...records.map(r => parseInt(r.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const newRecord = {
                ...recordData,
                id: newId,
                votedAt: new Date().toISOString()
            };
            
            await addDoc(collection(this.db, 'voteRecords'), newRecord);
            return newRecord;
        } catch (error) {
            console.error('Add vote record error:', error);
            throw error;
        }
    },
    
    async getLotteries() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'lotteries'));
            const lotteries = [];
            querySnapshot.forEach((doc) => {
                lotteries.push({ id: doc.id, ...doc.data() });
            });
            return lotteries;
        } catch (error) {
            console.error('Get lotteries error:', error);
            return JSON.parse(localStorage.getItem('lotteries') || '[]');
        }
    },
    
    async addLottery(lotteryData) {
        await this.ensureInit();
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const lotteries = await this.getLotteries();
            const maxId = lotteries.length > 0 ? Math.max(...lotteries.map(l => parseInt(l.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const newLottery = {
                ...lotteryData,
                id: newId,
                createdAt: new Date().toISOString()
            };
            
            await addDoc(collection(this.db, 'lotteries'), newLottery);
            return newLottery;
        } catch (error) {
            console.error('Add lottery error:', error);
            throw error;
        }
    },
    
    async updateLottery(id, updates) {
        await this.ensureInit();
        const { collection, query, where, getDocs, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'lotteries'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await updateDoc(querySnapshot.docs[0].ref, updates);
                return { id, ...updates };
            }
            return null;
        } catch (error) {
            console.error('Update lottery error:', error);
            throw error;
        }
    },
    
    async deleteLottery(id) {
        await this.ensureInit();
        const { collection, query, where, getDocs, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'lotteries'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await deleteDoc(querySnapshot.docs[0].ref);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete lottery error:', error);
            throw error;
        }
    },
    
    async getLotteryRecords() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'lotteryRecords'));
            const records = [];
            querySnapshot.forEach((doc) => {
                records.push({ id: doc.id, ...doc.data() });
            });
            return records;
        } catch (error) {
            console.error('Get lottery records error:', error);
            return JSON.parse(localStorage.getItem('lotteryRecords') || '[]');
        }
    },
    
    async addLotteryRecord(recordData) {
        await this.ensureInit();
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const records = await this.getLotteryRecords();
            const maxId = records.length > 0 ? Math.max(...records.map(r => parseInt(r.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const newRecord = {
                ...recordData,
                id: newId,
                drawnAt: new Date().toISOString()
            };
            
            await addDoc(collection(this.db, 'lotteryRecords'), newRecord);
            return newRecord;
        } catch (error) {
            console.error('Add lottery record error:', error);
            throw error;
        }
    },
    
    async getNotifications() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'notifications'));
            const notifications = [];
            querySnapshot.forEach((doc) => {
                notifications.push({ id: doc.id, ...doc.data() });
            });
            return notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (error) {
            console.error('Get notifications error:', error);
            return JSON.parse(localStorage.getItem('notifications') || '[]');
        }
    },
    
    async addNotification(notificationData) {
        await this.ensureInit();
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const notifications = await this.getNotifications();
            const maxId = notifications.length > 0 ? Math.max(...notifications.map(n => parseInt(n.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const newNotification = {
                ...notificationData,
                id: newId,
                createdAt: new Date().toISOString(),
                read: false
            };
            
            await addDoc(collection(this.db, 'notifications'), newNotification);
            return newNotification;
        } catch (error) {
            console.error('Add notification error:', error);
            throw error;
        }
    },
    
    async markNotificationRead(id) {
        await this.ensureInit();
        const { collection, query, where, getDocs, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'notifications'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await updateDoc(querySnapshot.docs[0].ref, { read: true });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Mark notification read error:', error);
            throw error;
        }
    },
    
    async getPasswordResetRequests() {
        await this.ensureInit();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const querySnapshot = await getDocs(collection(this.db, 'passwordResetRequests'));
            const requests = [];
            querySnapshot.forEach((doc) => {
                requests.push({ id: doc.id, ...doc.data() });
            });
            return requests;
        } catch (error) {
            console.error('Get password reset requests error:', error);
            return JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
        }
    },
    
    async addPasswordResetRequest(requestData) {
        await this.ensureInit();
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const requests = await this.getPasswordResetRequests();
            const maxId = requests.length > 0 ? Math.max(...requests.map(r => parseInt(r.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const newRequest = {
                ...requestData,
                id: newId,
                createdAt: new Date().toISOString(),
                status: 'pending'
            };
            
            await addDoc(collection(this.db, 'passwordResetRequests'), newRequest);
            return newRequest;
        } catch (error) {
            console.error('Add password reset request error:', error);
            throw error;
        }
    },
    
    async processPasswordResetRequest(id, processed) {
        await this.ensureInit();
        const { collection, query, where, getDocs, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const q = query(collection(this.db, 'passwordResetRequests'), where('id', '==', String(id)));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const request = querySnapshot.docs[0].data();
                await updateDoc(querySnapshot.docs[0].ref, {
                    status: processed ? 'processed' : 'rejected',
                    processedAt: new Date().toISOString()
                });
                
                if (processed) {
                    const user = await this.getUserByUsername(request.username);
                    if (user) {
                        await this.updateUser(user.id, { password: '123456' });
                    }
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Process password reset request error:', error);
            throw error;
        }
    },
    
    async getPermissionSettings() {
        const saved = localStorage.getItem('permissionSettings');
        return saved ? JSON.parse(saved) : {
            attendance: { showMemberList: true, showSignedCount: true, showUnsignedList: false },
            exam: { showMemberList: true, showScores: false, showAnswers: false, showRanking: false },
            vote: { showMemberList: true, showVoteCount: true, showVoteDetails: false },
            lottery: { showMemberList: true, showPrizeList: true, showWinnerList: false }
        };
    },
    
    async savePermissionSettings(settings) {
        localStorage.setItem('permissionSettings', JSON.stringify(settings));
    },
    
    async canView(module, permission) {
        const user = await this.getCurrentUser();
        if (!user) return false;
        
        if (user.role === 'admin' || user.role === 'subAdmin') {
            return true;
        }
        
        const settings = await this.getPermissionSettings();
        if (settings[module] && settings[module][permission] !== undefined) {
            return settings[module][permission];
        }
        
        return false;
    },
    
    exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            alert('没有数据可导出');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => {
                let value = row[h];
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                value = String(value || '').replace(/"/g, '""');
                return `"${value}"`;
            }).join(','))
        ].join('\n');
        
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename + '.csv';
        link.click();
    },
    
    async migrateFromLocalStorage() {
        console.log('Starting migration from LocalStorage to Firebase...');
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const groups = JSON.parse(localStorage.getItem('groups') || '[]');
        const attendances = JSON.parse(localStorage.getItem('attendances') || '[]');
        const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
        const exams = JSON.parse(localStorage.getItem('exams') || '[]');
        const examRecords = JSON.parse(localStorage.getItem('examRecords') || '[]');
        const questions = JSON.parse(localStorage.getItem('questions') || '[]');
        const votes = JSON.parse(localStorage.getItem('votes') || '[]');
        const voteRecords = JSON.parse(localStorage.getItem('voteRecords') || '[]');
        const lotteries = JSON.parse(localStorage.getItem('lotteries') || '[]');
        const lotteryRecords = JSON.parse(localStorage.getItem('lotteryRecords') || '[]');
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        
        for (const user of users) {
            try {
                await this.addUser(user);
            } catch (e) {
                console.log('User already exists:', user.username);
            }
        }
        
        for (const group of groups) {
            try {
                await this.addGroup(group);
            } catch (e) {
                console.log('Group already exists:', group.name);
            }
        }
        
        console.log('Migration completed!');
    }
};

window.FirebaseService = FirebaseService;
