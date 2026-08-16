# ⚙️ CI/CD Deployment & Testing Guide (GitHub Actions)

This pipeline automatically builds, deploys to GitHub Pages, verifies availability, executes 1,200 unique test cases across 4 report suites, and publishes artifacts on every code push.

---

## ⚙️ GitHub Repository Configuration

### 1. Enable GitHub Pages
1. Go to your repository on GitHub: **`https://github.com/192324105/Campus-connect`**
2. Click **Settings** ➔ **Pages**.
3. Under **Source**, select **GitHub Actions**.

### 2. Workflow File Location
📁 `.github/workflows/deploy-and-test.yml`

### 3. Pipeline Stages
1. **Stage 1:** Repository Checkout
2. **Stage 2:** Dependency Installation
3. **Stage 3:** Build Application (`npm run build`)
4. **Stage 4:** Static Analysis
5. **Stage 5:** Deploy to GitHub Pages
6. **Stage 6:** Wait for Live Propagation
7. **Stage 7:** Deployment Verification (`deployment_verifier.py`)
8. **Stage 8:** Run Selenium, Appium, Vulnerability & Load Test Suites
9. **Stage 9:** Generate HTML Reports
10. **Stage 10:** Generate Excel Reports
11. **Stage 11:** Upload Artifacts (30 Days Retention)
12. **Stage 12:** Publish Summary (`$GITHUB_STEP_SUMMARY`)
13. **Stage 13:** Store Historical Results
