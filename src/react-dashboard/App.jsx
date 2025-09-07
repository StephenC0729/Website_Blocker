import React, { useMemo } from 'react';
import Contact from './pages/Contact.jsx';
import FAQ from './pages/FAQ.jsx';
import About from './pages/About.jsx';

export default function App() {
  // Temporary: default is Contact. Specific mount functions render page as needed.
  const content = useMemo(() => <Contact />, []);
  return <div className="w-full">{content}</div>;
}
