// Backend Server Base URL — auto-detects local vs deployed environment
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : window.location.origin;

// State Management
let appState = {
    username: '',
    apiKey: localStorage.getItem('gemini_api_key') || '',
    theme: localStorage.getItem('theme') || 'dark',
    history: [],
    currentLanguage: 'cpp',
    analysisResult: null,
    profile: { name: "Code Explorer", xp: 0, completed: [] },
    currentExerciseKey: null,
    serverHasKey: false
};

// DOM Elements
const bodyEl = document.body;
const codeInputEl = document.getElementById('codeInput');
const customInputEl = document.getElementById('customInput');
const languageSelectEl = document.getElementById('languageSelect');
const btnAnalyze = document.getElementById('btnAnalyze');
const btnClear = document.getElementById('btnClear');
const apiStatusBadge = document.getElementById('apiStatusBadge');
const javaExercisesList = document.getElementById('javaExercisesList');
const pythonExercisesList = document.getElementById('pythonExercisesList');
const codeReviewHeader = document.getElementById('codeReviewHeader');
const profileNameInput = document.getElementById('profileName');
const profileXPText = document.getElementById('profileXP');
const profileCompletedText = document.getElementById('profileCompleted');
const profileAvatar = document.getElementById('profileAvatar');
const homeHeader = document.getElementById('homeHeader');
const stateHome = document.getElementById('stateHome');
const stateWorkspace = document.getElementById('stateWorkspace');
const cardStartReview = document.getElementById('cardStartReview');
const cardExploreExercises = document.getElementById('cardExploreExercises');
const cardOpenSettings = document.getElementById('cardOpenSettings');
const homeXP = document.getElementById('homeXP');
const homeCompleted = document.getElementById('homeCompleted');
const homeStatus = document.getElementById('homeStatus');

// Screen States
const stateEmpty = document.getElementById('stateEmpty');
const stateLoading = document.getElementById('stateLoading');
const stateDashboard = document.getElementById('stateDashboard');

// Login Elements
const loginPortal = document.getElementById('loginPortal');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginErrorMessage = document.getElementById('loginErrorMessage');
const btnSignOut = document.getElementById('btnSignOut');
const appContainer = document.querySelector('.app-container');

// Dashboard Elements
const scoreRingFill = document.getElementById('scoreRingFill');
const scoreText = document.getElementById('scoreText');
const scoreLabel = document.getElementById('scoreLabel');
const timeComplexityOrig = document.getElementById('timeComplexityOrig');
const timeComplexityOpt = document.getElementById('timeComplexityOpt');
const spaceComplexityOrig = document.getElementById('spaceComplexityOrig');
const spaceComplexityOpt = document.getElementById('spaceComplexityOpt');
const compilerInfoEl = document.getElementById('compilerInfo');
const optimizedCodeBlock = document.getElementById('optimizedCodeBlock');
const compileStatusBadge = document.getElementById('compileStatusBadge');
const execTimeVal = document.getElementById('execTimeVal');
const consoleOutputBlock = document.getElementById('consoleOutputBlock');

// Action Buttons
const btnCopyOptimized = document.getElementById('btnCopyOptimized');
const btnSettings = document.getElementById('btnSettings');
const btnSettingsClose = document.getElementById('btnSettingsClose');
const btnSettingsSave = document.getElementById('btnSettingsSave');
const btnSettingsClear = document.getElementById('btnSettingsClear');
const settingsDialog = document.getElementById('settingsDialog');
const apiKeyInput = document.getElementById('apiKeyInput');
const historyList = document.getElementById('historyList');

// Theme Buttons
const btnDarkTheme = document.getElementById('btnDarkTheme');
const btnLightTheme = document.getElementById('btnLightTheme');

// Sync and save user profile + history state to local storage and backend database
async function saveUserDatabaseState() {
    if (!appState.username) return;
    
    // Save to user-specific localStorage namespace
    localStorage.setItem('user_profile_' + appState.username, JSON.stringify(appState.profile));
    localStorage.setItem('review_history_' + appState.username, JSON.stringify(appState.history));
    
    // Sync to backend database
    try {
        await fetch(API_BASE + '/api/user/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: appState.username,
                profile: appState.profile,
                history: appState.history
            })
        });
    } catch (err) {
        console.warn("Failed to sync database state to backend server: ", err);
    }
}

