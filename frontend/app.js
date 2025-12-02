// ============================================================================
// CONSTANTS
// ============================================================================
// TODO: This should be configurable or fetched from the authenticated user context
const HARDCODED_OWNER_ID = '507f1f77bcf86cd799439011';

const DEFAULT_ACCOUNTS = [
    {
        id: 'acme-corp',
        name: 'Acme Corporation',
        apiUrl: 'http://localhost:8000',
        apiKey: 'dev-key-123',
        companyId: '507f1f77bcf86cd799439011',
        email: 'admin@acme-corp.com',
        tier: 'PROFESSIONAL'
    },
    {
        id: 'techstart',
        name: 'TechStart Inc',
        apiUrl: 'http://localhost:8000',
        apiKey: '',
        companyId: '',
        email: 'hello@techstart.io',
        tier: 'STARTER'
    }
];

const STORAGE_KEYS = {
    API_URL: 'apiUrl',
    API_KEY: 'apiKey',
    COMPANY_ID: 'companyId',
    SAVED_ACCOUNTS: 'savedAccounts',
    CURRENT_ACCOUNT_ID: 'currentAccountId',
    SEARCH_COUNT: 'searchCount',
    RECENT_ACTIVITY: 'recentActivity',
    SEARCH_HISTORY: 'searchHistory'
};

const DEBOUNCE_DELAY = 300;
const JOB_POLL_INTERVAL = 2000;
const MAX_SEARCH_HISTORY = 20;
const MAX_RECENT_ACTIVITY = 50;

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let config = {
    apiUrl: localStorage.getItem(STORAGE_KEYS.API_URL) || 'http://localhost:8000',
    apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || '',
    companyId: localStorage.getItem(STORAGE_KEYS.COMPANY_ID) || ''
};

let accounts = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_ACCOUNTS) || '[]');
let currentAccountId = localStorage.getItem(STORAGE_KEYS.CURRENT_ACCOUNT_ID) || '';
let searchCount = parseInt(localStorage.getItem(STORAGE_KEYS.SEARCH_COUNT) || '0');
let recentActivity = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT_ACTIVITY) || '[]');
let searchHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY) || '[]');

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');
const pageTitle = document.getElementById('pageTitle');
const connectionStatus = document.getElementById('connectionStatus');

// Configuration elements
const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const companyIdInput = document.getElementById('companyId');
const saveConfigBtn = document.getElementById('saveConfig');
const testConnectionBtn = document.getElementById('testConnection');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const clearCacheSearchBtn = document.getElementById('clearCacheSearchBtn');
const configStatus = document.getElementById('configStatus');

// Upload elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadStatus = document.getElementById('uploadStatus');
const jobStatus = document.getElementById('jobStatus');
const jobIdSpan = document.getElementById('jobId');
const jobStateSpan = document.getElementById('jobState');
const jobProgressSpan = document.getElementById('jobProgress');
const checkJobStatusBtn = document.getElementById('checkJobStatus');
const projectSelect = document.getElementById('projectSelect');

// Search elements
const searchQueryInput = document.getElementById('searchQuery');
const searchLimitInput = document.getElementById('searchLimit');
const useRerankCheckbox = document.getElementById('useRerank');
const searchBtn = document.getElementById('searchBtn');
const searchStatus = document.getElementById('searchStatus');
const resultsCard = document.getElementById('resultsCard');
const resultsCount = document.getElementById('resultsCount');
const resultsContainer = document.getElementById('resultsContainer');

// Overview elements
const projectsCountEl = document.getElementById('projectsCount');
const filesCountEl = document.getElementById('filesCount');
const searchCountEl = document.getElementById('searchCount');
const apiStatusEl = document.getElementById('apiStatus');
const recentActivityEl = document.getElementById('recentActivity');

// Projects elements
const projectsList = document.getElementById('projectsList');
const projectsStatus = document.getElementById('projectsStatus');
const createProjectBtn = document.getElementById('createProjectBtn');
const projectFilesSection = document.getElementById('projectFilesSection');
const projectFilesList = document.getElementById('projectFilesList');
const currentProjectName = document.getElementById('currentProjectName');
const closeProjectFilesBtn = document.getElementById('closeProjectFilesBtn');

// Project Detail Elements
const detailProjectName = document.getElementById('detailProjectName');
const detailProjectDescription = document.getElementById('detailProjectDescription');
const detailFileCount = document.getElementById('detailFileCount');
const detailVectorCount = document.getElementById('detailVectorCount');
const detailCreatedDate = document.getElementById('detailCreatedDate');
const detailFilesList = document.getElementById('detailFilesList');
const backToProjectsBtn = document.getElementById('backToProjectsBtn');
const detailUploadBtn = document.getElementById('detailUploadBtn');
const deleteProjectBtn = document.getElementById('deleteProjectBtn');

let currentProjectId = null;

// UI elements
const toastContainer = document.getElementById('toastContainer');
const loadingOverlay = document.getElementById('loadingOverlay');

// Account switcher elements
const accountSelect = document.getElementById('accountSelect');
const addAccountBtn = document.getElementById('addAccountBtn');
const accountNameInput = document.getElementById('accountName');
const savedAccountsEl = document.getElementById('savedAccounts');

let currentJobId = null;
let jobStatusInterval = null;

