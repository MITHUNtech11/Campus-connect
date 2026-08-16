# 🛠️ QA Automation & CI/CD Troubleshooting Guide

### 1. Issue: GitHub Pages Returns 404
* **Solution:** Ensure GitHub Settings ➔ Pages Source is set to **GitHub Actions**. Also ensure `vite.config.js` includes `base: process.env.VITE_BASE_URL || '/Campus-connect/'`.

### 2. Issue: `openpyxl` Module Not Found in Python
* **Solution:** Install openpyxl:
  ```bash
  pip install openpyxl requests selenium
  ```

### 3. Issue: Selenium Never Runs Against Localhost
* **Rule:** Selenium always executes against the LIVE deployment URL (`BASE_URL=https://192324105.github.io/Campus-connect/`).

### 4. Issue: Encoding Error on Windows Console
* **Solution:** All logger utilities output clean ASCII status messages to avoid console charmap errors on Windows environments.
