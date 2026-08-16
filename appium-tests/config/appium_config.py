"""
Appium Capabilities & Configuration Settings for Android E2E Mobile Testing
"""
import os

APPIUM_SERVER_URL = os.getenv("APPIUM_SERVER_URL", "http://127.0.0.1:4723")

# Default Android Capabilities for Mobile Web (Chrome) & Hybrid App Testing
ANDROID_CHROME_CAPS = {
    "platformName": "Android",
    "automationName": "UiAutomator2",
    "deviceName": os.getenv("ANDROID_DEVICE_NAME", "Android Emulator"),
    "browserName": "Chrome",
    "chromedriverAutodownload": True,
    "newCommandTimeout": 300,
    "noReset": False,
    "goog:chromeOptions": {
        "args": [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--ignore-certificate-errors",
            "--allow-insecure-localhost"
        ]
    }
}

# Android Native / APK Capabilities Template
ANDROID_NATIVE_CAPS = {
    "platformName": "Android",
    "automationName": "UiAutomator2",
    "deviceName": os.getenv("ANDROID_DEVICE_NAME", "Android Emulator"),
    "app": os.getenv("ANDROID_APK_PATH", os.path.abspath("./app-release.apk")),
    "appPackage": "com.campusconnect.app",
    "appActivity": ".MainActivity",
    "newCommandTimeout": 300,
    "autoGrantPermissions": True
}

# App Test Configuration Target URL
TEST_APP_URL = os.getenv("TEST_APP_URL", "http://localhost:5173")
