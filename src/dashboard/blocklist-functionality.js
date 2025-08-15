/**
 * Blocklist Functionality
 * Handles blocklist management and modal interactions
 */

/**
 * Simple Blocklist (MVP) Logic
 * Uses existing background actions: getBlockedSites, addBlockedSite, removeBlockedSite
 */
function setupSimpleBlocklist() {
  const form = document.getElementById('addBlockedSiteForm');
  const input = document.getElementById('addSiteInput');
  const listEl = document.getElementById('blockedSitesList');
  const emptyEl = document.getElementById('blockedSitesEmpty');
  const feedbackEl = document.getElementById('blocklistFeedback');

  if (!form || !input || !listEl) return; // UI not present

  // Setup modal functionality
  setupModalFunctionality();

  // Load existing sites
  refreshBlockedSites();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = (input.value || '').trim();
    if (!raw) return showFeedback('Please enter a site.', 'error');
    const normalized = normalizeDomain(raw);
    if (!normalized) return showFeedback('Invalid domain.', 'error');
    try {
      await sendMessagePromise({ action: 'addBlockedSite', url: normalized });
      input.value = '';
      showFeedback(`Added ${normalized}`, 'success');
      refreshBlockedSites();
    } catch (err) {
      showFeedback('Error adding site.', 'error');
      console.error(err);
    }
  });

  async function refreshBlockedSites() {
    try {
      const res = await sendMessagePromise({ action: 'getBlockedSites' });
      if (!res || !res.success) throw new Error('Failed');
      const sites = res.sites || [];
      listEl.innerHTML = '';
      if (!sites.length) {
        emptyEl && emptyEl.classList.remove('hidden');
      } else {
        emptyEl && emptyEl.classList.add('hidden');
      }
      sites.sort((a, b) => a.localeCompare(b, 'en')); // deterministic order
      sites.forEach((site) => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between py-2';
        li.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-gray-800">${escapeHtml(
                          site
                        )}</span>
                    </div>
                    <button data-site="${site}" class="text-red-500 hover:text-red-700 text-xs font-medium remove-blocked-site">Remove</button>
                `;
        listEl.appendChild(li);
      });
      // Attach remove handlers
      listEl.querySelectorAll('.remove-blocked-site').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const site = btn.getAttribute('data-site');
          try {
            await sendMessagePromise({
              action: 'removeBlockedSite',
              url: site,
            });
            showFeedback(`Removed ${site}`, 'success');
            refreshBlockedSites();
          } catch (err) {
            console.error(err);
            showFeedback('Error removing site.', 'error');
          }
        });
      });
    } catch (err) {
      console.error('Error loading blocked sites', err);
      showFeedback('Error loading blocked sites.', 'error');
    }
  }

  function showFeedback(message, type) {
    if (!feedbackEl) return;
    feedbackEl.textContent = message;
    feedbackEl.className =
      'text-sm mb-3 ' +
      (type === 'success' ? 'text-green-600' : 'text-red-600');
    feedbackEl.classList.remove('hidden');
    clearTimeout(showFeedback._t);
    showFeedback._t = setTimeout(
      () => feedbackEl.classList.add('hidden'),
      3500
    );
  }
}

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
          created: Date.now()
        }
      });

      // Add the new category to the page using the recreate function (ensures consistency)
      recreateCategoryOnPage(categoryId, name, icon);
      
      // Update the blocklist set selector with the new category
      populateBlocklistSetSelector();
      
      // Close modal and clear form
      addCategoryModal.classList.add('hidden');
      clearCategoryForm();
      
      console.log(`Saved category ${name} with ID ${categoryId}`);
      
      // Verify the category was saved by trying to load it
      const verifyResponse = await sendMessagePromise({ action: 'getCategoryMetadata' });
      console.log('Verification - Categories in storage:', verifyResponse.categories);
      
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
    const selectedOption = websiteCategory.options[websiteCategory.selectedIndex];
    const categoryName = selectedOption ? selectedOption.textContent : '';

    // Add the website to the appropriate category
    addWebsiteToCategory(url, categoryName);
    
    // Close modal and clear form
    addWebsiteModal.classList.add('hidden');
    clearWebsiteForm();
  }

  function addNewCategoryToPage(name, icon) {
    const categoriesContainer = document.getElementById('categoriesContainer');
    
    if (!categoriesContainer) {
      console.error('Categories container not found');
      return;
    }

    const categoryId = name.toLowerCase().replace(/\s+/g, '-');
    const newCategoryHTML = `
      <div class="border border-gray-200 rounded-lg p-4" data-category="${categoryId}">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-medium text-gray-900 flex items-center">
            <i class="${icon} text-blue-500 mr-2"></i>
            ${escapeHtml(name)}
          </h4>
          <div class="flex items-center space-x-2">
            <button class="text-gray-400 hover:text-red-500 delete-category-btn" data-category="${categoryId}">
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
    
    // Add event listeners for the new category
    setupCategoryEventListeners(categoryId);
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

    // Check if category is enabled before adding to actual blocklist
    const categoryCheckbox = targetCategory.querySelector('.category-enabled-checkbox');
    const isCategoryEnabled = categoryCheckbox ? categoryCheckbox.checked : true;

    try {
      // Add to category-specific blocklist
      const categoryId = targetCategory.getAttribute('data-category');
      await sendMessagePromise({ 
        action: 'addCategorySite', 
        url: url, 
        categoryId: categoryId 
      });

      // Create new website element with proper event handler
      const websiteId = `website-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const websiteHTML = `
        <div class="flex items-center justify-between bg-gray-50 px-3 py-2 rounded" data-website-id="${websiteId}" data-url="${escapeHtml(url)}">
          <span class="text-sm">${escapeHtml(url)}</span>
          <button class="text-red-500 hover:text-red-700 remove-website-btn" data-url="${url}" data-website-id="${websiteId}">
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>
      `;

      // Add the website to the grid
      websitesGrid.insertAdjacentHTML('beforeend', websiteHTML);
      
      // Add event listener for removal
      const removeBtn = websitesGrid.querySelector(`[data-website-id="${websiteId}"] .remove-website-btn`);
      if (removeBtn) {
        removeBtn.addEventListener('click', async (e) => {
          await removeWebsiteFromCategory(e.target.closest('[data-website-id]'));
        });
      }
      
      console.log(`Added ${url} to ${categoryName} category (blocking: ${isCategoryEnabled})`);
      
    } catch (error) {
      console.error('Error adding website:', error);
      alert('Error adding website to blocklist');
    }
  }

  async function removeWebsiteFromCategory(websiteElement) {
    const url = websiteElement.getAttribute('data-url');
    if (!url) return;

    // Find the category this website belongs to
    const categoryDiv = websiteElement.closest('[data-category]');
    const categoryId = categoryDiv ? categoryDiv.getAttribute('data-category') : null;

    if (!categoryId) {
      console.error('Could not find category for website');
      return;
    }

    try {
      // Remove from category-specific blocklist
      await sendMessagePromise({ 
        action: 'removeCategorySite', 
        url: url, 
        categoryId: categoryId 
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
    // Enable/disable checkbox handler
    const checkbox = document.querySelector(`[data-category="${categoryId}"] .category-enabled-checkbox`);
    if (checkbox) {
      checkbox.addEventListener('change', async (e) => {
        await toggleCategoryBlocking(categoryId, e.target.checked);
      });
    }

    // Delete category handler
    const deleteBtn = document.querySelector(`[data-category="${categoryId}"] .delete-category-btn`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        await deleteCategoryHandler(categoryId);
      });
    }
  }

  async function toggleCategoryBlocking(categoryId, isEnabled) {
    try {
      // Use the category-specific toggle API
      await sendMessagePromise({ 
        action: 'toggleCategoryBlocking', 
        categoryId: categoryId, 
        enabled: isEnabled 
      });
      
      console.log(`Category ${categoryId} ${isEnabled ? 'enabled' : 'disabled'} blocking`);
    } catch (error) {
      console.error('Error toggling category blocking:', error);
      alert('Error updating category blocking');
    }
  }

  async function deleteCategoryHandler(categoryId) {
    if (!confirm('Are you sure you want to delete this category and all its websites?')) {
      return;
    }

    const categoryDiv = document.querySelector(`[data-category="${categoryId}"]`);
    if (!categoryDiv) return;

    try {
      // Use the category-specific delete API
      await sendMessagePromise({ 
        action: 'deleteCategory', 
        categoryId: categoryId 
      });
      
      // Remove category from UI
      categoryDiv.remove();
      
      // Update the blocklist set selector to remove deleted category
      populateBlocklistSetSelector();
      
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
        sendMessagePromise({ action: 'getCategorySites' })
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

      // Recreate each category
      for (const [categoryId, metadata] of Object.entries(categoryMetadata)) {
        // Create the category UI
        recreateCategoryOnPage(categoryId, metadata.name, metadata.icon);

        // Add websites to the category if any exist
        const categoryData = categorySites[categoryId];
        if (categoryData && categoryData.sites) {
          for (const url of categoryData.sites) {
            await addWebsiteToExistingCategory(categoryId, url);
          }

          // Set the enabled state
          const categoryDiv = document.querySelector(`[data-category="${categoryId}"]`);
          if (categoryDiv) {
            const checkbox = categoryDiv.querySelector('.category-enabled-checkbox');
            if (checkbox) {
              checkbox.checked = categoryData.enabled !== false; // Default to true if not set
            }
          }
        }
      }

      console.log(`Loaded ${Object.keys(categoryMetadata).length} categories`);
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
      <div class="border border-gray-200 rounded-lg p-4" data-category="${categoryId}">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-medium text-gray-900 flex items-center">
            <i class="${icon} text-blue-500 mr-2"></i>
            ${escapeHtml(name)}
          </h4>
          <div class="flex items-center space-x-2">
            <button class="text-gray-400 hover:text-red-500 delete-category-btn" data-category="${categoryId}">
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
    const categoryDiv = document.querySelector(`[data-category="${categoryId}"]`);
    if (!categoryDiv) return;

    const websitesGrid = categoryDiv.querySelector('.grid');
    if (!websitesGrid) return;

    // Create website element (similar to addWebsiteToCategory but without API calls)
    const websiteId = `website-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const websiteHTML = `
      <div class="flex items-center justify-between bg-gray-50 px-3 py-2 rounded" data-website-id="${websiteId}" data-url="${escapeHtml(url)}">
        <span class="text-sm">${escapeHtml(url)}</span>
        <button class="text-red-500 hover:text-red-700 remove-website-btn" data-url="${url}" data-website-id="${websiteId}">
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>
    `;

    // Add the website to the grid
    websitesGrid.insertAdjacentHTML('beforeend', websiteHTML);
    
    // Add event listener for removal
    const removeBtn = websitesGrid.querySelector(`[data-website-id="${websiteId}"] .remove-website-btn`);
    if (removeBtn) {
      removeBtn.addEventListener('click', async (e) => {
        await removeWebsiteFromCategory(e.target.closest('[data-website-id]'));
      });
    }
  }

  // Function to populate blocklist set selector from localStorage
  async function populateBlocklistSetSelector() {
    const selector = document.getElementById('blocklistSetSelector');
    if (!selector) return;

    try {
      // Get category metadata from localStorage
      const response = await sendMessagePromise({ action: 'getCategoryMetadata' });
      
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
        
        console.log(`Populated blocklist selector with ${Object.keys(categories).length} categories`);
      }
    } catch (error) {
      console.error('Error populating blocklist set selector:', error);
    }
  }

  // Load existing categories after all functions are defined
  loadExistingCategories();
  
  // Populate blocklist set selector from localStorage
  populateBlocklistSetSelector();
}

// Export functions if using modules, otherwise they're global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setupSimpleBlocklist,
    setupModalFunctionality
  };
}