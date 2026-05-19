document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');

    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(contactForm);
            const data = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                topic: formData.get('topic'),
                message: formData.get('message'),
                timestamp: new Date().toISOString()
            };
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;
            formStatus.textContent = '';
            formStatus.className = 'form-status';

            try {
                const existingData = JSON.parse(localStorage.getItem('contactFormSubmissions') || '[]');
                existingData.push(data);
                localStorage.setItem('contactFormSubmissions', JSON.stringify(existingData));

                await new Promise(resolve => setTimeout(resolve, 800));

            
                formStatus.textContent = '✓ Message sent successfully! We\'ll get back to you soon.';
                formStatus.className = 'form-status success';

                contactForm.reset();

                setTimeout(() => {
                    formStatus.textContent = '';
                    formStatus.className = 'form-status';
                }, 9000);

            } finally {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });

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
