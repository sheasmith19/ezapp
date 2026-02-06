// popup.js: handles UI in popup.html
const DEFAULT_API = 'http://127.0.0.1:8000';

function $(id){return document.getElementById(id)}

function setStatus(text, type = 'info') {
  const el = $('status');
  el.textContent = text;
  el.className = type; // 'info', 'success', 'error'
}

async function getApiBase(){
  return new Promise((res) => {
    chrome.storage.sync.get({ apiBase: DEFAULT_API }, (items) => res(items.apiBase));
  });
}

async function setApiBase(val){
  return new Promise((res) => {
    chrome.storage.sync.set({ apiBase: val }, () => res());
  });
}

async function fetchResumes(apiBase){
  try{
    const res = await fetch(apiBase.replace(/\/+$/, '') + '/resumes');
    if(!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  }catch(e){
    console.error(e);
    return [];
  }
}

async function populate(){
  const api = await getApiBase();
  setStatus('Loading resumes...');
  const list = await fetchResumes(api);
  const sel = $('resumeSelect');
  sel.innerHTML = '';
  if(list.length === 0){
    const opt = document.createElement('option'); opt.text = 'No resumes'; opt.value=''; sel.add(opt);
    setStatus('No resumes found', 'error');
    return;
  }
  for(const r of list){
    const opt = document.createElement('option');
    opt.text = r.name || r.id || r.title || r.filename || 'Resume';
    // Construct a downloadUrl when backend returns `filename`
    const apiBaseClean = api.replace(/\/+$/, '');
    const downloadUrl = r.downloadUrl || r.url || (r.filename ? apiBaseClean + '/download-resume/' + encodeURIComponent(r.filename) : r.id);
    opt.value = downloadUrl;
    sel.add(opt);
  }
  setStatus('Ready');
}

document.addEventListener('DOMContentLoaded', async () => {
  $('refreshBtn').addEventListener('click', populate);
  $('settingsBtn').addEventListener('click', async () => {
    const current = await getApiBase();
    const val = prompt('API base URL for resumes (example: http://localhost:5000)', current);
    if(val) { await setApiBase(val); populate(); }
  });

  $('uploadBtn').addEventListener('click', async () => {
    const downloadUrl = $('resumeSelect').value;
    if(!downloadUrl){ setStatus('Select a resume first', 'error'); return; }
    setStatus('Sending to page...');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'upload', downloadUrl }, (resp) => {
      if(chrome.runtime.lastError){
        // Try to inject the content script and retry once
        const err = chrome.runtime.lastError.message || 'unknown';
        setStatus('Injecting script...', 'info');
        try {
          chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content_script.js'] }, () => {
            // Wait briefly for the injected script to register its listener, then retry
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: 'upload', downloadUrl }, (resp2) => {
                if(chrome.runtime.lastError){
                  const msg = chrome.runtime.lastError.message || 'unknown';
                  setStatus('Error: ' + msg, 'error');
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
  });

  populate();
});
