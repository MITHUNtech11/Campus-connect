# 📱 CampusConnect Appium Android E2E Testing Suite & Excel Analysis Generator

This directory (`appium-tests/`) contains a complete **End-to-End Appium Automation Testing Framework** built for Android mobile applications and webviews. It incorporates the Page Object Model (POM) architecture, test logging, automatic failure screenshot capture, and a custom **Excel Analysis Report Generator** (`.xlsx`).

---

## 📁 Directory Architecture

```
appium-tests/
├── config/
│   └── appium_config.py          # Appium capabilities for Android Chrome / Native APK & server settings
├── pages/                        # Page Object Model (POM) Classes
│   ├── base_page.py              # Common explicit waits, gestures, scrolling & element helpers
│   ├── auth_page.py              # Auth page object (Role toggle, Sign In / Register)
│   ├── student_page.py           # Student page object (Faculty Directory, Search, Meeting Request)
│   ├── teacher_page.py           # Teacher page object (Availability status, Request approvals)
│   └── admin_page.py             # Admin page object (Master control panel & User management)
├── tests/                        # End-to-End Test Suite Modules
│   ├── test_auth_e2e.py          # E2E tests for Student, Teacher, & Admin Authentication
│   ├── test_student_e2e.py       # E2E tests for Student Faculty search & Meeting Request
│   ├── test_teacher_e2e.py       # E2E tests for Teacher availability update & Approvals
│   ├── test_admin_e2e.py         # E2E tests for Admin Master Control panel
│   └── test_theme_e2e.py         # E2E tests for real-time Visual Palette switching (Emerald/Aurora/Acid/Sapphire)
├── utils/                        # Reporting & Logging Utilities
│   ├── excel_reporter.py         # Custom Excel engine creating formatted multi-sheet .xlsx analysis
│   └── logger.py                 # File logger & device screenshot capturer
├── reports/                      # Output directory for Excel reports, execution logs, & screenshots
│   ├── logs/
│   └── screenshots/
├── requirements.txt              # Python dependencies (Appium-Python-Client, pytest, openpyxl)
├── run_appium_tests.py           # Master CLI Test Suite Runner
└── README.md                     # Documentation & usage guide
```

---

## ⚡ Quick Start Instructions

### 1. Install Dependencies

```bash
cd appium-tests
pip install -r requirements.txt
```

### 2. Run Test Suite & Generate Excel Report

- **Run in Dry-Run / Verification Mode** (Generates Excel Analysis Report without requiring a connected Android device):
  ```bash
  python run_appium_tests.py --dry-run
  ```

- **Run with Live Appium Server & Android Device / Emulator**:
  ```bash
  # 1. Start Appium Server
  appium --port 4723

  # 2. Execute Master Suite
  python run_appium_tests.py
  ```

---

## 📊 Generated Excel Report Features (`.xlsx`)

The generated Excel analysis report contains:

1. **Executive Summary Sheet**:
   - Title Banner & Execution Timestamp
   - Styled KPI Summary Blocks (Total Tests, Passed, Failed, Pass Rate %, Duration)
   - Category-Wise Execution Metrics Table
   - Embedded Status Distribution Chart

2. **Test Details & Logs Sheet**:
   - Color-coded pass/fail statuses
   - Execution duration per test
   - Error messages & failure tracebacks
   - Device screenshot file paths
