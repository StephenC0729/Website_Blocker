/**
 * Dashboard Main
 * Core orchestration and page management for the dashboard application
 */

/**
 * Page Configuration Object
 * Defines available pages with their titles and content files
 */
const pageConfig = {
  dashboard: {
    title:
      '<i class="fas fa-chart-line text-blue-500 mr-2"></i>Productivity Dashboard',
  },
  summary: {
    title:
      '<i class="fas fa-chart-pie text-blue-500 mr-2"></i>Summary & Analytics',
  },
  blocklist: {
    title:
      '<i class="fas fa-ban text-red-500 mr-2"></i>Blocklist Category Management',
  },
  about: {
    title:
      '<i class="fas fa-info-circle text-blue-500 mr-2"></i>About App Blocker',
  },
  contact: {
    title: '<i class="fas fa-envelope text-blue-500 mr-2"></i>Contact Us',
  },
  faq: {
    title:
      '<i class="fas fa-question-circle text-blue-500 mr-2"></i>Frequently Asked Questions',
  },
  settings: {
    title: '<i class="fas fa-cog text-blue-500 mr-2"></i>Settings',
  },
};

// Current active page state
let currentPage = 'dashboard';

/**
 * Load Content Function
 * Dynamically loads page content from separate HTML files
 * @param {string} page - The page identifier to load
 */
async function loadContent(page) {
  try {
    const config = pageConfig[page];
    if (!config) return;

    // If navigating away from React-driven contact page, unmount it first
    if (
      currentPage === 'contact' &&
      window.DashboardReactApp &&
      typeof window.DashboardReactApp.unmountContactApp === 'function'
    ) {
      window.DashboardReactApp.unmountContactApp();
    }

    // React-driven Contact page: skip fetching legacy HTML
    if (
      page === 'contact' &&
      window.DashboardReactApp &&
      typeof window.DashboardReactApp.mountContactApp === 'function'
    ) {
      document.getElementById('content-container').innerHTML = '';
      document.getElementById('pageTitle').innerHTML = config.title;

      // Cleanup previous page if it was dashboard
      if (
        currentPage === 'dashboard' &&
        typeof dashboardTimer !== 'undefined' &&
        dashboardTimer
      ) {
        dashboardTimer.cleanup();
        dashboardTimer = null;
      }

      window.DashboardReactApp.mountContactApp('content-container');
      currentPage = page;
      return;
    }

    // React-driven pages: FAQ, About, Summary
    if (
      (page === 'faq' &&
        window.DashboardReactApp &&
        typeof window.DashboardReactApp.mountFAQApp === 'function') ||
      (page === 'about' &&
        window.DashboardReactApp &&
        typeof window.DashboardReactApp.mountAboutApp === 'function') ||
      (page === 'summary' &&
        window.DashboardReactApp &&
        typeof window.DashboardReactApp.mountSummaryApp === 'function')
    ) {
      document.getElementById('content-container').innerHTML = '';
      document.getElementById('pageTitle').innerHTML = config.title;
      if (page === 'faq') {
        window.DashboardReactApp.mountFAQApp('content-container');
      } else if (page === 'about') {
        window.DashboardReactApp.mountAboutApp('content-container');
      } else if (page === 'summary') {
        window.DashboardReactApp.mountSummaryApp('content-container');
      }
    } else {
      // If Blocklist is React-capable, mount it directly
      if (
        page === 'blocklist' &&
        window.DashboardReactApp &&
        typeof window.DashboardReactApp.mountBlocklistApp === 'function'
      ) {
        document.getElementById('content-container').innerHTML = '';
        document.getElementById('pageTitle').innerHTML = config.title;
        window.DashboardReactApp.mountBlocklistApp('content-container');
      } else if (
        page === 'dashboard' &&
        window.DashboardReactApp &&
        typeof window.DashboardReactApp.mountDashboardApp === 'function'
      ) {
        document.getElementById('content-container').innerHTML = '';
        document.getElementById('pageTitle').innerHTML = config.title;
        window.DashboardReactApp.mountDashboardApp('content-container');
      } else if (
        page === 'settings' &&
        window.DashboardReactApp &&
        typeof window.DashboardReactApp.mountSettingsApp === 'function'
      ) {
        document.getElementById('content-container').innerHTML = '';
        document.getElementById('pageTitle').innerHTML = config.title;
        window.DashboardReactApp.mountSettingsApp('content-container');
      } else {
        // Legacy HTML pages have been removed. If React mount is not available,
        // show an informational message instead of attempting to fetch.
        document.getElementById('content-container').innerHTML = '';
        document.getElementById('pageTitle').innerHTML = config.title;
        console.warn(
          'React page mount not available for',
          page,
          '- legacy HTML content has been removed.'
        );
      }
    }

    // Cleanup previous page if it was dashboard
    if (
      currentPage === 'dashboard' &&
      typeof dashboardTimer !== 'undefined' &&
      dashboardTimer
    ) {
      dashboardTimer.cleanup();
      dashboardTimer = null;
    }

    // Initialize page-specific functionality
    if (page === 'dashboard') {
      if (
        window.DashboardReactApp &&
        typeof window.DashboardReactApp.mountDashboardApp === 'function'
      ) {
        // React Dashboard mounted earlier
      } else {
        if (typeof setupDashboardFunctionality === 'function') {
          setupDashboardFunctionality();
        }
        if (typeof setupDashboardAnalytics === 'function') {
          setupDashboardAnalytics();
        }
      }
    } else if (page === 'summary') {
      if (
        window.DashboardReactApp &&
        typeof window.DashboardReactApp.mountSummaryApp === 'function'
      ) {
        // React Summary mounted in the block above; nothing else to init
      } else if (typeof setupSummaryAnalytics === 'function') {
        setupSummaryAnalytics();
      }
    } else if (page === 'contact') {
      if (typeof setupContactFunctionality === 'function') {
        setupContactFunctionality();
      }
    } else if (page === 'faq') {
      if (
        !(
          window.DashboardReactApp &&
          typeof window.DashboardReactApp.mountFAQApp === 'function'
        ) &&
        typeof setupFAQFunctionality === 'function'
      ) {
        setupFAQFunctionality();
      }
    } else if (page === 'blocklist') {
      if (
        window.DashboardReactApp &&
        typeof window.DashboardReactApp.mountBlocklistApp === 'function'
      ) {
        // React Blocklist mounted above when content was set
      } else if (typeof setupModalFunctionality === 'function') {
        setupModalFunctionality();
      }
    } else if (page === 'settings') {
      if (
        window.DashboardReactApp &&
        typeof window.DashboardReactApp.mountSettingsApp === 'function'
      ) {
        // React Settings mounted above when content was set
      } else if (typeof setupSettingsFunctionality === 'function') {
        setupSettingsFunctionality();
      }
    }

    currentPage = page;
  } catch (error) {
    console.error('Error loading content:', error);
  }
}

