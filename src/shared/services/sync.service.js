// Simple Firestore sync service for signed-in users
// Mirrors local chrome.storage to Firestore under users/{uid}

const SYNC_PATHS = {
  settings: 'settings',
  categorySites: 'categorySites',
  categoryMetadata: 'categoryMetadata',
  analytics: 'analytics',
};

let currentUid = null;
let isRunning = false;
let debounceTimer = null;
let storageListenerRegistered = false;

function nowTs() {
  return Date.now();
}

function stamped(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return { ...obj, updatedAt: nowTs() };
}

async function readLocal(keys) {
  try {
    return await chrome.storage.local.get(keys);
  } catch (e) {
    console.error('sync.readLocal error', e);
    return {};
  }
}

async function writeLocal(obj) {
  try {
    await chrome.storage.local.set(obj);
  } catch (e) {
    console.error('sync.writeLocal error', e);
  }
}

function userDoc(path) {
  if (!window.firebaseDb || !currentUid) throw new Error('Firestore not ready');
  return window.firebaseDb
    .collection('users')
    .doc(currentUid)
    .collection('data')
    .doc(path);
}

async function pullDoc(key, path) {
  try {
    const docRef = userDoc(path);
    const snap = await docRef.get();
    if (!snap.exists) return null;
    return snap.data();
  } catch (e) {
    console.warn('sync.pullDoc error', key, e);
    return null;
  }
}

async function pushDoc(key, path, value) {
  try {
    const docRef = userDoc(path);
    await docRef.set(value || {}, { merge: true });
  } catch (e) {
    console.warn('sync.pushDoc error', key, e);
  }
}

function mergeByUpdatedAt(localVal, cloudVal) {
  if (!localVal && !cloudVal) return null;
  if (localVal && !cloudVal) return localVal;
  if (!localVal && cloudVal) return cloudVal;
  const lt = localVal.updatedAt || 0;
  const ct = cloudVal.updatedAt || 0;
  return lt >= ct ? localVal : cloudVal;
}

async function pullAll(uid) {
  currentUid = uid;
  const [local, cloudSettings, cloudSites, cloudMeta, cloudAnalytics] =
    await Promise.all([
      readLocal(['settings', 'categorySites', 'categoryMetadata', 'analytics']),
      pullDoc('settings', SYNC_PATHS.settings),
      pullDoc('categorySites', SYNC_PATHS.categorySites),
      pullDoc('categoryMetadata', SYNC_PATHS.categoryMetadata),
      pullDoc('analytics', SYNC_PATHS.analytics),
    ]);

  const localSettings = local.settings ? { ...local.settings } : null;
  const localSites = local.categorySites ? { ...local.categorySites } : null;
  const localMeta = local.categoryMetadata
    ? { ...local.categoryMetadata }
    : null;

  const mergedSettings = mergeByUpdatedAt(localSettings, cloudSettings);
  const mergedSites = mergeByUpdatedAt(localSites, cloudSites);
  const mergedMeta = mergeByUpdatedAt(localMeta, cloudMeta);
  const mergedAnalytics = mergeByUpdatedAt(
    local.analytics || null,
    cloudAnalytics
  );

  const toLocal = {};
  if (mergedSettings) toLocal.settings = mergedSettings;
  if (mergedSites) toLocal.categorySites = mergedSites;
  if (mergedMeta) toLocal.categoryMetadata = mergedMeta;
  if (mergedAnalytics) toLocal.analytics = mergedAnalytics;
  if (Object.keys(toLocal).length) await writeLocal(toLocal);

  // Push back merged to cloud to ensure both sides are aligned
  if (mergedSettings)
    await pushDoc('settings', SYNC_PATHS.settings, stamped(mergedSettings));
  if (mergedSites)
    await pushDoc(
      'categorySites',
      SYNC_PATHS.categorySites,
      stamped(mergedSites)
    );
  if (mergedMeta)
    await pushDoc(
      'categoryMetadata',
      SYNC_PATHS.categoryMetadata,
      stamped(mergedMeta)
    );
  if (mergedAnalytics)
    await pushDoc('analytics', SYNC_PATHS.analytics, stamped(mergedAnalytics));
}

async function pushAll(uid) {
  currentUid = uid;
  const local = await readLocal([
    'settings',
    'categorySites',
    'categoryMetadata',
    'analytics',
  ]);
  if (local.settings)
    await pushDoc('settings', SYNC_PATHS.settings, stamped(local.settings));
  if (local.categorySites)
    await pushDoc(
      'categorySites',
      SYNC_PATHS.categorySites,
      stamped(local.categorySites)
    );
  if (local.categoryMetadata)
    await pushDoc(
      'categoryMetadata',
      SYNC_PATHS.categoryMetadata,
      stamped(local.categoryMetadata)
    );
  if (local.analytics)
    await pushDoc('analytics', SYNC_PATHS.analytics, stamped(local.analytics));
}

function onLocalChanged(changes, area) {
  if (area !== 'local') return;
  if (
    !changes.settings &&
    !changes.categorySites &&
    !changes.categoryMetadata &&
    !changes.analytics
  )
    return;
  if (!currentUid) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      const local = await readLocal([
        'settings',
        'categorySites',
        'categoryMetadata',
        'analytics',
      ]);
      if (local.settings)
        await pushDoc('settings', SYNC_PATHS.settings, stamped(local.settings));
      if (local.categorySites)
        await pushDoc(
          'categorySites',
          SYNC_PATHS.categorySites,
          stamped(local.categorySites)
        );
      if (local.categoryMetadata)
        await pushDoc(
          'categoryMetadata',
          SYNC_PATHS.categoryMetadata,
          stamped(local.categoryMetadata)
        );
      if (local.analytics)
        await pushDoc(
          'analytics',
          SYNC_PATHS.analytics,
          stamped(local.analytics)
        );
    } catch (e) {
      console.warn('sync.debounced push error', e);
    }
  }, 800);
}

async function startSync(uid) {
  if (!uid || !window.firebaseDb) return;
  currentUid = uid;
  if (isRunning) return;
  isRunning = true;
  try {
    await pullAll(uid);
  } catch (e) {
    console.warn('sync.pullAll on start failed', e);
  }
  if (!storageListenerRegistered) {
    try {
      chrome.storage.onChanged.addListener(onLocalChanged);
      storageListenerRegistered = true;
    } catch {}
  }
}

async function stopSync() {
  isRunning = false;
  currentUid = null;
  if (storageListenerRegistered) {
    try {
      chrome.storage.onChanged.removeListener(onLocalChanged);
    } catch {}
    storageListenerRegistered = false;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

// Expose minimal API globally for non-module script usage
window.SyncService = window.SyncService || {};
window.SyncService.startSync = startSync;
window.SyncService.stopSync = stopSync;
window.SyncService.pullAll = pullAll;
window.SyncService.pushAll = pushAll;
