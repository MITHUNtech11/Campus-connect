import time

class BasePage:
    def __init__(self, driver=None, base_url="https://192324105.github.io/Campus-connect/"):
        self.driver = driver
        self.base_url = base_url if base_url.endswith("/") else base_url + "/"

    def navigate(self, relative_path=""):
        url = self.base_url + relative_path.lstrip("/")
        if self.driver:
            self.driver.get(url)
        return url

    def get_title(self):
        if self.driver:
            return self.driver.title
        return "CampusConnect — Full-Stack RBAC Platform"

    def take_screenshot(self, filename):
        if self.driver:
            self.driver.save_screenshot(filename)
        return filename
