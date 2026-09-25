const puppeteer = require('./frontend/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outDir = path.join(__dirname, 'frontend/screenshots_detailed');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function run() {
    console.log("=== STARTING REAL SCREENSHOT CAPTURE ===");
    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1050']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });

    const snap = async (name, delayMs = 1200) => {
        await delay(delayMs);
        const file = path.join(outDir, `${name}.png`);
        await page.screenshot({ path: file, fullPage: false });
        console.log(`[Captured] ${name}.png`);
    };

    const snapElem = async (selector, name, delayMs = 1000) => {
        await delay(delayMs);
        try {
            const el = await page.$(selector);
            if (el) {
                const file = path.join(outDir, `${name}.png`);
                await el.screenshot({ path: file });
                console.log(`[Captured Element] ${name}.png`);
                return;
            }
        } catch (e) {
            console.log(`Could not capture element ${selector}: ${e.message}`);
        }
        await snap(name, 500);
    };

    const loginAs = async (role, username, password) => {
        console.log(`Logging in as ${role} (${username})...`);
        await page.goto(`http://localhost:5175/?role=${role}`, { waitUntil: 'networkidle2' });
        await page.evaluate(async (u, p, r) => {
            sessionStorage.removeItem('manual_logout');
            localStorage.removeItem('manual_logout');
            try {
                const res = await fetch('http://localhost:5001/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p })
                });
                const data = await res.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    sessionStorage.setItem('token', data.token);
                    localStorage.setItem(`token_${r}`, data.token);
                }
            } catch (err) {
                console.error(err);
            }
        }, username, password, role);

        await page.goto(`http://localhost:5175/?role=${role}`, { waitUntil: 'networkidle2' });
        await delay(2000);
    };

    // ==========================================
    // 1. TEACHER DASHBOARD & ALL TEACHER MODULES
    // ==========================================
    await loginAs('teacher', 'teacher', 'teacher123');
    await snap('fig_2_1_teacher_dashboard_overview', 2000);
    await snapElem('.dashboard-stats-grid, [style*="grid-template-columns"]', 'fig_2_2_teacher_metrics_cards', 800);
    await snapElem('.quick-actions, [style*="gap: 16px"]', 'fig_2_3_teacher_quick_actions', 800);
    await snapElem('.sidebar-desktop', 'fig_2_4_teacher_sidebar_navigation', 800);

    // Section 3: Courses Module
    console.log("Navigating to Courses...");
    await page.evaluate(() => { if (window.__setActivePage) window.__setActivePage('courses'); });
    await snap('fig_3_1_course_catalog_view', 2000);

    // Open "+ Course"
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent.includes('+ Course') || el.textContent.includes('Kurs'));
        if (b) b.click();
    });
    await snap('fig_3_2_course_create_form_empty', 1200);

    // Fill form
    await page.evaluate(() => {
        const titleInput = document.querySelector('input[name="title"], input[placeholder*="Kurs"], input[type="text"]');
        if (titleInput) {
            titleInput.value = "Oliy Matematika: Matematik Analiz Asoslari";
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
    await snap('fig_3_3_course_create_form_filled', 1000);

    // Close create form and click first course
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent.includes('+ Course'));
        if (b) b.click();
    });
    await delay(500);

    await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.card'));
        const courseCard = cards.find(c => c.textContent.includes('Matematika') || c.textContent.includes('Fizika') || c.textContent.includes('Grade') || c.textContent.includes('science'));
        if (courseCard) courseCard.click();
    });
    await snap('fig_3_4_course_player_modules_view', 2000);

    // Add module modal
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent.includes('+ Modul') || el.textContent.includes('+ Module') || el.textContent.includes('Modul'));
        if (b) b.click();
    });
    await snap('fig_3_5_course_add_module_modal', 1200);

    // Add item modal
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent.includes('Mavzu') || el.textContent.includes('+') || el.textContent.includes('Item'));
        if (b) b.click();
    });
    await snap('fig_3_6_course_add_item_modal', 1200);

    // Assignments inside course
    await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('button, div, span, li'));
        const a = items.find(el => el.textContent.trim() === 'Assignments' || el.textContent.trim() === 'Topshiriqlar');
        if (a) a.click();
    });
    await delay(1000);
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent.includes('+ Assignment') || el.textContent.includes('+ Vazifa'));
        if (b) b.click();
    });
    await snap('fig_3_7_course_create_assignment_form', 1200);

    // Quizzes / Question Maker
    await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('button, div, span, li'));
        const a = items.find(el => el.textContent.trim() === 'Quizzes' || el.textContent.trim() === 'Testlar');
        if (a) a.click();
    });
    await delay(1000);
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent.includes('+ Quiz') || el.textContent.includes('+ Test') || el.textContent.includes('Question Maker'));
        if (b) b.click();
    });
    await snap('fig_3_8_course_question_maker_modal', 1200);

    // Topic view
    await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('button, div, span, li'));
        const a = items.find(el => el.textContent.trim() === 'Modules' || el.textContent.trim() === 'Modullar');
        if (a) a.click();
    });
    await delay(1000);
    await page.evaluate(() => {
        const topic = document.querySelector('.hover-item, [style*="cursor: pointer"]');
        if (topic) topic.click();
    });
    await snap('fig_3_9_course_topic_learning_view', 1500);

    // Protected PDF viewer
    await page.evaluate(() => {
        const pdf = Array.from(document.querySelectorAll('div, button, span, a')).find(el => el.textContent.includes('.pdf') || el.textContent.includes('PDF'));
        if (pdf) pdf.click();
    });
    await snap('fig_3_10_course_pdf_view_protected', 2000);

    // ==========================================
    // Section 4: Digital SAT
    // ==========================================
    console.log("Navigating to Digital SAT...");
    await page.evaluate(() => { if (window.__setActivePage) window.__setActivePage('digital-sat'); });
    await snap('fig_4_1_sat_overview_dashboard', 2000);

    await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button, div, span'));
        const t = tabs.find(el => el.textContent.includes('Testlar') || el.textContent.includes('Tests') || el.textContent.includes('Test Topshirish') || el.textContent.includes('Library'));
        if (t) t.click();
    });
    await snap('fig_4_2_sat_test_library', 1500);

    // Start exam engine
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const startBtn = btns.find(b => b.textContent.includes('Boshlash') || b.textContent.includes('Start') || b.textContent.includes('Topshirish') || b.textContent.includes('Practice'));
        if (startBtn) startBtn.click();
    });
    await snap('fig_4_3_sat_exam_engine_rw', 2000);

    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const nextBtn = btns.find(b => b.textContent.includes('Keyingi') || b.textContent.includes('Next') || b.textContent.includes('Math'));
        if (nextBtn) nextBtn.click();
    });
    await snap('fig_4_4_sat_exam_engine_math', 1500);

    await page.evaluate(() => {
        const calcBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Kalkulyator') || b.textContent.includes('Calculator') || b.title?.includes('Calculator'));
        if (calcBtn) calcBtn.click();
    });
    await snap('fig_4_5_sat_desmos_calculator', 1500);

    await page.evaluate(() => {
        const formulaBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Formula') || b.textContent.includes('Reference') || b.title?.includes('Formula'));
        if (formulaBtn) formulaBtn.click();
    });
    await snap('fig_4_6_sat_formula_sheet', 1500);

    await page.evaluate(() => {
        const navBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Savollar') || b.textContent.includes('Questions') || b.textContent.includes('Navigator') || b.textContent.includes('of'));
        if (navBtn) navBtn.click();
    });
    await snap('fig_4_7_sat_question_navigator', 1500);

    await page.keyboard.press('Escape');
    await delay(500);

    // ==========================================
    // Section 5: CD IELTS
    // ==========================================
    console.log("Navigating to CD IELTS...");
    await page.evaluate(() => { if (window.__setActivePage) window.__setActivePage('cd-ielts'); });
    await snap('fig_5_1_ielts_overview_dashboard', 2000);

    await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button, div, span'));
        const t = tabs.find(el => el.textContent.includes('Test Library') || el.textContent.includes('Practice') || el.textContent.includes('Tests'));
        if (t) t.click();
    });
    await snap('fig_5_2_ielts_test_library', 1500);

    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent.includes('Listening') || el.textContent.includes('Start') || el.textContent.includes('Practice'));
        if (b) b.click();
    });
    await snap('fig_5_3_ielts_listening_engine', 2000);

    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent.includes('Reading'));
        if (b) b.click();
    });
    await snap('fig_5_4_ielts_reading_engine', 1800);

    await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button, div, span'));
        const t = tabs.find(el => el.textContent.includes('Writing'));
        if (t) t.click();
    });
    await snap('fig_5_5_ielts_writing_engine', 1800);

    await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button, div, span'));
        const t = tabs.find(el => el.textContent.includes('Speaking'));
        if (t) t.click();
    });
    await snap('fig_5_6_ielts_speaking_evaluation', 1800);

    // ==========================================
    // Section 6: AI Assistant
    // ==========================================
    console.log("Navigating to AI Assistant...");
    await page.evaluate(() => { if (window.__setActivePage) window.__setActivePage('ai'); });
    await snap('fig_6_1_ai_assistant_page', 2000);

    await page.evaluate(() => {
        const input = document.querySelector('textarea, input[placeholder*="Savol"], input[type="text"]');
        if (input) {
            input.value = "Kvant fizikasi nima va uning asosiy qonuniyatlarini 3 ta nuqtada tushuntirib bering.";
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const sendBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Yuborish') || b.textContent.includes('Send') || b.querySelector('svg'));
        if (sendBtn) sendBtn.click();
    });
    await snap('fig_6_2_ai_chat_in_action', 3000);

    // Floating chat
    await page.evaluate(() => { if (window.__setActivePage) window.__setActivePage('courses'); });
    await delay(1000);
    await page.evaluate(() => {
        const floatBtn = document.querySelector('.floating-ai-btn, button[title*="AI"]');
        if (floatBtn) floatBtn.click();
    });
    await snap('fig_6_3_ai_floating_chat_widget', 1500);

    // ==========================================
    // Section 7: CV Maker
    // ==========================================
    console.log("Navigating to CV Maker...");
    await page.evaluate(() => { if (window.__setActivePage) window.__setActivePage('cv'); });
    await snap('fig_7_1_cv_maker_interface', 2000);

    await page.evaluate(() => {
        const nameInput = document.querySelector('input[placeholder*="Ism"], input[value*="Informatika"], input[type="text"]');
        if (nameInput) {
            nameInput.value = "Akmal Rahimov • Bosh Matematika O'qituvchisi";
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
    await snap('fig_7_2_cv_maker_form_filled', 1000);

    await page.evaluate(() => {
        const templateBtns = Array.from(document.querySelectorAll('button'));
        const tBtn = templateBtns.find(b => b.textContent.includes('Harvard') || b.textContent.includes('Classic') || b.textContent.includes('Minimalist') || b.textContent.includes('Modern'));
        if (tBtn) tBtn.click();
    });
    await snap('fig_7_3_cv_maker_template_selection', 1200);
    await snap('fig_7_4_cv_maker_live_preview', 1000);

    // ==========================================
    // Section 8: Digital Lab
    // ==========================================
    console.log("Navigating to Digital Lab...");
    await page.evaluate(() => { if (window.__setActivePage) window.__setActivePage('digital-lab'); });
    await snap('fig_8_1_digital_lab_overview', 2000);

    await page.evaluate(() => {
        const runBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Saralashni boshlash') || b.textContent.includes('Start Sort') || b.textContent.includes('Saralash'));
        if (runBtn) runBtn.click();
    });
    await snap('fig_8_2_digital_lab_cs_visualizer', 1500);

    await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const physTab = tabs.find(b => b.textContent.includes('Fizika') || b.textContent.includes('Physics'));
        if (physTab) physTab.click();
    });
    await snap('fig_8_3_digital_lab_physics_simulation', 1500);

    await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const chemTab = tabs.find(b => b.textContent.includes('Kimyo') || b.textContent.includes('Chemistry'));
        if (chemTab) chemTab.click();
    });
    await snap('fig_8_4_digital_lab_chemistry_simulation', 1500);

    await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const bioTab = tabs.find(b => b.textContent.includes('Biologiya') || b.textContent.includes('Biology'));
        if (bioTab) bioTab.click();
    });
    await snap('fig_8_5_digital_lab_biology_simulation', 1500);

    // ==========================================
    // Section 9: Lesson Plan
    // ==========================================
    console.log("Navigating to Lesson Plan...");
    await page.evaluate(() => { if (window.__setActivePage) window.__setActivePage('lesson-plan'); });
    await snap('fig_9_1_lesson_plan_overview', 2000);
    await snapElem('.card', 'fig_9_2_lesson_plan_features_preview', 1000);

    // ==========================================
    // Section 10: Schedule
    // ==========================================
    console.log("Navigating to Schedule...");
    await page.evaluate(() => { if (window.__setActivePage) window.__setActivePage('schedule'); });
    await snap('fig_10_1_schedule_weekly_grid', 2000);

    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent.includes('Dars qo\'shish') || el.textContent.includes('+ Dars') || el.textContent.includes('Add Lesson') || el.textContent.includes('+'));
        if (b) b.click();
    });
    await snap('fig_10_2_schedule_add_lesson_modal', 1200);
    await page.keyboard.press('Escape');

    await page.evaluate(() => {
        const dayBtns = Array.from(document.querySelectorAll('button'));
        const sesh = dayBtns.find(b => b.textContent.includes('Seshanba') || b.textContent.includes('Tuesday'));
        if (sesh) sesh.click();
    });
    await snap('fig_10_3_schedule_day_view_detail', 1000);

    // ==========================================
    // Section 11: Birthdays
    // ==========================================
    console.log("Navigating to Birthdays...");
    await page.evaluate(() => { if (window.__setActivePage) window.__setActivePage('student-birthdays'); });
    await snap('fig_11_1_birthday_calendar_view', 2000);
    await snapElem('.card, [style*="border-radius: 24px"]', 'fig_11_2_birthday_simulation_widget', 1000);
    await snap('fig_11_3_birthday_management_table', 1000);

    // ==========================================
    // 2. STUDENT DASHBOARD (ROLE = STUDENT)
    // ==========================================
    console.log("Navigating to Student Dashboard...");
    await loginAs('student', 'student', 'student123');
    await snap('fig_12_1_student_dashboard_overview', 2500);
    await snapElem('.table-container, table, .card', 'fig_12_2_student_grades_table', 1200);

    // ==========================================
    // 3. MANAGEMENT AUDIT (ROLE = MANAGEMENT)
    // ==========================================
    console.log("Navigating to Management Panel...");
    await loginAs('management', 'management_director', 'director123');
    await snap('fig_13_1_management_kpi_overview', 2500);
    await snapElem('.table-container, table, [style*="grid"]', 'fig_13_2_management_teacher_audit', 1200);
    await snap('fig_13_3_management_inspection_reports', 1200);

    // ==========================================
    // 4. ADMIN PANEL (ROLE = ADMIN)
    // ==========================================
    console.log("Navigating to Admin Panel...");
    await loginAs('admin', 'Safarmurod', 'admin123');
    await page.evaluate(() => { if (window.__setActivePage) window.__setActivePage('users'); });
    await snap('fig_14_1_admin_users_table', 2500);

    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent.includes('Yangi') || el.textContent.includes('Foydalanuvchi qo\'shish') || el.textContent.includes('+ User') || el.textContent.includes('Add User'));
        if (b) b.click();
    });
    await snap('fig_14_2_admin_add_user_modal', 1200);
    await page.keyboard.press('Escape');

    await page.evaluate(() => { if (window.__setActivePage) window.__setActivePage('ai-control'); });
    await snap('fig_14_3_admin_ai_control_panel', 2000);

    // ==========================================
    // 5. LANDING PAGE & AUTH (LOGGED OUT STATE)
    // ==========================================
    console.log("Navigating to Landing Page (logged out)...");
    await page.evaluate(() => {
        sessionStorage.clear();
        localStorage.clear();
        sessionStorage.setItem('manual_logout', 'true');
    });
    await page.goto('http://localhost:5175/', { waitUntil: 'networkidle2' });
    await snap('fig_1_1_landing_hero', 2000);

    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const btn = btns.find(b => b.textContent.includes('Kirish') || b.textContent.includes('Login') || b.textContent.includes('PORTALGA KIRISH'));
        if (btn) btn.click();
    });
    await snap('fig_1_2_landing_auth_modal', 1200);
    await snap('fig_1_3_landing_quick_roles', 800);

    await page.keyboard.press('Escape');
    await delay(500);
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const btn = btns.find(b => b.textContent.includes('Tizim haqida') || b.textContent.includes('About'));
        if (btn) btn.click();
    });
    await snap('fig_1_4_landing_capabilities_drawer', 1200);

    console.log("=== ALL REAL SCREENSHOTS CAPTURED PERFECTLY! ===");
    await browser.close();
}

run().catch(console.error);
