// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD82KGz3nit8AK2Ee8vuV-Y_HqLS6Xv8Fk",
  authDomain: "stocksight-b19bb.firebaseapp.com",
  projectId: "stocksight-b19bb",
  storageBucket: "stocksight-b19bb.firebasestorage.app",
  messagingSenderId: "664168518907",
  appId: "1:664168518907:web:4ffc5da28b24c8070d0c5e",
  measurementId: "G-YGRH0KWNPN"
};

// Initialize Firebase (Compat Version for browser integration)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const analytics = firebase.analytics ? firebase.analytics() : null;

async function getAuthToken() {
    if (auth.currentUser) {
        return await auth.currentUser.getIdToken();
    }
    return null;
}

async function authenticatedFetch(url, options = {}) {
    const token = await getAuthToken();
    const headers = options.headers || {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
}
