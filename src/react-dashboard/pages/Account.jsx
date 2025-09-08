import React, { useEffect, useMemo, useState } from 'react';

export default function Account() {
  const [auth, setAuth] = useState(null);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [currPwd, setCurrPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [nameInput, setNameInput] = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState({ type: '', text: '' });
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delMsg, setDelMsg] = useState({ type: '', text: '' });
  const [delPwd, setDelPwd] = useState('');

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem('authUser');
        const parsed = raw ? JSON.parse(raw) : null;
        setAuth(parsed);
        setNameInput((parsed && parsed.name) || '');
      } catch {
        setAuth(null);
      }
    };
    read();
    const onStorage = (e) => {
      if (e.key === 'authUser') read();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const initials = useMemo(() => {
    if (!auth || !auth.name) return 'U';
    const n = auth.name.trim();
    return n ? n[0].toUpperCase() : 'U';
  }, [auth]);

  if (!auth) {
    return (
      <div className="flex-1 p-6 overflow-auto min-h-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 theme-transition">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            <i className="fas fa-user-circle text-blue-500 mr-2"></i>
            Account
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You are not signed in. Please log in to manage your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto min-h-full">
      {/* Profile */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 theme-transition">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <i className="fas fa-user-cog text-blue-500 mr-2"></i>
          Manage Account
        </h3>
        <div className="flex items-start">
          <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold mr-4">
            {initials}
          </div>
          <div className="flex-1">
            <div className="text-gray-900 dark:text-white font-medium mb-2">
              Profile
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display name
                </label>
                <div className="flex items-center justify-between mt-1">
                  <input
                    type="text"
                    className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 mr-3"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    disabled={nameBusy}
                  />
                  <button
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                      nameBusy ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    disabled={nameBusy}
                    onClick={async () => {
                      try {
                        setNameMsg({ type: '', text: '' });
                        const val = (nameInput || '').trim();
                        if (!val) {
                          setNameMsg({
                            type: 'error',
                            text: 'Display name cannot be empty.',
                          });
                          return;
                        }
                        if (val.length > 60) {
                          setNameMsg({
                            type: 'error',
                            text: 'Display name is too long.',
                          });
                          return;
                        }
                        const user =
                          (window.firebaseAuth &&
                            window.firebaseAuth.currentUser) ||
                          null;
                        if (!user) {
                          setNameMsg({
                            type: 'error',
                            text: 'Authentication not initialized.',
                          });
                          return;
                        }
                        setNameBusy(true);
                        await user.updateProfile({ displayName: val });
                        try {
                          const rawL = localStorage.getItem('authUser');
                          const parsedL = rawL ? JSON.parse(rawL) : {};
                          parsedL.name = val;
                          localStorage.setItem(
                            'authUser',
                            JSON.stringify(parsedL)
                          );
                          setAuth(parsedL);
                          try {
                            window.dispatchEvent(
                              new CustomEvent('authUserUpdated', {
                                detail: parsedL,
                              })
                            );
                          } catch {}
                        } catch {}
                        setNameMsg({
                          type: 'success',
                          text: 'Display name updated.',
                        });
                      } catch (e) {
                        setNameMsg({
                          type: 'error',
                          text:
                            e && e.message
                              ? e.message
                              : 'Failed to update display name.',
                        });
                      } finally {
                        setNameBusy(false);
                      }
                    }}
                  >
                    {nameBusy ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
                {nameMsg.text ? (
                  <div
                    className={`mt-2 text-xs ${
                      nameMsg.type === 'success'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {nameMsg.text}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                  value={auth.email || ''}
                  disabled
                />
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Sign-in: {auth.loginType || 'email'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Password management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 theme-transition">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
          <i className="fas fa-shield-alt text-green-500 mr-2"></i>
          Security
        </h4>
        {auth.loginType !== 'email' ? (
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-900 dark:text-white font-medium">
                  Password
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Password changes are managed by your provider (
                  {auth.loginType}).
                </div>
              </div>
              <div>
                <button
                  disabled
                  className="px-4 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                >
                  Change password unavailable
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-900 dark:text-white font-medium">
                  Password
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Change your account password
                </div>
              </div>
              <div>
                <button
                  className="px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  onClick={() => {
                    setMsg({ type: '', text: '' });
                    setCurrPwd('');
                    setNewPwd('');
                    setNewPwd2('');
                    setShowPwdModal(true);
                  }}
                >
                  Change password
                </button>
              </div>
            </div>
          </div>
        )}
        {msg.text ? (
          <div
            className={`mt-4 text-xs ${
              msg.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {msg.text}
          </div>
        ) : null}
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 theme-transition">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
          <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>
          Danger Zone
        </h4>
        <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-900 dark:text-white font-medium">
                Delete account
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Permanently delete your account and synced data
              </div>
            </div>
            <div>
              <button
                className="px-4 py-2 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
                onClick={() => {
                  setDelMsg({ type: '', text: '' });
                  setDelPwd('');
                  setDelOpen(true);
                }}
              >
                Delete account
              </button>
            </div>
          </div>
          {delMsg.text ? (
            <div
              className={`mt-2 text-xs ${
                delMsg.type === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {delMsg.text}
            </div>
          ) : null}
        </div>
      </div>

      <DeleteAccountModal
        open={delOpen}
        loginType={auth.loginType}
        busy={delBusy}
        currPwd={delPwd}
        onClose={() => (delBusy ? null : setDelOpen(false))}
        setCurrPwd={setDelPwd}
        onSubmitEmailFlow={async () => {
          try {
            setDelMsg({ type: '', text: '' });
            if (!delPwd) {
              setDelMsg({
                type: 'error',
                text: 'Please enter your current password.',
              });
              return;
            }
            const user =
              (window.firebaseAuth && window.firebaseAuth.currentUser) || null;
            const firebaseGlobal =
              (window.firebase && window.firebase.auth) || null;
            if (!user || !firebaseGlobal || !user.email) {
              setDelMsg({
                type: 'error',
                text: 'Authentication not initialized.',
              });
              return;
            }
            setDelBusy(true);
            try {
              const credential = firebaseGlobal.EmailAuthProvider.credential(
                user.email,
                delPwd
              );
              await user.reauthenticateWithCredential(credential);
            } catch (e) {
              const code = (e && e.code) || '';
              if (code === 'auth/wrong-password') {
                setDelMsg({
                  type: 'error',
                  text: 'Current password is incorrect.',
                });
              } else {
                setDelMsg({
                  type: 'error',
                  text:
                    e && e.message ? e.message : 'Re-authentication failed.',
                });
              }
              setDelBusy(false);
              return;
            }
            await doDeleteAccount();
          } catch (e) {
            setDelMsg({ type: 'error', text: 'Failed to delete account.' });
          } finally {
            setDelBusy(false);
          }
        }}
        onSubmitGoogleFlow={async () => {
          try {
            setDelMsg({ type: '', text: '' });
            const ok = await reauthWithGoogle();
            if (!ok) return;
            setDelBusy(true);
            await doDeleteAccount();
          } catch (e) {
            setDelMsg({
              type: 'error',
              text: e && e.message ? e.message : 'Failed to delete account.',
            });
          } finally {
            setDelBusy(false);
          }
        }}
      />

      {/* Change Password Modal */}
      <PasswordModal
        open={showPwdModal}
        onClose={() => {
          if (busy) return;
          setShowPwdModal(false);
        }}
        onSubmit={async () => {
          try {
            setMsg({ type: '', text: '' });
            if (!currPwd || !newPwd || !newPwd2) {
              setMsg({ type: 'error', text: 'Please fill in all fields.' });
              return;
            }
            if (newPwd !== newPwd2) {
              setMsg({ type: 'error', text: 'New passwords do not match.' });
              return;
            }
            if (newPwd.length < 6) {
              setMsg({
                type: 'error',
                text: 'New password must be at least 6 characters.',
              });
              return;
            }
            const user =
              (window.firebaseAuth && window.firebaseAuth.currentUser) || null;
            const firebaseGlobal =
              (window.firebase && window.firebase.auth) || null;
            if (!user || !firebaseGlobal) {
              setMsg({
                type: 'error',
                text: 'Authentication not initialized.',
              });
              return;
            }
            if (!user.email) {
              setMsg({ type: 'error', text: 'No email on record for user.' });
              return;
            }
            setBusy(true);
            try {
              const credential = firebaseGlobal.EmailAuthProvider.credential(
                user.email,
                currPwd
              );
              await user.reauthenticateWithCredential(credential);
            } catch (e) {
              const code = (e && e.code) || '';
              if (code === 'auth/wrong-password') {
                setMsg({
                  type: 'error',
                  text: 'Current password is incorrect.',
                });
              } else if (code === 'auth/too-many-requests') {
                setMsg({
                  type: 'error',
                  text: 'Too many attempts. Try again later.',
                });
              } else {
                setMsg({
                  type: 'error',
                  text:
                    e && e.message ? e.message : 'Re-authentication failed.',
                });
              }
              setBusy(false);
              return;
            }
            try {
              await user.updatePassword(newPwd);
              setShowPwdModal(false);
              setCurrPwd('');
              setNewPwd('');
              setNewPwd2('');
              setMsg({
                type: 'success',
                text: 'Password updated successfully.',
              });
            } catch (e) {
              const code = (e && e.code) || '';
              if (code === 'auth/weak-password') {
                setMsg({ type: 'error', text: 'New password is too weak.' });
              } else if (code === 'auth/requires-recent-login') {
                setMsg({
                  type: 'error',
                  text: 'Please re-authenticate and try again.',
                });
              } else {
                setMsg({
                  type: 'error',
                  text:
                    e && e.message ? e.message : 'Failed to update password.',
                });
              }
            } finally {
              setBusy(false);
            }
          } catch (err) {
            setBusy(false);
            setMsg({
              type: 'error',
              text: 'Unexpected error. Please try again.',
            });
          }
        }}
        busy={busy}
        currPwd={currPwd}
        newPwd={newPwd}
        newPwd2={newPwd2}
        setCurrPwd={setCurrPwd}
        setNewPwd={setNewPwd}
        setNewPwd2={setNewPwd2}
      />
    </div>
  );
}

// Modal component co-located for simplicity
export function PasswordModal({
  open,
  onClose,
  onSubmit,
  busy,
  currPwd,
  newPwd,
  newPwd2,
  setCurrPwd,
  setNewPwd,
  setNewPwd2,
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={() => (busy ? null : onClose())}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Change Password
          </h3>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={() => (busy ? null : onClose())}
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              value={currPwd}
              onChange={(e) => setCurrPwd(e.target.value)}
              disabled={busy}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              disabled={busy}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              value={newPwd2}
              onChange={(e) => setNewPwd2(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => (busy ? null : onClose())}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={busy}
            >
              {busy ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DeleteAccountModal({
  open,
  loginType,
  busy,
  currPwd,
  setCurrPwd,
  onClose,
  onSubmitEmailFlow,
  onSubmitGoogleFlow,
}) {
  if (!open) return null;
  const isEmail = loginType === 'email' || !loginType;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={() => (busy ? null : onClose())}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
  <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Delete Account
          </h3>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={() => (busy ? null : onClose())}
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          This action is permanent and cannot be undone.
        </p>
        {isEmail ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) onSubmitEmailFlow();
            }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                value={currPwd}
                onChange={(e) => setCurrPwd(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => (busy ? null : onClose())}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={busy}
              >
                {busy ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Re-authentication via {loginType} is required to continue.
            </div>
            <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => (busy ? null : onClose())}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                onClick={onSubmitGoogleFlow}
                disabled={busy}
              >
                {busy ? 'Deleting…' : 'Re-auth & delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

async function doDeleteAccount() {
  const user = (window.firebaseAuth && window.firebaseAuth.currentUser) || null;
  if (!user) throw new Error('No authenticated user.');
  try {
    await user.delete();
  } catch (e) {
    throw e;
  }
  try {
    if (
      window.SyncService &&
      typeof window.SyncService.stopSync === 'function'
    ) {
      await window.SyncService.stopSync();
    }
  } catch {}
  try {
    localStorage.removeItem('authUser');
  } catch {}
  try {
    if (
      window.firebaseAuth &&
      typeof window.firebaseAuth.signOut === 'function'
    ) {
      await window.firebaseAuth.signOut();
    }
  } catch {}
  try {
    const url =
      (window.chrome &&
        window.chrome.runtime &&
        window.chrome.runtime.getURL &&
        window.chrome.runtime.getURL('src/pages/login.html')) ||
      '../pages/login.html';
    if (window.chrome && window.chrome.tabs && window.chrome.tabs.create) {
      window.chrome.tabs.create({ url });
      window.close && window.close();
    } else {
      window.location.href = url;
    }
  } catch {}
}

async function reauthWithGoogle() {
  try {
    if (!window.chrome || !chrome.identity) {
      throw new Error('Google re-auth not supported in this context');
    }
    const redirectUrl = chrome.identity.getRedirectURL('oauth2');
    const clientId =
      (chrome.runtime &&
        chrome.runtime.getManifest &&
        chrome.runtime.getManifest().oauth2 &&
        chrome.runtime.getManifest().oauth2.client_id) ||
      '';
    const scope =
      'email profile https://www.googleapis.com/auth/userinfo.email';
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${encodeURIComponent(
      clientId
    )}&response_type=token&redirect_uri=${encodeURIComponent(
      redirectUrl
    )}&scope=${encodeURIComponent(scope)}&prompt=consent`;
    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (url) => {
          if (chrome.runtime.lastError || !url) {
            reject(new Error('WebAuthFlow failed'));
          } else {
            resolve(url);
          }
        }
      );
    });
    const params = new URL(responseUrl).hash.substring(1);
    const accessToken = new URLSearchParams(params).get('access_token');
    if (!accessToken) throw new Error('No access token received');
    const f = (window.firebase && window.firebase.auth) || null;
    const user =
      (window.firebaseAuth && window.firebaseAuth.currentUser) || null;
    if (!f || !user) throw new Error('Auth not initialized');
    const credential = f.GoogleAuthProvider.credential(null, accessToken);
    await user.reauthenticateWithCredential(credential);
    return true;
  } catch (e) {
    console.error('Google re-auth failed:', e);
    return false;
  }
}
