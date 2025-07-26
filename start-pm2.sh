#!/bin/bash
# Start the infinite Google phishing report script with pm2 using xvfb-run for headless display
pm2 start "xvfb-run --auto-servernum --server-args='-screen 0 1280x1024x24' node report.js" --name report_phish --interpreter=bash