/**
 * Update Navigation Active State
 * Updates visual state of navigation links to show current page
 * @param {string} activePage - The currently active page
 */
function updateNavigation(activePage) {
  document.querySelectorAll('.nav-link').forEach((link) => {
    const page = link.getAttribute('data-page');
    if (page === activePage) {
      // Active state styling with dark mode support
      link.className = 'nav-link nav-link-active';
    } else {
      // Default state styling with dark mode support
      link.className = 'nav-link nav-link-inactive';
    }
  });
}

/**
 * Load Navigation
 * Loads sidebar navigation and sets up event listeners
 */
async function loadNavigation() {
  try {
    // Ensure the shell has rendered the navigation container
    const ensureNavContainer = async () => {
      const start = Date.now();
      while (
        !document.getElementById('navigation-container') &&
        Date.now() - start < 2000
      ) {
        await new Promise((r) => setTimeout(r, 0));
      }
    };
    await ensureNavContainer();

    // Prefer React navigation if available
    if (
      window.DashboardReactApp &&
      typeof window.DashboardReactApp.mountNavigation === 'function'
    ) {
      window.DashboardReactApp.mountNavigation('navigation-container');
    } else {
      console.warn(
        'React navigation is not available; skipping legacy navigation.'
      );
    }

    // Auth button removed from UI; keep guard if present in future
    const authBtn = document.getElementById('authButton');
    if (authBtn) {
      authBtn.addEventListener('click', function () {
        alert('Authentication feature coming soon!');
      });
    }

    // Optional Guest state persistence (non-visual)
    const guestToggle = document.getElementById('guestModeToggle');
    const guestStatus = document.getElementById('guestStatus');
    const applyGuestUI = (enabled) => {
      if (guestToggle) guestToggle.classList.toggle('on', !!enabled);
      if (guestStatus)
        guestStatus.textContent = enabled ? 'Browsing as guest' : '';
      document.documentElement.classList.toggle('guest-mode', !!enabled);
    };
    applyGuestUI(localStorage.getItem('guestMode') === 'on');
    if (guestToggle) {
      guestToggle.addEventListener('click', () => {
        const enabled = !(localStorage.getItem('guestMode') === 'on');
        localStorage.setItem('guestMode', enabled ? 'on' : 'off');
        applyGuestUI(enabled);
      });
    }

    // Legacy navigation-only behaviors (skip when React navigation is mounted)
    if (
      !(
        window.DashboardReactApp &&
        typeof window.DashboardReactApp.mountNavigation === 'function'
      )
    ) {
      // Bottom Guest dropdown behavior
      const accountBtn = document.getElementById('guestAccountButton');
      const accountDropdown = document.getElementById('guestDropdown');
      const loginBtn = document.getElementById('dropdownLoginBtn');

      if (accountBtn && accountDropdown) {
        accountBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          accountDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
          if (!accountDropdown.classList.contains('hidden')) {
            const within =
              accountDropdown.contains(e.target) ||
              accountBtn.contains(e.target);
            if (!within) accountDropdown.classList.add('hidden');
          }
        });
      }

      // Help dropdown behavior
      const helpBtn = document.getElementById('helpDropdownButton');
      const helpMenu = document.getElementById('helpDropdownMenu');
      if (helpBtn && helpMenu) {
        helpBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          helpMenu.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
          if (!helpMenu.classList.contains('hidden')) {
            const within =
              helpMenu.contains(e.target) || helpBtn.contains(e.target);
            if (!within) helpMenu.classList.add('hidden');
          }
        });
      }

      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          // Navigate to the login page
          window.location.href = '../pages/login.html';
        });
      }
    }

    // Setup navigation link click handlers
    // For legacy navigation only: wire click handlers
    if (
      !window.DashboardReactApp ||
      typeof window.DashboardReactApp.mountNavigation !== 'function'
    ) {
      document.querySelectorAll('.nav-link').forEach((link) => {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          const page = this.getAttribute('data-page');
          if (page && pageConfig[page]) {
            localStorage.setItem('activePage', page);
            if (location.hash !== `#${page}`) {
              location.hash = `#${page}`;
            } else {
              loadContent(page);
              updateNavigation(page);
            }
          }
        });
      });
    }

    // Handle hash-based navigation (deep link) and persistence
    const applyInitialPage = async () => {
      const hashPage = (location.hash || '').replace(/^#/, '');
      const savedPage = localStorage.getItem('activePage');
      const initialPage = pageConfig[hashPage]
        ? hashPage
        : pageConfig[savedPage]
        ? savedPage
        : 'dashboard';
      // Ensure shell has rendered the content container
      const ensureContainer = async () => {
        const start = Date.now();
        while (
          !document.getElementById('content-container') &&
          Date.now() - start < 2000
        ) {
          await new Promise((r) => setTimeout(r, 0));
        }
      };
      await ensureContainer();
      loadContent(initialPage);
      updateNavigation(initialPage);
    };

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      const page = (location.hash || '').replace(/^#/, '');
      if (page && pageConfig[page]) {
        localStorage.setItem('activePage', page);
        loadContent(page);
        updateNavigation(page);
      }
    });

    // Load initial content (respect hash/localStorage)
    applyInitialPage();
  } catch (error) {
    console.error('Error loading navigation:', error);
  }
}