// Initialize the Application
function init() {
    // Auto-redirect if opened via file:// protocol instead of http server
    if (window.location.protocol === 'file:') {
        const fileName = window.location.pathname.split('/').pop();
        window.location.replace('http://localhost:8000/' + (fileName || 'index.html'));
        return;
    }

    // Apply theme
    applyTheme(appState.theme);

    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    if (isLoggedIn) {
        appState.username = localStorage.getItem('logged_in_username') || '';
        
        // Load user-specific profile and history from namespaces
        if (appState.username) {
            appState.profile = JSON.parse(localStorage.getItem('user_profile_' + appState.username)) || { name: appState.username, xp: 0, completed: [] };
            appState.history = JSON.parse(localStorage.getItem('review_history_' + appState.username)) || [];
        }
        
        loginPortal.classList.add('hidden');
        appContainer.classList.remove('hidden');
    } else {
        loginPortal.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
    
    // Set API Key in Input Field
    apiKeyInput.value = appState.apiKey;
    updateAPIStatusBadge();
    
    // Fetch Server API Status
    checkServerStatus();
    
    // Populate History list
    renderHistory();

    // Render 30 Exercises
    renderExercises();

    // Render User Profile Card
    renderProfile();

    // Setup Lucide Icons
    lucide.createIcons();

    // Event Listeners
    setupEventListeners();
}

// Toggle between Sign In and Register tab modes
let authMode = 'signin';

function setupAuthTabs() {
    const tabSignIn = document.getElementById('tabSignIn');
    const tabSignUp = document.getElementById('tabSignUp');
    const loginHeaderSubText = document.getElementById('loginHeaderSubText');
    const loginHint = document.getElementById('loginHint');
    const loginSuccessMessage = document.getElementById('loginSuccessMessage');
    const loginErrorMessage = document.getElementById('loginErrorMessage');
    const loginSubmitText = document.getElementById('loginSubmitText');
    const loginSubmitIcon = document.getElementById('loginSubmitIcon');

    if (tabSignIn && tabSignUp) {
        tabSignIn.addEventListener('click', () => {
            authMode = 'signin';
            tabSignIn.classList.add('active');
            tabSignUp.classList.remove('active');
            loginHeaderSubText.textContent = "Enter credentials to access the workspace";
            loginHint.classList.remove('hidden');
            loginSuccessMessage.classList.add('hidden');
            loginErrorMessage.classList.add('hidden');
            loginSubmitText.textContent = "Sign In";
            if (loginSubmitIcon) {
                loginSubmitIcon.setAttribute('data-lucide', 'log-in');
                lucide.createIcons();
            }
        });

        tabSignUp.addEventListener('click', () => {
            authMode = 'signup';
            tabSignUp.classList.add('active');
            tabSignIn.classList.remove('active');
            loginHeaderSubText.textContent = "Choose a username and password to register";
            loginHint.classList.add('hidden');
            loginSuccessMessage.classList.add('hidden');
            loginErrorMessage.classList.add('hidden');
            loginSubmitText.textContent = "Register Account";
            if (loginSubmitIcon) {
                loginSubmitIcon.setAttribute('data-lucide', 'user-plus');
                lucide.createIcons();
            }
        });
    }
}

// Event Listeners Configuration
function setupEventListeners() {
    setupAuthTabs();
    
    // Run analysis
    btnAnalyze.addEventListener('click', runReview);
    
    // Clear editor
    btnClear.addEventListener('click', () => {
        codeInputEl.value = '';
        codeInputEl.focus();
    });

    // Language Selector changed
    languageSelectEl.addEventListener('change', (e) => {
        appState.currentLanguage = e.target.value;
    });

    // Profile Name changed
    if (profileNameInput) {
        profileNameInput.addEventListener('change', saveProfileName);
    }

    // Code Review button clicked
    if (codeReviewHeader) {
        codeReviewHeader.addEventListener('click', openCodeReviewer);
    }

    // Home button clicked
    if (homeHeader) {
        homeHeader.addEventListener('click', openHomePage);
    }

    // Home Action Card: Custom Review Click
    if (cardStartReview) {
        cardStartReview.addEventListener('click', openCodeReviewer);
    }

    // Home Action Card: Explore Exercises Click
    if (cardExploreExercises) {
        cardExploreExercises.addEventListener('click', () => {
            const content = document.getElementById('exercisesAccordionContent');
            const header = document.getElementById('exercisesAccordionHeader');
            if (content && header) {
                content.classList.remove('hidden');
                header.classList.add('active');
            }
        });
    }

    // Home Action Card: Open Settings Click
    if (cardOpenSettings) {
        cardOpenSettings.addEventListener('click', () => {
            apiKeyInput.value = appState.apiKey;
            settingsDialog.classList.remove('hidden');
        });
    }

    // Listeners configured dynamically inside renderExercises
    
    // Configure Collapsible Accordions
    setupAccordion('exercisesAccordionHeader', 'exercisesAccordionContent');
    setupAccordion('javaSubsectionHeader', 'javaExercisesList');
    setupAccordion('pythonSubsectionHeader', 'pythonExercisesList');
    setupAccordion('historyAccordionHeader', 'historyAccordionContent');

    // Settings Modal
    btnSettings.addEventListener('click', () => {
        apiKeyInput.value = appState.apiKey;
        settingsDialog.classList.remove('hidden');
    });
    btnSettingsClose.addEventListener('click', () => {
        settingsDialog.classList.add('hidden');
    });
    btnSettingsSave.addEventListener('click', saveSettings);
    btnSettingsClear.addEventListener('click', () => {
        apiKeyInput.value = '';
        saveSettings();
    });

    // Copy Buttons
    btnCopyOptimized.addEventListener('click', () => copyToClipboard(optimizedCodeBlock.textContent, btnCopyOptimized));

    // Theme Switchers
    btnDarkTheme.addEventListener('click', () => applyTheme('dark'));
    btnLightTheme.addEventListener('click', () => applyTheme('light'));

    // Handle clicks outside settings modal to close it
    settingsDialog.addEventListener('click', (e) => {
        if (e.target === settingsDialog) {
            settingsDialog.classList.add('hidden');
        }
    });

    // Login Form Submission (Unified registration and login)
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            loginErrorMessage.classList.add('hidden');
            loginSuccessMessage.classList.add('hidden');
            
            if (authMode === 'signup') {
                // Register
                try {
                    const response = await fetch(API_BASE + '/api/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        loginSuccessMessage.textContent = "Account registered successfully! Please sign in.";
                        loginSuccessMessage.classList.remove('hidden');
                        // Reset input password and select Sign In tab
                        passwordInput.value = '';
                        document.getElementById('tabSignIn').click();
                    } else {
                        loginErrorMessage.textContent = data.error || "Registration failed.";
                        loginErrorMessage.classList.remove('hidden');
                    }
                } catch (err) {
                    loginErrorMessage.textContent = "Error: Cannot reach the backend database server.";
                    loginErrorMessage.classList.remove('hidden');
                }
            } else {
                // Sign In
                try {
                    const response = await fetch(API_BASE + '/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    const data = await response.json();
                    if (response.ok && data.success) {
                        // Store auth tokens
                        localStorage.setItem('is_logged_in', 'true');
                        localStorage.setItem('logged_in_username', username);
                        appState.username = username;
                        
                        // Set profile and history namespaces
                        appState.profile = data.profile || { name: username, xp: 0, completed: [] };
                        appState.history = data.history || [];
                        
                        // Sync to local storage namespaces
                        localStorage.setItem('user_profile_' + username, JSON.stringify(appState.profile));
                        localStorage.setItem('review_history_' + username, JSON.stringify(appState.history));
                        
                        // Refresh display layout
                        renderProfile();
                        renderHistory();
                        
                        // Switch views
                        loginPortal.classList.add('hidden');
                        appContainer.classList.remove('hidden');
                        lucide.createIcons();
                    } else {
                        loginErrorMessage.textContent = data.error || "Invalid username or password.";
                        loginErrorMessage.classList.remove('hidden');
                    }
                } catch (err) {
                    loginErrorMessage.textContent = "Error: Cannot reach the backend database server.";
                    loginErrorMessage.classList.remove('hidden');
                }
            }
        });
    }

    // Sign Out Button Clicked
    if (btnSignOut) {
        btnSignOut.addEventListener('click', () => {
            localStorage.removeItem('is_logged_in');
            localStorage.removeItem('logged_in_username');
            
            // Clear memory state variables
            appState.username = '';
            appState.profile = { name: "Code Explorer", xp: 0, completed: [] };
            appState.history = [];
            
            // Perform full page reload to clear variables and input buffers cleanly
            window.location.reload();
        });
    }
}

