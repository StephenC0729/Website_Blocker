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

  const categoryIds = useMemo(() => {
    const ids = [
      'general',
      ...Object.keys(metadata).filter((k) => k !== 'general'),
    ];
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
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            <i className="fas fa-plus mr-2"></i>Add Website
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
              className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-700 flex items-center"
            >
              <i className="fas fa-plus mr-1.5"></i>
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
                    <div className="flex items-center space-x-2">
                      <button
                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 delete-category-btn"
                        onClick={() => onDeleteCategory(id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(sitesByCategory[id]?.sites || []).map((url) => (
                    <div
                      key={`${id}:${url}`}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded"
                      data-url={url}
                    >
                      <span className="text-sm text-gray-900">{url}</span>
                      <button
                        className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 remove-website-btn"
                        onClick={() => onRemoveWebsite(id, url)}
                      >
                        <i className="fas fa-times text-xs"></i>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Website
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  value={newWebsite.url}
                  onChange={(e) =>
                    setNewWebsite((w) => ({ ...w, url: e.target.value }))
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                  placeholder="e.g., facebook.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={newWebsite.categoryId}
                  onChange={(e) =>
                    setNewWebsite((w) => ({ ...w, categoryId: e.target.value }))
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                >
                  {categoryIds.map((id) => (
                    <option key={id} value={id}>
                      {categoryName(id)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                id="cancelAddWebsite"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => setShowAddWebsite(false)}
              >
                Cancel
              </button>
              <button
                id="saveWebsite"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={onAddWebsite}
              >
                Add Website
              </button>
            </div>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add New Category
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory((c) => ({ ...c, name: e.target.value }))
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                  placeholder="e.g., News"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Icon
                </label>
                <select
                  value={newCategory.icon}
                  onChange={(e) =>
                    setNewCategory((c) => ({ ...c, icon: e.target.value }))
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                >
                  {DEFAULT_ICONS.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic.replace('fas fa-', '')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                id="cancelAddCategory"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => setShowAddCategory(false)}
              >
                Cancel
              </button>
              <button
                id="saveCategory"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={onAddCategory}
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
