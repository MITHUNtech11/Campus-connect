# 🛠️ Local QA Automation & Execution Guide

This guide details how to execute the Enterprise QA Automation Suite locally on your machine.

---

## 📋 Prerequisites
1. **Node.js** v18 or v20+
2. **Python** v3.10+
3. **Dependencies Installed:**
   ```bash
   npm install
   pip install openpyxl requests selenium
   ```

---

## 🚀 Running the Full Test Suite (1,200 Unique Test Cases)

Execute the master runner:
```bash
py automation/run_all_tests.py
```
Or with custom `BASE_URL`:
```bash
BASE_URL=https://192324105.github.io/Campus-connect/ py automation/run_all_tests.py
```

---

## 📊 Report Artifact Locations

After execution, all reports are saved in `Test Results/` and `automation/reports/`:
* 📁 **`Test Results/Excel/`**
  * `Automation_Test_Report.xlsx` (300 Unique Selenium Cases)
  * `Appium_Test_Report.xlsx` (300 Unique Appium Cases)
  * `Vulnerability_Test_Report.xlsx` (300 Unique Vulnerability Cases)
  * `Load_Test_Report.xlsx` (300 Unique Load Performance Cases)
* 📁 **`Test Results/HTML/`**
  * `execution-report.html`
  * `dashboard.html`
* 📁 **`Test Results/JSON/`**
  * `execution-results.json`
* 📁 **`Test Results/Summary/`**
  * `summary.md`
