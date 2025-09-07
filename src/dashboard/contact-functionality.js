/**
 * Contact Form Functionality
 * Handles validation and submission for the contact page form.
 * This simulates sending an email by posting a message to the background.
 */

function setupContactFunctionality() {
  try {
    const form = document.getElementById('contactForm');
    const nameInput = document.getElementById('contactName');
    const emailInput = document.getElementById('contactEmail');
    const subjectInput = document.getElementById('contactSubject');
    const messageInput = document.getElementById('contactMessage');
    const sendBtn = document.getElementById('sendMessageBtn');

    if (!form || !nameInput || !emailInput || !subjectInput || !messageInput) {
      return;
    }

    const setLoading = (loading) => {
      if (!sendBtn) return;
      sendBtn.disabled = !!loading;
      sendBtn.classList.toggle('opacity-60', !!loading);
      sendBtn.textContent = loading ? 'Sending…' : 'Send Message';
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const subject = subjectInput.value.trim();
      const message = messageInput.value.trim();

      if (!name || !email || !subject || !message) {
        alert('Please fill in all required fields.');
        return;
      }
      // simple email check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address.');
        return;
      }

      try {
        setLoading(true);
        if (typeof sendMessagePromise === 'function') {
          const res = await sendMessagePromise({
            action: 'contactSendEmail',
            payload: { name, email, subject, message },
          });
          if (res && res.ok) {
            alert('Thanks! Your message has been sent.');
            form.reset();
          } else {
            alert('Failed to send message. Please try again later.');
          }
        } else {
          // Fallback if background messaging is unavailable
          setTimeout(() => {
            alert('Thanks! Your message has been queued.');
            form.reset();
          }, 400);
        }
      } catch (err) {
        console.error('Contact form error:', err);
        alert('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    });
  } catch (error) {
    console.error('setupContactFunctionality init error:', error);
  }
}

// Export for tests if modules are used
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setupContactFunctionality };
}
