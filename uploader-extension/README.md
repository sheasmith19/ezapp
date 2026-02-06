# Resume Uploader Extension

This Chrome extension lists resumes available from a backend and uploads a selected resume into the active webpage.

Development notes

- Configure the backend API base URL from the popup settings (defaults to `http://localhost:5000`). The extension expects an endpoint at `{apiBase}/resumes` returning JSON array of objects with `id`, `name`, and `downloadUrl` fields.
- The popup fetches the list and sends an `upload` message to the content script. The content script fetches the `downloadUrl` and attaches the file to an `input[type=file]` if present, or pastes text into a textarea when appropriate.

Loading locally

1. Open `chrome://extensions` and enable Developer mode.
2. Click "Load unpacked" and select the `uploader-extension` folder.
3. Click the extension icon and set your API base URL if needed, then `Refresh` to fetch resumes.

Security / CORS

- The content script fetches resume files from the provided `downloadUrl`. Ensure your backend provides appropriate CORS headers or run the backend on the same origin as the page.

Files added/changed

- `manifest.json` - added storage permission and content script registration
- `popup.html` - UI for selecting resumes
- `popup.js` - popup logic
- `content_script.js` - page-side upload logic
- `content.js` - deprecated (left as marker)
