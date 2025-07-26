# Google Phishing Report Automation

This project automates the process of reporting competitor or spammy domains to Google Safe Browsing as phishing sites. The goal is to help SEO professionals and webmasters protect their rankings by flagging malicious or unfair competitor domains, or spammy sites, as phishing to Google.

## ⚠️ Disclaimer
This tool is for educational and research purposes only. Misuse of this tool to submit false reports or harm legitimate websites is unethical and may violate laws or Google's terms of service. Use responsibly and at your own risk.

## Features
- Automated submission of phishing reports to Google Safe Browsing
- AI-generated, human-like, Vietnamese-language complaint descriptions
- Proxy rotation and device emulation for stealth and realism
- Configurable via `.env` and JSON config files
- Logs all actions to `logs.txt` and the console, grouped by report
- Runs infinitely until manually stopped (Ctrl+C or pm2 stop)

## How It Works
1. Reads a list of target URLs from `urls.txt`
2. For each report:
   - Rotates proxy and emulates a random device
   - Generates a unique, human-like complaint using AI
   - Submits the phishing report to Google
   - Logs the process and result
3. Waits 25-30 seconds between reports to avoid rate limits

## Setup
1. **Clone the repository:**
   ```sh
   git clone https://github.com/iamsajidjaved/report_phish.git
   cd report_phish
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure environment:**
   - Copy `.env.example` to `.env` and fill in your API keys and proxy info
   - Edit `urls.txt` to add the domains you want to report
   - (Optional) Edit `config.ai.json` and `puppeteer.devices.json` for custom AI prompts and device profiles

## Usage
### Run in foreground (manual stop with Ctrl+C):
```sh
node report.js
```

### Run in background with pm2 and xvfb-run (recommended for servers):
```sh
bash start-pm2.sh
```
- This uses `pm2` and `xvfb-run` to keep the script running in the background, even if you log out.
- Stop with: `pm2 stop report_phish`
- View logs: `pm2 logs report_phish`

- All logs will be saved to `logs.txt` and printed to the console.
- Each report uses a new browser session, proxy, and device profile.

## Configuration Files
- `.env` — API keys, proxy endpoints, and Google report URL
- `urls.txt` — List of target URLs (one per line)
- `ai.json` — AI prompt roles, causes, and tones
- `puppeteer.devices.json` — List of device profiles for emulation

## Ethical Use
This tool is intended for defending against spam and malicious competitors. Do not use it to attack legitimate businesses or for black-hat SEO. Always comply with local laws and Google's terms of service.

## License
MIT
