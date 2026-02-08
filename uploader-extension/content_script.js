// content_script.js - runs in the page and performs the actual upload/insert
console.log('Resume uploader content script loaded');

// Set up MutationObserver to watch for dynamically added or revealed file inputs
let hasNotifiedBackground = false;

function checkForFileInputs() {
  const allFileInputs = document.querySelectorAll('input[type="file"]');
  if (allFileInputs.length > 0 && !hasNotifiedBackground) {
    console.log('Content script: File input detected');
    hasNotifiedBackground = true;
    chrome.runtime.sendMessage({ action: 'file-input-detected' });
  }
}

// Initial check after DOM is ready
setTimeout(checkForFileInputs, 1000);

// Watch for DOM changes - only start observing when body exists
function startObserver() {
  if (!document.body) {
    setTimeout(startObserver, 100);
    return;
  }
  
  const observer = new MutationObserver((mutations) => {
    if (!hasNotifiedBackground) {
      checkForFileInputs();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden']
  });
}

startObserver();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if(!msg || msg.action !== 'upload') return false;
  
  const downloadUrl = msg.downloadUrl;
  const token = msg.token; // Auth token passed from popup
  
  // Wrap async logic so we can return true immediately to keep port open
  (async () => {
    try{
      console.log('Fetching resume from:', downloadUrl);
      
      // Ask background script to fetch (bypasses page CSP)
      chrome.runtime.sendMessage({ action: 'fetch-resume', downloadUrl, token }, async (bgResp) => {
        if (!bgResp || !bgResp.ok) {
          console.error('Background fetch failed:', bgResp?.error);
          sendResponse({ ok: false, error: bgResp?.error || 'Fetch failed' });
          return;
        }
        
        try {
          // Convert base64 back to ArrayBuffer
          if (!bgResp.base64) {
            throw new Error('Missing base64 data from background');
          }
          const binary = atob(bgResp.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const buffer = bytes.buffer;
          const blob = new Blob([buffer], { type: bgResp.contentType || 'application/pdf' });
          console.log('Downloaded blob:', blob.size, 'bytes, type:', bgResp.contentType);

          // Wait a bit for file inputs to appear (some sites show them after interaction)
          await new Promise(resolve => setTimeout(resolve, 500));

          // Find the BEST file input based on scoring
          // Check main document
          let allFileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
          console.log('Main document file inputs:', allFileInputs.length);
          
          // Log details of each input found
          allFileInputs.forEach((inp, idx) => {
            console.log(`Input ${idx}:`, {
              id: inp.id,
              name: inp.name,
              visible: inp.offsetParent !== null
            });
          });
          
          // Also check shadow roots
          document.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
              const shadowInputs = el.shadowRoot.querySelectorAll('input[type="file"]');
              if (shadowInputs.length > 0) {
                console.log('Found', shadowInputs.length, 'inputs in shadow DOM');
                allFileInputs = allFileInputs.concat(Array.from(shadowInputs));
              }
            }
          });
          
          // Check iframes
          const iframes = document.querySelectorAll('iframe');
          console.log('Found', iframes.length, 'iframes');
          iframes.forEach((iframe, idx) => {
            try {
              const iframeInputs = iframe.contentDocument?.querySelectorAll('input[type="file"]');
              if (iframeInputs && iframeInputs.length > 0) {
                console.log(`Iframe ${idx} has ${iframeInputs.length} file inputs`);
                allFileInputs = allFileInputs.concat(Array.from(iframeInputs));
              }
            } catch (e) {
              console.log(`Cannot access iframe ${idx} (cross-origin):`, e.message);
            }
          });
          
          console.log('Total file inputs found:', allFileInputs.length);
          let fileInput = null;
          
          if (allFileInputs.length > 0) {
            // Try to get the target identifier from session storage (set by background script)
            const targetIdentifier = sessionStorage.getItem('resumeUploaderTarget');
            
            if (targetIdentifier) {
              // Find input by name, id, or index
              for (const input of allFileInputs) {
                if (input.name === targetIdentifier || input.id === targetIdentifier) {
                  fileInput = input;
                  console.log('Found target input by identifier:', targetIdentifier);
                  break;
                }
              }
              
              // Try index-based match if not found by name/id
              if (!fileInput && targetIdentifier.startsWith('input-')) {
                const index = parseInt(targetIdentifier.split('-')[1]);
                if (!isNaN(index) && index < allFileInputs.length) {
                  fileInput = allFileInputs[index];
                  console.log('Found target input by index:', index);
                }
              }
            }
            
            // If no stored target or not found, score inputs again
            if (!fileInput) {
              let bestScore = -1;
              let bestInput = null;
              
              for (const input of allFileInputs) {
                let score = 0;
                const name = (input.name || '').toLowerCase();
                const id = (input.id || '').toLowerCase();
                const placeholder = (input.placeholder || '').toLowerCase();
                const accept = (input.accept || '').toLowerCase();
                
                if (name.includes('resume') || name.includes('cv')) score += 50;
                if (id.includes('resume') || id.includes('cv')) score += 50;
                if (placeholder.includes('resume') || placeholder.includes('cv')) score += 30;
                if (accept.includes('pdf') || accept.includes('doc')) score += 10;
                
                const label = document.querySelector(`label[for="${input.id}"]`);
                if (label) {
                  const labelText = label.textContent.toLowerCase();
                  if (labelText.includes('resume') || labelText.includes('cv')) score += 40;
                }
                
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
                
                console.log('Input candidate:', {
                  name: input.name || input.id || 'unnamed',
                  score,
                  accept: input.accept
                });
                
                if (score > bestScore) {
                  bestScore = score;
                  bestInput = input;
                }
              }
              
              // Use best candidate if found, even with score 0
              // Prioritize higher scores but don't exclude low-scoring inputs entirely
              if (bestInput) {
                fileInput = bestInput;
                console.log('Selected best candidate with score:', bestScore);
              } else if (allFileInputs.length === 1) {
                fileInput = allFileInputs[0];
                console.log('Using only available file input');
              }
            }
          }
          
          if(fileInput){
            try {
              console.log('Found file input, attaching file');
              const acceptAttr = (fileInput.accept || '').toLowerCase();
              const baseName = (bgResp.filename || 'resume').replace(/\.[^/.]+$/, '');
              const acceptList = acceptAttr.split(',').map((s) => s.trim()).filter(Boolean);

              const mimeToExt = {
                'application/pdf': '.pdf',
                'application/msword': '.doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                'application/rtf': '.rtf',
                'text/plain': '.txt',
                'application/vnd.ms-powerpoint': '.ppt',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx'
              };

              const extToMime = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.rtf': 'application/rtf',
                '.txt': 'text/plain',
                '.ppt': 'application/vnd.ms-powerpoint',
                '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
              };

              let chosenType = blob.type || bgResp.contentType || 'application/pdf';
              if (chosenType.includes('text/html')) {
                throw new Error('Download returned HTML, not a resume file');
              }
              let chosenExt = mimeToExt[chosenType] || '.pdf';

              if (acceptList.length > 0) {
                const acceptsPdf = acceptList.some((v) => v.includes('pdf'));
                if (acceptsPdf) {
                  chosenType = 'application/pdf';
                  chosenExt = '.pdf';
                } else {
                  const first = acceptList[0];
                  if (first.startsWith('.')) {
                    chosenExt = first;
                    chosenType = extToMime[first] || chosenType;
                  } else if (first.includes('/')) {
                    chosenType = first;
                    chosenExt = mimeToExt[first] || chosenExt;
                  }
                }
              }

              const safeName = `${baseName}${chosenExt}`;
              console.log('Using filename/type:', safeName, chosenType, 'accept:', acceptAttr);

              // Validate PDF magic bytes when using PDF
              if (chosenExt === '.pdf') {
                const headerBytes = new Uint8Array(buffer.slice(0, 5));
                const header = String.fromCharCode(...headerBytes);
                if (header !== '%PDF-') {
                  console.error('Invalid PDF header:', header);
                  throw new Error('Downloaded file is not a valid PDF');
                }
              }

              const file = new File([blob], safeName, { type: chosenType });
              const dt = new DataTransfer();
              dt.items.add(file);
              fileInput.files = dt.files;
              
              console.log('File set to input:', fileInput.name || fileInput.id, 'files.length:', fileInput.files.length);
              
              // Check if there's an inline onchange handler
              const hasInlineHandler = fileInput.hasAttribute('onchange');
              console.log('Has inline onchange handler:', hasInlineHandler);
              
              // For inputs with inline handlers, we need to call the handler directly
              if (hasInlineHandler && fileInput.onchange) {
                console.log('Calling inline onchange handler directly');
                try {
                  fileInput.onchange.call(fileInput, new Event('change', { bubbles: true }));
                } catch (handlerError) {
                  console.warn('Inline handler error:', handlerError);
                }
              }
              
              // Also dispatch events normally
              fileInput.dispatchEvent(new Event('input', { bubbles: true }));
              fileInput.dispatchEvent(new Event('change', { bubbles: true }));
              
              // Some sites need focus events too
              fileInput.dispatchEvent(new Event('focus', { bubbles: true }));
              fileInput.dispatchEvent(new Event('blur', { bubbles: true }));
              
              console.log('File attached successfully, all events fired');
              sendResponse({ ok: true });
              return;
            } catch (attachError) {
              console.error('File attachment error:', attachError);
              sendResponse({ ok: false, error: attachError.message });
              return;
            }
          }

          // If no file input, try to paste text into a textarea or contentEditable
          if(bgResp.contentType.includes('text') || bgResp.contentType.includes('json')){
            console.log('Content is text, trying to paste into textarea');
            const text = await blob.text();
            const textarea = document.querySelector('textarea') || document.activeElement;
            if(textarea && (textarea.tagName === 'TEXTAREA' || textarea.isContentEditable || textarea.tagName === 'INPUT')){
              if(textarea.tagName === 'INPUT') textarea.value = text;
              else textarea.value = text;
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              console.log('Text pasted into textarea');
              sendResponse({ ok: true });
              return;
            }
          }

          // As a fallback, try to open the file in a new tab (user can download)
          console.log('No file input or textarea, opening file in new tab');
          const objectUrl = URL.createObjectURL(blob);
          window.open(objectUrl, '_blank');
          sendResponse({ ok: true });
        } catch(e) {
          console.error('Processing error:', e);
          sendResponse({ ok: false, error: e.message });
        }
      });
    }catch(e){
      console.error('Upload failed:', e);
      sendResponse({ ok: false, error: e.message });
    }
  })();
  
  // Return true to keep the message port open for the async sendResponse above
  return true;
});
