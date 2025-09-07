import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';

const NAV_ITEMS = [
  { page: 'dashboard', icon: 'fas fa-chart-line', label: 'Dashboard' },
  { page: 'summary', icon: 'fas fa-chart-pie', label: 'Summary' },
  { page: 'blocklist', icon: 'fas fa-ban', label: 'Blocklist Categories' },
  { page: 'settings', icon: 'fas fa-cog', label: 'Settings' },
];

const HELP_ITEMS = [
  { page: 'about', icon: 'fas fa-info-circle', label: 'About' },
  { page: 'contact', icon: 'fas fa-envelope', label: 'Contact' },
  { page: 'faq', icon: 'fas fa-question-circle', label: 'FAQ' },
];

function NavLink({ active, icon, label, onClick }) {
  const className = active
    ? 'nav-link nav-link-active'
    : 'nav-link nav-link-inactive';
  return (
    <a href="#" className={className} onClick={onClick}>
      <i className={`${icon} mr-3`}></i>
      {label}
    </a>
  );
}

export default function Navigation() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const guestContainerRef = useRef(null);
  const activePage = useMemo(() => {
    const fromHash = (location.hash || '').replace(/^#/, '');
    const saved = localStorage.getItem('activePage');
    return fromHash || saved || 'dashboard';
  }, []);

  const navigate = useCallback((page) => {
    if (!page) return;
    localStorage.setItem('activePage', page);
    if (location.hash !== `#${page}`) {
      location.hash = `#${page}`;
    } else if (
      typeof window.loadContent === 'function' &&
      typeof window.updateNavigation === 'function'
    ) {
      // If hash unchanged, trigger load manually to match legacy behavior
      window.loadContent(page);
      window.updateNavigation(page);
    }
  }, []);

  // Close guest dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!guestOpen) return;
      if (
        guestContainerRef.current &&
        !guestContainerRef.current.contains(e.target)
      ) {
        setGuestOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [guestOpen]);

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col h-full theme-transition">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 theme-transition">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <i className="fas fa-shield-alt text-white text-sm"></i>
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white theme-transition">
            App Blocker
          </h1>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.page}>
              <NavLink
                active={activePage === item.page}
                icon={item.icon}
                label={item.label}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.page);
                }}
              />
            </li>
          ))}

          <li className="relative">
            <a
              href="#"
              className="nav-link nav-link-inactive justify-between"
              onClick={(e) => {
                e.preventDefault();
                setHelpOpen((v) => !v);
              }}
            >
              <span className="flex items-center">
                <i className="fas fa-life-ring mr-3"></i>
                Help
              </span>
              <i className="fas fa-chevron-down text-gray-500 ml-2"></i>
            </a>
            <ul
              className={`mt-1 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700 ${
                helpOpen ? '' : 'hidden'
              }`}
            >
              {HELP_ITEMS.map((item) => (
                <li key={item.page}>
                  <NavLink
                    active={activePage === item.page}
                    icon={item.icon}
                    label={item.label}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(item.page);
                    }}
                  />
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>

      <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700 theme-transition">
        <div className="relative" ref={guestContainerRef}>
          <button
            id="guestAccountButton"
            className="w-full flex items-center justify-between p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              setGuestOpen((v) => !v);
            }}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center mr-3">
                G
              </div>
              <div className="text-left">
                <div className="text-sm text-gray-900 dark:text-white">
                  Guest
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Not signed in
                </div>
              </div>
            </div>
            <i className="fas fa-chevron-down text-gray-500"></i>
          </button>

          <div
            id="guestDropdown"
            className={`account-dropdown absolute bottom-16 left-0 w-[calc(100%-0px)] ${
              guestOpen ? '' : 'hidden'
            }`}
          >
            <div className="account-dropdown-inner">
              <div className="account-header">
                <div className="email text-sm">Guest mode</div>
                <div className="plan text-xs">Limited features</div>
              </div>
              <div className="dropdown-separator"></div>
              <button
                id="dropdownLoginBtn"
                className="dropdown-item"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    const url =
                      (window.chrome &&
                        window.chrome.runtime &&
                        window.chrome.runtime.getURL &&
                        window.chrome.runtime.getURL('src/pages/login.html')) ||
                      '../pages/login.html';
                    if (
                      window.chrome &&
                      window.chrome.tabs &&
                      window.chrome.tabs.create
                    ) {
                      window.chrome.tabs.create({ url });
                    } else {
                      window.location.href = url;
                    }
                  } catch {
                    window.location.href = '../pages/login.html';
                  }
                }}
              >
                <span>
                  <i className="fas fa-sign-in-alt mr-2"></i>Log in
                </span>
                <i className="fas fa-chevron-right opacity-70"></i>
              </button>
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center theme-transition mt-3">
          <p className="mt-1">© 2024 App Blocker</p>
        </div>
      </div>
    </div>
  );
}
