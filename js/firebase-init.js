// Firebase initialization for the messaging system
(function(){
    const firebaseConfig = {
        apiKey: "AIzaSyDwrwqmp-LshZjFDsykgwKanf1SDO11O0E",
        authDomain: "plataforma-de-voluntariados.firebaseapp.com",
        projectId: "plataforma-de-voluntariados",
        storageBucket: "plataforma-de-voluntariados.firebasestorage.app",
        messagingSenderId: "695935091498",
        appId: "1:695935091498:web:4106f54eaaaf75f0925453",
        measurementId: "G-E93YQR75XQ"
    };

    if(typeof firebase === 'undefined'){
        console.warn('Firebase SDK not loaded. Messaging will continue using localStorage.');
        window.firebaseEnabled = false;
        return;
    }

    try {
        firebase.initializeApp(firebaseConfig);
        window.firebaseDb = firebase.firestore();
        window.firebaseEnabled = true;
    } catch (error) {
        console.warn('Firebase initialization failed:', error);
        window.firebaseEnabled = false;
    }
})();
