"""
Page Object Model for CampusConnect Authentication Screen
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class AuthPage(BasePage):
    # Locators
    AUTH_STAGE = (By.ID, "authStage")
    ROLE_STUDENT_BTN = (By.CSS_SELECTOR, ".role-toggle button[data-role='student']")
    ROLE_TEACHER_BTN = (By.CSS_SELECTOR, ".role-toggle button[data-role='teacher']")
    ROLE_ADMIN_BTN = (By.CSS_SELECTOR, ".role-toggle button[data-role='admin']")

    MODE_SIGNIN_BTN = (By.CSS_SELECTOR, ".mode-toggle button[data-mode='login']")
    MODE_REGISTER_BTN = (By.CSS_SELECTOR, ".mode-toggle button[data-mode='register']")

    FULLNAME_INPUT = (By.ID, "name")
    EMAIL_INPUT = (By.ID, "email")
    PASSWORD_INPUT = (By.ID, "password")
    DEPT_SELECT = (By.ID, "deptSelect")
    SUBMIT_BTN = (By.ID, "submitBtn")
    CARD_TITLE = (By.ID, "cardTitle")

    def select_role(self, role):
        """Selects Student, Teacher, or Admin role tab"""
        role = role.lower()
        if role == "student":
            self.click(*self.ROLE_STUDENT_BTN)
        elif role == "teacher":
            self.click(*self.ROLE_TEACHER_BTN)
        elif role == "admin":
            self.click(*self.ROLE_ADMIN_BTN)

    def switch_mode(self, mode):
        """Switches between login and register modes"""
        if mode == "register":
            self.click(*self.MODE_REGISTER_BTN)
        else:
            self.click(*self.MODE_SIGNIN_BTN)

    def login(self, email, password, role="student"):
        """Performs login workflow"""
        self.select_role(role)
        self.switch_mode("login")
        self.send_keys(*self.EMAIL_INPUT, email)
        self.send_keys(*self.PASSWORD_INPUT, password)
        self.click(*self.SUBMIT_BTN)

    def register(self, fullname, email, password, role="student", dept="Computer Science"):
        """Performs account registration workflow"""
        self.select_role(role)
        self.switch_mode("register")
        self.send_keys(*self.FULLNAME_INPUT, fullname)
        self.send_keys(*self.EMAIL_INPUT, email)
        self.send_keys(*self.PASSWORD_INPUT, password)
        self.click(*self.SUBMIT_BTN)