// Theme Management
function applyTheme(theme) {
    appState.theme = theme;
    localStorage.setItem('theme', theme);
    bodyEl.setAttribute('data-theme', theme);
    
    if (theme === 'dark') {
        btnDarkTheme.classList.add('active');
        btnLightTheme.classList.remove('active');
    } else {
        btnLightTheme.classList.add('active');
        btnDarkTheme.classList.remove('active');
    }
}

// API Status Badge Display
function updateAPIStatusBadge() {
    const dot  = apiStatusBadge.querySelector('.badge-dot');
    const text = apiStatusBadge.querySelector('.badge-text');
    
    if (appState.serverHasKey) {
        dot.className       = 'badge-dot dot-online';
        text.textContent    = 'Live AI Mode';
        apiStatusBadge.title = 'Reviews are powered by Groq AI (Llama 3.3 70B)';
    } else {
        dot.className       = 'badge-dot dot-offline';
        text.textContent    = 'No API Key';
        apiStatusBadge.title = 'No API Key detected on the server.';
    }
}

// Settings Save
function saveSettings() {
    appState.apiKey = apiKeyInput.value.trim();
    localStorage.setItem('gemini_api_key', appState.apiKey);
    updateAPIStatusBadge();
    renderProfile();
    settingsDialog.classList.add('hidden');
    
    addLogLine("System settings updated successfully.", "success");
}