// Initialize
function init() {
    // Load saved config
    apiUrlInput.value = config.apiUrl;
    apiKeyInput.value = config.apiKey;
    companyIdInput.value = config.companyId;

    // Tab navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });

    // Configuration
    saveConfigBtn.addEventListener('click', saveConfig);
    testConnectionBtn.addEventListener('click', testConnection);
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', clearCache);
    }
    if (clearCacheSearchBtn) {
        clearCacheSearchBtn.addEventListener('click', clearCache);
    }
    
    // Upload
    uploadArea.addEventListener('click', () => {
        if (!uploadArea.classList.contains('disabled')) {
            fileInput.click();
        }
    });
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    checkJobStatusBtn.addEventListener('click', checkJobStatus);
    
    // Project select change handler
    projectSelect.addEventListener('change', handleProjectSelectChange);
    
    // Search
    searchBtn.addEventListener('click', performSearch);
    searchQueryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            performSearch();
        }
    });
    
    // Debounced search input for suggestions (future enhancement)
    let searchDebounceTimer;
    searchQueryInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        // Could add search suggestions here
    });
    
    // Projects
    createProjectBtn.addEventListener('click', showCreateProjectModal);
    
    // Vector DB
    const refreshVectorsBtn = document.getElementById('refreshVectorsBtn');
    if (refreshVectorsBtn) {
        refreshVectorsBtn.addEventListener('click', () => loadVectors(1));
    }

    // Account switcher
    accountSelect.addEventListener('change', handleAccountSwitch);
    addAccountBtn.addEventListener('click', showAddAccountModal);
    
    // Project Files
    if (closeProjectFilesBtn) {
        closeProjectFilesBtn.addEventListener('click', hideProjectFiles);
    }
    
    // Project Detail Listeners
    backToProjectsBtn.addEventListener('click', () => switchTab('projects'));
    
    detailUploadBtn.addEventListener('click', () => {
        if (currentProjectId) {
            projectSelect.value = currentProjectId;
            handleProjectSelectChange();
            switchTab('upload');
        }
    });
    
    deleteProjectBtn.addEventListener('click', () => {
        if (currentProjectId) {
            deleteProject(currentProjectId);
        }
    });

    // Initialize accounts
    initializeAccounts();
    
    // Load initial data
    if (config.apiKey && config.companyId) {
        loadOverview();
        loadProjects();
    }
    
    // Initialize upload area state
    handleProjectSelectChange();
    
    updateConnectionStatus();
    updateSearchCount();
    loadRecentActivity();
}

