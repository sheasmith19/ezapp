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
        // Found a resume field, update badge and open popup
        chrome.action.setBadgeText({ text: '📄', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#1a73e8', tabId });
        
        // Try to open the popup
        chrome.action.openPopup().catch(() => {
          // If popup open fails, show notification as fallback
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231a73e8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/></svg>',
            title: 'Resume Upload Detected',
            message: 'Click the extension icon to upload your resume',
            contextMessage: 'Resume Pro'
          });
        });
      } else {
        // No resume field found, clear badge
        chrome.action.setBadgeText({ text: '', tabId });
      }
    }
  );
});

// This function runs in the page context to detect resume fields
function detectResumeField() {
  // Just check if there are ANY file inputs on the page
  // Most job sites with file inputs are for resume/CV
  const allFileInputs = document.querySelectorAll('input[type="file"]');
  console.log('Resume Pro: Found', allFileInputs.length, 'file inputs');
  
  if (allFileInputs.length > 0) {
    // Log all file inputs for debugging
    for (let i = 0; i < allFileInputs.length; i++) {
      const input = allFileInputs[i];
      console.log(`Input ${i}:`, {
        name: input.name,
        id: input.id,
        accept: input.accept,
        visible: input.offsetParent !== null
      });
    }
    return true; // If there are any file inputs, assume it's a resume upload opportunity
  }
  
  return false;
}
