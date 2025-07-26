const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const { KnownDevices } = require('puppeteer');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

require('dotenv').config();

puppeteer.use(StealthPlugin());

// --------- CONFIG ---------
const REPORT_URL = process.env.REPORT_URL;
const MAX_DESC_LENGTH = parseInt(process.env.MAX_DESC_LENGTH, 10) || 800;

// PROXY API CONFIG FROM .env
const PROXY_NEW_API = process.env.PROXY_NEW_API;
const PROXY_CURRENT_API = process.env.PROXY_CURRENT_API;
const PROXY_TOKEN = process.env.PROXY_TOKEN;

// --------- LOGGING SETUP ---------
const logStream = fs.createWriteStream('logs.txt', { flags: 'a' });
function logToBoth(type, ...args) {
    const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    const timestamp = new Date().toISOString();
    logStream.write(`[${timestamp}] [${type}] ${msg}\n`);
    if (type === 'ERROR') {
        process.stderr.write(msg + '\n');
    } else {
        process.stdout.write(msg + '\n');
    }
}
console.log = (...args) => logToBoth('INFO', ...args);
console.error = (...args) => logToBoth('ERROR', ...args);
console.warn = (...args) => logToBoth('WARN', ...args);


// --------- AI DESCRIPTION GENERATOR ---------
async function generateAIDescription(url) {
    const aiConfig = require('./ai.json');
    const roles = aiConfig.roles;
    const causes = aiConfig.causes;
    const tones = aiConfig.tones;



    const scenario = roles[Math.floor(Math.random() * roles.length)];
    const cause = causes[Math.floor(Math.random() * causes.length)];
    const tone = tones[Math.floor(Math.random() * tones.length)];

    const prompt = `${scenario}\nThe suspicious address ${url} is a phishing site pretending to be the official Google website. Please write in Vietnamese using a natural style, without markdown, special characters, or line breaks. The report should be a maximum of 800 characters and sound like it is submitted by a real person to Google. Follow the cause: ${cause} and tone: ${tone}.`;

    try {
        const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
        const apiKey = process.env.OPENROUTER_API_KEY;
        console.log('🧠 Generating AI description...');
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/gemma-3n-e4b-it:free',
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        let desc = data?.choices?.[0]?.message?.content || '';
        desc = desc.replace(/[*_`#>\-]/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

        const chars = Array.from(desc);
        if (!desc) {
            console.warn('⚠️ AI returned empty description, using fallback.');
        }
        return chars.length > MAX_DESC_LENGTH ? chars.slice(0, MAX_DESC_LENGTH).join('') : desc;
    } catch (err) {
        console.error('❌ AI generation failed, using fallback.');
        return 'Trang này có dấu hiệu lừa đảo và mạo danh 8Xbet. Giao diện giống thật nhưng tên miền không đúng. Có thể gây mất tài khoản hoặc tiền. Vui lòng kiểm tra và xử lý.'.slice(0, MAX_DESC_LENGTH);
    }
}


// --------- PROXY HELPERS ---------
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function requestNewProxy() {
    if (PROXY_NEW_API && PROXY_TOKEN) {
        const newProxyUrl = `${PROXY_NEW_API}?access_token=${PROXY_TOKEN}`;
        console.log('🌐 Requesting new proxy...');
        try {
            await fetch(newProxyUrl);
        } catch (err) {
            console.warn('⚠️ Could not request new proxy (may be rate limited), continuing with current proxy.');
        }
    }
}

async function getCurrentProxy() {
    let proxy = '';
    if (PROXY_CURRENT_API && PROXY_TOKEN) {
        const currentProxyUrl = `${PROXY_CURRENT_API}?access_token=${PROXY_TOKEN}`;
        console.log('🌐 Getting current proxy...');
        try {
            const resp = await fetch(currentProxyUrl);
            const proxyData = await resp.json();
            if (proxyData.status === 'success' && proxyData.data && proxyData.data.proxy) {
                proxy = proxyData.data.proxy;
                console.log(`🌍 Using proxy: ${proxy}`);
            } else {
                console.warn('⚠️ Could not get proxy, proceeding without proxy.');
            }
        } catch (err) {
            console.warn('⚠️ Error getting proxy, proceeding without proxy.');
        }
    }
    return proxy;
}

// --------- DEVICE EMULATION HELPER ---------
function getRandomDevice() {
    const deviceNames = require('./puppeteer.devices.json');
    const randomDeviceName = deviceNames[Math.floor(Math.random() * deviceNames.length)];
    return { name: randomDeviceName, device: KnownDevices[randomDeviceName] };
}

// --------- FORM SUBMITTER ---------
async function submitPhishingReport(url, description) {
    let browser;
    try {
        await requestNewProxy();
        const proxy = await getCurrentProxy();

        // Puppeteer launch args
        const launchArgs = ['--no-sandbox'];
        if (proxy) {
            launchArgs.push(`--proxy-server=${proxy}`);
        }
        console.log('🚀 Launching browser and opening report form...');
        browser = await puppeteer.launch({ headless: true, args: launchArgs });
        const page = await browser.newPage();

        // Device emulation
        const { name: deviceName, device } = getRandomDevice();
        if (device) {
            console.log(`📱 Emulating device: ${deviceName}`);
            await page.emulate(device);
        }

        await page.goto(REPORT_URL, { waitUntil: 'networkidle2' });

        // Scroll URL input into view
        await page.$eval('[formcontrolname="url"]', el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
        console.log('⌨️ Typing URL...');
        await typeLikeHuman(page, '[formcontrolname="url"]', url, 50, 150);

        // Scroll description input into view
        await page.$eval('[formcontrolname="details"]', el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
        console.log('⌨️ Typing description...');
        await typeLikeHuman(page, '[formcontrolname="details"]', description, 30, 90);

        // Wait a few seconds before clicking submit (2-4 seconds)
        console.log('⏳ Waiting before submitting...');
        await randomDelay(2000, 4000);

        // Scroll submit button into view
        await page.$eval('button[type="submit"]', el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
        console.log('📝 Clicking submit button...');
        await page.click('button[type="submit"]');

        // Wait for either success or failure message or timeout
        console.log('⏳ Waiting for submission to process and result...');
        try {
            const result = await page.waitForFunction(
                () => {
                    const successEl = document.querySelector('status-tile .mat-mdc-card-content.success.value');
                    if (successEl && successEl.textContent.includes('Đã gửi thành công.')) {
                        return 'success';
                    }
                    const failEl = document.querySelector('status-tile .mat-mdc-card-content.failure.value');
                    if (failEl && failEl.textContent.includes('An error occurred while sending. Please try again.')) {
                        return 'fail';
                    }
                    return null;
                },
                { timeout: 10000 }
            );
            const status = await result.jsonValue();
            if (status === 'success') {
                console.log('✅ Submission successful: Đã gửi thành công.');
            } else if (status === 'fail') {
                console.log('❌ Submission failed: An error occurred while sending. Please try again.');
            } else {
                console.log('❌ Submission result unknown.');
            }
        } catch (e) {
            console.log('❌ Submission may have failed or timed out (no result message detected).');
        }
    } catch (err) {
        console.error('❌ Proxy or browser error:', err);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// --------- HUMAN-LIKE TYPING ---------
async function typeLikeHuman(page, selector, text, minDelay = 30, maxDelay = 100) {
    await page.waitForSelector(selector);
    for (const char of text) {
        await page.type(selector, char);
        await randomDelay(minDelay, maxDelay);
    }
}

// --------- RANDOM DELAY ---------
function randomDelay(min, max) {
    return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
}

// --------- LOAD URL LIST ---------
function loadUrls(filePath = 'urls.txt') {
    return fs.readFileSync(filePath, 'utf-8')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
}

// --------- MAIN FUNCTION WITH LOG GROUPING ---------
(async () => {
    const urls = loadUrls();
    if (urls.length === 0) {
        console.error('⚠️ No URLs found in urls.txt. Exiting.');
        return;
    }

    let reportCount = 1;
    while (true) {
        const targetUrl = urls[Math.floor(Math.random() * urls.length)];
        const reportHeader = `\n==================== REPORT ${reportCount} ====================\n`;
        const reportFooter = `\n================ END REPORT ${reportCount} ================\n`;
        console.log(reportHeader);
        console.log(`📌 [${reportCount}] Đang báo cáo URL: ${targetUrl}`);
        const description = await generateAIDescription(targetUrl);
        if (description) {
            console.log('✍️ Mô tả AI sinh ra:', description);
        }
        await submitPhishingReport(targetUrl, description);
        console.log(reportFooter);
        console.log('\n⏳ Đợi 25-30 giây trước khi gửi báo cáo tiếp theo...\n');
        await randomDelay(25000, 30000);
        reportCount++;
    }
    // logStream.end();
})();