// Tab Navigation
function switchTab(tabName) {
    // Update nav items
    navItems.forEach(item => {
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update tab panes
    tabPanes.forEach(pane => {
        if (pane.id === `${tabName}-tab`) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });

    // Update page title
    const titles = {
        overview: 'Overview',
        upload: 'Upload Documents',
        projects: 'Projects',
        search: 'Search Documents',
        settings: 'Settings',
        vectordb: 'Vector DB'
    };
    pageTitle.textContent = titles[tabName] || 'Dashboard';
    
    // Update document title for accessibility
    document.title = `${titles[tabName] || 'Dashboard'} - RAG Dashboard`;

    // Load data when switching tabs
    if (tabName === 'overview' && config.apiKey && config.companyId) {
        loadOverview();
    } else if (tabName === 'projects' && config.apiKey && config.companyId) {
        loadProjects();
    } else if (tabName === 'vectordb' && config.apiKey && config.companyId) {
        loadVectors();
    }
    
    // Focus management for accessibility
    const activePane = document.querySelector(`#${tabName}-tab`);
    if (activePane) {
        const firstFocusable = activePane.querySelector('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }
    }
}

// Account Management Functions
function initializeAccounts() {
    // Add default accounts if they don't exist
    const hasDefaults = accounts.some(acc => DEFAULT_ACCOUNTS.some(def => def.id === acc.id));
    if (!hasDefaults) {
        accounts = [...DEFAULT_ACCOUNTS, ...accounts];
        saveAccounts();
    }
    
    updateAccountSelect();
    loadSavedAccounts();
    
    // Load current account if set
    if (currentAccountId) {
        const account = accounts.find(acc => acc.id === currentAccountId);
        if (account) {
            loadAccount(account);
        }
    } else if (accounts.length > 0) {
        // Load first account by default
        loadAccount(accounts[0]);
    }
}

function updateAccountSelect() {
    accountSelect.innerHTML = '<option value="">Select Account...</option>' +
        accounts.map(acc => 
            `<option value="${acc.id}" ${acc.id === currentAccountId ? 'selected' : ''}>${acc.name || 'Unnamed Account'}</option>`
        ).join('');
}

function loadAccount(account) {
    config.apiUrl = account.apiUrl || 'http://localhost:8000';
    config.apiKey = account.apiKey || '';
    config.companyId = account.companyId || '';
    
    apiUrlInput.value = config.apiUrl;
    apiKeyInput.value = config.apiKey;
    companyIdInput.value = config.companyId;
    accountNameInput.value = account.name || '';
    
    currentAccountId = account.id;
    localStorage.setItem(STORAGE_KEYS.CURRENT_ACCOUNT_ID, currentAccountId);
    localStorage.setItem(STORAGE_KEYS.API_URL, config.apiUrl);
    localStorage.setItem(STORAGE_KEYS.API_KEY, config.apiKey);
    localStorage.setItem(STORAGE_KEYS.COMPANY_ID, config.companyId);
    
    updateAccountSelect();
    updateConnectionStatus();
    
    if (config.apiKey && config.companyId) {
        loadOverview();
        loadProjects();
    }
    
    addActivity(`Switched to account: ${account.name || 'Unnamed'}`);
}

function handleAccountSwitch() {
    const accountId = accountSelect.value;
    if (!accountId) return;
    
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
        loadAccount(account);
    }
}

function showAddAccountModal() {
    // Clear form
    apiUrlInput.value = 'http://localhost:8000';
    apiKeyInput.value = '';
    companyIdInput.value = '';
    accountNameInput.value = '';
    
    // Switch to settings tab
    switchTab('settings');
    showStatus(configStatus, 'Fill in the form and click "Save Configuration" to add a new account', 'info');
}

function saveAccounts() {
    localStorage.setItem(STORAGE_KEYS.SAVED_ACCOUNTS, JSON.stringify(accounts));
}

function saveSearchHistory() {
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(searchHistory.slice(0, MAX_SEARCH_HISTORY)));
}

function loadSavedAccounts() {
    if (accounts.length === 0) {
        savedAccountsEl.innerHTML = '<p class="empty-state">No saved accounts. Add default seed accounts or create a new one.</p>';
        return;
    }
    
    savedAccountsEl.innerHTML = accounts.map(account => `
        <div class="account-item ${account.id === currentAccountId ? 'active' : ''}">
            <div class="account-item-info">
                <h4>${escapeHtml(account.name || 'Unnamed Account')}</h4>
                <p>Company ID: ${escapeHtml(account.companyId || 'Not set')} | API Key: ${account.apiKey ? '***' + account.apiKey.slice(-4) : 'Not set'}</p>
            </div>
            <div class="account-item-actions">
                <button class="btn btn-secondary btn-icon" onclick="switchToAccount('${account.id}')">Switch</button>
                <button class="btn btn-secondary btn-icon" onclick="deleteAccount('${account.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Make functions available globally for onclick handlers
window.switchToAccount = function(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
        loadAccount(account);
        accountSelect.value = accountId;
    }
};

window.deleteAccount = function(accountId) {
    if (confirm('Are you sure you want to delete this account?')) {
        accounts = accounts.filter(acc => acc.id !== accountId);
        if (currentAccountId === accountId) {
            currentAccountId = '';
            localStorage.removeItem('currentAccountId');
        }
        saveAccounts();
        updateAccountSelect();
        loadSavedAccounts();
        addActivity('Account deleted');
    }
};

// Configuration functions
function saveConfig() {
    const accountName = accountNameInput.value.trim() || 'Unnamed Account';
    const apiUrl = apiUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const companyId = companyIdInput.value.trim();
    
    if (!apiKey || !companyId) {
        showStatus(configStatus, 'Please enter API Key and Company ID', 'error');
        return;
    }
    
    // Check if this is an existing account or new
    const existingAccount = accounts.find(acc => 
        acc.apiKey === apiKey && acc.companyId === companyId
    );
    
    if (existingAccount) {
        // Update existing account
        existingAccount.name = accountName;
        existingAccount.apiUrl = apiUrl;
        showStatus(configStatus, 'Account updated!', 'success');
    } else {
        // Create new account
        const newAccount = {
            id: 'acc_' + Date.now(),
            name: accountName,
            apiUrl: apiUrl,
            apiKey: apiKey,
            companyId: companyId,
            email: '',
            tier: 'FREE'
        };
        accounts.push(newAccount);
        showStatus(configStatus, 'New account saved!', 'success');
    }
    
    saveAccounts();
    loadAccount(existingAccount || accounts[accounts.length - 1]);
    loadSavedAccounts();
    updateAccountSelect();
}

async function testConnection() {
    if (!config.apiUrl) {
        showStatus(configStatus, 'Please enter API URL', 'error');
        return;
    }

    showStatus(configStatus, 'Testing connection...', 'info');
    testConnectionBtn.disabled = true;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${config.apiUrl}/health`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
            showStatus(configStatus, 'Connection successful! API is running.', 'success');
            updateConnectionStatus(true);
    } catch (error) {
        if (error.name === 'AbortError') {
            showStatus(configStatus, 'Connection timeout. Please check if the API is running.', 'error');
        } else {
            showStatus(configStatus, `Connection failed: ${error.message}`, 'error');
        }
            updateConnectionStatus(false);
    } finally {
        testConnectionBtn.disabled = false;
    }
}

async function clearCache() {
    if (!validateConfig()) {
        return;
    }

    if (!confirm('Are you sure you want to clear the cache? This will remove all cached search results for this company.')) {
        return;
    }

    if (clearCacheBtn) {
        clearCacheBtn.disabled = true;
        clearCacheBtn.textContent = '⏳ Clearing...';
    }
    if (clearCacheSearchBtn) {
        clearCacheSearchBtn.disabled = true;
        clearCacheSearchBtn.textContent = '⏳ Clearing...';
    }

    try {
        const response = await fetch(
            `${config.apiUrl}/v1/companies/${config.companyId}/cache`,
            {
                method: 'DELETE',
                headers: {
                    'x-api-key': config.apiKey
                }
            }
        );

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Failed to clear cache: HTTP ${response.status}`);
        }

        const data = await response.json();
        showToast(`Cache cleared successfully! ${data.keysDeleted || 0} keys deleted.`, 'success');
        addActivity(`Cleared cache (${data.keysDeleted || 0} keys deleted)`);
    } catch (error) {
        showToast(`Failed to clear cache: ${error.message}`, 'error');
        console.error('Clear cache error:', error);
    } finally {
        if (clearCacheBtn) {
            clearCacheBtn.disabled = false;
            clearCacheBtn.textContent = '🗑️ Clear Cache';
        }
        if (clearCacheSearchBtn) {
            clearCacheSearchBtn.disabled = false;
            clearCacheSearchBtn.textContent = '🗑️ Clear Cache';
        }
    }
}

function updateConnectionStatus(connected = null) {
    if (connected === null) {
        // Auto-detect
        if (config.apiUrl && config.apiKey && config.companyId) {
            fetch(`${config.apiUrl}/health`)
                .then(() => {
                    connectionStatus.classList.add('connected');
                    connectionStatus.classList.remove('disconnected');
                    connectionStatus.querySelector('span:last-child').textContent = 'Connected';
                })
                .catch(() => {
                    connectionStatus.classList.add('disconnected');
                    connectionStatus.classList.remove('connected');
                    connectionStatus.querySelector('span:last-child').textContent = 'Disconnected';
                });
        } else {
            connectionStatus.classList.add('disconnected');
            connectionStatus.classList.remove('connected');
            connectionStatus.querySelector('span:last-child').textContent = 'Not Configured';
        }
    } else {
        if (connected) {
            connectionStatus.classList.add('connected');
            connectionStatus.classList.remove('disconnected');
            connectionStatus.querySelector('span:last-child').textContent = 'Connected';
        } else {
            connectionStatus.classList.add('disconnected');
            connectionStatus.classList.remove('connected');
            connectionStatus.querySelector('span:last-child').textContent = 'Disconnected';
        }
    }
}

// Overview functions
async function loadOverview() {
    if (!validateConfig()) return;

    try {
        // Load projects count
        const projectsRes = await fetch(
            `${config.apiUrl}/v1/companies/${config.companyId}/projects?limit=1`,
            {
                headers: { 'x-api-key': config.apiKey }
            }
        );
        if (projectsRes.ok) {
            const projectsData = await projectsRes.json();
            projectsCountEl.textContent = projectsData.pagination?.total || 0;
        }

        // Check API status
        const healthRes = await fetch(`${config.apiUrl}/health`);
        if (healthRes.ok) {
            apiStatusEl.textContent = 'Online';
            apiStatusEl.style.color = '#4caf50';
        } else {
            apiStatusEl.textContent = 'Offline';
            apiStatusEl.style.color = '#f44336';
        }
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

function updateSearchCount() {
    searchCountEl.textContent = searchCount;
}

function loadRecentActivity() {
    if (recentActivity.length === 0) {
        recentActivityEl.innerHTML = '<p class="empty-state">No recent activity</p>';
        return;
    }

    recentActivityEl.innerHTML = recentActivity.slice(0, 10).map(activity => `
        <div class="activity-item">
            <div class="activity-text">${escapeHtml(activity.text)}</div>
            <div class="activity-time">${formatTime(activity.time)}</div>
        </div>
    `).join('');
}

function addActivity(text) {
    recentActivity.unshift({
        text,
        time: new Date().toISOString()
    });
    recentActivity = recentActivity.slice(0, MAX_RECENT_ACTIVITY);
    localStorage.setItem(STORAGE_KEYS.RECENT_ACTIVITY, JSON.stringify(recentActivity));
    loadRecentActivity();
}

// Projects functions
async function loadProjects() {
    if (!validateConfig()) {
        projectsList.innerHTML = '<p class="empty-state">Please configure API settings first</p>';
        return;
    }

    showStatus(projectsStatus, 'Loading projects...', 'info');
    
    try {
        const response = await fetch(
            `${config.apiUrl}/v1/companies/${config.companyId}/projects`,
            {
                headers: { 'x-api-key': config.apiKey }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to load projects');
        }

        const data = await response.json();
        displayProjects(data.projects || []);
        showStatus(projectsStatus, '', 'info');
        
        // Update project select
        updateProjectSelect(data.projects || []);
    } catch (error) {
        showStatus(projectsStatus, `Error: ${error.message}`, 'error');
        projectsList.innerHTML = '<p class="empty-state">Failed to load projects</p>';
    }
}

function displayProjects(projects) {
    if (projects.length === 0) {
        projectsList.innerHTML = '<p class="empty-state">No projects found. Create one to get started!</p>';
        return;
    }

    projectsList.innerHTML = projects.map(project => `
        <div class="project-item" onclick="viewProjectFiles('${project._id}', '${escapeHtml(project.name)}')">
            <div class="project-info">
                <h4>${escapeHtml(project.name || 'Unnamed Project')}</h4>
                <p>${escapeHtml(project.description || 'No description')}</p>
            </div>
            <div class="project-meta">
                <span>📄 ${project.fileCount || 0} files</span>
                <span>🔍 ${project.vectorCount || 0} vectors</span>
                <span>${project.status || 'ACTIVE'}</span>
            </div>
        </div>
    `).join('');
}

// Make available globally
window.viewProjectFiles = function(projectId, projectName) {
    viewProjectDetails(projectId);
};

async function viewProjectDetails(projectId) {
    currentProjectId = projectId;
    switchTab('project-detail');
    
    // Reset UI
    detailProjectName.textContent = 'Loading...';
    detailProjectDescription.textContent = '';
    detailFilesList.innerHTML = '<p class="empty-state">Loading files...</p>';
    detailFileCount.textContent = '-';
    detailVectorCount.textContent = '-';
    detailCreatedDate.textContent = '-';

    if (!validateConfig()) return;

    try {
        // 1. Get Project Details
        const projectRes = await fetch(
            `${config.apiUrl}/v1/companies/${config.companyId}/projects/${projectId}`,
            { headers: { 'x-api-key': config.apiKey } }
        );
        
        if (!projectRes.ok) {
             const err = await projectRes.json();
             throw new Error(err.error || 'Failed to load project details');
        }
        const data = await projectRes.json();
        const project = data.project;
        
        detailProjectName.textContent = project.name || 'Unnamed Project';
        detailProjectDescription.textContent = project.description || 'No description';
        detailVectorCount.textContent = project.vectorCount || 0;
        detailCreatedDate.textContent = new Date(project.createdAt).toLocaleDateString();

        // 2. Get Files
        // Use correct endpoint: /v1/companies/:companyId/projects/:projectId/files
        const filesRes = await fetch(
            `${config.apiUrl}/v1/companies/${config.companyId}/projects/${projectId}/files`,
            { headers: { 'x-api-key': config.apiKey } }
        );

        if (!filesRes.ok) {
             const err = await filesRes.json();
             throw new Error(err.error || 'Failed to load files');
        }
        const filesData = await filesRes.json();
        
        // Use actual file count from pagination total (most reliable), fallback to project.fileCount if not available
        const actualFileCount = filesData.pagination?.total ?? filesData.files?.length ?? project.fileCount ?? 0;
        detailFileCount.textContent = actualFileCount;
        
        displayProjectFiles(filesData.files || []);

    } catch (error) {
        showStatus(null, error.message, 'error');
        detailProjectName.textContent = 'Error';
        detailFilesList.innerHTML = `<p class="empty-state error">${escapeHtml(error.message)}</p>`;
    }
}

function displayProjectFiles(files) {
    if (files.length === 0) {
        detailFilesList.innerHTML = '<p class="empty-state">No files uploaded yet.</p>';
        return;
    }

    detailFilesList.innerHTML = files.map(file => `
        <div class="file-item">
            <div class="file-info">
                <h5>${escapeHtml(file.originalFilename)}</h5>
                <div class="file-meta">
                    <span>${formatBytes(file.size)}</span>
                    <span>${formatTime(file.uploadedAt)}</span>
                </div>
            </div>
            <span class="status-badge ${file.processingStatus.toLowerCase()}">${file.processingStatus}</span>
        </div>
    `).join('');
}

function hideProjectFiles() {
    // Legacy function support if needed, or remove
}

async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone and will delete all associated files.')) return;
    
    try {
        const res = await fetch(
            `${config.apiUrl}/v1/companies/${config.companyId}/projects/${projectId}`,
            { 
                method: 'DELETE',
                headers: { 'x-api-key': config.apiKey } 
            }
        );
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete project');
        }
        
        showStatus(null, 'Project deleted successfully', 'success');
        switchTab('projects');
        loadProjects();
    } catch (error) {
        showStatus(null, `Delete failed: ${error.message}`, 'error');
    }
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function updateProjectSelect(projects) {
    const currentValue = projectSelect.value;
    projectSelect.innerHTML = '<option value="">Select a project...</option>' +
        projects.map(p => `<option value="${p._id}">${escapeHtml(p.name)}</option>`).join('');
    
    // Restore selection if it still exists
    if (currentValue) {
        projectSelect.value = currentValue;
    }
    
    // Update upload area state
    handleProjectSelectChange();
}

function showCreateProjectModal() {
    const name = prompt('Enter project name:');
    if (!name) return;

    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const description = prompt('Enter project description (optional):') || '';

    createProject(name, slug, description);
}

async function createProject(name, slug, description) {
    if (!validateConfig()) return;

    try {
        const requestBody = { name, slug, description, ownerId: HARDCODED_OWNER_ID };
        console.log('Creating project with body:', requestBody);
        
        const response = await fetch(
            `${config.apiUrl}/v1/companies/${config.companyId}/projects`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create project');
        }

        addActivity(`Created project: ${name}`);
        loadProjects();
        showStatus(projectsStatus, 'Project created successfully!', 'success');
    } catch (error) {
        showStatus(projectsStatus, `Error: ${error.message}`, 'error');
    }
}

// Upload functions
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!uploadArea.classList.contains('disabled')) {
        uploadArea.style.background = '#f0f4ff';
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.style.background = '#f9f9ff';
    
    // Check if project is selected
    if (!projectSelect.value) {
        showStatus(uploadStatus, 'Please select a project first', 'error');
        return;
    }
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        handleMultipleFiles(files);
    }
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        handleMultipleFiles(files);
    }
}

function handleProjectSelectChange() {
    const projectId = projectSelect.value;
    const uploadMessage = document.getElementById('uploadMessage');
    
    if (projectId) {
        // Enable upload
        uploadArea.classList.remove('disabled');
        fileInput.disabled = false;
        uploadMessage.textContent = 'Click to select a file or drag and drop';
        uploadArea.style.cursor = 'pointer';
    } else {
        // Disable upload
        uploadArea.classList.add('disabled');
        fileInput.disabled = true;
        uploadMessage.textContent = 'Please select a project first';
        uploadArea.style.cursor = 'not-allowed';
    }
}

function handleMultipleFiles(files) {
    if (!validateConfig()) {
        return;
    }
    
    // Validate project is selected
    const projectId = projectSelect.value;
    if (!projectId) {
        showStatus(uploadStatus, 'Please select a project before uploading', 'error');
        switchTab('upload');
        return;
    }

    // Validate all files
    const maxSize = 50 * 1024 * 1024; // 50MB
    const validFiles = [];
    const invalidFiles = [];

    files.forEach(file => {
        if (file.size > maxSize) {
            invalidFiles.push({ name: file.name, reason: `File too large (${formatBytes(file.size)})` });
        } else {
            validFiles.push(file);
        }
    });

    if (invalidFiles.length > 0) {
        const errorMsg = invalidFiles.map(f => `${f.name}: ${f.reason}`).join(', ');
        showStatus(uploadStatus, `Some files are invalid: ${errorMsg}`, 'error');
    }

    if (validFiles.length === 0) {
        return;
    }

    // Show selected files
    displaySelectedFiles(validFiles);
    
    // Upload all valid files
    uploadMultipleFiles(validFiles, projectId);
}

function displaySelectedFiles(files) {
    const fileList = document.getElementById('fileList');
    const selectedFilesList = document.getElementById('selectedFilesList');
    
    if (files.length === 0) {
        fileList.style.display = 'none';
        return;
    }
    
    fileList.style.display = 'block';
    selectedFilesList.innerHTML = files.map((file, index) => `
        <li>
            <span>${escapeHtml(file.name)}</span>
            <span class="file-size">${formatBytes(file.size)}</span>
        </li>
    `).join('');
}

async function uploadMultipleFiles(files, projectId) {
    showStatus(uploadStatus, `Uploading ${files.length} file(s)...`, 'info');
    jobStatus.style.display = 'none';
    fileInput.disabled = true;
    uploadArea.classList.add('loading');
    
    // Show upload progress
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadProgressList = document.getElementById('uploadProgressList');
    uploadProgress.style.display = 'block';
    uploadProgressList.innerHTML = '';
    
    const uploadResults = [];
    const jobIds = [];
    
    // Create progress items for each file
    files.forEach((file, index) => {
        const progressItem = document.createElement('div');
        progressItem.className = 'upload-progress-item';
        progressItem.id = `progress-${index}`;
        progressItem.innerHTML = `
            <div class="progress-header">
                <span class="progress-filename">${escapeHtml(file.name)}</span>
                <span class="progress-status">Pending...</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
        `;
        uploadProgressList.appendChild(progressItem);
    });

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progressItem = document.getElementById(`progress-${i}`);
        const progressFill = progressItem.querySelector('.progress-fill');
        const progressStatus = progressItem.querySelector('.progress-status');
        
        try {
            progressStatus.textContent = 'Uploading...';
            progressFill.style.width = '50%';
            
            const formData = new FormData();
            formData.append('files', file);
            formData.append('projectId', projectId);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
            
            const response = await fetch(`${config.apiUrl}/v1/companies/${config.companyId}/uploads`, {
                method: 'POST',
                headers: {
                    'x-api-key': config.apiKey
                },
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const data = await response.json();
            
            // Handle different response statuses
            if (response.ok || response.status === 207) {
                // Success or partial success
                progressFill.style.width = '100%';
                progressStatus.textContent = 'Uploaded';
                progressItem.classList.add('success');
                
                // Handle response - could be single or array
                if (Array.isArray(data.results)) {
                    data.results.forEach(result => {
                        uploadResults.push({ file: file.name, success: true, ...result });
                        if (result.jobId) jobIds.push(result.jobId);
                    });
                } else if (data.jobId) {
                    // Single file response (backward compatibility)
                    uploadResults.push({ file: file.name, success: true, ...data });
                    jobIds.push(data.jobId);
                } else {
                    // Unexpected response format
                    uploadResults.push({ file: file.name, success: false, error: 'Unexpected response format' });
                }
            } else {
                // Error response
                progressFill.style.width = '100%';
                progressStatus.textContent = 'Failed';
                progressItem.classList.add('error');
                
                const errorMsg = data.error || data.message || `Upload failed: HTTP ${response.status}`;
                uploadResults.push({ file: file.name, success: false, error: errorMsg });
            }
            
            addActivity(`Uploaded file: ${file.name}`);
        } catch (error) {
            progressFill.style.width = '100%';
            progressStatus.textContent = error.name === 'AbortError' ? 'Timeout' : 'Failed';
            progressItem.classList.add('error');
            
            uploadResults.push({ 
                file: file.name, 
                error: error.message,
                success: false 
            });
        }
    }
    
    // Show job status for all uploaded files
    if (jobIds.length > 0) {
        currentJobId = jobIds[0]; // Keep first for backward compatibility
        displayJobStatuses(jobIds);
        jobStatus.style.display = 'block';
        
        // Poll job statuses
        if (jobStatusInterval) {
            clearInterval(jobStatusInterval);
        }
        jobStatusInterval = setInterval(() => checkAllJobStatuses(jobIds), JOB_POLL_INTERVAL);
    }
    
    const successCount = uploadResults.filter(r => r.success !== false).length;
    showStatus(uploadStatus, `Upload complete: ${successCount}/${files.length} file(s) uploaded successfully`, 
        successCount === files.length ? 'success' : 'info');
    
    fileInput.disabled = false;
    uploadArea.classList.remove('loading');
    fileInput.value = ''; // Reset file input
    
    // Hide file list after a delay
    setTimeout(() => {
        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.style.display = 'none';
        }
    }, 3000);
    
    // Refresh projects to show updated file count
    if (config.apiKey && config.companyId) {
        loadProjects();
    }
}

function displayJobStatuses(jobIds) {
    const jobStatusList = document.getElementById('jobStatusList');
    jobStatusList.innerHTML = jobIds.map((jobId, index) => `
        <div class="job-item" id="job-${jobId}">
            <div class="job-header">
                <strong>Job ${index + 1}:</strong> <span class="job-id">${jobId}</span>
            </div>
            <div class="job-details">
                <div><strong>Status:</strong> <span class="job-state processing" id="job-state-${jobId}">queued</span></div>
                <div><strong>Progress:</strong> <span id="job-progress-${jobId}">0%</span></div>
            </div>
        </div>
    `).join('');
}

async function checkAllJobStatuses(jobIds) {
    if (!validateConfig()) {
        return;
    }
    
    let allCompleted = true;
    
    for (const jobId of jobIds) {
        try {
            const response = await fetch(`${config.apiUrl}/v1/jobs/${jobId}`, {
                method: 'GET',
                headers: {
                    'x-api-key': config.apiKey
                }
            });
            
            if (!response.ok) {
                continue;
            }
            
            const data = await response.json();
            const stateSpan = document.getElementById(`job-state-${jobId}`);
            const progressSpan = document.getElementById(`job-progress-${jobId}`);
            
            if (stateSpan && progressSpan) {
                stateSpan.textContent = data.state || 'unknown';
                progressSpan.textContent = data.progress ? `${data.progress}%` : '-';
                
                if (data.state === 'completed') {
                    stateSpan.className = 'job-state completed';
                } else if (data.state === 'failed') {
                    stateSpan.className = 'job-state failed';
                } else {
                    stateSpan.className = 'job-state processing';
                    allCompleted = false;
                }
            }
        } catch (error) {
            console.error(`Error checking job status for ${jobId}:`, error);
        }
    }
    
    if (allCompleted && jobStatusInterval) {
        clearInterval(jobStatusInterval);
        jobStatusInterval = null;
        showStatus(uploadStatus, 'All files processed!', 'success');
        addActivity('All file processing completed');
    }
}

async function checkJobStatus() {
    // Legacy function for single file uploads - now redirects to checkAllJobStatuses
    if (currentJobId && validateConfig()) {
        checkAllJobStatuses([currentJobId]);
    }
}

// Search functions
async function performSearch() {
    if (!validateConfig()) {
        return;
    }

    const query = searchQueryInput.value.trim();
    if (!query) {
        showStatus(searchStatus, 'Please enter a search query', 'error');
        return;
    }

    showStatus(searchStatus, 'Searching...', 'info');
    resultsCard.style.display = 'none';
    searchBtn.disabled = true;
    const originalBtnText = searchBtn.textContent;
    searchBtn.textContent = '⏳ Searching...';

    const limit = parseInt(searchLimitInput.value) || 10;
    const rerank = useRerankCheckbox.checked;

    const requestBody = {
        query: query,
        limit: limit
    };

    if (rerank) {
        requestBody.rerank = true;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(`${config.apiUrl}/v1/companies/${config.companyId}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey
        },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Search failed: HTTP ${response.status}`);
        }
        
        const data = await response.json();
        displayResults(data.results || []);
        showStatus(searchStatus, `Search completed! Found ${data.results?.length || 0} results.`, 'success');
        searchCount++;
        localStorage.setItem(STORAGE_KEYS.SEARCH_COUNT, searchCount.toString());
        updateSearchCount();
        
        // Add to search history
        searchHistory.unshift({
            query: query,
            resultsCount: data.results?.length || 0,
            timestamp: new Date().toISOString(),
            rerank: rerank
        });
        searchHistory = searchHistory.slice(0, MAX_SEARCH_HISTORY);
        saveSearchHistory();
        
        addActivity(`Searched: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
    } catch (error) {
        if (error.name === 'AbortError') {
            showStatus(searchStatus, 'Search timeout. Please try again or use a shorter query.', 'error');
        } else {
        showStatus(searchStatus, `Search failed: ${error.message}`, 'error');
        }
        console.error('Search error:', error);
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = originalBtnText;
    }
}

