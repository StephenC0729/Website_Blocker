import React, { useCallback, useEffect, useMemo, useState } from 'react';

function messaging(msg) {
  if (
    typeof window !== 'undefined' &&
    typeof window.sendMessagePromise === 'function'
  ) {
    return window.sendMessagePromise(msg);
  }
  return Promise.resolve({ success: true });
}

function normalize(input) {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.normalizeDomain === 'function'
    ) {
      return window.normalizeDomain(input);
    }
  } catch {}
  try {
    let value = String(input || '').trim();
    if (!value) return '';
    if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
    const u = new URL(value);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const DEFAULT_ICONS = [
  'fas fa-newspaper',
  'fas fa-gamepad',
  'fas fa-shopping-cart',
  'fas fa-music',
  'fas fa-book',
];

export default function Blocklist() {
  const [metadata, setMetadata] = useState({}); // { id: { name, icon, created } }
  const [sitesByCategory, setSitesByCategory] = useState({}); // { id: { sites: [] } }
  const [activeCategory, setActiveCategory] = useState('general');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddWebsite, setShowAddWebsite] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: DEFAULT_ICONS[0],
  });
  const [newWebsite, setNewWebsite] = useState({
    url: '',
    categoryId: 'general',
  });

  // Derive list of category ids. Filter out any metadata keys that aren't actual
  // category objects (e.g. accidental fields like updatedAt that may come from persistence layer).
  const categoryIds = useMemo(() => {
    const metaKeys = Object.keys(metadata).filter((k) => {
      if (k === 'general') return false;
      const val = metadata[k];
      return (
        val &&
        typeof val === 'object' &&
        // require a name string to qualify as a category
        typeof val.name === 'string' &&
        val.name.trim().length > 0 &&
        // disallow obvious system fields
        !/^updatedAt|createdAt|timestamp$/i.test(k)
      );
    });
    const ids = ['general', ...metaKeys];
    return Array.from(new Set(ids));
  }, [metadata]);

  const categoryName = useCallback(
    (id) => {
      if (id === 'general') return 'General';
      const m = metadata[id];
      return m && m.name ? m.name : id;
    },
    [metadata]
  );

  const categoryIcon = useCallback(
    (id) => {
      if (id === 'general') return 'fas fa-globe';
      const m = metadata[id];
      return (m && m.icon) || 'fas fa-folder';
    },
    [metadata]
  );

  const refreshAll = useCallback(async () => {
    try {
      await messaging({ action: 'migrateCategoryData' });
    } catch {}
    try {
      const [metaRes, sitesRes, activeRes] = await Promise.all([
        messaging({ action: 'getCategoryMetadata' }),
        messaging({ action: 'getCategorySites' }),
        messaging({ action: 'getActiveCategory' }),
      ]);
      if (metaRes && metaRes.success) setMetadata(metaRes.categories || {});
      if (sitesRes && sitesRes.success)
        setSitesByCategory(sitesRes.sites || {});
      if (activeRes && activeRes.success && activeRes.activeCategory)
        setActiveCategory(activeRes.activeCategory);
    } catch (e) {
      console.error('Blocklist refresh error:', e);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const onAddCategory = useCallback(async () => {
    const name = (newCategory.name || '').trim();
    if (!name) {
      alert('Please enter a category name');
      return;
    }
    const icon = newCategory.icon || 'fas fa-folder';
    const id = name.toLowerCase().replace(/\s+/g, '-');
    try {
      await messaging({
        action: 'saveCategoryMetadata',
        categoryId: id,
        metadata: { name, icon, created: Date.now() },
      });
      setMetadata((prev) => ({
        ...prev,
        [id]: { name, icon, created: Date.now() },
      }));
      setSitesByCategory((prev) => ({ ...prev, [id]: { sites: [] } }));
      setShowAddCategory(false);
      setNewCategory({ name: '', icon: DEFAULT_ICONS[0] });
    } catch (e) {
      alert('Error creating category');
    }
  }, [newCategory]);

  const onDeleteCategory = useCallback(
    async (id) => {
      if (id === 'general') return;
      if (
        !confirm(
          'Are you sure you want to delete this category and all its websites?'
        )
      )
        return;
      try {
        await messaging({ action: 'deleteCategory', categoryId: id });
        setMetadata((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setSitesByCategory((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        if (activeCategory === id) setActiveCategory('general');
      } catch (e) {
        alert('Error deleting category');
      }
    },
    [activeCategory]
  );

  const onAddWebsite = useCallback(async () => {
    const domain = normalize(newWebsite.url);
    const categoryId = newWebsite.categoryId || activeCategory || 'general';
    if (!domain) {
      alert('Please enter a valid website URL');
      return;
    }
    try {
      await messaging({ action: 'addCategorySite', url: domain, categoryId });
      setSitesByCategory((prev) => {
        const existing = prev[categoryId]?.sites || [];
        return { ...prev, [categoryId]: { sites: [...existing, domain] } };
      });
      setShowAddWebsite(false);
      setNewWebsite({ url: '', categoryId: 'general' });
    } catch (e) {
      alert('Error adding website to blocklist');
    }
  }, [newWebsite, activeCategory]);

  const onRemoveWebsite = useCallback(async (categoryId, url) => {
    if (!confirm(`Remove "${url}" from this category?`)) return;
    try {
      await messaging({ action: 'removeCategorySite', url, categoryId });
      setSitesByCategory((prev) => {
        const list = prev[categoryId]?.sites || [];
        return {
          ...prev,
          [categoryId]: { sites: list.filter((u) => u !== url) },
        };
      });
    } catch (e) {
      alert('Error removing website');
    }
  }, []);

  const onCategoryChange = useCallback(async (id) => {
    try {
      await messaging({ action: 'setActiveCategory', categoryId: id });
      setActiveCategory(id);
    } catch (e) {
      alert('Error updating active category');
    }
  }, []);

  return (
    <div className="flex-1 p-6 overflow-auto min-h-full">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <i className="fas fa-layer-group text-blue-500 mr-2"></i>
              Organized Blocklist Categories
            </h3>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Active Category:
              </span>
              <select
                value={activeCategory}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm font-medium"
              >
                {categoryIds.map((id) => (
                  <option key={id} value={id}>
                    {categoryName(id)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={() => {
              setNewWebsite({
                url: '',
                categoryId: activeCategory || 'general',
              });
              setShowAddWebsite(true);
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors"
          >
            <i className="fas fa-plus text-xs mr-2"></i>
            Add Website
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <i className="fas fa-info-circle mr-2"></i>
            Create organized blocklist categories for different contexts (work,
            study, etc.). Select a category above to view and manage its
            websites.
            <strong className="text-gray-900 dark:text-gray-100">
              {' '}
              Currently viewing: {categoryName(activeCategory)}
            </strong>
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              Website Categories
            </h4>
            <button
              onClick={() => setShowAddCategory(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 transition-colors"
            >
              <i className="fas fa-plus text-xs mr-2"></i>
              Add Category
            </button>
          </div>

          <div id="categoriesContainer" className="space-y-4">
            {categoryIds.map((id) => (
              <div
                key={id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 dark:bg-gray-800"
                data-category={id}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    <i className={`${categoryIcon(id)} text-blue-500 mr-2`}></i>
                    {categoryName(id)}
                  </h4>
                  {id !== 'general' && (
                    <div className="flex items-center">
                      <button
                        className="delete-category-btn w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition"
                        onClick={() => onDeleteCategory(id)}
                        aria-label="Delete category"
                      >
                        <i className="fas fa-trash text-sm"></i>
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(sitesByCategory[id]?.sites || []).map((url) => (
                    <div
                      key={`${id}:${url}`}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded group"
                      data-url={url}
                    >
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate pr-2">
                        {url}
                      </span>
                      <button
                        className="remove-website-btn w-7 h-7 inline-flex items-center justify-center rounded-md text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition flex-shrink-0"
                        onClick={() => onRemoveWebsite(id, url)}
                        aria-label="Remove website"
                      >
                        <i className="fas fa-times text-sm"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Website Modal */}
      {showAddWebsite && (
        <div
          id="addWebsiteModal"
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center"
          onClick={() => setShowAddWebsite(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Add Website
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter a domain and choose which category it belongs to.
            </p>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                onAddWebsite();
              }}
            >
              <div className="flex flex-col">
                <label className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Website URL
                </label>
                <input
                  type="text"
                  value={newWebsite.url}
                  onChange={(e) =>
                    setNewWebsite((w) => ({ ...w, url: e.target.value }))
                  }
                  placeholder="e.g., facebook.com"
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <select
                  value={newWebsite.categoryId}
                  onChange={(e) =>
                    setNewWebsite((w) => ({ ...w, categoryId: e.target.value }))
                  }
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {categoryIds.map((id) => (
                    <option key={id} value={id}>
                      {categoryName(id)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  id="cancelAddWebsite"
                  className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setShowAddWebsite(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="saveWebsite"
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm"
                >
                  Add Website
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div
          id="addCategoryModal"
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center"
          onClick={() => setShowAddCategory(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Add New Category
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create a custom category to group related sites.
            </p>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                onAddCategory();
              }}
            >
              <div className="flex flex-col">
                <label className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory((c) => ({ ...c, name: e.target.value }))
                  }
                  placeholder="e.g., News"
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Icon
                </label>
                <select
                  value={newCategory.icon}
                  onChange={(e) =>
                    setNewCategory((c) => ({ ...c, icon: e.target.value }))
                  }
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {DEFAULT_ICONS.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic.replace('fas fa-', '')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  id="cancelAddCategory"
                  className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setShowAddCategory(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="saveCategory"
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
