/**
 * EmailJS service for sending contact form emails
 */

// EmailJS Configuration
const EMAILJS_CONFIG = {
  serviceId: 'service_zvkjvfc',
  templateId: 'template_7yfkhjw',
  publicKey: 'ScWnYMxp96RPCl11q'
};

/**
 * Send email using EmailJS API
 * @param {Object} formData - Contact form data
 * @param {string} formData.name - User's name
 * @param {string} formData.email - User's email
 * @param {string} formData.subject - Email subject
 * @param {string} formData.message - Email message
 * @returns {Promise<Object>} Response object
 */
export async function sendContactEmail(formData) {
  try {
    // Validate input
    if (!formData || !formData.name || !formData.email || !formData.subject || !formData.message) {
      throw new Error('Missing required fields');
    }

    // Prepare template parameters for EmailJS
    const templateParams = {
      from_name: formData.name,
      reply_to: formData.email,
      subject: formData.subject,
      message: formData.message,
      to_name: 'App Blocker Support' // Your name/company
    };

    // EmailJS API endpoint
    const url = 'https://api.emailjs.com/api/v1.0/email/send';
    
    // Prepare request payload
    const payload = {
      service_id: EMAILJS_CONFIG.serviceId,
      template_id: EMAILJS_CONFIG.templateId,
      user_id: EMAILJS_CONFIG.publicKey,
      template_params: templateParams
    };

    console.log('Sending email via EmailJS...', { 
      from: formData.email, 
      subject: formData.subject 
    });

    // Send request to EmailJS
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EmailJS API error: ${response.status} - ${errorText}`);
    }

    console.log('Email sent successfully via EmailJS');
    
    return {
      success: true,
      message: 'Email sent successfully'
    };

  } catch (error) {
    console.error('Failed to send email:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Rate limiting check (basic implementation)
 * Prevents spam by limiting emails per time period
 */
let lastEmailTime = 0;
const EMAIL_COOLDOWN = 30000; // 30 seconds between emails

export function checkRateLimit() {
  const now = Date.now();
  if (now - lastEmailTime < EMAIL_COOLDOWN) {
    const remainingTime = Math.ceil((EMAIL_COOLDOWN - (now - lastEmailTime)) / 1000);
    return {
      allowed: false,
      remainingTime
    };
  }
  
  lastEmailTime = now;
  return { allowed: true };
}