function displayResults(results) {
    if (results.length === 0) {
        resultsCount.textContent = 'No results found';
        resultsContainer.innerHTML = '<p class="empty-state">Try a different search query or check if files have been processed.</p>';
        resultsCard.style.display = 'block';
        return;
    }

    resultsCount.textContent = `Found ${results.length} result${results.length !== 1 ? 's' : ''}`;
    resultsContainer.innerHTML = '';

    results.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.setAttribute('role', 'article');
        resultItem.setAttribute('aria-label', `Search result ${index + 1}`);
        
        // Extract all metadata
        // Scores are already normalized to 0-100 range in the backend
        const scoreValue = result.score !== undefined ? result.score : 0;
        const score = scoreValue.toFixed(1);
        // Prefer full content, then text, then text_preview as fallback
        const content = result.payload?.content || result.payload?.text || result.payload?.text_preview || '';
        const hasContent = content && content.trim().length > 0;
        
        // File info - prefer originalFilename over stored filename
        const fileId = result.payload?.fileId || 'Unknown';
        const originalFileName = result.payload?.originalFilename || result.payload?.fileName || 'Unknown';
        
        // Project info
        const projectId = result.payload?.projectId || 'N/A';
        const projectName = result.payload?.projectName || 'N/A';
        
        // Chunk info
        const chunkIndex = result.payload?.chunkIndex !== undefined ? result.payload.chunkIndex : 'N/A';
        const totalChunks = result.payload?.totalChunks !== undefined ? result.payload.totalChunks : 'N/A';
        
        // Determine score class
        let scoreClass = 'low';
        if (scoreValue >= 70) scoreClass = 'high';
        else if (scoreValue >= 40) scoreClass = 'medium';
        
        // Truncate long values
        const truncateId = (id, len = 8) => {
            if (!id || id === 'Unknown' || id === 'N/A') return id;
            return id.length > len ? id.substring(0, len) + '...' : id;
        };
        
        const truncateName = (name, len = 25) => {
            if (!name || name === 'Unknown' || name === 'N/A') return name;
            return name.length > len ? name.substring(0, len) + '...' : name;
        };

        resultItem.innerHTML = `
            <div class="result-header">
                <div class="result-title">
                    <h4>#${index + 1}</h4>
                    <span class="score ${scoreClass}">${score}%</span>
                </div>
                <div class="result-actions">
                    <button class="btn-copy" onclick="copyResultToClipboard(${index})" title="Copy content">
                        📋 Copy
                    </button>
                </div>
            </div>
            <div class="content ${hasContent ? '' : 'empty'}">${hasContent ? escapeHtml(content) : 'No content available'}</div>
            <div class="metadata-grid">
                <div class="meta-item">
                    <span class="meta-label">Project</span>
                    <span class="meta-value truncate" title="${escapeHtml(projectName)}">${escapeHtml(truncateName(projectName))}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Project ID</span>
                    <span class="meta-value id" title="${escapeHtml(projectId)}">${escapeHtml(truncateId(projectId))}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">File</span>
                    <span class="meta-value truncate" title="${escapeHtml(originalFileName)}">${escapeHtml(truncateName(originalFileName, 40))}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">File ID</span>
                    <span class="meta-value id" title="${escapeHtml(fileId)}">${escapeHtml(truncateId(fileId))}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Chunk</span>
                    <span class="meta-value">${chunkIndex}${totalChunks !== 'N/A' ? ' / ' + totalChunks : ''}</span>
                </div>
            </div>
        `;

        resultsContainer.appendChild(resultItem);
    });

    resultsCard.style.display = 'block';
    
    // Show export button if results exist
    const exportBtn = document.getElementById('exportResultsBtn');
    if (exportBtn) {
        exportBtn.style.display = 'inline-flex';
    }
    
    // Store results for copy functionality
    window.currentSearchResults = results;
}