// Render Exercises dynamically in Sidebar
function renderExercises() {
    // Render Java Exercises
    if (window.JAVA_EXERCISES && javaExercisesList) {
        javaExercisesList.innerHTML = '';
        window.JAVA_EXERCISES.forEach(ex => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary exercise-btn';
            btn.setAttribute('data-lang', 'java');
            btn.setAttribute('data-id', ex.id);
            btn.innerHTML = `<i data-lucide="play-circle"></i> Ex ${ex.id}: ${ex.title}`;
            btn.addEventListener('click', () => loadExercisesItem('java', ex.id));
            javaExercisesList.appendChild(btn);
        });
    }

    // Render Python Exercises
    if (window.PYTHON_EXERCISES && pythonExercisesList) {
        pythonExercisesList.innerHTML = '';
        window.PYTHON_EXERCISES.forEach(ex => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary exercise-btn';
            btn.setAttribute('data-lang', 'python');
            btn.setAttribute('data-id', ex.id);
            btn.innerHTML = `<i data-lucide="play-circle"></i> Ex ${ex.id}: ${ex.title}`;
            btn.addEventListener('click', () => loadExercisesItem('python', ex.id));
            pythonExercisesList.appendChild(btn);
        });
    }
}

// Load coding exercise metadata and comments
// Load coding exercise metadata and comments
function loadExercisesItem(lang, id) {
    const db = lang === 'java' ? window.JAVA_EXERCISES : window.PYTHON_EXERCISES;
    if (db) {
        const ex = db.find(e => e.id === id);
        if (ex) {
            // Hide Home, Show Workspace
            if (stateHome) stateHome.classList.add('hidden');
            if (stateWorkspace) stateWorkspace.classList.remove('hidden');

            codeInputEl.value = ex.code;
            languageSelectEl.value = lang;
            appState.currentLanguage = lang;
            appState.currentExerciseKey = `${lang}_${id}`;
            codeInputEl.focus();

            // Set visual active highlight
            document.querySelectorAll('.exercise-btn').forEach(b => b.classList.remove('active'));
            const activeBtn = document.querySelector(`.exercise-btn[data-lang="${lang}"][data-id="${id}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }

            // Remove active classes on accordion navigation headers
            document.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('active'));

            // Force empty editor state inside workspace panel
            stateEmpty.classList.remove('hidden');
            stateDashboard.classList.add('hidden');
            stateLoading.classList.add('hidden');
        }
    }
}

// History List Rendering
function renderHistory() {
    if (appState.history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No reviews run yet</div>';
        return;
    }

    historyList.innerHTML = '';
    appState.history.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-item-top">
                <span class="history-item-lang">${getLanguageName(item.language)}</span>
                <span class="history-item-score">${item.score}%</span>
            </div>
            <span class="history-item-time">${formatDate(item.timestamp)}</span>
        `;
        historyItem.addEventListener('click', () => loadHistoryItem(index));
        historyList.appendChild(historyItem);
    });
}

function getLanguageName(lang) {
    const names = {
        cpp: 'C++',
        python: 'Python',
        javascript: 'JavaScript',
        java: 'Java'
    };
    return names[lang] || lang.toUpperCase();
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Load a selected history element
function loadHistoryItem(index) {
    const item = appState.history[index];
    codeInputEl.value = item.originalCode;
    languageSelectEl.value = item.language;
    appState.currentLanguage = item.language;
    
    displayResults(item.result);
}

// Clipboard copying utility
function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const icon = button.querySelector('i');
        const originalHtml = button.innerHTML;
        
        button.innerHTML = '<i data-lucide="check" style="color: var(--accent-green)"></i>';
        lucide.createIcons();
        
        setTimeout(() => {
            button.innerHTML = originalHtml;
            lucide.createIcons();
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Logging helper (re-routed to developer console)
function addLogLine(message, type = '') {
    const formatted = `[AGENT${type ? ':' + type.toUpperCase() : ''}] ${message}`;
    console.log(formatted);
}

// Main Review Run Logic
async function runReview() {
    const code = codeInputEl.value.trim();
    if (!code) {
        alert("Please enter some source code to review.");
        return;
    }

    // Switch View to Loading State
    stateEmpty.classList.add('hidden');
    stateDashboard.classList.add('hidden');
    stateLoading.classList.remove('hidden');

    let analysisResult = null;
    const customInput = customInputEl ? customInputEl.value : "";

    try {
        const backendResponse = await fetchGeminiReview(code, appState.currentLanguage, customInput);
        if (backendResponse && backendResponse.aiResult) {
            analysisResult = backendResponse.aiResult;
            analysisResult.execution = backendResponse.execution;
        } else {
            throw new Error("Invalid response structure received from server.");
        }
    } catch (error) {
        console.error("Backend AI review query failed: ", error);
        // Restore view and show error — no offline simulation
        stateLoading.classList.add('hidden');
        stateEmpty.classList.remove('hidden');
        alert("⚠️ Could not reach the backend server.\n\nMake sure the server is running:\npowershell -ExecutionPolicy Bypass -File backend\\serve.ps1");
        return;
    }

    // Save to history
    const historyEntry = {
        timestamp: Date.now(),
        language: appState.currentLanguage,
        score: analysisResult.efficiencyScore,
        originalCode: code,
        result: analysisResult
    };

    appState.history.unshift(historyEntry);
    if (appState.history.length > 10) {
        appState.history.pop();
    }
    renderHistory();

    // Display Output Report Dashboard
    displayResults(analysisResult);

    // Update gamified user profile metrics if an exercise is active
    if (appState.currentExerciseKey) {
        if (!appState.profile.completed.includes(appState.currentExerciseKey)) {
            appState.profile.completed.push(appState.currentExerciseKey);
            appState.profile.xp += analysisResult.efficiencyScore;
            renderProfile();
        }
    }

    // Sync and save user database state
    saveUserDatabaseState();
}

// Fetch content from Gemini API via Backend Server
async function fetchGeminiReview(code, language, input = "") {
    const headers = {
        "Content-Type": "application/json"
    };
    if (appState.apiKey) {
        headers["X-Gemini-API-Key"] = appState.apiKey;
    }

    const response = await fetch(API_BASE + "/api/review", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ code, language, input })
    });

    if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || `HTTP error ${response.status}`);
    }

    const result = await response.json();
    return result;
}

