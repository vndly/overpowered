importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js');

const firebaseConfig = {
    authDomain: "tension-path.firebaseapp.com",
    projectId: "tension-path",
    storageBucket: "tension-path.appspot.com",
    messagingSenderId: "183502893220",
    appId: "1:183502893220:web:2b1cc8c9b1378b23ecb631",
    measurementId: "G-XBSE04LEGT"
}

firebase.initializeApp(firebaseConfig);