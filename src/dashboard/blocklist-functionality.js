/**
 * Blocklist Functionality
 * Handles blocklist management and modal interactions
 */

/**
 * Setup Modal Functionality
 * Handles Add Category and Add Website modal interactions
 */
function setupModalFunctionality() {
  // Add New Category Button
  const addCategoryButton = document.getElementById('addCategoryButton');
  const addCategoryModal = document.getElementById('addCategoryModal');
  const cancelAddCategory = document.getElementById('cancelAddCategory');
  const saveCategory = document.getElementById('saveCategory');

  // Add Website Button
  const addWebsiteButton = document.getElementById('addWebsiteButton');
  const addWebsiteModal = document.getElementById('addWebsiteModal');
  const cancelAddWebsite = document.getElementById('cancelAddWebsite');
  const saveWebsite = document.getElementById('saveWebsite');

  // Add Category Modal Events
  if (addCategoryButton && addCategoryModal) {
    addCategoryButton.addEventListener('click', () => {
      addCategoryModal.classList.remove('hidden');
    });
  }

  if (cancelAddCategory && addCategoryModal) {
    cancelAddCategory.addEventListener('click', () => {
      addCategoryModal.classList.add('hidden');
      clearCategoryForm();
    });
  }

  if (saveCategory && addCategoryModal) {
    saveCategory.addEventListener('click', () => {
      saveCategoryHandler();
    });
  }

  // Add Website Modal Events
  if (addWebsiteButton && addWebsiteModal) {
    addWebsiteButton.addEventListener('click', () => {
      populateCategoryDropdown();
      addWebsiteModal.classList.remove('hidden');
    });
  }

  if (cancelAddWebsite && addWebsiteModal) {
    cancelAddWebsite.addEventListener('click', () => {
      addWebsiteModal.classList.add('hidden');
      clearWebsiteForm();
    });
  }

  if (saveWebsite && addWebsiteModal) {
    saveWebsite.addEventListener('click', () => {
      saveWebsiteHandler();
    });
  }

  // Click outside modal to close
  if (addCategoryModal) {
    addCategoryModal.addEventListener('click', (e) => {
      if (e.target === addCategoryModal) {
        addCategoryModal.classList.add('hidden');
        clearCategoryForm();
      }
    });
  }

  if (addWebsiteModal) {
    addWebsiteModal.addEventListener('click', (e) => {
      if (e.target === addWebsiteModal) {
        addWebsiteModal.classList.add('hidden');
        clearWebsiteForm();
      }
    });
  }

  function clearCategoryForm() {
    const categoryName = document.getElementById('categoryName');
    const categoryIcon = document.getElementById('categoryIcon');
    if (categoryName) categoryName.value = '';
    if (categoryIcon) categoryIcon.selectedIndex = 0;
  }

  function clearWebsiteForm() {
    const websiteUrl = document.getElementById('websiteUrl');
    const websiteCategory = document.getElementById('websiteCategory');
    if (websiteUrl) websiteUrl.value = '';
    if (websiteCategory) websiteCategory.selectedIndex = 0;
  }

  async function saveCategoryHandler() {
    const categoryName = document.getElementById('categoryName');
    const categoryIcon = document.getElementById('categoryIcon');

    if (!categoryName || !categoryName.value.trim()) {
      alert('Please enter a category name');
      return;
    }

    const name = categoryName.value.trim();
    const icon = categoryIcon ? categoryIcon.value : 'fas fa-folder';
    const categoryId = name.toLowerCase().replace(/\s+/g, '-');

    try {
      // Save category metadata to storage
      await sendMessagePromise({
        action: 'saveCategoryMetadata',
        categoryId: categoryId,
        metadata: {
          name: name,
          icon: icon,
          created: Date.now(),
        },
      });

      // Add the new category to the page using the recreate function (ensures consistency)
      recreateCategoryOnPage(categoryId, name, icon);

      // Update the blocklist category selector with the new category
      populateBlocklistCategorySelector();

      // Close modal and clear form
      addCategoryModal.classList.add('hidden');
      clearCategoryForm();

      console.log(`Saved category ${name} with ID ${categoryId}`);

      // Verify the category was saved by trying to load it
      const verifyResponse = await sendMessagePromise({
        action: 'getCategoryMetadata',
      });
      console.log(
        'Verification - Categories in storage:',
        verifyResponse.categories
      );
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error creating category');
    }
  }

  function saveWebsiteHandler() {
    const websiteUrl = document.getElementById('websiteUrl');
    const websiteCategory = document.getElementById('websiteCategory');

    if (!websiteUrl || !websiteUrl.value.trim()) {
      alert('Please enter a website URL');
      return;
    }

    if (!websiteCategory || !websiteCategory.value) {
      alert('Please select a category');
      return;
    }

    const url = normalizeDomain(websiteUrl.value.trim());
    if (!url) {
      alert('Please enter a valid website URL');
      return;
    }

    // Get the actual category name from the selected option text
    const selectedOption =
      websiteCategory.options[websiteCategory.selectedIndex];
    const categoryName = selectedOption ? selectedOption.textContent : '';

    // Add the website to the appropriate category
    addWebsiteToCategory(url, categoryName);

    // Close modal and clear form
    addWebsiteModal.classList.add('hidden');
    clearWebsiteForm();
  }

  function populateCategoryDropdown() {
    const categorySelect = document.getElementById('websiteCategory');
    if (!categorySelect) return;

    // Clear existing options except the first one
    categorySelect.innerHTML = '<option value="">Select a category</option>';

    // Find all existing categories on the page
    const categories = document.querySelectorAll('.space-y-4 > div.border');

    categories.forEach((categoryDiv) => {
      const categoryTitle = categoryDiv.querySelector('h4');
      if (categoryTitle) {
        const titleText = categoryTitle.textContent.trim();
        const option = document.createElement('option');
        option.value = titleText.toLowerCase().replace(/\s+/g, '-');
        option.textContent = titleText;
        categorySelect.appendChild(option);
      }
    });

    // If no categories exist, show a message
    if (categories.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No categories available - create one first';
      option.disabled = true;
      categorySelect.appendChild(option);
    }
  }

  async function addWebsiteToCategory(url, categoryName) {
    if (!categoryName) {
      alert('Please select a category');
      return;
    }

    // Find the category container by name
    const categories = document.querySelectorAll('.space-y-4 > div.border');
    let targetCategory = null;

    categories.forEach((categoryDiv) => {
      const categoryTitle = categoryDiv.querySelector('h4');
      if (categoryTitle && categoryTitle.textContent.trim() === categoryName) {
        targetCategory = categoryDiv;
      }
    });

    if (!targetCategory) {
      alert('Category not found');
      return;
    }

    // Find the websites grid within this category
    const websitesGrid = targetCategory.querySelector('.grid');
    if (!websitesGrid) {
      console.error('Websites grid not found in category');
      return;
    }

    // Categories no longer have enabled checkboxes - all are managed via active category selection

    try {
      // Add to category-specific blocklist
      const categoryId = targetCategory.getAttribute('data-category');
      await sendMessagePromise({
        action: 'addCategorySite',
        url: url,
        categoryId: categoryId,
      });

      // Create new website element with proper event handler
      const websiteId = `website-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 11)}`;
      const websiteHTML = `
        <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded" data-website-id="${websiteId}" data-url="${escapeHtml(
        url
      )}">
          <span class="text-sm text-gray-900">${escapeHtml(url)}</span>
          <button class="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 remove-website-btn" data-url="${url}">
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>
      `;

      // Add the website to the grid
      websitesGrid.insertAdjacentHTML('beforeend', websiteHTML);

      // Add event listener for removal
      const removeBtn = websitesGrid.querySelector(
        `[data-website-id="${websiteId}"] .remove-website-btn`
      );
      if (removeBtn) {
        removeBtn.addEventListener('click', async (e) => {
          await removeWebsiteFromCategory(
            e.target.closest('[data-website-id]')
          );
        });
      }

      console.log(`Added ${url} to ${categoryName} category`);
    } catch (error) {
      console.error('Error adding website:', error);
      alert('Error adding website to blocklist');
    }
  }

  async function removeWebsiteFromCategory(websiteElement) {
    const url = websiteElement.getAttribute('data-url');
    if (!url) return;

    // Show confirmation popup before removing
    if (
      !confirm(`Are you sure you want to remove "${url}" from this category?`)
    ) {
      return;
    }

    // Find the category this website belongs to
    const categoryDiv = websiteElement.closest('[data-category]');
    const categoryId = categoryDiv
      ? categoryDiv.getAttribute('data-category')
      : null;

    if (!categoryId) {
      console.error('Could not find category for website');
      return;
    }

    try {
      // Remove from category-specific blocklist
      await sendMessagePromise({
        action: 'removeCategorySite',
        url: url,
        categoryId: categoryId,
      });

      // Remove from UI
      websiteElement.remove();

      console.log(`Removed ${url} from category ${categoryId}`);
    } catch (error) {
      console.error('Error removing website:', error);
      alert('Error removing website from category');
    }
  }

  function setupCategoryEventListeners(categoryId) {
    // Delete category handler (removed enable/disable checkbox since we use active category selection)
    const deleteBtn = document.querySelector(
      `[data-category="${categoryId}"] .delete-category-btn`
    );
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        await deleteCategoryHandler(categoryId);
      });
    }
  }

  async function deleteCategoryHandler(categoryId) {
    if (
      !confirm(
        'Are you sure you want to delete this category and all its websites?'
      )
    ) {
      return;
    }

    const categoryDiv = document.querySelector(
      `[data-category="${categoryId}"]`
    );
    if (!categoryDiv) return;

    try {
      // Use the category-specific delete API
      await sendMessagePromise({
        action: 'deleteCategory',
        categoryId: categoryId,
      });

      // Remove category from UI
      categoryDiv.remove();

      // Update the blocklist category selector to remove deleted category
      populateBlocklistCategorySelector();

      console.log(`Deleted category ${categoryId} and all its websites`);
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category');
    }
  }

  async function loadExistingCategories() {
    try {
      console.log('Loading existing categories...');

      // Get both category metadata and category sites
      const [metadataResponse, sitesResponse] = await Promise.all([
        sendMessagePromise({ action: 'getCategoryMetadata' }),
        sendMessagePromise({ action: 'getCategorySites' }),
      ]);

      console.log('Metadata response:', metadataResponse);
      console.log('Sites response:', sitesResponse);

      if (!metadataResponse.success) {
        console.error('Failed to load category metadata:', metadataResponse);
        return;
      }

      if (!sitesResponse.success) {
        console.error('Failed to load category sites:', sitesResponse);
        return;
      }

      const categoryMetadata = metadataResponse.categories || {};
      const categorySites = sitesResponse.sites || {};

      console.log('Category metadata loaded:', categoryMetadata);
      console.log('Category sites loaded:', categorySites);

      // First, handle the default "General" category that's hardcoded in HTML
      const generalCategoryData = categorySites['general'];
      if (generalCategoryData && generalCategoryData.sites) {
        const generalCategoryDiv = document.querySelector(
          '[data-category="general"]'
        );
        if (generalCategoryDiv) {
          const websitesGrid = generalCategoryDiv.querySelector('.grid');
          if (websitesGrid) {
            // Clear existing content in the general category
            websitesGrid.innerHTML = '';
            // Add websites to the General category
            for (const url of generalCategoryData.sites) {
              await addWebsiteToExistingCategory('general', url);
            }
          }
        }
      }

      // Recreate each custom category (non-general)
      for (const [categoryId, metadata] of Object.entries(categoryMetadata)) {
        if (categoryId !== 'general') {
          // Skip general since it's handled above
          // Create the category UI
          recreateCategoryOnPage(categoryId, metadata.name, metadata.icon);

          // Add websites to the category if any exist
          const categoryData = categorySites[categoryId];
          if (categoryData && categoryData.sites) {
            for (const url of categoryData.sites) {
              await addWebsiteToExistingCategory(categoryId, url);
            }
          }
        }
      }

      console.log(
        `Loaded ${
          Object.keys(categoryMetadata).length
        } categories plus General category`
      );
    } catch (error) {
      console.error('Error loading existing categories:', error);
    }
  }

  function recreateCategoryOnPage(categoryId, name, icon) {
    const categoriesContainer = document.getElementById('categoriesContainer');

    if (!categoriesContainer) {
      console.error('Categories container not found');
      return;
    }

    const newCategoryHTML = `
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 dark:bg-gray-800" data-category="${categoryId}">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-medium text-gray-900 dark:text-gray-100 flex items-center">
            <i class="${icon} text-blue-500 mr-2"></i>
            ${escapeHtml(name)}
          </h4>
          <div class="flex items-center space-x-2">
            <button class="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 delete-category-btn" data-category="${categoryId}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <!-- Websites will be added here -->
        </div>
      </div>
    `;

    // Insert the new category AFTER the General category (at the end)
    categoriesContainer.insertAdjacentHTML('beforeend', newCategoryHTML);

    // Add event listeners for the recreated category
    setupCategoryEventListeners(categoryId);
  }

  async function addWebsiteToExistingCategory(categoryId, url) {
    const categoryDiv = document.querySelector(
      `[data-category="${categoryId}"]`
    );
    if (!categoryDiv) return;

    const websitesGrid = categoryDiv.querySelector('.grid');
    if (!websitesGrid) return;

    // Create website element (similar to addWebsiteToCategory but without API calls)
    const websiteId = `website-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    const websiteHTML = `
      <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded" data-website-id="${websiteId}" data-url="${escapeHtml(
      url
    )}">
        <span class="text-sm text-gray-900">${escapeHtml(url)}</span>
        <button class="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 remove-website-btn" data-url="${url}">
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>
    `;

    // Add the website to the grid
    websitesGrid.insertAdjacentHTML('beforeend', websiteHTML);

    // Add event listener for removal
    const removeBtn = websitesGrid.querySelector(
      `[data-website-id="${websiteId}"] .remove-website-btn`
    );
    if (removeBtn) {
      removeBtn.addEventListener('click', async (e) => {
        await removeWebsiteFromCategory(e.target.closest('[data-website-id]'));
      });
    }
  }

  // Function to populate blocklist category selector from localStorage
  async function populateBlocklistCategorySelector() {
    const selector = document.getElementById('blocklistCategorySelector');
    if (!selector) return;

    try {
      // Get category metadata from localStorage
      const response = await sendMessagePromise({
        action: 'getCategoryMetadata',
      });

      if (response.success && response.categories) {
        const categories = response.categories;

        // Clear existing options except 'General'
        const generalOption = selector.querySelector('option[value="general"]');
        selector.innerHTML = '';
        if (generalOption) {
          selector.appendChild(generalOption);
        } else {
          // Add 'General' option if it doesn't exist
          const generalOpt = document.createElement('option');
          generalOpt.value = 'general';
          generalOpt.textContent = 'General';
          generalOpt.selected = true;
          selector.appendChild(generalOpt);
        }

        // Add category options dynamically (excluding general since it's already added)
        for (const [categoryId, metadata] of Object.entries(categories)) {
          if (categoryId !== 'general') {
            const option = document.createElement('option');
            option.value = categoryId;
            option.textContent = metadata.name;
            selector.appendChild(option);
          }
        }

        console.log(
          `Populated category selector with ${
            Object.keys(categories).length
          } categories`
        );
      }
    } catch (error) {
      console.error('Error populating blocklist category selector:', error);
    }
  }

  // Function to setup category selector change listener
  async function setupCategorySelectorListener() {
    const selector = document.getElementById('blocklistCategorySelector');
    if (!selector) return;

    // Load and set the initial active category
    try {
      const response = await sendMessagePromise({
        action: 'getActiveCategory',
      });
      if (response.success && response.activeCategory) {
        selector.value = response.activeCategory;
        const selectedOption = selector.options[selector.selectedIndex];
        if (selectedOption) {
          updateCurrentCategoryName(selectedOption.textContent);
        }
      }
    } catch (error) {
      console.error('Error loading active category:', error);
    }

    selector.addEventListener('change', async (e) => {
      const selectedCategory = e.target.value;
      const selectedCategoryName = e.target.selectedOptions[0].textContent;

      try {
        // Update the active category in storage
        await sendMessagePromise({
          action: 'setActiveCategory',
          categoryId: selectedCategory,
        });

        updateCurrentCategoryName(selectedCategoryName);
        console.log(
          `Active category set to: ${selectedCategoryName} (${selectedCategory})`
        );
      } catch (error) {
        console.error('Error setting active category:', error);
        alert('Error updating active category');
      }
    });
  }

  // Function to update the current category name display
  function updateCurrentCategoryName(categoryName) {
    const currentCategoryNameSpan = document.getElementById(
      'currentCategoryName'
    );
    if (currentCategoryNameSpan) {
      currentCategoryNameSpan.textContent = categoryName;
    }
  }

  // Migrate category data on dashboard load (for existing users)
  async function initializeDashboard() {
    try {
      // Run migration to clean up old enabled fields
      await sendMessagePromise({ action: 'migrateCategoryData' });

      // Load existing categories after migration
      loadExistingCategories();

      // Populate blocklist category selector from localStorage
      populateBlocklistCategorySelector();

      // Setup category selector change listener
      setupCategorySelectorListener();
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    }
  }

  // Initialize dashboard
  initializeDashboard();
}

// Export functions if using modules, otherwise they're global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setupModalFunctionality,
  };
}
