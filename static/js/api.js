// API Configuration
const API_BASE_URL = window.location.origin + '/api';

// API Helper Functions
class CollegeAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Generic API call method
    async apiCall(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    // Student API Methods
    async submitApplication(applicationData) {
        return await this.apiCall('/students/apply', {
            method: 'POST',
            body: JSON.stringify(applicationData)
        });
    }

    async getApplicationStatus(applicationId) {
        return await this.apiCall(`/students/application/${applicationId}`);
    }

    async checkEmailExists(email) {
        return await this.apiCall(`/students/check-email/${encodeURIComponent(email)}`);
    }

    async getPrograms() {
        return await this.apiCall('/students/programs');
    }

    async getStudentStats() {
        return await this.apiCall('/students/stats');
    }

    // Contact API Methods
    async submitContact(contactData) {
        return await this.apiCall('/contact/submit', {
            method: 'POST',
            body: JSON.stringify(contactData)
        });
    }

    async getInquiryTypes() {
        return await this.apiCall('/contact/inquiry-types');
    }

    async getContactStats() {
        return await this.apiCall('/contact/stats');
    }

    // Health Check
    async healthCheck() {
        return await this.apiCall('/health');
    }
}

// Create global API instance
const api = new CollegeAPI();

// Form Handlers
class FormHandler {
    constructor() {
        this.initializeForms();
    }

    initializeForms() {
        // Initialize admission form
        const admissionForm = document.getElementById('admissionForm');
        if (admissionForm) {
            this.setupAdmissionForm(admissionForm);
        }

        // Initialize contact form
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            this.setupContactForm(contactForm);
        }

        // Load programs dropdown
        this.loadPrograms();
        
        // Load inquiry types
        this.loadInquiryTypes();
    }

    async setupAdmissionForm(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

                // Collect form data
                const formData = new FormData(form);
                const applicationData = {
                    firstName: formData.get('firstName'),
                    lastName: formData.get('lastName'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    dateOfBirth: formData.get('dateOfBirth'),
                    gender: formData.get('gender'),
                    address: {
                        street: formData.get('street'),
                        city: formData.get('city'),
                        state: formData.get('state'),
                        zipCode: formData.get('zipCode'),
                        country: formData.get('country') || 'India'
                    },
                    program: formData.get('program'),
                    previousEducation: {
                        qualification: formData.get('qualification'),
                        institution: formData.get('institution'),
                        yearOfCompletion: parseInt(formData.get('yearOfCompletion')),
                        percentage: parseFloat(formData.get('percentage'))
                    },
                    admissionYear: parseInt(formData.get('admissionYear')),
                    guardian: {
                        name: formData.get('guardianName'),
                        relationship: formData.get('guardianRelationship'),
                        phone: formData.get('guardianPhone'),
                        email: formData.get('guardianEmail')
                    },
                    medicalHistory: formData.get('medicalHistory'),
                    specialNeeds: formData.get('specialNeeds'),
                    motivation: formData.get('motivation')
                };

                // Submit application
                const response = await api.submitApplication(applicationData);

                // Show success message
                this.showMessage('success', response.message);
                
                // Store application ID for tracking
                if (response.data && response.data.applicationId) {
                    localStorage.setItem('applicationId', response.data.applicationId);
                }

                // Reset form
                form.reset();

            } catch (error) {
                console.error('Application submission failed:', error);
                this.showMessage('error', error.message || 'Failed to submit application. Please try again.');
            } finally {
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });

        // Email validation
        const emailInput = form.querySelector('input[name="email"]');
        if (emailInput) {
            emailInput.addEventListener('blur', async (e) => {
                const email = e.target.value.trim();
                if (email) {
                    try {
                        const response = await api.checkEmailExists(email);
                        if (response.exists) {
                            this.showFieldError(emailInput, 'This email is already registered');
                        } else {
                            this.clearFieldError(emailInput);
                        }
                    } catch (error) {
                        console.error('Email check failed:', error);
                    }
                }
            });
        }
    }

    async setupContactForm(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

                // Collect form data
                const formData = new FormData(form);
                const contactData = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    subject: formData.get('subject'),
                    message: formData.get('message'),
                    inquiryType: formData.get('inquiryType') || 'General Inquiry',
                    programInterest: formData.get('programInterest') || 'Not Specified'
                };

                // Submit contact form
                const response = await api.submitContact(contactData);

                // Show success message
                this.showMessage('success', response.message);

                // Reset form
                form.reset();

            } catch (error) {
                console.error('Contact submission failed:', error);
                this.showMessage('error', error.message || 'Failed to send message. Please try again.');
            } finally {
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    async loadPrograms() {
        try {
            const response = await api.getPrograms();
            const programSelects = document.querySelectorAll('select[name="program"], select[name="programInterest"]');
            
            programSelects.forEach(select => {
                // Clear existing options except the first one
                const firstOption = select.querySelector('option');
                select.innerHTML = '';
                if (firstOption) {
                    select.appendChild(firstOption);
                }

                // Add program options
                response.data.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program.name;
                    option.textContent = `${program.name} (${program.duration})`;
                    select.appendChild(option);
                });
            });
        } catch (error) {
            console.error('Failed to load programs:', error);
        }
    }

    async loadInquiryTypes() {
        try {
            const response = await api.getInquiryTypes();
            const inquirySelect = document.querySelector('select[name="inquiryType"]');
            
            if (inquirySelect) {
                // Clear existing options except the first one
                const firstOption = inquirySelect.querySelector('option');
                inquirySelect.innerHTML = '';
                if (firstOption) {
                    inquirySelect.appendChild(firstOption);
                }

                // Add inquiry type options
                response.data.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.value;
                    option.textContent = type.label;
                    option.title = type.description;
                    inquirySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load inquiry types:', error);
        }
    }

    showMessage(type, message) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.api-message');
        existingMessages.forEach(msg => msg.remove());

        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `api-message alert alert-${type === 'success' ? 'success' : 'danger'}`;
        messageDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;

        // Insert message at the top of the page
        document.body.insertBefore(messageDiv, document.body.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);

        // Scroll to top to show message
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error text-danger small mt-1';
        errorDiv.textContent = message;
        
        field.classList.add('is-invalid');
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }
}

