"""
Page Object Model for CampusConnect Teacher Dashboard View
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class TeacherPage(BasePage):
    # Locators
    PROFILE_DROPDOWN_BTN = (By.ID, "profileBtn")
    SWITCH_TO_TEACHER_BTN = (By.ID, "switchRoleTeacherBtn")

    STATUS_AVAIL_BTN = (By.CSS_SELECTOR, ".status-opt-btn[data-status='Available']")
    STATUS_OFFICE_BTN = (By.CSS_SELECTOR, ".status-opt-btn[data-status='Office Hours']")
    STATUS_CLASS_BTN = (By.CSS_SELECTOR, ".status-opt-btn[data-status='In Class']")

    LOCATION_INPUT = (By.ID, "teacherRoomInput")
    UPDATE_STATUS_BTN = (By.ID, "updateStatusBtn")

    NAV_REQUESTS_TAB = (By.CSS_SELECTOR, ".nav-item[data-tab='requests']")
    ACCEPT_REQ_BTNS = (By.CSS_SELECTOR, ".req-action.accept")
    REJECT_REQ_BTNS = (By.CSS_SELECTOR, ".req-action.reject")

    def switch_to_teacher_view(self):
        """Switches user session to Teacher View"""
        self.click(*self.PROFILE_DROPDOWN_BTN)
        self.click(*self.SWITCH_TO_TEACHER_BTN)

    def set_status(self, status_type="Available", location="Block C - Room 302"):
        """Updates teacher availability status and room location"""
        if status_type == "Available":
            self.click(*self.STATUS_AVAIL_BTN)
        elif status_type == "Office Hours":
            self.click(*self.STATUS_OFFICE_BTN)
        elif status_type == "In Class":
            self.click(*self.STATUS_CLASS_BTN)

        self.send_keys(*self.LOCATION_INPUT, location)
        self.click(*self.UPDATE_STATUS_BTN)

    def respond_to_request(self, accept=True):
        """Accepts or rejects student meeting requests"""
        self.click(*self.NAV_REQUESTS_TAB)
        if accept and self.is_displayed(*self.ACCEPT_REQ_BTNS):
            self.click(*self.ACCEPT_REQ_BTNS)
        elif not accept and self.is_displayed(*self.REJECT_REQ_BTNS):
            self.click(*self.REJECT_REQ_BTNS)
