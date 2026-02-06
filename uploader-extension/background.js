// background.js - monitors tabs and detects resume upload fields
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // When page finishes loading, check for resume fields
  if (changeInfo.status !== 'complete') return;
  
  chrome.scripting.executeScript(
    {
      target: { tabId },
      function: detectResumeField,
    },
    (results) => {
      if (results && results[0] && results[0].result) {
        // Found a resume field, update badge
        chrome.action.setBadgeText({ text: '📄', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#1a73e8', tabId });
      } else {
        // No resume field found, clear badge
        chrome.action.setBadgeText({ text: '', tabId });
      }
    }
  );
});

// Listen for messages from content script when file input is detected dynamically
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'file-input-detected') {
    console.log('Background: File input detected dynamically');
    const tabId = sender.tab && sender.tab.id;
    if (tabId) {
      chrome.action.setBadgeText({ text: '📄', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#1a73e8', tabId });
    }
    sendResponse({ ok: true });
    return true;
  }
  if (msg.action === 'fetch-resume') {
    const downloadUrl = msg.downloadUrl;
    console.log('Background: fetching resume', downloadUrl);
    fetch(downloadUrl)
      .then((resp) => {
        if (!resp.ok) throw new Error('Download failed: ' + resp.status);
        const contentType = resp.headers.get('content-type') || 'application/pdf';
        return resp.arrayBuffer().then((buffer) => ({ buffer, contentType }));
      })
      .then(({ buffer, contentType }) => {
        const base64 = arrayBufferToBase64(buffer);
        sendResponse({
          ok: true,
          base64,
          contentType,
          filename: (new URL(downloadUrl)).pathname.split('/').pop() || 'resume.pdf'
        });
      })
      .catch((err) => {
        console.error('Background fetch failed:', err);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }
});

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// This function runs in the page context to detect resume fields
function detectResumeField() {
  const allFileInputs = document.querySelectorAll('input[type="file"]');
  console.log('Resume Pro: Found', allFileInputs.length, 'file inputs');
  
  if (allFileInputs.length === 0) return false;
  
  // Score each input based on proximity to "resume" or "CV" keywords
  let bestInput = null;
  let bestScore = 0;
  
  for (const input of allFileInputs) {
    let score = 0;
    
    // Check attributes (name, id, placeholder, accept)
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const accept = (input.accept || '').toLowerCase();
    
    if (name.includes('resume') || name.includes('cv')) score += 50;
    if (id.includes('resume') || id.includes('cv')) score += 50;
    if (placeholder.includes('resume') || placeholder.includes('cv')) score += 30;
    // Removed: PDF acceptance alone doesn't indicate resume field
    
    // Check associated label
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) {
      const labelText = label.textContent.toLowerCase();
      if (labelText.includes('resume') || labelText.includes('cv')) score += 40;
    }
    
    // Check nearby text (within 200 characters of surrounding text)
    let nearbyText = '';
    let current = input.parentElement;
    let depth = 0;
    while (current && depth < 3) {
      nearbyText += ' ' + (current.textContent || '');
      current = current.parentElement;
      depth++;
    }
    nearbyText = nearbyText.toLowerCase();
    
    const resumeMatches = (nearbyText.match(/resume/g) || []).length;
    const cvMatches = (nearbyText.match(/\bcv\b/g) || []).length;
    score += (resumeMatches + cvMatches) * 15;
    
    console.log(`Input score:`, {
      name: input.name || input.id || 'unnamed',
      score,
      resumeMatches,
      cvMatches
    });
    
    if (score > bestScore) {
      bestScore = score;
      bestInput = input;
    }
  }
  
  // Only consider it a resume field if score is at least 30 (must have clear resume/CV indicators)
  if (bestScore >= 30 && bestInput) {
    // Store identifier for the best input
    const identifier = bestInput.name || bestInput.id || `input-${Array.from(allFileInputs).indexOf(bestInput)}`;
    console.log('Resume Pro: Best candidate:', identifier, 'score:', bestScore);
    
    // Store in session storage so content script can find it
    sessionStorage.setItem('resumeUploaderTarget', identifier);
    return true;
  }
  
  console.log('Resume Pro: No resume field detected (best score:', bestScore, ')');
  return false;
}
