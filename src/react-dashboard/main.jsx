import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Navigation from './components/Navigation.jsx';
import Shell from './Shell.jsx';
import FAQ from './pages/FAQ.jsx';
import About from './pages/About.jsx';
import Summary from './pages/Summary.jsx';
import Blocklist from './pages/Blocklist.jsx';
import Settings from './pages/Settings.jsx';
import Dashboard from './pages/Dashboard.jsx';

let reactRoot = null;

export function mountContactApp(containerId = 'content-container') {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;
    let mountNode = container.querySelector('#react-root');
    if (!mountNode) {
      mountNode = document.createElement('div');
      mountNode.id = 'react-root';
      container.appendChild(mountNode);
    }
    reactRoot = createRoot(mountNode);
    reactRoot.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    console.error('Failed to mount React contact app:', e);
  }
}

export function unmountContactApp() {
  try {
    if (reactRoot) {
      reactRoot.unmount();
      reactRoot = null;
    }
  } catch (e) {
    console.error('Failed to unmount React contact app:', e);
  }
}

export function mountFAQApp(containerId = 'content-container') {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    reactRoot = createRoot(container);
    reactRoot.render(
      <React.StrictMode>
        <FAQ />
      </React.StrictMode>
    );
  } catch (e) {
    console.error('Failed to mount React FAQ app:', e);
  }
}

export function mountAboutApp(containerId = 'content-container') {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    reactRoot = createRoot(container);
    reactRoot.render(
      <React.StrictMode>
        <About />
      </React.StrictMode>
    );
  } catch (e) {
    console.error('Failed to mount React About app:', e);
  }
}

export function mountSummaryApp(containerId = 'content-container') {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    reactRoot = createRoot(container);
    reactRoot.render(
      <React.StrictMode>
        <Summary />
      </React.StrictMode>
    );
  } catch (e) {
    console.error('Failed to mount React Summary app:', e);
  }
}

export function mountBlocklistApp(containerId = 'content-container') {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    reactRoot = createRoot(container);
    reactRoot.render(
      <React.StrictMode>
        <Blocklist />
      </React.StrictMode>
    );
  } catch (e) {
    console.error('Failed to mount React Blocklist app:', e);
  }
}

export function mountSettingsApp(containerId = 'content-container') {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    reactRoot = createRoot(container);
    reactRoot.render(
      <React.StrictMode>
        <Settings />
      </React.StrictMode>
    );
  } catch (e) {
    console.error('Failed to mount React Settings app:', e);
  }
}

export function mountDashboardApp(containerId = 'content-container') {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    reactRoot = createRoot(container);
    reactRoot.render(
      <React.StrictMode>
        <Dashboard />
      </React.StrictMode>
    );
  } catch (e) {
    console.error('Failed to mount React Dashboard app:', e);
  }
}

let navRoot = null;
export function mountNavigation(containerId = 'navigation-container') {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    navRoot = createRoot(container);
    navRoot.render(
      <React.StrictMode>
        <Navigation />
      </React.StrictMode>
    );
  } catch (e) {
    console.error('Failed to mount React navigation:', e);
  }
}

export function unmountNavigation() {
  try {
    if (navRoot) {
      navRoot.unmount();
      navRoot = null;
    }
  } catch (e) {
    console.error('Failed to unmount React navigation:', e);
  }
}

let shellRoot = null;
export function mountShell(containerId = 'react-shell-root') {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;
    shellRoot = createRoot(container);
    shellRoot.render(
      <React.StrictMode>
        <Shell />
      </React.StrictMode>
    );
  } catch (e) {
    console.error('Failed to mount React shell:', e);
  }
}

export function unmountShell() {
  try {
    if (shellRoot) {
      shellRoot.unmount();
      shellRoot = null;
    }
  } catch (e) {
    console.error('Failed to unmount React shell:', e);
  }
}
