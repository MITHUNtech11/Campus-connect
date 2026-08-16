import os

class Config:
    # Base URL for Live GitHub Pages Deployment (No localhost allowed)
    DEFAULT_BASE_URL = "https://192324105.github.io/Campus-connect/"
    BASE_URL = os.environ.get("BASE_URL", DEFAULT_BASE_URL)
    if not BASE_URL.endswith("/"):
        BASE_URL += "/"

    BROWSER = os.environ.get("BROWSER", "chrome")
    HEADLESS = os.environ.get("HEADLESS", "true").lower() == "true"
    IMPLICIT_WAIT = int(os.environ.get("IMPLICIT_WAIT", 10))
    EXPLICIT_WAIT = int(os.environ.get("EXPLICIT_WAIT", 15))

    # Directories
    ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    REPORTS_DIR = os.path.join(ROOT_DIR, "reports")
    SCREENSHOTS_DIR = os.path.join(ROOT_DIR, "screenshots")
    LOGS_DIR = os.path.join(ROOT_DIR, "logs")
    DATA_DIR = os.path.join(ROOT_DIR, "data")

    @classmethod
    def ensure_directories(cls):
        for path in [cls.REPORTS_DIR, cls.SCREENSHOTS_DIR, cls.LOGS_DIR, cls.DATA_DIR]:
            os.makedirs(path, exist_ok=True)
            os.makedirs(os.path.join(path, "Excel"), exist_ok=True)
            os.makedirs(os.path.join(path, "HTML"), exist_ok=True)
            os.makedirs(os.path.join(path, "JSON"), exist_ok=True)
            os.makedirs(os.path.join(path, "Summary"), exist_ok=True)
