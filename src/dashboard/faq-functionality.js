/**
 * FAQ Functionality
 * Handles accordion behavior for FAQ questions
 */

/**
 * Setup FAQ Functionality
 * Initializes accordion behavior for FAQ questions
 */
function setupFAQFunctionality() {
  // FAQ Accordion functionality
  document.querySelectorAll('.faq-question').forEach((button) => {
    button.addEventListener('click', () => {
      const answer = button.nextElementSibling;
      const icon = button.querySelector('i');

      // Close other FAQ items (accordion behavior)
      document.querySelectorAll('.faq-answer').forEach((otherAnswer) => {
        if (otherAnswer !== answer) {
          otherAnswer.classList.remove('open');
          const otherIcon =
            otherAnswer.previousElementSibling.querySelector('i');
          otherIcon.style.transform = 'rotate(0deg)';
        }
      });

      // Toggle current FAQ item
      answer.classList.toggle('open');

      // Rotate chevron icon for visual feedback
      if (answer.classList.contains('open')) {
        icon.style.transform = 'rotate(180deg)';
      } else {
        icon.style.transform = 'rotate(0deg)';
      }
    });
  });
}

// Export function if using modules, otherwise it's global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setupFAQFunctionality
  };
}