// src/shared/services/firebase-init.js
if (!window.firebaseApp) {
  window.firebaseApp = firebase.initializeApp(window.firebaseConfig);
  window.firebaseAuth = firebase.auth();
  if (firebase.firestore) {
    try {
      window.firebaseDb = firebase.firestore();
      if (window.firebaseDb && window.firebaseDb.settings) {
        try {
          window.firebaseDb.settings({
            experimentalAutoDetectLongPolling: true,
          });
        } catch {}
      }
    } catch {}
  }
}
