// Admin Dashboard JavaScript
let adminDashboard = {
    currentTab: 'hero',
    websiteData: {},
    editors: {},
    isLoggedIn: false,

    init() {
        this.setupEventListeners();
        this.initializeEditors();
        this.loadWebsiteData();
        this.checkAuthStatus();
    },

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Action buttons
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveChanges();
        });

        document.getElementById('previewBtn').addEventListener('click', () => {
            this.showPreview();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        // Preview modal
        document.getElementById('closePreview').addEventListener('click', () => {
            this.hidePreview();
        });

        this.setupFormListeners();
    },

    setupFormListeners() {
        // Hero section inputs
        const heroInputs = [
            'hero-institution-name', 'hero-established', 'hero-heading',
            'hero-btn1-text', 'hero-btn1-link', 'hero-btn2-text', 'hero-btn2-link'
        ];

        heroInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.updatePreview('hero');
                });
            }
        });

        // About section inputs
        const aboutInputs = [
            'about-title', 'about-subtitle', 'stat-years', 'stat-alumni', 
            'stat-placement', 'stat-faculty'
        ];

        aboutInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.updatePreview('about');
                });
            }
        });
    },

    initializeEditors() {
        // Initialize Quill editors
        this.editors.heroDescription = new Quill('#hero-description-editor', {
            theme: 'snow',
            placeholder: 'Enter hero description...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['link'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            }
        });

        this.editors.aboutDescription = new Quill('#about-description-editor', {
            theme: 'snow',
            placeholder: 'Enter about description...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['link'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            }
        });

        // Add change listeners to editors
        this.editors.heroDescription.on('text-change', () => {
            this.updatePreview('hero');
        });

        this.editors.aboutDescription.on('text-change', () => {
            this.updatePreview('about');
        });
    },

    checkAuthStatus() {
        const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
        if (isLoggedIn) {
            this.showDashboard();
        } else {
            this.showLogin();
        }
    },

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        // Simple authentication (in production, use proper backend authentication)
        if (username === 'admin' && password === 'admin123') {
            localStorage.setItem('adminLoggedIn', 'true');
            this.showDashboard();
            errorDiv.classList.add('hidden');
        } else {
            errorDiv.textContent = 'Invalid username or password';
            errorDiv.classList.remove('hidden');
        }
    },

    handleLogout() {
        localStorage.removeItem('adminLoggedIn');
        this.showLogin();
    },

    showLogin() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
        this.isLoggedIn = false;
    },

    showDashboard() {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        this.isLoggedIn = true;
        this.updatePreview(this.currentTab);
    },

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load applications when admissions tab is accessed
        if (tabName === 'admissions') {
            this.loadApplications();
            this.setupAdmissionsEventListeners();
        }

        // Update page title
        const titles = {
            hero: 'Hero Section',
            about: 'About Section',
            programs: 'Programs',
            facilities: 'Facilities',
            gallery: 'Gallery',
            testimonials: 'Testimonials',
            admissions: 'Admissions',
            faq: 'FAQ',
            contact: 'Contact',
            seo: 'SEO Settings',
            footer: 'Footer'
        };
        document.getElementById('pageTitle').textContent = titles[tabName];

        this.currentTab = tabName;
        this.updatePreview(tabName);
        
        // Load specific content for admissions tab
        if (tabName === 'admissions') {
            this.loadApplications();
        }
    },

    updatePreview(section) {
        const previewDiv = document.getElementById(`${section}-preview`);
        if (!previewDiv) return;

        let previewHTML = '';

        switch (section) {
            case 'hero':
                previewHTML = this.generateHeroPreview();
                break;
            case 'about':
                previewHTML = this.generateAboutPreview();
                break;
        }

        previewDiv.innerHTML = previewHTML;
    },

    generateHeroPreview() {
        const institutionName = document.getElementById('hero-institution-name').value;
        const established = document.getElementById('hero-established').value;
        const heading = document.getElementById('hero-heading').value;
        const description = this.editors.heroDescription.root.innerHTML;
        const btn1Text = document.getElementById('hero-btn1-text').value;
        const btn2Text = document.getElementById('hero-btn2-text').value;

        return `
            <div class="text-center p-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg">
                <div class="text-sm font-semibold mb-2">${institutionName}</div>
                <div class="text-xs text-blue-200 mb-4">${established}</div>
                <h1 class="text-2xl font-bold mb-4">${heading}</h1>
                <div class="text-sm mb-6 opacity-90">${description}</div>
                <div class="flex gap-2 justify-center">
                    <button class="bg-white text-blue-600 px-4 py-2 rounded text-sm font-semibold">${btn1Text}</button>
                    <button class="border border-white text-white px-4 py-2 rounded text-sm">${btn2Text}</button>
                </div>
            </div>
        `;
    },

    generateAboutPreview() {
        const title = document.getElementById('about-title').value;
        const subtitle = document.getElementById('about-subtitle').value;
        const description = this.editors.aboutDescription.root.innerHTML;
        const years = document.getElementById('stat-years').value;
        const alumni = document.getElementById('stat-alumni').value;
        const placement = document.getElementById('stat-placement').value;
        const faculty = document.getElementById('stat-faculty').value;

        return `
            <div class="p-6">
                <h2 class="text-xl font-bold mb-2">${title}</h2>
                <p class="text-blue-600 font-semibold mb-4">${subtitle}</p>
                <div class="text-sm mb-6">${description}</div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="text-center">
                        <div class="text-lg font-bold text-blue-600">${years}</div>
                        <div class="text-xs text-gray-600">Years of Excellence</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-bold text-blue-600">${alumni}</div>
                        <div class="text-xs text-gray-600">Successful Alumni</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-bold text-blue-600">${placement}</div>
                        <div class="text-xs text-gray-600">Placement Rate</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-bold text-blue-600">${faculty}</div>
                        <div class="text-xs text-gray-600">Expert Faculty</div>
                    </div>
                </div>
            </div>
        `;
    },

    loadWebsiteData() {
        const savedData = localStorage.getItem('websiteData');
        if (savedData) {
            this.websiteData = JSON.parse(savedData);
            this.populateFormFields();
        } else {
            this.websiteData = this.getDefaultData();
        }
    },

    getDefaultData() {
        return {
            hero: {
                institutionName: 'American Nursing Institutions',
                established: 'ESTABLISHED 1988',
                heading: 'Excellence in Healthcare Education',
                description: 'Empowering the next generation of healthcare professionals...',
                btn1Text: 'Explore Programs',
                btn1Link: '#programs',
                btn2Text: 'Visit Campus',
                btn2Link: '#contact'
            },
            about: {
                title: 'About American College of Nursing',
                subtitle: 'Shaping healthcare professionals with excellence, ethics, and expertise since 1988.',
                description: 'American College of Nursing is a premier institution...',
                stats: {
                    years: '36+',
                    alumni: '3,240+',
                    placement: '98%',
                    faculty: '25+'
                }
            }
        };
    },

    populateFormFields() {
        // Populate hero section
        if (this.websiteData.hero) {
            const hero = this.websiteData.hero;
            document.getElementById('hero-institution-name').value = hero.institutionName || '';
            document.getElementById('hero-established').value = hero.established || '';
            document.getElementById('hero-heading').value = hero.heading || '';
            document.getElementById('hero-btn1-text').value = hero.btn1Text || '';
            document.getElementById('hero-btn1-link').value = hero.btn1Link || '';
            document.getElementById('hero-btn2-text').value = hero.btn2Text || '';
            document.getElementById('hero-btn2-link').value = hero.btn2Link || '';
            
            if (this.editors.heroDescription) {
                this.editors.heroDescription.root.innerHTML = hero.description || '';
            }
        }

        // Populate about section
        if (this.websiteData.about) {
            const about = this.websiteData.about;
            document.getElementById('about-title').value = about.title || '';
            document.getElementById('about-subtitle').value = about.subtitle || '';
            
            if (about.stats) {
                document.getElementById('stat-years').value = about.stats.years || '';
                document.getElementById('stat-alumni').value = about.stats.alumni || '';
                document.getElementById('stat-placement').value = about.stats.placement || '';
                document.getElementById('stat-faculty').value = about.stats.faculty || '';
            }
            
            if (this.editors.aboutDescription) {
                this.editors.aboutDescription.root.innerHTML = about.description || '';
            }
        }
    },

    saveChanges() {
        this.collectFormData();
        localStorage.setItem('websiteData', JSON.stringify(this.websiteData));
        this.showNotification('Changes saved successfully!', 'success');
    },

    collectFormData() {
        // Collect hero data
        this.websiteData.hero = {
            institutionName: document.getElementById('hero-institution-name').value,
            established: document.getElementById('hero-established').value,
            heading: document.getElementById('hero-heading').value,
            description: this.editors.heroDescription.root.innerHTML,
            btn1Text: document.getElementById('hero-btn1-text').value,
            btn1Link: document.getElementById('hero-btn1-link').value,
            btn2Text: document.getElementById('hero-btn2-text').value,
            btn2Link: document.getElementById('hero-btn2-link').value
        };

        // Collect about data
        this.websiteData.about = {
            title: document.getElementById('about-title').value,
            subtitle: document.getElementById('about-subtitle').value,
            description: this.editors.aboutDescription.root.innerHTML,
            stats: {
                years: document.getElementById('stat-years').value,
                alumni: document.getElementById('stat-alumni').value,
                placement: document.getElementById('stat-placement').value,
                faculty: document.getElementById('stat-faculty').value
            }
        };
    },

    showPreview() {
        const previewModal = document.getElementById('previewModal');
        const previewFrame = document.getElementById('previewFrame');
        previewFrame.src = 'index.html';
        previewModal.classList.remove('hidden');
    },

    hidePreview() {
        document.getElementById('previewModal').classList.add('hidden');
    },

    exportData() {
        this.collectFormData();
        const dataStr = JSON.stringify(this.websiteData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'website-data.json';
        link.click();
        this.showNotification('Data exported successfully!', 'success');
    },

    importData(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                this.websiteData = importedData;
                this.populateFormFields();
                this.updatePreview(this.currentTab);
                this.showNotification('Data imported successfully!', 'success');
            } catch (error) {
                this.showNotification('Error importing data. Please check the file format.', 'error');
            }
        };
        reader.readAsText(file);
    },

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    },

    setupAdmissionsEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchApplications');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.loadApplications();
            });
        }

        // Sort controls
        const sortBy = document.getElementById('sortBy');
        const sortOrder = document.getElementById('sortOrder');
        
        if (sortBy) {
            sortBy.addEventListener('change', () => {
                this.loadApplications();
            });
        }
        
        if (sortOrder) {
            sortOrder.addEventListener('change', () => {
                this.loadApplications();
            });
        }
    },

    async loadApplications() {
        try {
            // Get search and sort parameters
            const searchQuery = document.getElementById('searchApplications')?.value || '';
            const sortBy = document.getElementById('sortBy')?.value || 'date';
            const sortOrder = document.getElementById('sortOrder')?.value || 'desc';
            
            // Build query parameters
            const params = new URLSearchParams();
            if (searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }
            params.append('sort', sortBy);
            params.append('order', sortOrder);
            
            const response = await fetch(`${window.location.origin}/api/applications?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch applications');
            }
            
            const data = await response.json();
            this.displayApplications(data.data || []);
            
        } catch (error) {
            console.error('Error loading applications:', error);
            this.displayApplicationsError();
        }
    },

    displayApplications(applications) {
        const tbody = document.getElementById('applicationsTableBody');
        const totalElement = document.getElementById('totalApplications');
        
        if (!tbody) return;
        
        // Update total count
        if (totalElement) {
            totalElement.textContent = applications.length;
        }
        
        if (applications.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                        <i class="fas fa-inbox mr-2"></i>No applications found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = applications.map(app => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-mono text-blue-600 font-medium" title="Application ID (Phone Number)">
                    ${app._id || app.phone || 'N/A'}
                </td>
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${app.name || 'N/A'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${app.email || 'N/A'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${app.phone || 'N/A'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${app.course || 'N/A'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${this.formatDate(app.timestamp)}</td>
                <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${this.getStatusClass(app.status)}">
                        ${app.status || 'pending'}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm">
                    <div class="flex gap-2">
                        <button onclick="adminDashboard.viewApplication('${app._id}')" class="text-blue-600 hover:text-blue-800" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="adminDashboard.updateApplicationStatus('${app._id}', 'approved')" class="text-green-600 hover:text-green-800" title="Approve">
                            <i class="fas fa-check"></i>
                        </button>
                        <button onclick="adminDashboard.updateApplicationStatus('${app._id}', 'rejected')" class="text-red-600 hover:text-red-800" title="Reject">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Setup refresh button
        const refreshBtn = document.getElementById('refreshApplications');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.loadApplications();
        }

        // Setup export button
        const exportBtn = document.getElementById('exportApplications');
        if (exportBtn) {
            exportBtn.onclick = () => this.exportApplications(applications);
        }
    },

    displayApplicationsError() {
        const tbody = document.getElementById('applicationsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-red-500">
                        <i class="fas fa-exclamation-triangle mr-2"></i>Failed to load applications. Please try again.
                    </td>
                </tr>
            `;
        }
    },

    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    },

    getStatusClass(status) {
        switch (status?.toLowerCase()) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'reviewed': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    },

    async updateApplicationStatus(applicationId, status) {
        try {
            const response = await fetch(`${window.location.origin}/api/applications/${applicationId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                throw new Error('Failed to update application status');
            }

            this.showNotification(`Application ${status} successfully`, 'success');
            this.loadApplications(); // Refresh the list

        } catch (error) {
            console.error('Error updating application status:', error);
            this.showNotification('Failed to update application status', 'error');
        }
    },

    exportApplications(applications) {
        if (!applications || applications.length === 0) {
            this.showNotification('No applications to export', 'error');
            return;
        }

        // Create CSV content
        const headers = ['Application ID', 'Name', 'Email', 'Phone', 'Course', 'Message', 'Date', 'Status'];
        const csvContent = [
            headers.join(','),
            ...applications.map(app => [
                `"${app._id || ''}"`,
                `"${app.name || ''}"`,
                `"${app.email || ''}"`,
                `"${app.phone || ''}"`,
                `"${app.course || ''}"`,
                `"${app.message || ''}"`,
                `"${this.formatDate(app.timestamp)}"`,
                `"${app.status || 'pending'}"`
            ].join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `applications_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showNotification('Applications exported successfully', 'success');
    },

    viewApplication(applicationId) {
        // Find the application in the current data
        fetch(window.location.origin + '/api/applications')
            .then(response => response.json())
            .then(data => {
                const application = data.data.find(app => app._id === applicationId);
                if (application) {
                    this.showApplicationModal(application);
                } else {
                    this.showNotification('Application not found', 'error');
                }
            })
            .catch(error => {
                console.error('Error fetching application details:', error);
                this.showNotification('Failed to load application details', 'error');
            });
    },

    showApplicationModal(application) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white w-full max-w-2xl mx-4 rounded-lg shadow-xl overflow-hidden">
                <div class="flex justify-between items-center p-6 border-b">
                    <h3 class="text-xl font-semibold">Application Details</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="p-6">
                    <div class="mb-4 p-4 bg-blue-50 rounded-lg">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Application ID</label>
                        <p class="text-blue-600 font-mono font-semibold text-lg">${application._id || 'N/A'}</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <p class="text-gray-900">${application.name || 'N/A'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <p class="text-gray-900">${application.email || 'N/A'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <p class="text-gray-900">${application.phone || 'N/A'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Course</label>
                            <p class="text-gray-900">${application.course || 'N/A'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Application Date</label>
                            <p class="text-gray-900">${this.formatDate(application.timestamp)}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${this.getStatusClass(application.status)}">
                                ${application.status || 'pending'}
                            </span>
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <p class="text-gray-900 bg-gray-50 p-3 rounded-lg">${application.message || 'No message provided'}</p>
                        </div>
                    </div>
                    <div class="mt-6 flex gap-3">
                        <button onclick="adminDashboard.updateApplicationStatus('${application._id}', 'approved'); this.closest('.fixed').remove();" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                            <i class="fas fa-check mr-2"></i>Approve
                        </button>
                        <button onclick="adminDashboard.updateApplicationStatus('${application._id}', 'rejected'); this.closest('.fixed').remove();" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                            <i class="fas fa-times mr-2"></i>Reject
                        </button>
                        <button onclick="this.closest('.fixed').remove()" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
};

// CSS for navigation items
const style = document.createElement('style');
style.textContent = `
    .nav-item {
        display: block;
        padding: 12px 16px;
        color: #d1d5db;
        text-decoration: none;
        transition: all 0.2s;
        border-left: 3px solid transparent;
    }
    .nav-item:hover {
        background-color: #374151;
        color: white;
        border-left-color: #3b82f6;
    }
    .nav-item.active {
        background-color: #1f2937;
        color: white;
        border-left-color: #3b82f6;
    }
`;
document.head.appendChild(style);

document.addEventListener("DOMContentLoaded", function () {
    // Login
    const loginForm = document.getElementById("loginForm");
    const loginModal = document.getElementById("loginModal");
    const dashboard = document.getElementById("dashboard");
    const loginError = document.getElementById("loginError");

    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        if (username === "admin" && password === "admin123") {
            loginModal.classList.add("hidden");
            dashboard.classList.remove("hidden");
        } else {
            loginError.textContent = "Invalid credentials. Try admin/admin123.";
            loginError.classList.remove("hidden");
        }
    });

    // Tabs
    const navItems = document.querySelectorAll(".nav-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitle = document.getElementById("pageTitle");

    navItems.forEach(item => {
        item.addEventListener("click", function (e) {
            e.preventDefault();
            const tab = this.getAttribute("data-tab");
            navItems.forEach(i => i.classList.remove("bg-gray-900"));
            this.classList.add("bg-gray-900");

            tabContents.forEach(tc => tc.classList.remove("active"));
            document.getElementById(`${tab}-tab`).classList.add("active");
            pageTitle.textContent = this.textContent.trim();
        });
    });

    // Preview Modal
    const previewBtn = document.getElementById("previewBtn");
    const previewModal = document.getElementById("previewModal");
    const closePreview = document.getElementById("closePreview");
    const previewFrame = document.getElementById("previewFrame");

    previewBtn.addEventListener("click", () => {
        previewFrame.src = "/";
        previewModal.classList.remove("hidden");
    });

    closePreview.addEventListener("click", () => {
        previewModal.classList.add("hidden");
    });
});


// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard.init();

}); 