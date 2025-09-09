import React from 'react';

export default function About() {
  return (
    <div className="flex-1 p-6 overflow-auto min-h-full">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-shield-alt text-white text-2xl"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">App Blocker</h3>
          <p className="text-lg text-gray-600">
            Productivity & Focus Extension
          </p>
          <p className="text-sm text-gray-500 mt-2">Version 1.0.0</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="text-gray-700 leading-relaxed space-y-4">
            <p>
              App Blocker is a powerful Chrome extension designed to help you
              stay focused and productive by blocking distracting websites
              during your work sessions. Built with a comprehensive dashboard
              and advanced analytics, it's your ultimate companion for
              maintaining digital wellness.
            </p>
            <p>
              Whether you're studying, working, or just trying to reduce screen
              time, App Blocker provides the tools you need to take control of
              your browsing habits and achieve your productivity goals.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
            <i className="fas fa-clock text-red-600 text-xl"></i>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Pomodoro Timer</h4>
          <p className="text-sm text-gray-600">
            Built-in Pomodoro timer with customizable work and break sessions to
            boost your productivity.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <i className="fas fa-ban text-blue-600 text-xl"></i>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Smart Blocking</h4>
          <p className="text-sm text-gray-600">
            Unlimited customizable categories with organized website management
            and manual category switching.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <i className="fas fa-chart-bar text-green-600 text-xl"></i>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">
            Analytics Dashboard
          </h4>
          <p className="text-sm text-gray-600">
            Comprehensive productivity analytics with charts, trends, and
            session tracking.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <i className="fas fa-database text-purple-600 text-xl"></i>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Local-First</h4>
          <p className="text-sm text-gray-600">
            All data stored locally with Chrome Storage API. No account required
            for core features.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
            <i className="fas fa-calendar text-orange-600 text-xl"></i>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Session Control</h4>
          <p className="text-sm text-gray-600">
            Timer-integrated blocking with automatic category switching
            between focus and break sessions.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <i className="fas fa-shield-alt text-indigo-600 text-xl"></i>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">
            Account Security
          </h4>
          <p className="text-sm text-gray-600">
            Firebase authentication with email verification, password
            management, and secure account deletion.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          <i className="fas fa-code text-gray-500 mr-2"></i>Technical Details
        </h3>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Built With</h4>
            <ul className="space-y-3">
              <li className="flex items-center text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mr-3"></i>React 18+
                with Hooks
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mr-3"></i>Tailwind CSS
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mr-3"></i>Chart.js for
                Analytics
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mr-3"></i>Chrome
                Extension APIs
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Key Features</h4>
            <ul className="space-y-3">
              <li className="flex items-center text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mr-3"></i>
                No account required for core features
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mr-3"></i>Local data
                persistence
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mr-3"></i>Optional cross-device
                sync with account
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mr-3"></i>Full offline
                functionality
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