// Display results on Dashboard Screen
function displayResults(result) {
    appState.analysisResult = result;

    // Switch view
    stateEmpty.classList.add('hidden');
    stateLoading.classList.add('hidden');
    stateDashboard.classList.remove('hidden');

    // 1. Efficiency Score Gauge
    const score = result.efficiencyScore;
    scoreText.textContent = `${score}%`;
    
    // SVG Circular offset math: C = 2 * PI * r = 2 * 3.14159 * 40 = 251.2
    const circumference = 251.2;
    const offset = circumference - (score / 100) * circumference;
    scoreRingFill.style.strokeDashoffset = offset;

    // Color and label rating configuration
    if (score >= 90) {
        scoreRingFill.style.stroke = "var(--accent-green)";
        scoreLabel.textContent = "Excellent";
        scoreLabel.style.color = "var(--accent-green)";
    } else if (score >= 70) {
        scoreRingFill.style.stroke = "var(--accent-cyan)";
        scoreLabel.textContent = "Good / Optimized";
        scoreLabel.style.color = "var(--accent-cyan)";
    } else if (score >= 50) {
        scoreRingFill.style.stroke = "var(--accent-warning)";
        scoreLabel.textContent = "Fair Performance";
        scoreLabel.style.color = "var(--accent-warning)";
    } else {
        scoreRingFill.style.stroke = "var(--accent-error)";
        scoreLabel.textContent = "Highly Inefficient";
        scoreLabel.style.color = "var(--accent-error)";
    }

    // 2. Complexity badges
    timeComplexityOrig.textContent = result.timeComplexityOriginal;
    timeComplexityOpt.textContent = result.timeComplexityOptimized;
    spaceComplexityOrig.textContent = result.spaceComplexityOriginal;
    spaceComplexityOpt.textContent = result.spaceComplexityOptimized;

    // 3. Bottlenecks and Compiler Advice sections removed by user request
    const defaultCompilers = {
        cpp: "GCC 11+ (C++17)",
        python: "CPython 3.10+ / PyPy3",
        javascript: "V8 / Node.js 18+",
        java: "OpenJDK 17+"
    };
    compilerInfoEl.textContent = result.compilerInfo || defaultCompilers[appState.currentLanguage] || "Standard Compiler";

    // 5. Optimized Code Block
    optimizedCodeBlock.textContent = result.optimizedCode;
    
    // Set appropriate Prism class for syntax highlighting
    optimizedCodeBlock.className = `language-${appState.currentLanguage}`;
    // Re-highlight the element using Prism.js
    Prism.highlightElement(optimizedCodeBlock);

    // 6. Render Compiler Execution and Output
    if (result.execution) {
        const exec = result.execution;
        
        // Update badge text and class list
        compileStatusBadge.textContent = exec.status || "Unknown";
        compileStatusBadge.className = "status-badge"; // Reset classes
        
        if (exec.status === "Success") {
            compileStatusBadge.classList.add("success");
            execTimeVal.textContent = `${exec.execTimeMs} ms`;
            consoleOutputBlock.textContent = exec.stdout || "(Code executed successfully with no console output)";
            consoleOutputBlock.style.color = "#e5e7eb";
        } else if (exec.status === "Compiler Not Found") {
            compileStatusBadge.classList.add("warning");
            execTimeVal.textContent = "—";
            consoleOutputBlock.textContent = exec.error || "Local compiler/runtime was not found on this system.";
            consoleOutputBlock.style.color = "var(--accent-warning)";
        } else if (exec.status === "Compilation Error") {
            compileStatusBadge.classList.add("error");
            execTimeVal.textContent = "—";
            consoleOutputBlock.textContent = exec.error || "Compilation failed.";
            consoleOutputBlock.style.color = "var(--accent-error)";
        } else if (exec.status === "Runtime Error") {
            compileStatusBadge.classList.add("error");
            execTimeVal.textContent = `${exec.execTimeMs} ms`;
            consoleOutputBlock.textContent = exec.stderr || exec.error || "Runtime error occurred.";
            consoleOutputBlock.style.color = "var(--accent-error)";
        } else if (exec.status === "Timeout") {
            compileStatusBadge.classList.add("error");
            execTimeVal.textContent = "> 5000 ms";
            consoleOutputBlock.textContent = exec.error || "Execution timed out.";
            consoleOutputBlock.style.color = "var(--accent-error)";
        } else {
            // Unknown execution status
            compileStatusBadge.classList.add("warning");
            execTimeVal.textContent = "—";
            consoleOutputBlock.textContent = exec.stdout || exec.error || "No local compiler run performed.";
            consoleOutputBlock.style.color = "var(--text-muted)";
        }
    } else {
        // Fallback if no execution result exists in the result object
        compileStatusBadge.textContent = "Not Run";
        compileStatusBadge.className = "status-badge";
        execTimeVal.textContent = "—";
        consoleOutputBlock.textContent = "Write code and run AI review to see compiler output.";
        consoleOutputBlock.style.color = "var(--text-muted)";
    }

    // Refresh icons inside rendered fields
    lucide.createIcons();
}