// Make copy function available globally
window.copyResultToClipboard = function(index) {
    if (!window.currentSearchResults || !window.currentSearchResults[index]) {
        showToast('No result to copy', 'error');
        return;
    }
    
    const result = window.currentSearchResults[index];
    const content = result.payload?.text || result.payload?.content || '';
    
    navigator.clipboard.writeText(content).then(() => {
        showToast('Content copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy to clipboard', 'error');
    });
};

// Export search results
window.exportSearchResults = function() {
    if (!window.currentSearchResults || window.currentSearchResults.length === 0) {
        showToast('No results to export', 'error');
        return;
    }
    
    const query = searchQueryInput.value.trim();
    const exportData = {
        query: query,
        timestamp: new Date().toISOString(),
        resultsCount: window.currentSearchResults.length,
        results: window.currentSearchResults.map((result, index) => ({
            index: index + 1,
            score: result.score !== undefined ? result.score.toFixed(2) : 'N/A',
            content: result.payload?.text || result.payload?.content || '',
            projectName: result.payload?.projectName || 'N/A',
            projectId: result.payload?.projectId || 'N/A',
            fileName: result.payload?.fileName || result.payload?.originalFilename || 'Unknown',
            fileId: result.payload?.fileId || 'Unknown',
            chunkIndex: result.payload?.chunkIndex !== undefined ? result.payload.chunkIndex : 'N/A',
            totalChunks: result.payload?.totalChunks !== undefined ? result.payload.totalChunks : 'N/A'
        }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Results exported successfully!', 'success');
};

// Utility functions
function validateConfig() {
    if (!config.apiUrl) {
        showStatus(configStatus, 'Please set API URL', 'error');
        switchTab('settings');
        return false;
    }
    if (!config.apiKey) {
        showStatus(configStatus, 'Please set API Key', 'error');
        switchTab('settings');
        return false;
    }
    if (!config.companyId) {
        showStatus(configStatus, 'Please set Company ID', 'error');
        switchTab('settings');
        return false;
    }
    return true;
}

// UI Utilities
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Override showStatus to use Toast for success/error
function showStatus(element, message, type) {
    if (type === 'success' || type === 'error') {
        showToast(message, type);
    }
    
    if (!element) return;
    
    element.textContent = message;
    element.className = `status-message ${type}`;
    element.style.display = 'block';
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            if (element.textContent === message) {
                element.style.display = 'none';
            }
        }, 5000);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

// Vector DB functions
let currentVectorsPage = 1;
const VECTORS_PER_PAGE = 20;

async function loadVectors(page = 1) {
    if (!validateConfig()) {
        return;
    }
    
    const vectorsList = document.getElementById('vectorsList');
    const vectorsStatus = document.getElementById('vectorsStatus');
    const vectorsPagination = document.getElementById('vectorsPagination');
    
    if (vectorsStatus) showStatus(vectorsStatus, 'Loading vectors...', 'info');
    currentVectorsPage = page;
    
    let data;
    
    // Fetch data
    try {
        const response = await fetch(
            `${config.apiUrl}/v1/companies/${config.companyId}/vectors?page=${page}&limit=${VECTORS_PER_PAGE}`,
            {
                headers: { 'x-api-key': config.apiKey }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to load vectors');
        }

        data = await response.json();
    } catch (error) {
        if (vectorsStatus) showStatus(vectorsStatus, `Error: ${error.message}`, 'error');
        if (vectorsList) vectorsList.innerHTML = '<tr><td colspan="5" class="empty-state">Failed to load vectors</td></tr>';
        return;
    }
    
    // Render data (separate error boundary for render errors)
    try {
        displayVectors(data.embeddings || []);
        if (vectorsPagination) setupPagination(data.page, data.totalPages, vectorsPagination, loadVectors);
        if (vectorsStatus) showStatus(vectorsStatus, '', 'info');
    } catch (renderError) {
        console.error('Render error in loadVectors:', renderError);
        if (vectorsStatus) showStatus(vectorsStatus, 'Error displaying vectors', 'error');
        if (vectorsList) vectorsList.innerHTML = '<tr><td colspan="5" class="empty-state">Error rendering vectors</td></tr>';
    }
}

function displayVectors(vectors) {
    const vectorsList = document.getElementById('vectorsList');
    if (!vectorsList) return;
    
    if (vectors.length === 0) {
        vectorsList.innerHTML = '<tr><td colspan="5" class="empty-state">No vectors found. Upload files to generate vectors.</td></tr>';
        return;
    }

    vectorsList.innerHTML = vectors.map(vector => `
        <tr>
            <td style="padding: 10px;">${escapeHtml(vector.projectId?.name || 'Unknown')}</td>
            <td style="padding: 10px;">${escapeHtml(vector.fileId?.originalFilename || 'Unknown')}</td>
            <td style="padding: 10px;">${vector.chunkCount}</td>
            <td style="padding: 10px;">${new Date(vector.createdAt).toLocaleDateString()}</td>
            <td style="padding: 10px;">
                <button class="btn btn-secondary btn-sm" onclick="viewVectorDetails('${vector._id}')">View</button>
            </td>
        </tr>
    `).join('');
    
    // Store vectors for details view
    window.currentVectors = vectors;
}

function setupPagination(currentPage, totalPages, container, loadFunction) {
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    if (currentPage > 1) {
        html += `<button class="btn btn-secondary btn-sm" onclick="window.changeVectorPage(${currentPage - 1})">Previous</button>`;
    }
    
    html += `<span style="align-self: center;">Page ${currentPage} of ${totalPages}</span>`;
    
    if (currentPage < totalPages) {
        html += `<button class="btn btn-secondary btn-sm" onclick="window.changeVectorPage(${currentPage + 1})">Next</button>`;
    }
    
    container.innerHTML = html;
    
    // Expose change page function globally
    window.changeVectorPage = (page) => loadFunction(page);
}

window.viewVectorDetails = function(vectorId) {
    const vector = window.currentVectors.find(v => v._id === vectorId);
    if (!vector) return;
    
    // Simple alert for now, or a modal could be better
    const contentPreview = vector.contents ? vector.contents.slice(0, 3).join('\n---\n') : 'No content';
    alert(`Vector Details:\n\nFile: ${vector.fileId?.originalFilename}\nChunks: ${vector.chunkCount}\n\nContent Preview:\n${contentPreview.substring(0, 500)}...`);
};

// Initialize app
init();
