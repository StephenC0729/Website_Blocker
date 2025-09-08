// Ensure sync starts on pages that don't load authService (e.g., dashboard)
(function () {
  function startIfVerified(user) {
    try {
      if (!user || !user.emailVerified) return;
      if (
        window.SyncService &&
        typeof window.SyncService.startSync === 'function'
      ) {
        window.SyncService.startSync(user.uid);
      }
    } catch {}
  }

  function stopSync() {
    try {
      if (
        window.SyncService &&
        typeof window.SyncService.stopSync === 'function'
      ) {
        window.SyncService.stopSync();
      }
    } catch {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.firebaseAuth) return;
    window.firebaseAuth.onAuthStateChanged(function (user) {
      if (user && user.emailVerified) {
        startIfVerified(user);
      } else {
        stopSync();
      }
    });
  });
})();