// Convert markdown links e.g. [Godbolt](https://godbolt.org) into regular clickable links
function parseLinks(rawText) {
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    if (regex.test(rawText)) {
        return rawText.replace(regex, '<a href="$2" target="_blank" rel="noopener noreferrer">$1 <i data-lucide="external-link" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-left:2px"></i></a>');
    }
    // Return standard link layout if it's just a raw URL
    if (rawText.startsWith('http')) {
        return `<a href="${rawText}" target="_blank" rel="noopener noreferrer">Sandbox Explorer <i data-lucide="external-link" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-left:2px"></i></a>`;
    }
    return rawText;
}

// Simple Helper Delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Accordion Panel Toggle helper
function setupAccordion(headerId, contentId) {
    const header = document.getElementById(headerId);
    const content = document.getElementById(contentId);
    if (header && content) {
        header.addEventListener('click', () => {
            const isHidden = content.classList.contains('hidden');
            if (isHidden) {
                content.classList.remove('hidden');
                header.classList.add('active');
            } else {
                content.classList.add('hidden');
                header.classList.remove('active');
            }
        });
    }
}

// User Profile Card Rendering
function renderProfile() {
    if (profileNameInput) {
        profileNameInput.value = appState.profile.name;
        
        // Compute Initials
        const words = appState.profile.name.trim().split(/\s+/);
        const initials = words.map(w => w[0]).join('').substring(0, 2).toUpperCase();
        profileAvatar.textContent = initials || 'CE';
    }
    if (profileXPText) {
        profileXPText.textContent = `${appState.profile.xp} XP`;
    }
    if (profileCompletedText) {
        profileCompletedText.textContent = `${appState.profile.completed.length} / 60`;
    }

    // Update Home page widgets
    if (homeXP) {
        homeXP.textContent = `${appState.profile.xp} XP`;
    }
    if (homeCompleted) {
        homeCompleted.textContent = `${appState.profile.completed.length} / 60`;
    }

}

