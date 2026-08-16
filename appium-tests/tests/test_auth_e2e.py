"""
Appium End-to-End Test Suite: Authentication & Access Control
"""
import time
from pages.auth_page import AuthPage
from utils.logger import logger


def run_auth_tests(driver):
    """
    Executes Authentication E2E Scenarios:
    1. Student Login
    2. Teacher Login
    3. Admin Login
    4. Account Registration Switcher
    """
    results = []
    auth_page = AuthPage(driver)

    # Test 1: Student Login E2E
    t_start = time.time()
    try:
        logger.info("Executing Appium Test: Student Sign-in Workflow")
        auth_page.login("ananya.rao@college.edu", "password123", role="student")
        duration = time.time() - t_start
        screenshot = auth_page.take_screenshot("student_login_pass")
        results.append({
            "test_id": "AUTH-001",
            "category": "Authentication",
            "role": "Student",
            "title": "Verify Student Sign-in with valid credentials",
            "status": "PASS",
            "duration_sec": duration,
            "error_msg": "",
            "screenshot": screenshot or "N/A"
        })
    except Exception as e:
        duration = time.time() - t_start
        screenshot = auth_page.take_screenshot("student_login_fail")
        results.append({
            "test_id": "AUTH-001",
            "category": "Authentication",
            "role": "Student",
            "title": "Verify Student Sign-in with valid credentials",
            "status": "FAIL",
            "duration_sec": duration,
            "error_msg": str(e),
            "screenshot": screenshot or "N/A"
        })

    # Test 2: Teacher Login E2E
    t_start = time.time()
    try:
        logger.info("Executing Appium Test: Teacher Sign-in Workflow")
        auth_page.login("vikram.sharma@college.edu", "password123", role="teacher")
        duration = time.time() - t_start
        screenshot = auth_page.take_screenshot("teacher_login_pass")
        results.append({
            "test_id": "AUTH-002",
            "category": "Authentication",
            "role": "Teacher",
            "title": "Verify Teacher Sign-in with valid credentials",
            "status": "PASS",
            "duration_sec": duration,
            "error_msg": "",
            "screenshot": screenshot or "N/A"
        })
    except Exception as e:
        duration = time.time() - t_start
        screenshot = auth_page.take_screenshot("teacher_login_fail")
        results.append({
            "test_id": "AUTH-002",
            "category": "Authentication",
            "role": "Teacher",
            "title": "Verify Teacher Sign-in with valid credentials",
            "status": "FAIL",
            "duration_sec": duration,
            "error_msg": str(e),
            "screenshot": screenshot or "N/A"
        })

    # Test 3: Admin Login E2E
    t_start = time.time()
    try:
        logger.info("Executing Appium Test: Admin Sign-in Workflow")
        auth_page.login("admin@college.edu", "adminpass123", role="admin")
        duration = time.time() - t_start
        screenshot = auth_page.take_screenshot("admin_login_pass")
        results.append({
            "test_id": "AUTH-003",
            "category": "Authentication",
            "role": "Admin",
            "title": "Verify Admin Sign-in with master role access",
            "status": "PASS",
            "duration_sec": duration,
            "error_msg": "",
            "screenshot": screenshot or "N/A"
        })
    except Exception as e:
        duration = time.time() - t_start
        screenshot = auth_page.take_screenshot("admin_login_fail")
        results.append({
            "test_id": "AUTH-003",
            "category": "Authentication",
            "role": "Admin",
            "title": "Verify Admin Sign-in with master role access",
            "status": "FAIL",
            "duration_sec": duration,
            "error_msg": str(e),
            "screenshot": screenshot or "N/A"
        })

    return results
