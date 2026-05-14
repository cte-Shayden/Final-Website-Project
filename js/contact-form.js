// Contact Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');

    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(contactForm);
            const data = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                topic: formData.get('topic'),
                message: formData.get('message'),
                timestamp: new Date().toISOString()
            };

            // Show loading state
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;
            formStatus.textContent = '';
            formStatus.className = 'form-status';

            try {
                // Store data locally (since we don't have a backend)
                // In a real app, you would send this to a server
                const existingData = JSON.parse(localStorage.getItem('contactFormSubmissions') || '[]');
                existingData.push(data);
                localStorage.setItem('contactFormSubmissions', JSON.stringify(existingData));

                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 800));

                // Show success message
                formStatus.textContent = '✓ Message sent successfully! We\'ll get back to you soon.';
                formStatus.className = 'form-status success';

                // Reset form
                contactForm.reset();

                // Clear success message after 5 seconds
                setTimeout(() => {
                    formStatus.textContent = '';
                    formStatus.className = 'form-status';
                }, 5000);

            } catch (error) {
                // Show error message
                formStatus.textContent = '✗ Error sending message. Please try again.';
                formStatus.className = 'form-status error';
                console.error('Form error:', error);
            } finally {
                // Restore button state
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });

        // Add real-time validation
        const inputs = contactForm.querySelectorAll('input[type="email"]');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value);
                if (this.value && !isValid) {
                    this.style.borderColor = 'rgba(255, 107, 97, 0.4)';
                } else {
                    this.style.borderColor = 'rgba(123, 230, 255, 0.18)';
                }
            });
        });
    }
});
