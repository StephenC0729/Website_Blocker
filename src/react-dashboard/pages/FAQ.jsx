import React, { useState, useCallback } from 'react';

function navigateTo(page) {
  if (!page) return;
  try {
    localStorage.setItem('activePage', page);
    if (location.hash !== `#${page}`) {
      location.hash = `#${page}`;
    } else if (
      typeof window.loadContent === 'function' &&
      typeof window.updateNavigation === 'function'
    ) {
      window.loadContent(page);
      window.updateNavigation(page);
    }
  } catch {}
}

function Question({ index, title, children, openIndex, setOpenIndex }) {
  const isOpen = openIndex === index;
  return (
    <div className="faq-container">
      <button
        className="faq-question w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none transition-colors"
        onClick={() => setOpenIndex(isOpen ? null : index)}
      >
        <span className="text-gray-900 font-medium">{title}</span>
        <i
          className={`fas fa-chevron-down text-gray-400 transform transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        ></i>
      </button>
      <div className={`faq-answer px-6 pb-4 ${isOpen ? 'open' : ''}`}>
        <div className="text-gray-700 leading-relaxed space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);
  const goContact = useCallback(() => navigateTo('contact'), []);

  return (
    <div className="flex-1 p-6 overflow-auto min-h-full bg-white">
      <div className="max-w-4xl mx-auto space-y-4">
        <Question
          index={0}
          title="1. Getting Started"
          openIndex={openIndex}
          setOpenIndex={setOpenIndex}
        >
          <p>Getting started with App Blocker is simple:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Install the extension from the Chrome Web Store</li>
            <li>Click on the App Blocker icon in your browser toolbar</li>
            <li>
              Set up your first blocklist category with websites you want to
              block
            </li>
            <li>Configure your Pomodoro timer settings</li>
            <li>Start your first focus session!</li>
          </ol>
          <p className="text-sm">
            No account registration is required for basic functionality -
            everything works locally on your device.
          </p>
        </Question>

        <Question
          index={1}
          title="2. Blocklist Categories & Configuration"
          openIndex={openIndex}
          setOpenIndex={setOpenIndex}
        >
          <p>
            Blocklist Categories are different blocking modes that allow you to
            customize your focus sessions:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              <strong>Categories:</strong> Each category contains its own list
              of blocked websites and categories
            </li>
            <li>
              <strong>Only one set active:</strong> You can only have one
              blocklist category active at a time
            </li>
            <li>
              <strong>Custom schedules:</strong> Each set can have different
              active hours and days
            </li>
            <li>
              <strong>Category organization:</strong> Group websites by
              categories like Social Media, Entertainment, etc.
            </li>
          </ul>
          <p className="text-sm">
            For example, you might use the 'Work' category for work hours
            (blocking social media), 'Study' category for study time (blocking
            entertainment), and 'Deep Focus' category for complete focus
            (blocking everything distracting).
          </p>
        </Question>

        <Question
          index={2}
          title="3. Timer & Sessions"
          openIndex={openIndex}
          setOpenIndex={setOpenIndex}
        >
          <p>
            The Pomodoro Timer and website blocking work together seamlessly:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              <strong>Work sessions:</strong> Websites in your active blocklist
              category are blocked during focus periods
            </li>
            <li>
              <strong>Break sessions:</strong> You can configure different
              blocking rules for short and long breaks
            </li>
            <li>
              <strong>Automatic switching:</strong> The extension can
              automatically change blocklist categories based on session type
            </li>
            <li>
              <strong>Lockdown mode:</strong> Prevents you from changing
              settings during active sessions
            </li>
          </ul>
          <p className="text-sm">
            This ensures you stay focused during work periods while allowing
            controlled access during breaks.
          </p>
        </Question>

        <Question
          index={3}
          title="4. Data Storage & Privacy"
          openIndex={openIndex}
          setOpenIndex={setOpenIndex}
        >
          <p>App Blocker follows a "local-first" approach:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              <strong>Local storage:</strong> All your settings, blocklists, and
              analytics are stored locally using Chrome Storage API
            </li>
            <li>
              <strong>No account required:</strong> Core functionality works
              without any registration
            </li>
            <li>
              <strong>Chrome Sync:</strong> If you're signed into Chrome, your
              settings sync across your devices automatically
            </li>
            <li>
              <strong>Optional cloud backup:</strong> Future versions will offer
              optional cloud sync for additional backup
            </li>
            <li>
              <strong>Privacy-focused:</strong> Your browsing data never leaves
              your device unless you explicitly choose cloud sync
            </li>
          </ul>
          <p className="text-sm">
            This ensures your privacy while providing the convenience of
            cross-device synchronization.
          </p>
        </Question>

        <Question
          index={4}
          title="5. Analytics & Insights"
          openIndex={openIndex}
          setOpenIndex={setOpenIndex}
        >
          <p>App Blocker provides comprehensive productivity analytics:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              <strong>Session tracking:</strong> Time spent in focus sessions,
              completion rates, and session history
            </li>
            <li>
              <strong>Blocking statistics:</strong> Number of sites blocked,
              most blocked sites, and blocking effectiveness
            </li>
            <li>
              <strong>Productivity trends:</strong> Daily, weekly, and monthly
              productivity patterns
            </li>
            <li>
              <strong>Interactive charts:</strong> Visual representations of
              your focus habits and improvements
            </li>
            <li>
              <strong>Category breakdown:</strong> See which categories of
              websites you block most often
            </li>
            <li>
              <strong>Productivity score:</strong> Overall productivity metrics
              and goal tracking
            </li>
          </ul>
          <p className="text-sm">
            All analytics are generated from your local data and help you
            understand and improve your focus habits.
          </p>
        </Question>

        <Question
          index={5}
          title="6. Customization & Settings"
          openIndex={openIndex}
          setOpenIndex={setOpenIndex}
        >
          <p>App Blocker offers full customization of timer settings:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              <strong>Work sessions:</strong> Adjust from 1-60 minutes (default:
              25 minutes)
            </li>
            <li>
              <strong>Short breaks:</strong> Customize from 1-30 minutes
              (default: 5 minutes)
            </li>
            <li>
              <strong>Long breaks:</strong> Set from 1-60 minutes (default: 15
              minutes)
            </li>
            <li>
              <strong>Session cycles:</strong> Configure how many sessions
              before a long break
            </li>
            <li>
              <strong>Auto-start:</strong> Option to automatically start breaks
              or require manual activation
            </li>
            <li>
              <strong>Notifications:</strong> Desktop and sound notifications
              for session transitions
            </li>
          </ul>
          <p className="text-sm">
            Access these settings through the Settings panel in the dashboard or
            the options page.
          </p>
        </Question>
      </div>

      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <i className="fas fa-life-ring text-blue-600 text-2xl mb-3"></i>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Still need help?
          </h3>
          <p className="text-blue-700 mb-4">
            If you can't find the answer you're looking for, we're here to help!
          </p>
          <div className="space-x-4">
            <button
              id="faqContactSupportBtn"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              onClick={goContact}
            >
              <i className="fas fa-envelope mr-2"></i>Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
