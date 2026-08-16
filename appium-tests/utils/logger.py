"""
Logger & Screenshot Utilities for Appium End-to-End Test Execution
"""
import os
import logging
from datetime import datetime

# Setup Log Directory
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports", "logs")
SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports", "screenshots")

os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

import sys

# Logger Configuration
log_file = os.path.join(LOG_DIR, f"appium_execution_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("AppiumE2E")


def capture_screenshot(driver, name="screenshot"):
    """
    Captures an Android device screenshot and saves it to reports/screenshots/
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
    filename = f"{name}_{timestamp}.png"
    filepath = os.path.join(SCREENSHOT_DIR, filename)
    try:
        if driver:
            driver.save_screenshot(filepath)
            logger.info(f"Screenshot captured: {filepath}")
            return filepath
    except Exception as e:
        logger.error(f"Failed to capture screenshot: {e}")
    return None
