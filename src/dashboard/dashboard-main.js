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
    file: 'components/dashboard-content.html',
  },
  summary: {
    title:
      '<i class="fas fa-chart-pie text-blue-500 mr-2"></i>Summary & Analytics',
    file: 'components/summary-content.html',
  },
  blocklist: {
    title:
      '<i class="fas fa-ban text-red-500 mr-2"></i>Blocklist Category Management',
    file: 'components/blocklist-content.html',
  },
  about: {
    title:
      '<i class="fas fa-info-circle text-blue-500 mr-2"></i>About App Blocker',
    file: 'components/about-content.html',
  },
  faq: {
    title:
      '<i class="fas fa-question-circle text-blue-500 mr-2"></i>Frequently Asked Questions',
    file: 'components/faq-content.html',
  },
  settings: {
    title:
      '<i class="fas fa-cog text-blue-500 mr-2"></i>Settings',
    file: 'components/settings-content.html',
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

    // Fetch the content file
    const response = await fetch(config.file);
    const contentHTML = await response.text();

    // Update DOM with new content
    document.getElementById('content-container').innerHTML = contentHTML;
    document.getElementById('pageTitle').innerHTML = config.title;

    // Cleanup previous page if it was dashboard
    if (currentPage === 'dashboard' && dashboardTimer) {
      dashboardTimer.cleanup();
      dashboardTimer = null;
    }

    // Initialize page-specific functionality
    if (page === 'dashboard') {
      setupDashboardFunctionality();
      if (typeof setupDashboardAnalytics === 'function') {
        setupDashboardAnalytics();
      }
    } else if (page === 'summary') {
      if (typeof setupSummaryAnalytics === 'function') {
        setupSummaryAnalytics();
      }
    } else if (page === 'faq') {
      setupFAQFunctionality();
    } else if (page === 'blocklist') {
      setupModalFunctionality();
    } else if (page === 'settings') {
      if (typeof setupSettingsFunctionality === 'function') {
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
    // Fetch and load navigation HTML
    const response = await fetch('navigation.html');
    const navigationHTML = await response.text();
    document.getElementById('navigation-container').innerHTML = navigationHTML;

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
            accountDropdown.contains(e.target) || accountBtn.contains(e.target);
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

    // Setup navigation link click handlers
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const page = this.getAttribute('data-page');
        // Update URL hash for deep-linking and persistence
        if (page && pageConfig[page]) {
          localStorage.setItem('activePage', page);
          if (location.hash !== `#${page}`) {
            location.hash = `#${page}`;
          } else {
            // If the hash is unchanged, still load
            loadContent(page);
            updateNavigation(page);
          }
        }
      });
    });

    // Handle hash-based navigation (deep link) and persistence
    const applyInitialPage = () => {
      const hashPage = (location.hash || '').replace(/^#/, '');
      const savedPage = localStorage.getItem('activePage');
      const initialPage = pageConfig[hashPage]
        ? hashPage
        : pageConfig[savedPage]
        ? savedPage
        : 'dashboard';
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
  loadNavigation();
});

/**
 * Cleanup when dashboard window is closed
 */
window.addEventListener('beforeunload', () => {
  if (dashboardTimer) {
    dashboardTimer.cleanup();
    dashboardTimer = null;
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
