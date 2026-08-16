"""
Page Object Model for CampusConnect Admin Master Control View
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class AdminPage(BasePage):
    # Locators
    PROFILE_DROPDOWN_BTN = (By.ID, "profileBtn")
    SWITCH_TO_ADMIN_BTN = (By.ID, "switchRoleAdminBtn")

    ADMIN_CONTROL_PANEL = (By.CSS_SELECTOR, ".admin-control-panel")
    ADD_FACULTY_BTN = (By.ID, "adminAddFacBtn")
    OVERRIDE_STATUS_BTN = (By.ID, "adminOverrideBtn")
    EXPORT_LOGS_BTN = (By.ID, "adminExportBtn")

    NAV_STUDENTS_TAB = (By.ID, "sideStudentsNavItem")

    def switch_to_admin_view(self):
        """Switches session to Admin Master View"""
        self.click(*self.PROFILE_DROPDOWN_BTN)
        self.click(*self.SWITCH_TO_ADMIN_BTN)

    def is_admin_panel_visible(self):
        """Verifies if admin control panel is displayed"""
        return self.is_displayed(*self.ADMIN_CONTROL_PANEL)

    def view_all_students(self):
        """Navigates to Students Directory view"""
        self.click(*self.NAV_STUDENTS_TAB)
