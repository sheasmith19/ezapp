// content_script.js - runs in the page and performs the actual upload/insert
console.log('Resume uploader content script loaded');

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if(!msg || msg.action !== 'upload') return false;
  
  const downloadUrl = msg.downloadUrl;
  
  // Wrap async logic so we can return true immediately to keep port open
  (async () => {
    try{
      console.log('Fetching resume from:', downloadUrl);
      
      // Ask background script to fetch (bypasses page CSP)
      chrome.runtime.sendMessage({ action: 'fetch-resume', downloadUrl }, async (bgResp) => {
        if (!bgResp || !bgResp.ok) {
          console.error('Background fetch failed:', bgResp?.error);
          sendResponse({ ok: false, error: bgResp?.error || 'Fetch failed' });
          return;
        }
        
        try {
          // Convert ArrayBuffer back to Blob
          const blob = new Blob([bgResp.blob], { type: bgResp.contentType });
          console.log('Downloaded blob:', blob.size, 'bytes, type:', bgResp.contentType);

          // If the page has a file input, attach the file
          // Smart selection: prefer inputs that hint they're for resume/CV/PDF
          const allFileInputs = document.querySelectorAll('input[type="file"]');
          let fileInput = null;
          
          if (allFileInputs.length > 0) {
            // Look for inputs with resume/cv hints in name, id, or accept attribute
            for (const input of allFileInputs) {
              const nameAttr = (input.name || '').toLowerCase();
              const idAttr = (input.id || '').toLowerCase();
              const acceptAttr = (input.accept || '').toLowerCase();
              const labelText = (input.previousElementSibling?.textContent || '').toLowerCase();
              
              // Check if any attribute suggests this is a resume/cv field
              if (nameAttr.includes('resume') || nameAttr.includes('cv') ||
                  idAttr.includes('resume') || idAttr.includes('cv') ||
                  acceptAttr.includes('pdf') || acceptAttr.includes('resume') ||
                  labelText.includes('resume') || labelText.includes('cv')) {
                fileInput = input;
                console.log('Found likely resume input:', input.name || input.id || 'unnamed');
                break;
              }
            }
            
            // Fall back to first file input if no match found
            if (!fileInput) {
              fileInput = allFileInputs[0];
              console.log('No resume-specific input found, using first file input');
            }
          }
          
          if(fileInput){
            console.log('Found file input, attaching file');
            const file = new File([blob], bgResp.filename, { type: bgResp.contentType });
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('File attached and change event fired');
            sendResponse({ ok: true });
            return;
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