// User Profile Renaming
function saveProfileName() {
    appState.profile.name = profileNameInput.value.trim() || "Code Explorer";
    saveUserDatabaseState();
    renderProfile();
    addLogLine(`Renamed profile to: ${appState.profile.name}`, "info");
}

// Open clean Code Reviewer editor
function openCodeReviewer() {
    // Hide Home, Show Workspace
    if (stateHome) stateHome.classList.add('hidden');
    if (stateWorkspace) stateWorkspace.classList.remove('hidden');

    stateEmpty.classList.remove('hidden');
    stateDashboard.classList.add('hidden');
    stateLoading.classList.add('hidden');

    // Reset active exercise states
    appState.currentExerciseKey = null;
    document.querySelectorAll('.exercise-btn').forEach(btn => btn.classList.remove('active'));

    // Highlight Code Review in sidebar
    document.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('active'));
    if (codeReviewHeader) codeReviewHeader.classList.add('active');

    // Clear code input and set placeholder
    codeInputEl.value = '';
    codeInputEl.placeholder = "Write or paste your code here for efficiency review...";
    codeInputEl.focus();

    addLogLine("Returned to Code Reviewer input dashboard.", "info");
}

// Open Home Page view
function openHomePage() {
    // Show Home, Hide Workspace
    if (stateHome) stateHome.classList.remove('hidden');
    if (stateWorkspace) stateWorkspace.classList.add('hidden');

    // Highlight Home in sidebar
    document.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('active'));
    if (homeHeader) homeHeader.classList.add('active');

    // Reset active exercise states
    appState.currentExerciseKey = null;
    document.querySelectorAll('.exercise-btn').forEach(btn => btn.classList.remove('active'));

    // Re-render stats in welcome card
    renderProfile();
}

// Check Groq API status on the backend server
async function checkServerStatus() {
    try {
        const response = await fetch(API_BASE + "/api/status");
        if (response.ok) {
            const data = await response.json();
            appState.serverHasKey = data.live;
            updateAPIStatusBadge();
            renderProfile(); // Sync stats card
        }
    } catch (e) {
        console.warn("Failed to contact backend status API: ", e);
    }
}

// Start app
window.addEventListener('DOMContentLoaded', init);
