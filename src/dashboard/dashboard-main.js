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
  blocklist: {
    title:
      '<i class="fas fa-ban text-red-500 mr-2"></i>Blocklist Set Management',
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
    } else if (page === 'faq') {
      setupFAQFunctionality();
    } else if (page === 'blocklist') {
      setupSimpleBlocklist();
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

    // Setup authentication button (placeholder functionality)
    document
      .getElementById('authButton')
      .addEventListener('click', function () {
        alert('Authentication feature coming soon!');
      });

    // Setup navigation link click handlers
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const page = this.getAttribute('data-page');
        loadContent(page);
        updateNavigation(page);
      });
    });

    // Load default content (dashboard)
    loadContent('dashboard');
  } catch (error) {
    console.error('Error loading navigation:', error);
  }
}

/**
 * Dark Mode Toggle Functionality
 * Handles theme switching between light and dark modes
 */
function initializeDarkMode() {
  const darkModeToggle = document.getElementById('darkModeToggle');

  // Check for saved theme preference or default to light mode
  const savedTheme = localStorage.getItem('theme') || 'light';

  // Apply saved theme
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Toggle dark mode on button click
  darkModeToggle.addEventListener('click', function () {
    document.documentElement.classList.toggle('dark');

    if (document.documentElement.classList.contains('dark')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  });
}

/**
 * Application Initialization
 * Loads navigation and sets up the dashboard when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function () {
  loadNavigation();
  initializeDarkMode();
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
    initializeDarkMode
  };
}