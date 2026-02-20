# Privacy Policy for GPT Boost

_Last updated: February 20, 2026_

GPT Boost is designed with privacy as a top priority.  
This extension does **not** collect, store, transmit, or share any personal data.

## 🔒 Data Collection
GPT Boost collects **no data whatsoever**, including:

- No personal information  
- No browsing history  
- No authentication data  
- No chat content  
- No usage analytics  
- No device identifiers  
- No telemetry of any kind  

The extension contains **no tracking scripts**, **no analytics**, and **no external network requests**.

## 🧠 How the Extension Works
The extension operates entirely within the user’s browser.  
It enhances performance on ChatGPT by:

- Identifying message elements in the DOM  
- Replacing off-screen messages with placeholders  
- Restoring them automatically when needed  

All logic runs locally and never leaves the user’s device.

## 🔑 Permissions Explanation
The extension requires minimal permissions:

### `storage`
Used only to save the extension’s own settings (enabled/disabled, debug mode).  
No user data or chat contents are stored.

### `activeTab`
Used only so the popup can send messages to the content script on the current ChatGPT tab.  
No access to other websites.

### Host permissions (`https://chat.openai.com/*`, `https://chatgpt.com/*`)
Required to modify the ChatGPT page’s DOM for performance optimization.  
No data is collected or transmitted.

## 🌐 Data Transfer
GPT Boost does **not** send any data to any server.  
There are **no** external APIs, remote code, or cloud services.

## 🧱 Open Source
The full source code is available on GitHub:  
https://github.com/YOUR_USERNAME/gpt-boost

Anyone may review, audit, or fork the code.

## 📬 Contact
If you have privacy questions or concerns, please open an issue on GitHub.
