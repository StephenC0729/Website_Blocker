import React from 'react';

export default function Shell() {
  return (
    <div className="flex h-screen">
      <div id="navigation-container" className="h-full"></div>
      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 p-4 theme-transition">
          <div className="flex items-center justify-between">
            <h2
              id="pageTitle"
              className="text-2xl font-bold text-gray-900 dark:text-white"
            ></h2>
          </div>
        </header>
        <div
          id="content-container"
          className="flex-1 flex flex-col min-h-0"
        ></div>
      </div>
    </div>
  );
}