// Statistics Display
class StatsDisplay {
    constructor() {
        this.loadStats();
    }

    async loadStats() {
        try {
            // Load student stats
            const studentStats = await api.getStudentStats();
            this.updateStudentStats(studentStats.data);

            // Load contact stats
            const contactStats = await api.getContactStats();
            this.updateContactStats(contactStats.data);

        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    }

    updateStudentStats(data) {
        // Update student count in about section
        const studentCountElement = document.querySelector('.stat-number[data-stat="students"]');
        if (studentCountElement && data.overview) {
            this.animateCounter(studentCountElement, data.overview.approvedStudents || 0);
        }

        // Update applications count
        const applicationsElement = document.querySelector('.stat-number[data-stat="applications"]');
        if (applicationsElement && data.overview) {
            this.animateCounter(applicationsElement, data.overview.totalApplications || 0);
        }
    }

    updateContactStats(data) {
        // Update contact stats if needed
        const contactCountElement = document.querySelector('.stat-number[data-stat="contacts"]');
        if (contactCountElement && data.overview) {
            this.animateCounter(contactCountElement, data.overview.totalContacts || 0);
        }
    }

    animateCounter(element, targetValue) {
        const startValue = 0;
        const duration = 2000; // 2 seconds
        const startTime = performance.now();

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
            element.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };

        requestAnimationFrame(updateCounter);
    }
}

// Application Status Checker
class ApplicationTracker {
    constructor() {
        this.setupTracker();
    }

    setupTracker() {
        // Check if there's a stored application ID
        const applicationId = localStorage.getItem('applicationId');
        if (applicationId) {
            this.showTrackingOption(applicationId);
        }

        // Setup tracking form if exists
        const trackingForm = document.getElementById('trackingForm');
        if (trackingForm) {
            this.setupTrackingForm(trackingForm);
        }
    }

    showTrackingOption(applicationId) {
        // Create tracking notification
        const trackingDiv = document.createElement('div');
        trackingDiv.className = 'application-tracker alert alert-info';
        trackingDiv.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div>
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Track Your Application:</strong> Application ID: ${applicationId}
                </div>
                <button class="btn btn-sm btn-primary" onclick="applicationTracker.checkStatus('${applicationId}')">
                    Check Status
                </button>
            </div>
        `;

        // Insert after header
        const header = document.querySelector('.header');
        if (header && header.nextSibling) {
            header.parentNode.insertBefore(trackingDiv, header.nextSibling);
        }
    }

    setupTrackingForm(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const applicationId = form.querySelector('input[name="applicationId"]').value.trim();
            if (applicationId) {
                await this.checkStatus(applicationId);
            }
        });
    }

    async checkStatus(applicationId) {
        try {
            const response = await api.getApplicationStatus(applicationId);
            this.displayStatus(response.data);
        } catch (error) {
            console.error('Failed to check application status:', error);
            formHandler.showMessage('error', 'Application not found or invalid ID');
        }
    }

    displayStatus(data) {
        const statusModal = this.createStatusModal(data);
        document.body.appendChild(statusModal);
        
        // Show modal (assuming Bootstrap is available)
        if (window.bootstrap) {
            const modal = new bootstrap.Modal(statusModal);
            modal.show();
        }
    }

    createStatusModal(data) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Application Status</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <strong>Name:</strong> ${data.fullName}
                            </div>
                            <div class="col-md-6">
                                <strong>Email:</strong> ${data.email}
                            </div>
                            <div class="col-md-6">
                                <strong>Program:</strong> ${data.program}
                            </div>
                            <div class="col-md-6">
                                <strong>Status:</strong> 
                                <span class="badge bg-${this.getStatusColor(data.applicationStatus)}">
                                    ${data.applicationStatus}
                                </span>
                            </div>
                            <div class="col-md-6">
                                <strong>Applied:</strong> ${new Date(data.applicationDate).toLocaleDateString()}
                            </div>
                            <div class="col-md-6">
                                <strong>Admission Year:</strong> ${data.admissionYear}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    getStatusColor(status) {
        const colors = {
            'Pending': 'warning',
            'Under Review': 'info',
            'Approved': 'success',
            'Rejected': 'danger',
            'Waitlisted': 'secondary'
        };
        return colors[status] || 'secondary';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize form handlers
    window.formHandler = new FormHandler();
    
    // Initialize stats display
    window.statsDisplay = new StatsDisplay();
    
    // Initialize application tracker
    window.applicationTracker = new ApplicationTracker();

    // Health check
    api.healthCheck().then(response => {
        console.log('API Health Check:', response.message);
    }).catch(error => {
        console.error('API Health Check Failed:', error);
    });
});

// Export for global access
window.api = api; 