// Dark mode removed: always use light theme

/**
 * Application Initialization
 * Loads navigation and sets up the dashboard when DOM is ready
 */
async function applyDarkFromSettings() {
  try {
    if (typeof sendMessagePromise === 'function') {
      const res = await sendMessagePromise({ action: 'getSettings' });
      const dark = !!(res && res.settings && res.settings.darkModeEnabled);
      document.documentElement.classList.toggle('dark', dark);
    }
  } catch {}
}

document.addEventListener('DOMContentLoaded', async function () {
  await applyDarkFromSettings();

  // Mount the React shell first if available to create containers
  if (
    window.DashboardReactApp &&
    typeof window.DashboardReactApp.mountShell === 'function'
  ) {
    window.DashboardReactApp.mountShell('react-shell-root');
  }

  loadNavigation();
});

/**
 * Cleanup when dashboard window is closed
 */
window.addEventListener('beforeunload', () => {
  if (typeof dashboardTimer !== 'undefined' && dashboardTimer) {
    dashboardTimer.cleanup();
    dashboardTimer = null;
  }
  if (
    window.DashboardReactApp &&
    typeof window.DashboardReactApp.unmountContactApp === 'function'
  ) {
    window.DashboardReactApp.unmountContactApp();
  }
});

// Export functions if using modules, otherwise they're global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    pageConfig,
    currentPage,
    loadContent,
    updateNavigation,
    loadNavigation,
    // Dark mode removed
  };
}
