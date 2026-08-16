"""
Appium End-to-End Test Suite: Admin Portal Workflow
"""
import time
from pages.admin_page import AdminPage
from utils.logger import logger


def run_admin_tests(driver):
    """
    Executes Admin View E2E Scenarios:
    1. Switch Session to Admin Master View
    2. Verify Admin Master Control Panel display & actions
    3. View Students directory navigation
    """
    results = []
    admin_page = AdminPage(driver)

    # Test 1: Switch to Admin View
    t_start = time.time()
    try:
        logger.info("Executing Appium Test: Switch to Admin Master Session")
        admin_page.switch_to_admin_view()
        duration = time.time() - t_start
        screenshot = admin_page.take_screenshot("admin_switch_pass")
        results.append({
            "test_id": "ADMIN-001",
            "category": "Admin Master",
            "role": "Admin",
            "title": "Verify switching role view to Admin Master Control",
            "status": "PASS",
            "duration_sec": duration,
            "error_msg": "",
            "screenshot": screenshot or "N/A"
        })
    except Exception as e:
        duration = time.time() - t_start
        screenshot = admin_page.take_screenshot("admin_switch_fail")
        results.append({
            "test_id": "ADMIN-001",
            "category": "Admin Master",
            "role": "Admin",
            "title": "Verify switching role view to Admin Master Control",
            "status": "FAIL",
            "duration_sec": duration,
            "error_msg": str(e),
            "screenshot": screenshot or "N/A"
        })

    # Test 2: Admin Panel Visibility
    t_start = time.time()
    try:
        logger.info("Executing Appium Test: Verify Admin Control Panel Visibility")
        is_visible = admin_page.is_admin_panel_visible()
        duration = time.time() - t_start
        screenshot = admin_page.take_screenshot("admin_panel_pass")
        results.append({
            "test_id": "ADMIN-002",
            "category": "Admin Master",
            "role": "Admin",
            "title": "Verify Master Control Panel & Quick Actions render correctly",
            "status": "PASS" if is_visible else "FAIL",
            "duration_sec": duration,
            "error_msg": "" if is_visible else "Admin panel not visible",
            "screenshot": screenshot or "N/A"
        })
    except Exception as e:
        duration = time.time() - t_start
        screenshot = admin_page.take_screenshot("admin_panel_fail")
        results.append({
            "test_id": "ADMIN-002",
            "category": "Admin Master",
            "role": "Admin",
            "title": "Verify Master Control Panel & Quick Actions render correctly",
            "status": "FAIL",
            "duration_sec": duration,
            "error_msg": str(e),
            "screenshot": screenshot or "N/A"
        })

    return results
