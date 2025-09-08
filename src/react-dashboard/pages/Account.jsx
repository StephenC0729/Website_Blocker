import React, { useEffect, useMemo, useState } from 'react';

export default function Account() {
  const [auth, setAuth] = useState(null);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [currPwd, setCurrPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem('authUser');
        setAuth(raw ? JSON.parse(raw) : null);
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
        <div className="flex items-center">
          <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold mr-4">
            {initials}
          </div>
          <div>
            <div className="text-gray-900 dark:text-white font-medium">{auth.name || 'User'}</div>
            <div className="text-gray-600 dark:text-gray-300 text-sm">{auth.email || ''}</div>
            <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">Sign-in: {auth.loginType || 'email'}</div>
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
            <div className="text-sm text-gray-900 dark:text-white font-medium">Password</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Password changes are managed by your provider ({auth.loginType}).
            </div>
            <div className="mt-3">
              <button disabled className="px-3 py-1.5 text-xs rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed">
                Change password unavailable
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-900 dark:text-white font-medium">Password</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Change your account password
            </div>
            <div className="mt-3">
              <button
                className="px-3 py-1.5 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white"
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
          <div className="text-sm text-gray-900 dark:text-white font-medium">Delete account</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Permanently delete your account and synced data</div>
          <div className="mt-3">
            <button disabled className="px-3 py-1.5 text-xs rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed">
              Delete account (coming soon)
            </button>
          </div>
        </div>
      </div>

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
              setMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
              return;
            }
            const user = (window.firebaseAuth && window.firebaseAuth.currentUser) || null;
            const firebaseGlobal = (window.firebase && window.firebase.auth) || null;
            if (!user || !firebaseGlobal) {
              setMsg({ type: 'error', text: 'Authentication not initialized.' });
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
                setMsg({ type: 'error', text: 'Current password is incorrect.' });
              } else if (code === 'auth/too-many-requests') {
                setMsg({ type: 'error', text: 'Too many attempts. Try again later.' });
              } else {
                setMsg({ type: 'error', text: e && e.message ? e.message : 'Re-authentication failed.' });
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
              setMsg({ type: 'success', text: 'Password updated successfully.' });
            } catch (e) {
              const code = (e && e.code) || '';
              if (code === 'auth/weak-password') {
                setMsg({ type: 'error', text: 'New password is too weak.' });
              } else if (code === 'auth/requires-recent-login') {
                setMsg({ type: 'error', text: 'Please re-authenticate and try again.' });
              } else {
                setMsg({ type: 'error', text: e && e.message ? e.message : 'Failed to update password.' });
              }
            } finally {
              setBusy(false);
            }
          } catch (err) {
            setBusy(false);
            setMsg({ type: 'error', text: 'Unexpected error. Please try again.' });
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
export function PasswordModal({ open, onClose, onSubmit, busy, currPwd, newPwd, newPwd2, setCurrPwd, setNewPwd, setNewPwd2 }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => (busy ? null : onClose())}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 theme-transition">
        <h5 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Change Password
        </h5>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Current password</label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
              value={currPwd}
              onChange={(e) => setCurrPwd(e.target.value)}
              disabled={busy}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">New password</label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              disabled={busy}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Confirm new password</label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
              value={newPwd2}
              onChange={(e) => setNewPwd2(e.target.value)}
              disabled={busy}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end space-x-2">
          <button
            className="px-3 py-1.5 text-xs rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            onClick={() => (busy ? null : onClose())}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className={`px-3 py-1.5 text-xs rounded-md ${busy ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            onClick={onSubmit}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </div>
    </div>
  );
}
