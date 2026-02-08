// popup.js: handles UI and authentication

const $ = (id) => document.getElementById(id);

function setStatus(text, type = 'info') {
  const el = $('status');
  el.textContent = text;
  el.className = type;
}

// Get config from config.js (loaded before this script)
function getConfig() {
  return window.CONFIG || {
    API_BASE: 'https://app.crowd.cab/api',
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: ''
  };
}

// Storage helpers
async function getStoredAuth() {
  return new Promise((res) => {
    chrome.storage.local.get(['accessToken', 'refreshToken', 'userEmail', 'tokenExpiry'], (items) => {
      res(items);
    });
  });
}

async function setStoredAuth(accessToken, refreshToken, userEmail, expiresIn) {
  const tokenExpiry = Date.now() + (expiresIn * 1000);
  return new Promise((res) => {
    chrome.storage.local.set({ accessToken, refreshToken, userEmail, tokenExpiry }, () => res());
  });
}

async function clearAuth() {
  return new Promise((res) => {
    chrome.storage.local.remove(['accessToken', 'refreshToken', 'userEmail', 'tokenExpiry'], () => res());
  });
}

// Supabase Auth via REST API
async function supabaseLogin(email, password) {
  const config = getConfig();
  const res = await fetch(`${config.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ email, password })
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || err.message || 'Login failed');
  }
  
  return res.json();
}

async function supabaseRefresh(refreshToken) {
  const config = getConfig();
  const res = await fetch(`${config.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  
  if (!res.ok) {
    throw new Error('Token refresh failed');
  }
  
  return res.json();
}

// Get valid access token (refresh if needed)
async function getValidToken() {
  const auth = await getStoredAuth();
  
  if (!auth.accessToken) return null;
  
  // Check if token is expired (with 60s buffer)
  if (auth.tokenExpiry && Date.now() > auth.tokenExpiry - 60000) {
    try {
      const data = await supabaseRefresh(auth.refreshToken);
      await setStoredAuth(data.access_token, data.refresh_token, auth.userEmail, data.expires_in);
      return data.access_token;
    } catch (e) {
      console.error('Token refresh failed:', e);
      await clearAuth();
      return null;
    }
  }
  
  return auth.accessToken;
}

// API calls with auth
async function apiFetch(path, options = {}) {
  const config = getConfig();
  const token = await getValidToken();
  
  console.log('apiFetch:', config.API_BASE + path, 'token:', token ? 'present' : 'missing');
  
  const headers = {
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(`${config.API_BASE}${path}`, { ...options, headers });
}

async function fetchResumes() {
  try {
    const res = await apiFetch('/resumes');
    console.log('fetchResumes response:', res.status, res.statusText);
    if (res.status === 401) {
      const text = await res.text();
      console.error('401 response body:', text);
      throw new Error('Session expired');
    }
    if (!res.ok) {
      const text = await res.text();
      console.error('Error response:', res.status, text);
      throw new Error('Failed to fetch');
    }
    return await res.json();
  } catch (e) {
    console.error('fetchResumes error:', e);
    if (e.message === 'Session expired') {
      await clearAuth();
      showLoginView();
    }
    return [];
  }
}

// UI state management
function showLoginView() {
  $('loginView').classList.remove('hidden');
  $('mainView').classList.add('hidden');
  setStatus('Enter credentials to sign in');
}

function showMainView(email) {
  $('loginView').classList.add('hidden');
  $('mainView').classList.remove('hidden');
  $('userEmail').textContent = email;
  populate();
}

async function populate() {
  setStatus('Loading resumes...');
  const list = await fetchResumes();
  const sel = $('resumeSelect');
  sel.innerHTML = '';
  
  if (list.length === 0) {
    const opt = document.createElement('option');
    opt.text = 'No resumes';
    opt.value = '';
    sel.add(opt);
    setStatus('No resumes found', 'error');
    return;
  }
  
  const config = getConfig();
  for (const r of list) {
    const opt = document.createElement('option');
    opt.text = r.name || r.filename || 'Resume';
    opt.value = r.downloadUrl || r.url || `${config.API_BASE}/download-resume/${encodeURIComponent(r.filename)}`;
    sel.add(opt);
  }
  setStatus('Ready');
}

// Event handlers
async function handleLogin() {
  const email = $('email').value.trim();
  const password = $('password').value;
  
  if (!email || !password) {
    setStatus('Enter email and password', 'error');
    return;
  }
  
  setStatus('Signing in...');
  
  try {
    const data = await supabaseLogin(email, password);
    await setStoredAuth(data.access_token, data.refresh_token, email, data.expires_in);
    showMainView(email);
  } catch (e) {
    setStatus(e.message, 'error');
  }
}

async function handleLogout() {
  await clearAuth();
  $('email').value = '';
  $('password').value = '';
  showLoginView();
}

async function handleUpload() {
  const downloadUrl = $('resumeSelect').value;
  if (!downloadUrl) {
    setStatus('Select a resume first', 'error');
    return;
  }
  
  setStatus('Sending to page...');
  
  // Get the token to pass to background script
  const token = await getValidToken();
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'upload', downloadUrl, token }, (resp) => {
    if (chrome.runtime.lastError) {
      setStatus('Injecting script...', 'info');
      try {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content_script.js'] }, () => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'upload', downloadUrl, token }, (resp2) => {
              if (chrome.runtime.lastError) {
                setStatus('Error: ' + (chrome.runtime.lastError.message || 'unknown'), 'error');
              } else {
                setStatus(resp2 && resp2.ok ? 'Uploaded!' : 'Done', 'success');
              }
            });
          }, 300);
        });
      } catch (e) {
        setStatus('Injection failed', 'error');
      }
    } else {
      setStatus(resp && resp.ok ? 'Uploaded!' : 'Done', 'success');
    }
  });
}

function handleSettings() {
  const config = getConfig();
  const val = prompt('API base URL:', config.API_BASE);
  if (val) {
    window.CONFIG.API_BASE = val;
    populate();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Event listeners
  $('loginBtn').addEventListener('click', handleLogin);
  $('password').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
  $('logoutBtn').addEventListener('click', handleLogout);
  $('refreshBtn').addEventListener('click', populate);
  $('uploadBtn').addEventListener('click', handleUpload);
  $('settingsBtnLogin').addEventListener('click', handleSettings);
  
  // Check if already logged in
  const auth = await getStoredAuth();
  if (auth.accessToken && auth.userEmail) {
    showMainView(auth.userEmail);
  } else {
    showLoginView();
  }
});
