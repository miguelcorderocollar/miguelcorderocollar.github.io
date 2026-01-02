# Agent Rules

## Automatic Preview

When making changes to HTML, CSS, or JavaScript files in this project:

1. **Automatically start a local HTTP server** on port 8000 if one is not already running:
   ```bash
   python3 -m http.server 8000
   ```

2. **Open the preview** in the default browser at `http://localhost:8000`:
   ```bash
   xdg-open http://localhost:8000
   ```
   (On macOS, use `open` instead of `xdg-open`)

3. **Run the server in the background** so it doesn't block other operations.

4. **After making changes**, inform the user that they can refresh the browser to see the updates.

This ensures that content changes can be immediately previewed without manual server setup.

