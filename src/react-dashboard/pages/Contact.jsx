import React, { useState, useCallback } from 'react';

function getMessaging() {
  if (
    typeof window !== 'undefined' &&
    typeof window.sendMessagePromise === 'function'
  ) {
    return window.sendMessagePromise;
  }
  return async (msg) => {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ ok: true, queued: true, msg }), 400)
    );
  };
}

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const trimmed = {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      };
      if (
        !trimmed.name ||
        !trimmed.email ||
        !trimmed.subject ||
        !trimmed.message
      ) {
        alert('Please fill in all required fields.');
        return;
      }
      if (!/^([^\s@])+@([^\s@])+\.[^\s@]+$/.test(trimmed.email)) {
        alert('Please enter a valid email address.');
        return;
      }
      try {
        setLoading(true);
        const send = getMessaging();
        const res = await send({
          action: 'contactSendEmail',
          payload: trimmed,
        });
        if (res && res.ok) {
          alert('Thanks! Your message has been sent.');
          setName('');
          setEmail('');
          setSubject('');
          setMessage('');
        } else {
          alert('Failed to send message. Please try again later.');
        }
      } catch (err) {
        console.error('Contact form error:', err);
        alert('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [name, email, subject, message]
  );

  return (
    <div className="flex-1 p-6 overflow-auto min-h-full bg-white dark:bg-gray-900">
      <div className="max-w-5xl mx-auto text-center mb-8">
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
          Get in Touch with Us
        </h3>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Have questions or need support? Reach out through our contact form, or
          visit our headquarters for direct assistance.
        </p>
      </div>
      <div className="flex justify-center">
        <div className="w-full max-w-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Send us a Message
          </h4>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your name *
              </label>
              <input
                type="text"
                required
                placeholder="Enter your name"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your email *
              </label>
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject *
              </label>
              <input
                type="text"
                required
                placeholder="Enter subject"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your message *
              </label>
              <textarea
                rows="6"
                required
                placeholder="Enter your message"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-colors ${
                  loading ? 'opacity-60' : ''
                }`}
                disabled={loading}
              >
                {loading ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
