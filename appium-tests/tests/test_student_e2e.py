"""
Appium End-to-End Test Suite: Student Portal Workflow
"""
import time
from pages.student_page import StudentPage
from utils.logger import logger


def run_student_tests(driver):
    """
    Executes Student View E2E Scenarios:
    1. Faculty Directory Search & Filter
    2. Submit Meeting Request Modal Workflow
    """
    results = []
    student_page = StudentPage(driver)

    # Test 1: Faculty Search
    t_start = time.time()
    try:
        logger.info("Executing Appium Test: Faculty Directory Search")
        student_page.search_faculty("Vikram")
        duration = time.time() - t_start
        screenshot = student_page.take_screenshot("faculty_search_pass")
        results.append({
            "test_id": "STUDENT-001",
            "category": "Student Workflow",
            "role": "Student",
            "title": "Verify real-time Faculty Directory search filtering",
            "status": "PASS",
            "duration_sec": duration,
            "error_msg": "",
            "screenshot": screenshot or "N/A"
        })
    except Exception as e:
        duration = time.time() - t_start
        screenshot = student_page.take_screenshot("faculty_search_fail")
        results.append({
            "test_id": "STUDENT-001",
            "category": "Student Workflow",
            "role": "Student",
            "title": "Verify real-time Faculty Directory search filtering",
            "status": "FAIL",
            "duration_sec": duration,
            "error_msg": str(e),
            "screenshot": screenshot or "N/A"
        })

    # Test 2: Submit Meeting Request
    t_start = time.time()
    try:
        logger.info("Executing Appium Test: Submit Meeting Request Modal")
        student_page.request_meeting(topic="Appium Mobile Test Consultation", duration="15 mins")
        duration = time.time() - t_start
        screenshot = student_page.take_screenshot("request_meeting_pass")
        results.append({
            "test_id": "STUDENT-002",
            "category": "Student Workflow",
            "role": "Student",
            "title": "Verify End-to-End Meeting Request creation to Faculty",
            "status": "PASS",
            "duration_sec": duration,
            "error_msg": "",
            "screenshot": screenshot or "N/A"
        })
    except Exception as e:
        duration = time.time() - t_start
        screenshot = student_page.take_screenshot("request_meeting_fail")
        results.append({
            "test_id": "STUDENT-002",
            "category": "Student Workflow",
            "role": "Student",
            "title": "Verify End-to-End Meeting Request creation to Faculty",
            "status": "FAIL",
            "duration_sec": duration,
            "error_msg": str(e),
            "screenshot": screenshot or "N/A"
        })

    return results
