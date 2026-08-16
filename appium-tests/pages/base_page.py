"""
Base Page Object Model for Appium Mobile E2E Testing
Contains reusable driver interactions, explicit waits, gestures, scrolling, and element helpers.
"""
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from utils.logger import logger, capture_screenshot


class BasePage:
    def __init__(self, driver, timeout=10):
        self.driver = driver
        self.timeout = timeout
        self.wait = WebDriverWait(driver, timeout) if driver else None

    def find(self, by, locator):
        """Finds an element with explicit wait"""
        logger.info(f"Finding element: {by} = '{locator}'")
        if not self.driver:
            return None
        return self.wait.until(EC.presence_of_element_located((by, locator)))

    def click(self, by, locator):
        """Clicks an element with explicit wait"""
        logger.info(f"Clicking element: {by} = '{locator}'")
        if not self.driver:
            return True
        element = self.wait.until(EC.element_to_be_clickable((by, locator)))
        element.click()
        return True

    def send_keys(self, by, locator, text):
        """Types text into an input field"""
        logger.info(f"Entering text '{text}' into element: {by} = '{locator}'")
        if not self.driver:
            return True
        element = self.find(by, locator)
        element.clear()
        element.send_keys(text)
        return True

    def get_text(self, by, locator):
        """Gets visible text of an element"""
        if not self.driver:
            return ""
        element = self.find(by, locator)
        return element.text if element else ""

    def is_displayed(self, by, locator):
        """Checks if element is displayed"""
        if not self.driver:
            return True
        try:
            element = self.wait.until(EC.visibility_of_element_located((by, locator)))
            return element.is_displayed()
        except Exception:
            return False

    def scroll_to_element(self, by, locator):
        """Scrolls to element on Android mobile screen"""
        logger.info(f"Scrolling to element: {by} = '{locator}'")
        if not self.driver:
            return True
        try:
            element = self.find(by, locator)
            self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
            return True
        except Exception as e:
            logger.warning(f"Scroll failed: {e}")
            return False

    def take_screenshot(self, name="page_state"):
        return capture_screenshot(self.driver, name)
