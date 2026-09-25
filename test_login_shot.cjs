const puppeteer = require('./frontend/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function test() {
    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1050']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000 });

    console.log("Navigating to teacher login...");
    await page.goto('http://localhost:5175/?role=teacher', { waitUntil: 'networkidle2' });
    
    // Explicitly authenticate via API in page context
    await page.evaluate(async () => {
        sessionStorage.removeItem('manual_logout');
        localStorage.removeItem('manual_logout');
        const res = await fetch('http://localhost:5001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'teacher', password: 'teacher123' })
        });
        const data = await res.json();
        console.log("Login res:", data);
        if (data.token) {
            localStorage.setItem('token', data.token);
            sessionStorage.setItem('token', data.token);
            localStorage.setItem('token_teacher', data.token);
        }
    });

    await page.goto('http://localhost:5175/?role=teacher', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2500));

    await page.screenshot({ path: path.join(__dirname, 'test_real_teacher.png') });
    console.log("Saved test_real_teacher.png");

    await browser.close();
}

test().catch(console.error);
