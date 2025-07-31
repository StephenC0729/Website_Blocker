/**
 * Dashboard Application Logic
 * Handles dynamic content loading, navigation, and page management
 */

/**
 * Page Configuration Object
 * Defines available pages with their titles and content files
 */
const pageConfig = {
    dashboard: {
        title: '<i class="fas fa-chart-line text-blue-500 mr-2"></i>Productivity Dashboard',
        file: 'components/dashboard-content.html'
    },
    blocklist: {
        title: '<i class="fas fa-ban text-red-500 mr-2"></i>Blocklist Set Management',
        file: 'components/blocklist-content.html'
    },
    about: {
        title: '<i class="fas fa-info-circle text-blue-500 mr-2"></i>About App Blocker',
        file: 'components/about-content.html'
    },
    faq: {
        title: '<i class="fas fa-question-circle text-blue-500 mr-2"></i>Frequently Asked Questions',
        file: 'components/faq-content.html'
    }
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

        // Initialize page-specific functionality
        if (page === 'dashboard') {
            setupDashboardFunctionality();
        } else if (page === 'faq') {
            setupFAQFunctionality();
        }

        currentPage = page;
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

/**
 * Setup Dashboard Functionality
 * Initializes dashboard-specific features after content loads
 */
function setupDashboardFunctionality() {
    // Settings button toggle functionality
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.addEventListener('click', function() {
            const settingsPanel = document.getElementById('settingsPanel');
            if (settingsPanel) {
                settingsPanel.classList.toggle('hidden');
            }
        });
    }
}

/**
 * Setup FAQ Functionality
 * Initializes accordion behavior for FAQ questions
 */
function setupFAQFunctionality() {
    // FAQ Accordion functionality
    document.querySelectorAll('.faq-question').forEach((button) => {
        button.addEventListener('click', () => {
            const answer = button.nextElementSibling;
            const icon = button.querySelector('i');

            // Close other FAQ items (accordion behavior)
            document.querySelectorAll('.faq-answer').forEach((otherAnswer) => {
                if (otherAnswer !== answer) {
                    otherAnswer.classList.remove('open');
                    const otherIcon = otherAnswer.previousElementSibling.querySelector('i');
                    otherIcon.style.transform = 'rotate(0deg)';
                }
            });

            // Toggle current FAQ item
            answer.classList.toggle('open');

            // Rotate chevron icon for visual feedback
            if (answer.classList.contains('open')) {
                icon.style.transform = 'rotate(180deg)';
            } else {
                icon.style.transform = 'rotate(0deg)';
            }
        });
    });
}

/**
 * Update Navigation Active State
 * Updates visual state of navigation links to show current page
 * @param {string} activePage - The currently active page
 */
function updateNavigation(activePage) {
    document.querySelectorAll('.nav-link').forEach(link => {
        const page = link.getAttribute('data-page');
        if (page === activePage) {
            // Active state styling
            link.className = 'nav-link flex items-center px-3 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium';
        } else {
            // Default state styling
            link.className = 'nav-link flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors';
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
        document.getElementById('authButton').addEventListener('click', function() {
            alert('Authentication feature coming soon!');
        });
        
        // Setup navigation link click handlers
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
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
 * Application Initialization
 * Loads navigation and sets up the dashboard when DOM is ready
 */
document.addEventListener('DOMContentLoaded', loadNavigation);