"""
Page Object Model for CampusConnect Student Dashboard View
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class StudentPage(BasePage):
    # Locators
    DASHBOARD_STAGE = (By.ID, "dashboardApp")
    SEARCH_INPUT = (By.ID, "searchInput")
    NAV_FACULTY_TAB = (By.CSS_SELECTOR, ".nav-item[data-tab='directory']")
    NAV_REQUESTS_TAB = (By.CSS_SELECTOR, ".nav-item[data-tab='requests']")

    FACULTY_CARDS = (By.CSS_SELECTOR, ".fac-card")
    REQUEST_MEETING_BTNS = (By.CSS_SELECTOR, ".action-btn.req")

    # Modal Locators
    REQUEST_MODAL = (By.ID, "requestModal")
    MODAL_TOPIC_INPUT = (By.ID, "reqTopic")
    MODAL_DURATION_SELECT = (By.ID, "reqDuration")
    MODAL_SUBMIT_BTN = (By.ID, "submitRequestBtn")

    # Theme Switcher Chips
    THEME_EMERALD = (By.CSS_SELECTOR, ".theme-chip[data-theme-set='emerald']")
    THEME_AURORA = (By.CSS_SELECTOR, ".theme-chip[data-theme-set='aurora']")
    THEME_ACID = (By.CSS_SELECTOR, ".theme-chip[data-theme-set='acid-lime']")
    THEME_SAPPHIRE = (By.CSS_SELECTOR, ".theme-chip[data-theme-set='sapphire-gold']")

    def search_faculty(self, query):
        """Searches for faculty members by name or department"""
        self.send_keys(*self.SEARCH_INPUT, query)

    def request_meeting(self, topic="Project Consultation", duration="15 mins"):
        """Opens request modal and submits a meeting request"""
        self.click(*self.NAV_FACULTY_TAB)
        if self.is_displayed(*self.REQUEST_MEETING_BTNS):
            self.click(*self.REQUEST_MEETING_BTNS)
            self.send_keys(*self.MODAL_TOPIC_INPUT, topic)
            self.click(*self.MODAL_SUBMIT_BTN)
            return True
        return False

    def switch_theme(self, theme_name):
        """Switches visual theme via navigation theme bar"""
        theme_name = theme_name.lower()
        if "aurora" in theme_name:
            self.click(*self.THEME_AURORA)
        elif "acid" in theme_name or "lime" in theme_name:
            self.click(*self.THEME_ACID)
        elif "sapphire" in theme_name or "gold" in theme_name:
            self.click(*self.THEME_SAPPHIRE)
        else:
            self.click(*self.THEME_EMERALD)
