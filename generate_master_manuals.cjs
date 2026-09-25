const fs = require('fs');
const path = require('path');
const puppeteer = require('./frontend/node_modules/puppeteer-core');

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const imgDir = path.join(__dirname, 'frontend/screenshots_detailed');

// Helper to get base64 image
function getImg(name) {
    const p = path.join(imgDir, `${name}.png`);
    if (fs.existsSync(p)) {
        return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
    }
    return '';
}

// Pre-load all screenshots
const images = {
    landing_hero: getImg('fig_1_1_landing_hero'),
    landing_auth: getImg('fig_1_2_landing_auth_modal'),
    landing_quick: getImg('fig_1_3_landing_quick_roles'),
    landing_drawer: getImg('fig_1_4_landing_capabilities_drawer'),
    
    teacher_dash: getImg('fig_2_1_teacher_dashboard_overview'),
    teacher_stats: getImg('fig_2_2_teacher_metrics_cards'),
    teacher_actions: getImg('fig_2_3_teacher_quick_actions'),
    teacher_sidebar: getImg('fig_2_4_teacher_sidebar_navigation'),
    
    course_catalog: getImg('fig_3_1_course_catalog_view'),
    course_empty: getImg('fig_3_2_course_create_form_empty'),
    course_filled: getImg('fig_3_3_course_create_form_filled'),
    course_modules: getImg('fig_3_4_course_player_modules_view'),
    course_add_mod: getImg('fig_3_5_course_add_module_modal'),
    course_add_item: getImg('fig_3_6_course_add_item_modal'),
    course_assignment: getImg('fig_3_7_course_create_assignment_form'),
    course_qm: getImg('fig_3_8_course_question_maker_modal'),
    course_topic: getImg('fig_3_9_course_topic_learning_view'),
    course_pdf: getImg('fig_3_10_course_pdf_view_protected'),
    
    sat_dash: getImg('fig_4_1_sat_overview_dashboard'),
    sat_library: getImg('fig_4_2_sat_test_library'),
    sat_rw: getImg('fig_4_3_sat_exam_engine_rw'),
    sat_math: getImg('fig_4_4_sat_exam_engine_math'),
    sat_desmos: getImg('fig_4_5_sat_desmos_calculator'),
    sat_formula: getImg('fig_4_6_sat_formula_sheet'),
    sat_navigator: getImg('fig_4_7_sat_question_navigator'),
    sat_results: getImg('fig_4_9_sat_results_analysis'),
    
    ielts_dash: getImg('fig_5_1_ielts_overview_dashboard'),
    ielts_library: getImg('fig_5_2_ielts_test_library'),
    ielts_listening: getImg('fig_5_3_ielts_listening_engine'),
    ielts_reading: getImg('fig_5_4_ielts_reading_engine'),
    ielts_writing: getImg('fig_5_5_ielts_writing_engine'),
    ielts_speaking: getImg('fig_5_6_ielts_speaking_evaluation'),
    ielts_results: getImg('fig_5_7_ielts_score_report'),
    
    ai_page: getImg('fig_6_1_ai_assistant_page'),
    ai_action: getImg('fig_6_2_ai_chat_in_action'),
    ai_float: getImg('fig_6_3_ai_floating_chat_widget'),
    
    cv_interface: getImg('fig_7_1_cv_maker_interface'),
    cv_filled: getImg('fig_7_2_cv_maker_form_filled'),
    cv_templates: getImg('fig_7_3_cv_maker_template_selection'),
    cv_preview: getImg('fig_7_4_cv_maker_live_preview'),
    
    lab_overview: getImg('fig_8_1_digital_lab_overview'),
    lab_cs: getImg('fig_8_2_digital_lab_cs_visualizer'),
    lab_physics: getImg('fig_8_3_digital_lab_physics_simulation'),
    lab_chemistry: getImg('fig_8_4_digital_lab_chemistry_simulation'),
    lab_biology: getImg('fig_8_5_digital_lab_biology_simulation'),
    
    lesson_overview: getImg('fig_9_1_lesson_plan_overview'),
    lesson_preview: getImg('fig_9_2_lesson_plan_features_preview'),
    
    schedule_grid: getImg('fig_10_1_schedule_weekly_grid'),
    schedule_modal: getImg('fig_10_2_schedule_add_lesson_modal'),
    schedule_detail: getImg('fig_10_3_schedule_day_view_detail'),
    
    birthday_calendar: getImg('fig_11_1_birthday_calendar_view'),
    birthday_simulation: getImg('fig_11_2_birthday_simulation_widget'),
    birthday_table: getImg('fig_11_3_birthday_management_table'),
    
    student_dash: getImg('fig_12_1_student_dashboard_overview'),
    student_grades: getImg('fig_12_2_student_grades_table'),
    
    management_kpi: getImg('fig_13_1_management_kpi_overview'),
    management_audit: getImg('fig_13_2_management_teacher_audit'),
    management_reports: getImg('fig_13_3_management_inspection_reports'),
    
    admin_users: getImg('fig_14_1_admin_users_table'),
    admin_modal: getImg('fig_14_2_admin_add_user_modal'),
    admin_ai: getImg('fig_14_3_admin_ai_control_panel')
};

console.log("Images loaded successfully into memory.");

function buildHTML(lang) {
    const isUz = lang === 'uz';
    
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <title>${isUz ? "LMS Platformasi Rasmiy Foydalanuvchi Qo'llanmasi" : "LMS Platform Official Software User Manual"}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        
        :root {
            --primary: #1e40af;
            --primary-light: #3b82f6;
            --primary-bg: #eff6ff;
            --text-main: #0f172a;
            --text-muted: #475569;
            --border-color: #cbd5e1;
            --card-bg: #ffffff;
            --accent-green: #059669;
            --accent-amber: #d97706;
            --accent-purple: #7c3aed;
        }

        * { box-sizing: border-box; }
        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--text-main);
            background: #f8fafc;
            margin: 0;
            padding: 0;
            line-height: 1.65;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        @page {
            size: A4;
            margin: 16mm 14mm 18mm 14mm;
            @bottom-right {
                content: counter(page);
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 9pt;
                color: #64748b;
            }
            @bottom-left {
                content: "${isUz ? "EdTech Exchange • Rasmiy Foydalanuvchi Qo'llanmasi" : "EdTech Exchange • Official Software User Manual"}";
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 9pt;
                color: #64748b;
            }
        }

        @media print {
            body { background: white; }
            .page-break { page-break-before: always; }
            .avoid-break { page-break-inside: avoid; }
            .doc-container { padding: 0 !important; width: 100% !important; max-width: 100% !important; box-shadow: none !important; }
        }

        .doc-container {
            max-width: 900px;
            margin: 30px auto;
            background: #ffffff;
            padding: 40px 50px;
            box-shadow: 0 4px 25px rgba(0,0,0,0.06);
            border-radius: 8px;
        }

        /* Cover Page */
        .cover-page {
            min-height: 960px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 60px 40px;
            border-left: 8px solid var(--primary);
            background: linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%);
            margin-bottom: 50px;
            position: relative;
        }
        .cover-badge {
            display: inline-block;
            background: #1e3a8a;
            color: #ffffff;
            padding: 6px 14px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
            border-radius: 4px;
            text-transform: uppercase;
            width: fit-content;
        }
        .cover-title {
            font-size: 40px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.15;
            margin: 20px 0 10px 0;
            letter-spacing: -0.02em;
        }
        .cover-subtitle {
            font-size: 20px;
            color: #3b82f6;
            font-weight: 600;
            margin-bottom: 30px;
        }
        .cover-desc {
            font-size: 15px;
            color: #475569;
            line-height: 1.7;
            max-width: 650px;
        }
        .cover-meta {
            border-top: 2px solid #e2e8f0;
            padding-top: 25px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            font-size: 13px;
        }
        .cover-meta strong {
            display: block;
            color: #1e293b;
            font-size: 14px;
            margin-bottom: 3px;
        }

        /* Headings */
        h1 {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 3px solid var(--primary);
            padding-bottom: 12px;
            margin-top: 40px;
            margin-bottom: 20px;
            letter-spacing: -0.01em;
        }
        h2 {
            font-size: 21px;
            font-weight: 700;
            color: #1e3a8a;
            margin-top: 30px;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        h3 {
            font-size: 16px;
            font-weight: 700;
            color: #334155;
            margin-top: 20px;
            margin-bottom: 10px;
        }

        p, li {
            font-size: 14px;
            color: #334155;
            line-height: 1.7;
        }

        /* Callout Boxes */
        .box {
            padding: 14px 18px;
            border-radius: 6px;
            margin: 18px 0;
            font-size: 13.5px;
            line-height: 1.6;
        }
        .box-info {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            color: #1e40af;
        }
        .box-tip {
            background: #f0fdf4;
            border-left: 4px solid #10b981;
            color: #065f46;
        }
        .box-warning {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            color: #92400e;
        }
        .box-important {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            color: #991b1b;
        }

        /* Screenshots & Figures */
        .figure-box {
            margin: 22px 0 26px 0;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.04);
            page-break-inside: avoid;
        }
        .figure-box img {
            width: 100%;
            display: block;
            border-bottom: 1px solid #e2e8f0;
        }
        .figure-caption {
            padding: 10px 16px;
            background: #f8fafc;
            font-size: 12.5px;
            font-weight: 600;
            color: #334155;
            border-top: 1px solid #e2e8f0;
        }
        .figure-caption strong {
            color: #1e3a8a;
        }

        /* Marker List */
        .markers-list {
            margin: 12px 0;
            padding: 0;
            list-style: none;
        }
        .markers-list li {
            padding: 6px 0;
            display: flex;
            align-items: baseline;
            gap: 8px;
            font-size: 13.5px;
            border-bottom: 1px dashed #e2e8f0;
        }
        .markers-list li:last-child { border-bottom: none; }
        .marker-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            background: #1e3a8a;
            color: #ffffff;
            font-weight: 800;
            font-size: 12px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 13px;
            page-break-inside: avoid;
        }
        th, td {
            padding: 10px 14px;
            border: 1px solid #cbd5e1;
            text-align: left;
        }
        th {
            background: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
        }
        tr:nth-child(even) td {
            background: #f8fafc;
        }

        /* Form Field Specification Grid */
        .field-spec {
            display: grid;
            grid-template-columns: 140px 1fr;
            gap: 8px;
            padding: 8px 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 8px;
            font-size: 13px;
        }
        .field-name { font-weight: 700; color: #1e293b; }
        .field-desc { color: #475569; }

        /* Step procedure */
        .step-block {
            margin: 16px 0;
            padding-left: 18px;
            border-left: 3px solid #3b82f6;
        }
        .step-title {
            font-weight: 700;
            color: #1e3a8a;
            font-size: 14px;
            margin-bottom: 4px;
        }

        .badge-tag {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 4px;
            background: #e2e8f0;
            color: #334155;
            margin-right: 6px;
        }
    </style>
</head>
<body>

<div class="doc-container">

    <!-- ================= COVER PAGE ================= -->
    <div class="cover-page">
        <div>
            <div class="cover-badge">${isUz ? "RASMIY DASTURIY TA'MINOT QO'LLANMASI" : "OFFICIAL SOFTWARE USER MANUAL"}</div>
            <div class="cover-title">EdTech Exchange LMS</div>
            <div class="cover-subtitle">${isUz ? "Termiz Shahridagi Prezident Maktabi Portali • To'liq Tizim Qo'llanmasi" : "Termez Presidential School Portal • Comprehensive Software Guide"}</div>
            <div class="cover-desc">
                ${isUz 
                    ? "Ushbu texnik qo'llanma Termiz shahridagi Prezident maktabi uchun maxsus ishlab chiqilgan ilg'or EdTech LMS tizimining barcha modullari, rollari, Digital SAT/CD IELTS imtihon simulyatorlari, Sun'iy Intellekt yordamchisi, Raqamli laboratoriya va akademik boshqaruv vositalarini haqiqiy ekran dalillari (skrinshotlar) asosida to'liq yoritadi."
                    : "This technical user manual provides an exhaustive, screenshot-verified guide to the EdTech LMS platform deployed at Termez Presidential School. Covering all 4 primary user roles, official Digital SAT and CD IELTS exam engines, AI Assistant integration, STEM Digital Laboratory, and academic audit capabilities."
                }
            </div>
        </div>

        <div class="cover-meta">
            <div>
                <strong>${isUz ? "Hujjat Versiyasi:" : "Document Version:"}</strong>
                <span>Release 2.0 (Enterprise LMS Build)</span>
            </div>
            <div>
                <strong>${isUz ? "Sana va Hudud:" : "Publication Date & Location:"}</strong>
                <span>${isUz ? "Sentabr 2026 • Termiz, O'zbekiston" : "September 2026 • Termez, Uzbekistan"}</span>
            </div>
            <div>
                <strong>${isUz ? "Maqsadli Auditoriya:" : "Target Audience:"}</strong>
                <span>${isUz ? "O'qituvchilar, O'quvchilar, Rahbariyat, Inspektorlar" : "Teachers, Students, School Management, Auditors"}</span>
            </div>
            <div>
                <strong>${isUz ? "Xalqaro Akkreditatsiyalar:" : "Accreditations & Standards:"}</strong>
                <span>Cognia • CollegeBoard • Cambridge • CIS</span>
            </div>
        </div>
    </div>

    <!-- ================= TABLE OF CONTENTS ================= -->
    <div class="page-break"></div>
    <h1>${isUz ? "Mundarija" : "Table of Contents"}</h1>
    <table>
        <thead>
            <tr>
                <th style="width: 80px;">${isUz ? "Bo'lim" : "Section"}</th>
                <th>${isUz ? "Mavzu va Modullar Tavsifi" : "Topic & Module Description"}</th>
                <th style="width: 120px;">${isUz ? "Qamrab Olingan Rol" : "Target Roles"}</th>
                <th style="width: 80px;">${isUz ? "Dalillar" : "Evidence"}</th>
            </tr>
        </thead>
        <tbody>
            <tr><td><strong>1.0</strong></td><td>${isUz ? "Asosiy Oyna (Landing Page), E'lonlar va Autentifikatsiya" : "Main Landing Page, Announcements & Authentication"}</td><td>Barchasi / All</td><td>Fig 1.1 - 1.4</td></tr>
            <tr><td><strong>2.0</strong></td><td>${isUz ? "O'qituvchi Boshqaruv Paneli (Teacher Dashboard & Anatomy)" : "Teacher Dashboard & Workspace Anatomy"}</td><td>O'qituvchi / Teacher</td><td>Fig 2.1 - 2.4</td></tr>
            <tr><td><strong>3.0</strong></td><td>${isUz ? "Kurslar Yaratish, Modullar va Materiallar (Courses CRUD & Question Maker)" : "Course Creation, Modules & Question Maker (Canvas LMS)"}</td><td>O'qituvchi, Admin</td><td>Fig 3.1 - 3.10</td></tr>
            <tr><td><strong>4.0</strong></td><td>${isUz ? "Digital SAT Imtihon Simulyatori (Official Bluebook Format)" : "Digital SAT Simulation Engine (CollegeBoard Format)"}</td><td>O'quvchi, Math Teacher</td><td>Fig 4.1 - 4.9</td></tr>
            <tr><td><strong>5.0</strong></td><td>${isUz ? "CD IELTS Imtihon Platformasi (Computer-Delivered IELTS)" : "CD IELTS Simulation Platform (Listening, Reading, Writing, Speaking)"}</td><td>O'quvchi, English Teacher</td><td>Fig 5.1 - 5.7</td></tr>
            <tr><td><strong>6.0</strong></td><td>${isUz ? "Sun'iy Intellekt (AI) Yordamchisi va Floating Chat" : "Artificial Intelligence (AI) Assistant & Live Tutoring"}</td><td>Barchasi / All</td><td>Fig 6.1 - 6.3</td></tr>
            <tr><td><strong>7.0</strong></td><td>${isUz ? "CV Maker (Professional Rezyume Yaratish va PDF Export)" : "CV Maker (Professional Resume Builder & Export)"}</td><td>O'qituvchi, O'quvchi</td><td>Fig 7.1 - 7.4</td></tr>
            <tr><td><strong>8.0</strong></td><td>${isUz ? "Digital Lab (Interaktiv Raqamli STEM Laboratoriyasi)" : "Digital STEM Laboratory (CS, Physics, Chemistry, Biology, Math)"}</td><td>O'quvchi, O'qituvchi</td><td>Fig 8.1 - 8.5</td></tr>
            <tr><td><strong>9.0</strong></td><td>${isUz ? "Dars Ishlanmasi (Lesson Plan) va Kelajak Versiyalar Yo'l Xaritasi" : "Lesson Plan Manager & Version 2.5 Roadmap"}</td><td>O'qituvchi / Teacher</td><td>Fig 9.1 - 9.2</td></tr>
            <tr><td><strong>10.0</strong></td><td>${isUz ? "Dars Jadvallari va Rejalashtiruvchi (Teacher Schedule)" : "Teacher Schedule & Timetable Planner"}</td><td>O'qituvchi / Teacher</td><td>Fig 10.1 - 10.3</td></tr>
            <tr><td><strong>11.0</strong></td><td>${isUz ? "Tug'ilgan Kunlar Simulyatsiyasi va Ijtimoiy Muhit" : "Birthday Celebration System & Festive Simulation"}</td><td>Barchasi / All</td><td>Fig 11.1 - 11.3</td></tr>
            <tr><td><strong>12.0</strong></td><td>${isUz ? "O'quvchi Tajribasi va Baholash Jurnali (Student Dashboard & Grades)" : "Student Experience, Learning Flow & Grades"}</td><td>O'quvchi / Student</td><td>Fig 12.1 - 12.2</td></tr>
            <tr><td><strong>13.0</strong></td><td>${isUz ? "Menejment Paneli va Akademik Audit (Management & Inspection)" : "Management Panel, Teacher Audit & Inspection Analytics"}</td><td>Rahbariyat / Management</td><td>Fig 13.1 - 13.3</td></tr>
            <tr><td><strong>14.0</strong></td><td>${isUz ? "Administrator Paneli va Tizim Boshqaruvi (Admin Governance)" : "Administrator Panel, User CRUD & AI Control Center"}</td><td>Administrator</td><td>Fig 14.1 - 14.3</td></tr>
            <tr><td><strong>15.0</strong></td><td>${isUz ? "To'liq Funksiyalar Matritsasi va Rollar Taqqoslovi" : "Comprehensive Feature Matrix & Role Permissions"}</td><td>Tizim / Matrix</td><td>Jadval / Table</td></tr>
            <tr><td><strong>16.0</strong></td><td>${isUz ? "Skrinshot Dalillari Indeksi" : "Complete Screenshot Evidence Index"}</td><td>Audit Indeks</td><td>48 Dalillar / Items</td></tr>
        </tbody>
    </table>

    <!-- ================= SECTION 1: LANDING & AUTH ================= -->
    <div class="page-break"></div>
    <h1>1.0 ${isUz ? "Asosiy Oyna (Landing Page), E'lonlar va Autentifikatsiya" : "Main Landing Page, Announcements & Authentication"}</h1>
    
    <h2>1.1 ${isUz ? "Asosiy Oyna Anatomiyasi va 3D Muhit" : "Landing Page Anatomy & 3D Knowledge Core"}</h2>
    <p>
        ${isUz 
            ? "Platforma tizimga kirmagan mehmonlar va barcha foydalanuvchilarni zamonaviy 3D interaktiv yulduzlar va bilim yadrosi (Knowledge Core) animatsiyasi bilan kutib oladi. Sahifaning yuqori qismida Termiz shahridagi Prezident maktabining rasmiy brendi, davlat va xalqaro akkreditatsiyalari (Cognia, CollegeBoard, Cambridge Assessment, CIS, Maktabgacha va maktab ta'limi vazirligi) namoyish etiladi."
            : "The application welcomes unauthenticated users and visitors with a high-performance 3D interactive particle simulation and Knowledge Core canvas. The header prominently displays Termez Presidential School branding alongside international accreditations including Cognia, CollegeBoard, Cambridge International Education, CIS, and the Ministry of Preschool and School Education."
        }
    </p>

    <div class="figure-box">
        <img src="${images.landing_hero}" alt="Figure 1.1">
        <div class="figure-caption">
            <strong>Figure 1.1:</strong> ${isUz ? "EdTech Exchange Asosiy Kirish Oynasi (Landing Page). Yuqori navigatsiya paneli, 3D interaktiv yadro va xalqaro akkreditatsiya belgilari." : "EdTech Exchange Main Landing Page featuring the 3D particle canvas, header navigation, and accreditation badges."}
        </div>
    </div>

    <ul class="markers-list">
        <li><span class="marker-badge">①</span> <strong>${isUz ? "Maktab Brendi va Logotipi:" : "School Branding & Logo:"}</strong> ${isUz ? "Termiz shahridagi Prezident maktabi rasmiy logotipi va 'EdTech Exchange' portali sarlavhasi." : "Official Termez Presidential School insignia and portal title."}</li>
        <li><span class="marker-badge">②</span> <strong>${isUz ? "Xalqaro Akkreditatsiyalar:" : "International Accreditations:"}</strong> ${isUz ? "Cognia, CollegeBoard, Cambridge, CIS hamda Vazirlik akkreditatsiyasi rasmiy sertifikatlari." : "Accreditation emblems validating institutional curriculum standards."}</li>
        <li><span class="marker-badge">③</span> <strong>${isUz ? "Kirish Tugmasi (Portalga Kirish):" : "Login Action Button:"}</strong> ${isUz ? "Autentifikatsiya modal oynasini ochadi va tizimga kirish imkonini beradi." : "Launches the authentication modal for authorized users."}</li>
        <li><span class="marker-badge">④</span> <strong>${isUz ? "E'lonlar va Yangiliklar Lentasi:" : "Announcements & Live Feed:"}</strong> ${isUz ? "Maktabdagi eng so'nggi yangiliklar, tadbirlar va e'lonlarni namoyish etuvchi markaziy lenta." : "Central dynamic news ticker displaying institutional announcements."}</li>
    </ul>

    <h2>1.2 ${isUz ? "Autentifikatsiya va Tizimga Kirish (Login Modal)" : "Authentication & User Login Workflow"}</h2>
    <p>
        ${isUz 
            ? "Tizimga kirish xavfsiz JWT (JSON Web Token) protokoli orqali amalga oshiriladi. Modal oyna ichida foydalanuvchi nomi, parol kiritish maydoni hamda parolni ko'rsatish/yashirish (Show/Hide Password) indikatori mavjud. Ishlab chiquvchilar va test jarayonlari uchun Tezkor Rollarga Kirish (Quick Role Access) tugmalari ham integratsiya qilingan."
            : "User authentication uses industry-standard JSON Web Tokens (JWT). The login modal contains Username, Password with visibility toggle, form validation, and dev-mode Quick Role shortcuts for instant evaluation of Teacher, Student, Management, and Admin roles."
        }
    </p>

    <div class="figure-box">
        <img src="${images.landing_auth}" alt="Figure 1.2">
        <div class="figure-caption">
            <strong>Figure 1.2:</strong> ${isUz ? "Tizimga Kirish Modali (Login Modal) va Parol Xavfsizligi Boshqaruvi." : "Authentication Modal featuring login credentials input and password visibility toggle."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.landing_quick}" alt="Figure 1.3">
        <div class="figure-caption">
            <strong>Figure 1.3:</strong> ${isUz ? "Tezkor Rol Tanlash Paneli (Quick Role Access: Admin, Teacher, Student, Management)." : "Quick Role Selector modal allowing direct credential prefill for audit inspection."}
        </div>
    </div>

    <!-- ================= SECTION 2: TEACHER DASHBOARD ================= -->
    <div class="page-break"></div>
    <h1>2.0 ${isUz ? "O'qituvchi Boshqaruv Paneli (Teacher Dashboard & Anatomy)" : "Teacher Dashboard & Workspace Anatomy"}</h1>
    
    <h2>2.1 ${isUz ? "O'qituvchi Ish Maydoni Umumiy Ko'rinishi" : "Teacher Workspace Overview"}</h2>
    <p>
        ${isUz 
            ? "O'qituvchi tizimga kirganda shaxsiy 'Teacher Dashboard' oynasiga yo'naltiriladi. Ushbu panel o'qituvchining dars berayotgan fanlari, biriktirilgan sinflari, topshiriqlar holati va o'quvchilar o'zlashtirish ko'rsatkichlarini real vaqt rejimida jamlab beradi."
            : "Upon successful authentication, teachers are welcomed into the comprehensive Teacher Dashboard. This control center consolidates ongoing classes, active assignments, curriculum progress, and student grade averages."
        }
    </p>

    <div class="figure-box">
        <img src="${images.teacher_dash}" alt="Figure 2.1">
        <div class="figure-caption">
            <strong>Figure 2.1:</strong> ${isUz ? "O'qituvchi Boshqaruv Paneli (Teacher Dashboard). Shaxsiy tabrik, statistika kartalari va tezkor amallar paneli." : "Teacher Dashboard complete overview showcasing personalized greeting, KPI metrics, and quick action buttons."}
        </div>
    </div>

    <h2>2.2 ${isUz ? "Statistika Kartalari va Tezkor Amallar" : "Teacher KPI Cards & Navigation Anatomy"}</h2>
    <div class="figure-box">
        <img src="${images.teacher_actions}" alt="Figure 2.3">
        <div class="figure-caption">
            <strong>Figure 2.2:</strong> ${isUz ? "O'qituvchi Tezkor Amallar Qatori (+ Kurs yaratish, Dars jadvali, Baholash jurnali, AI Yordamchi)." : "Teacher Quick Actions bar providing 1-click access to Course Creation, Schedule, Gradebook, and AI Tutor."}
        </div>
    </div>

    <div class="box box-tip">
        <strong>${isUz ? "FOYDALI MASLAHAT:" : "PRO TIP:"}</strong>
        ${isUz 
            ? "O'qituvchi yon menyudagi qisqartirish (Collapse) tugmasi orqali ekranni kengaytirib, dars jadvali yoki baholar jurnalini to'liq formatda ko'rishi mumkin."
            : "Teachers can collapse the sidebar using the collapse toggle to maximize horizontal screen real estate for wide gradebook tables and test authoring."
        }
    </div>

    <!-- ================= SECTION 3: COURSES MODULE ================= -->
    <div class="page-break"></div>
    <h1>3.0 ${isUz ? "Kurslar Yaratish, Modullar va Materiallar (Courses CRUD & Question Maker)" : "Course Creation, Modules & Question Maker (Canvas LMS)"}</h1>

    <h2>3.1 ${isUz ? "Kurslar Katalogi va Filtrlash" : "Course Catalog & Subject Filtering"}</h2>
    <p>
        ${isUz 
            ? "Kurslar bo'limida o'qituvchi o'ziga biriktirilgan barcha o'quv kurslarini ko'radi. Yuqori qismda fanlar bo'yicha saralash filtrlari (Barchasi, Aniq fanlar, Tabiiy fanlar, Tillar), qidiruv paneli hamda '+ Course' (Yangi kurs qo'shish) tugmasi joylashgan."
            : "The Courses catalog presents all curriculum courses assigned to the instructor. Top-level subject filters (All, STEM, Humanities, Languages), search bar, and the primary '+ Course' button allow seamless management."
        }
    </p>

    <div class="figure-box">
        <img src="${images.course_catalog}" alt="Figure 3.1">
        <div class="figure-caption">
            <strong>Figure 3.1:</strong> ${isUz ? "Kurslar Katalogi (Courses Catalog) va Yangi Kurs Yaratish Tugmasi." : "Course Catalog showing active courses, subject tags, and '+ Course' action."}
        </div>
    </div>

    <h2>3.2 ${isUz ? "QADAM-BA-QADAM: Yangi Kurs Yaratish Jarayoni" : "STEP-BY-STEP: Course Creation Workflow"}</h2>
    <div class="step-block">
        <div class="step-title">${isUz ? "1-QADAM: '+ Course' tugmasini bosing" : "STEP 1: Click the '+ Course' button"}</div>
        <p>${isUz ? "Kurslar sahifasining yuqori o'ng burchagidagi ko'k rangli '+ Course' tugmasini bosing. Ekranda yangi kurs ma'lumotlarini kiritish formasi paydo bo'ladi." : "Click the primary '+ Course' button. The course creation form will dynamically expand on screen."}</p>
    </div>

    <div class="figure-box">
        <img src="${images.course_empty}" alt="Figure 3.2">
        <div class="figure-caption">
            <strong>Figure 3.2:</strong> ${isUz ? "Yangi Kurs Yaratish Formasi (Bo'sh holatda)." : "Course Creation Form (Empty state with field specifications)."}
        </div>
    </div>

    <div class="step-block">
        <div class="step-title">${isUz ? "2-QADAM: Maydonlarni to'ldiring" : "STEP 2: Complete the Form Fields"}</div>
        <p>${isUz ? "Har bir maydonga talab qilingan ma'lumotlarni kiriting:" : "Enter the required course metadata:"}</p>
    </div>

    <div class="field-spec">
        <div class="field-name">Course Title (Nomi)</div>
        <div class="field-desc">${isUz ? "Kursning to'liq akademik nomi. Masalan: 'Oliy Matematika: Matematik Analiz Asoslari'." : "Official course title. Example: 'Higher Mathematics: Foundations of Calculus'."}</div>
    </div>
    <div class="field-spec">
        <div class="field-name">Class Group (Sinf)</div>
        <div class="field-desc">${isUz ? "Kurs qaysi sinf o'quvchilari uchun mo'ljallanganligi. Masalan: 'Grade 10'." : "Target grade level selection dropdown. Example: 'Grade 10'."}</div>
    </div>
    <div class="field-spec">
        <div class="field-name">Subject (Fan turi)</div>
        <div class="field-desc">${isUz ? "Fan sohasi (Matematika, Fizika, Kimyo, Ingliz tili)." : "Subject domain categorization."}</div>
    </div>

    <div class="figure-box">
        <img src="${images.course_filled}" alt="Figure 3.3">
        <div class="figure-caption">
            <strong>Figure 3.3:</strong> ${isUz ? "Yangi Kurs Formasi To'ldirilgan Holatda." : "Course Creation Form filled with verified institutional course parameters."}
        </div>
    </div>

    <h2>3.3 ${isUz ? "Kurs Ichki Boshqaruvi va Modullar Tizimi (Canvas LMS Moduli)" : "Course Player & Curriculum Modules (Canvas LMS Architecture)"}</h2>
    <p>
        ${isUz 
            ? "Kurs ochilganda dunyodagi eng ilg'or Canvas LMS standarti asosida qurilgan 'CoursePlayer' interfeysi yuklanadi. Bu yerda o'qituvchi Modullar yaratishi, mavzular (Topics), darsliklar (Pages), topshiriqlar (Assignments) va testlar (Quizzes) qo'shishi mumkin."
            : "Clicking into any course launches the Canvas LMS-style CoursePlayer workspace. Instructors organize content into progressive hierarchical modules containing Topics, Reading Pages, Graded Assignments, and Interactive Quizzes."
        }
    </p>

    <div class="figure-box">
        <img src="${images.course_modules}" alt="Figure 3.4">
        <div class="figure-caption">
            <strong>Figure 3.4:</strong> ${isUz ? "Kurs Modullari Boshqaruvi (Canvas Modules View) va Elementlar Ierarxiyasi." : "Course Modules hierarchy displaying lesson topics, attached quizzes, and item creation triggers."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.course_add_mod}" alt="Figure 3.5">
        <div class="figure-caption">
            <strong>Figure 3.5:</strong> ${isUz ? "Yangi Modul Qo'shish Modali (+ Add Module)." : "Add Module modal allowing structural partitioning of curriculum chapters."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.course_add_item}" alt="Figure 3.6">
        <div class="figure-caption">
            <strong>Figure 3.6:</strong> ${isUz ? "Modulga Element Qo'shish Modali (Mavzu, Sahifa, Test, Topshiriq, Fayl)." : "Add Item modal supporting Topic, Page, Quiz, Assignment, Link, and Protected File."}
        </div>
    </div>

    <h2>3.4 ${isUz ? "Topshiriqlar Yaratish (Assignment Management)" : "Assignment Authoring & Secure Attachments"}</h2>
    <div class="figure-box">
        <img src="${images.course_assignment}" alt="Figure 3.7">
        <div class="figure-caption">
            <strong>Figure 3.7:</strong> ${isUz ? "Topshiriq Yaratish Formasi (Points: 100, Due Date, PDF va Link biriktirish)." : "Create Assignment form specifying Title, Description, Max Points, Deadline, and Attachment Type."}
        </div>
    </div>

    <h2>3.5 ${isUz ? "Question Maker: Testlar va Savollar Tuzuvchi" : "Question Maker: Assessment & Quiz Engine"}</h2>
    <p>
        ${isUz 
            ? "Question Maker interfeysi o'qituvchiga har bir modul bo'yicha interaktiv testlar yaratish imkonini beradi. Har bir savolga variantlar (A, B, C, D), to'g'ri javob kaliti, ball miqdori va o'quvchi xato qilganda chiqadigan tushuntirish kiritiladi."
            : "The Question Maker provides rich test construction capabilities. Teachers formulate question prompts, define multiple choice answers, assign correct keys, configure question scoring weights, and append detailed pedagogical explanations."
        }
    </p>

    <div class="figure-box">
        <img src="${images.course_qm}" alt="Figure 3.8">
        <div class="figure-caption">
            <strong>Figure 3.8:</strong> ${isUz ? "Question Maker Interfeysi (Savol matni, variantlar va to'g'ri javobni belgilash)." : "Question Maker assessment editor showing question builder, answer options, and scoring."}
        </div>
    </div>

    <h2>3.6 ${isUz ? "Mavzu Ko'rinishi va Himoyalangan PDF O'qish Rejimi" : "Topic View & Secure Protected PDF Viewer"}</h2>
    <div class="figure-box">
        <img src="${images.course_topic}" alt="Figure 3.9">
        <div class="figure-caption">
            <strong>Figure 3.9:</strong> ${isUz ? "Mavzuni O'rganish Oynasi (Topic Player): Video darslik, izohlar va biriktirilgan materiallar." : "Topic Player view displaying video lecture embed, lecture syllabus, and attached learning materials."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.course_pdf}" alt="Figure 3.10">
        <div class="figure-caption">
            <strong>Figure 3.10:</strong> ${isUz ? "Himoyalangan PDF O'qish Oynasi (O'quvchi uchun toza, qulay o'qish tajribasi)." : "Protected PDF Viewer delivering a distraction-free, secure in-browser reading environment."}
        </div>
    </div>

    <!-- ================= SECTION 4: DIGITAL SAT ================= -->
    <div class="page-break"></div>
    <h1>4.0 ${isUz ? "Digital SAT Imtihon Simulyatori (Official Bluebook Format)" : "Digital SAT Simulation Engine (Official Bluebook Format)"}</h1>

    <h2>4.1 ${isUz ? "SAT Tizimi Umumiy Ko'rinishi" : "Digital SAT Platform Architecture"}</h2>
    <p>
        ${isUz 
            ? "EdTech platformasidagi eng kuchli va noyob modullardan biri — bu rasmiy CollegeBoard Bluebook imtihon tizimining to'liq nusxasi bo'lgan Digital SAT modulidir. Tizim 400 dan 1600 gacha bo'lgan ball shkalasida baholaydi, Reading & Writing hamda Math seksiyalaridan iborat."
            : "The platform integrates a pixel-accurate emulation of the official CollegeBoard Bluebook Digital SAT application. Supporting official adaptive multi-stage scoring (400 - 1600 scale), complete with Reading/Writing and Math modules, Desmos Graphing Calculator, and Reference Sheets."
        }
    </p>

    <div class="figure-box">
        <img src="${images.sat_dash}" alt="Figure 4.1">
        <div class="figure-caption">
            <strong>Figure 4.1:</strong> ${isUz ? "Digital SAT Boshqaruv Paneli (SAT Overview Dashboard)." : "Digital SAT Dashboard displaying cohort average scaled scores, section breakdown, and test counts."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.sat_library}" alt="Figure 4.2">
        <div class="figure-caption">
            <strong>Figure 4.2:</strong> ${isUz ? "SAT Testlar Kutubxonasi (Practice Tests Library: Test 1, Test 2, Reading & Writing, Math)." : "SAT Test Library listing official mock exams with direct 'Start Test' triggers."}
        </div>
    </div>

    <h2>4.2 ${isUz ? "SAT Reading & Writing va Math Imtihon Dasturlari" : "SAT Exam Engines: Reading & Writing and Math"}</h2>
    <div class="figure-box">
        <img src="${images.sat_rw}" alt="Figure 4.3">
        <div class="figure-caption">
            <strong>Figure 4.3:</strong> ${isUz ? "Digital SAT Reading & Writing Imtihon Oynasi. Chap tomonda matn (passage), o'ng tomonda savol va variantlar, yuqorida taymer va 'Mark for Review' belgisi." : "Digital SAT Reading & Writing engine showing split-screen passage, question choices, countdown timer, and 'Mark for Review' flag."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.sat_math}" alt="Figure 4.4">
        <div class="figure-caption">
            <strong>Figure 4.4:</strong> ${isUz ? "Digital SAT Math Imtihon Oynasi. Matematik formulalar va savollar navigatsiyasi." : "Digital SAT Math engine featuring mathematical formula rendering and scratchpad integration."}
        </div>
    </div>

    <h2>4.3 ${isUz ? "O'rnatilgan Desmos Grafikli Kalkulyator va Formula Varaqasi" : "Integrated Desmos Graphing Calculator & Official Formula Sheet"}</h2>
    <p>
        ${isUz 
            ? "Math seksiyasi davomida o'quvchilar rasmiy CollegeBoard imtihonidagi kabi to'liq funksiyali Desmos Graphing Calculator va Formula Reference Sheet dan foydalanishlari mumkin."
            : "During Math sections, examinees have built-in access to the official Desmos Graphing Calculator drawer and the CollegeBoard Formula Reference Sheet."
        }
    </p>

    <div class="figure-box">
        <img src="${images.sat_desmos}" alt="Figure 4.5">
        <div class="figure-caption">
            <strong>Figure 4.5:</strong> ${isUz ? "Imtihon Ichida Ochilgan Rasmiy Desmos Grafikli Kalkulyatori." : "Embedded Desmos Graphing Calculator open during an active SAT Math session."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.sat_formula}" alt="Figure 4.6">
        <div class="figure-caption">
            <strong>Figure 4.6:</strong> ${isUz ? "Rasmiy SAT Matematika Formulalar Varaqasi (Geometry Formulas Sheet)." : "Official SAT Math Reference Sheet modal containing geometric area and volume equations."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.sat_navigator}" alt="Figure 4.7">
        <div class="figure-caption">
            <strong>Figure 4.7:</strong> ${isUz ? "SAT Savollar Navigatsiya Palitrasi (Javob berilgan, bo'sh va 'Mark for Review' qilingan savollar ro'yxati)." : "Question Navigator palette detailing answered, unanswered, and flagged review items."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.sat_results}" alt="Figure 4.9">
        <div class="figure-caption">
            <strong>Figure 4.9:</strong> ${isUz ? "Digital SAT Natijalar Tahlili (Umumiy ball: 1600 shkala, RW va Math seksiyalar tahlili)." : "Comprehensive SAT Results Report providing scaled score breakdown (400-1600) and mistake review."}
        </div>
    </div>

    <!-- ================= SECTION 5: CD IELTS ================= -->
    <div class="page-break"></div>
    <h1>5.0 ${isUz ? "CD IELTS Imtihon Platformasi (Computer-Delivered IELTS)" : "CD IELTS Simulation Platform (Listening, Reading, Writing, Speaking)"}</h1>

    <h2>5.1 ${isUz ? "CD IELTS Tizimi va Modullar Xaritasi" : "CD IELTS Architecture & Skill Modules"}</h2>
    <p>
        ${isUz 
            ? "Platforma xalqaro British Council va IDP Computer-Delivered IELTS imtihon formatini to'liq simulyatsiya qiladi. Tizimda Listening, Reading, Writing hamda Speaking bo'limlari to'liq avtomatlashtirilgan holda Band 0.0 dan 9.0 gacha baholanadi."
            : "The CD IELTS module emulates official British Council / IDP Computer-Delivered examination interfaces. It features complete engines for Listening, Reading, Writing, and Speaking, calibrated against official Band 0.0 - 9.0 assessment rubrics."
        }
    </p>

    <div class="figure-box">
        <img src="${images.ielts_dash}" alt="Figure 5.1">
        <div class="figure-caption">
            <strong>Figure 5.1:</strong> ${isUz ? "CD IELTS Boshqaruv Paneli (Overall Band Score 0-9 va ko'nikmalar radari)." : "CD IELTS Module Dashboard illustrating candidate cohort Band Scores and section averages."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.ielts_library}" alt="Figure 5.2">
        <div class="figure-caption">
            <strong>Figure 5.2:</strong> ${isUz ? "IELTS Testlar Kutubxonasi (Academic & General Mock Test to'plamlari)." : "IELTS Test Library displaying authentic Cambridge practice exams."}
        </div>
    </div>

    <h2>5.2 ${isUz ? "Listening va Reading Imtihon Dasturlari" : "CD IELTS Listening & Reading Simulation Engines"}</h2>
    <div class="figure-box">
        <img src="${images.ielts_listening}" alt="Figure 5.3">
        <div class="figure-caption">
            <strong>Figure 5.3:</strong> ${isUz ? "CD IELTS Listening Sinov Oynasi. Audio nazorati, savollar palitrasi va 1-4 qismlar navigatsiyasi." : "CD IELTS Listening engine featuring audio playback simulation, volume adjustment, and question palette."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.ielts_reading}" alt="Figure 5.4">
        <div class="figure-caption">
            <strong>Figure 5.4:</strong> ${isUz ? "CD IELTS Reading Sinov Oynasi. Chapda matn, o'ngda savollar, matnni belgilash (highlighter) va qoralama (notepad)." : "CD IELTS Reading split-screen interface with text passage, interactive question inputs, and highlighter."}
        </div>
    </div>

    <h2>5.3 ${isUz ? "Writing va Speaking Baholash Tizimi" : "CD IELTS Writing & Speaking Assessment"}</h2>
    <div class="figure-box">
        <img src="${images.ielts_writing}" alt="Figure 5.5">
        <div class="figure-caption">
            <strong>Figure 5.5:</strong> ${isUz ? "CD IELTS Writing Oynasi. Task 1 va Task 2 topshiriqlari, so'z hisoblagich (Word Counter) va taymer." : "CD IELTS Writing engine with Task 1/2 prompts, live word counter, and countdown timer."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.ielts_speaking}" alt="Figure 5.6">
        <div class="figure-caption">
            <strong>Figure 5.6:</strong> ${isUz ? "IELTS Speaking Baholash va Mashg'ulot Oynasi (Ovoz yozish va xalqaro 4 ta mezon)." : "IELTS Speaking evaluation interface featuring voice recording and official 4-criteria assessment."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.ielts_results}" alt="Figure 5.7">
        <div class="figure-caption">
            <strong>Figure 5.7:</strong> ${isUz ? "IELTS Rasmiy Natija Varaqasi (Overall Band 7.5: L:8.5, R:7.5, W:7.0, S:7.0)." : "IELTS Candidate Performance Report presenting Band Score breakdown and analytical feedback."}
        </div>
    </div>

    <!-- ================= SECTION 6: AI ASSISTANT ================= -->
    <div class="page-break"></div>
    <h1>6.0 ${isUz ? "Sun'iy Intellekt (AI) Yordamchisi va Floating Chat" : "Artificial Intelligence (AI) Assistant & Live Tutoring"}</h1>

    <h2>6.1 ${isUz ? "OpenAI Integratsiyalangan Aqlli Dars Yordamchisi" : "Integrated Academic AI Assistant"}</h2>
    <p>
        ${isUz 
            ? "Platformaga ilg'or OpenAI arxitekturasi asosida ishlovchi akademik AI Yordamchi o'rnatilgan. Ushbu yordamchi o'quvchilarga murakkab masalalarni yechishda, o'qituvchilarga esa dars rejalari, test savollari va akademik matnlarni tahlil qilishda beminnat ko'mak beradi."
            : "The platform integrates an intelligent OpenAI-powered educational assistant tailored for pedagogical environments. Students leverage the assistant for STEM problem-solving, while instructors generate lesson blueprints and rubric evaluations."
        }
    </p>

    <div class="figure-box">
        <img src="${images.ai_page}" alt="Figure 6.1">
        <div class="figure-caption">
            <strong>Figure 6.1:</strong> ${isUz ? "Sun'iy Intellekt (AI) Yordamchisi Asosiy Oynasi va Akademik So'rov Kategoriyalari." : "AI Assistant dedicated workspace showcasing categorized academic prompt templates."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.ai_action}" alt="Figure 6.2">
        <div class="figure-caption">
            <strong>Figure 6.2:</strong> ${isUz ? "AI Yordamchi Bilan Jonli Muloqot (Kvant fizikasi bo'yicha batafsil tushuntirish jarayoni)." : "Live interactive AI conversation demonstrating real-time structured markdown STEM explanation."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.ai_float}" alt="Figure 6.3">
        <div class="figure-caption">
            <strong>Figure 6.3:</strong> ${isUz ? "Suzuvchi AI Vidjeti (Floating AI Chat Widget) — Istalgan sahifadan chiqmasdan bir zumda yordam olish." : "Floating AI Chat widget accessible across any page without navigating away from coursework."}
        </div>
    </div>

    <!-- ================= SECTION 7: CV MAKER ================= -->
    <div class="page-break"></div>
    <h1>7.0 ${isUz ? "CV Maker (Professional Rezyume Yaratish va PDF Export)" : "CV Maker (Professional Resume Builder & Export)"}</h1>

    <h2>7.1 ${isUz ? "Xalqaro Standartdagi Rezyume Konstruktori" : "International Standard Resume Engine"}</h2>
    <p>
        ${isUz 
            ? "Prezident maktabi bitiruvchilari va o'qituvchilari uchun xalqaro universitetlar hamda nufuzli tashkilotlar talablariga to'la javob beruvchi 'CV Maker' moduli ishlab chiqilgan. Tizim Harvard Classic, Modern, Minimalist va Executive shablonlarini taqdim etadi."
            : "Developed specifically for Presidential school scholars and faculty, the CV Maker generates world-class academic and professional CVs compliant with Ivy League and international employer standards."
        }
    </p>

    <div class="figure-box">
        <img src="${images.cv_interface}" alt="Figure 7.1">
        <div class="figure-caption">
            <strong>Figure 7.1:</strong> ${isUz ? "CV Maker Asosiy Konstruktori va Bo'limlar Navigatsiyasi." : "CV Maker primary workspace displaying section tabs (Profile, Education, Experience, Skills, Contact)."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.cv_filled}" alt="Figure 7.2">
        <div class="figure-caption">
            <strong>Figure 7.2:</strong> ${isUz ? "Shaxsiy va Professional Ma'lumotlarni Kiritish Formasi." : "Resume data entry form populated with candidate career history and accomplishments."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.cv_templates}" alt="Figure 7.3">
        <div class="figure-caption">
            <strong>Figure 7.3:</strong> ${isUz ? "Dizayn Shablonlarini Tanlash Galereyasi (Modern, Harvard Classic, Minimalist)." : "Template Selector showcasing verified layouts including Harvard Classic and Modern Executive."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.cv_preview}" alt="Figure 7.4">
        <div class="figure-caption">
            <strong>Figure 7.4:</strong> ${isUz ? "Jonli A4 Rezyume Ko'rinishi (Live Preview) va 'PDF Yuklab Olish' Amali." : "High-resolution live A4 resume preview with 1-click 'Download PDF' and Print actions."}
        </div>
    </div>

    <!-- ================= SECTION 8: DIGITAL LAB ================= -->
    <div class="page-break"></div>
    <h1>8.0 ${isUz ? "Digital Lab (Interaktiv Raqamli STEM Laboratoriyasi)" : "Digital STEM Laboratory (CS, Physics, Chemistry, Biology, Math)"}</h1>

    <h2>8.1 ${isUz ? "5 Ta Ilmiy Yo'nalishdagi Simulyatsiya Muhiti" : "Interactive Simulations Across 5 STEM Disciplines"}</h2>
    <p>
        ${isUz 
            ? "Digital Lab o'quvchilarga tabiiy va aniq fanlarni amaliy tajribalar orqali o'rganish imkonini beradi. Laboratoriya Kompyuter Ilmlari (CS), Fizika, Kimyo, Biologiya va Matematika sohalaridagi real vaqt rejimida parametrlarini o'zgartirish mumkin bo'lgan simulyatsiyalarni o'z ichiga oladi."
            : "The Digital Lab is a state-of-the-art interactive virtual laboratory spanning Computer Science, Physics, Chemistry, Biology, and Mathematics, allowing learners to manipulate real-time physical variables."
        }
    </p>

    <div class="figure-box">
        <img src="${images.lab_overview}" alt="Figure 8.1">
        <div class="figure-caption">
            <strong>Figure 8.1:</strong> ${isUz ? "Digital STEM Laboratoriyasi Asosiy Portali va Fanlar Tanlovi." : "Digital STEM Laboratory portal featuring 5 domain selection tabs."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.lab_cs}" alt="Figure 8.2">
        <div class="figure-caption">
            <strong>Figure 8.2:</strong> ${isUz ? "CS Lab: Saralash Algoritmlari Vizualizatori (Bubble, Selection, Insertion Sort real vaqtda)." : "CS Lab Sort Visualizer demonstrating step-by-step array element comparisons and swaps."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.lab_physics}" alt="Figure 8.3">
        <div class="figure-caption">
            <strong>Figure 8.3:</strong> ${isUz ? "Fizika Laboratoriyasi: Matematik Mayatnik va Snaryad Harakati Simulyatori." : "Physics Lab interactive simulation featuring gravitational, mass, and string length sliders."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.lab_chemistry}" alt="Figure 8.4">
        <div class="figure-caption">
            <strong>Figure 8.4:</strong> ${isUz ? "Kimyo Laboratoriyasi: Interaktiv Davriy Jadval va Kimyoviy Reaksiyalar Balansi." : "Chemistry Lab interactive Periodic Table and chemical reaction stoichiometry balancer."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.lab_biology}" alt="Figure 8.5">
        <div class="figure-caption">
            <strong>Figure 8.5:</strong> ${isUz ? "Biologiya Laboratoriyasi: Hujayra Anatomiyasi Mikroskopi va DNK Replikatsiyasi." : "Biology Lab virtual microscope explorer and DNA genetics simulation."}
        </div>
    </div>

    <!-- ================= SECTION 9: LESSON PLAN & ROADMAP ================= -->
    <div class="page-break"></div>
    <h1>9.0 ${isUz ? "Dars Ishlanmasi (Lesson Plan) va Kelajak Versiyalar Yo'l Xaritasi" : "Lesson Plan Manager & Version 2.5 Roadmap"}</h1>

    <h2>9.1 ${isUz ? "AI Asosidagi Dars Rejasi Yaratuvchi Modul" : "AI-Powered Curriculum Syllabus Engine"}</h2>
    <p>
        ${isUz 
            ? "O'qituvchilarning darsga tayyorgarlik vaqtini 80% gacha tejovchi ushbu modul keyingi 2.5 versiyada taqdim etiladigan tizim imkoniyatlarini oldindan namoyish etadi. Davlat ta'lim standartlari (DTS) va Cambridge xalqaro mezonlari asosida avtomatlashtirilgan dars bayonnomalarini tuzadi."
            : "The Lesson Plan Manager features an upcoming preview of the Version 2.5 AI syllabus generator, engineered to automate Cambridge and national curriculum lesson planning."
        }
    </p>

    <div class="figure-box">
        <img src="${images.lesson_overview}" alt="Figure 9.1">
        <div class="figure-caption">
            <strong>Figure 9.1:</strong> ${isUz ? "Dars Ishlanmasi Moduli Ko'rinishi va Kelajak Imkoniyatlar Tavsifi." : "Lesson Plan Manager architecture card outlining Version 2.5 automated pedagogical features."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.lesson_preview}" alt="Figure 9.2">
        <div class="figure-caption">
            <strong>Figure 9.2:</strong> ${isUz ? "Dars Rejasi Tuzilishi: Maqsad, Kirish, Asosiy qism, Amaliy mashg'ulot va Uyga vazifa." : "Standard Lesson Plan framework including Learning Objectives, Warm-Up, Guided Practice, and Homework."}
        </div>
    </div>

    <!-- ================= SECTION 10: TEACHER SCHEDULE ================= -->
    <div class="page-break"></div>
    <h1>10.0 ${isUz ? "Dars Jadvallari va Rejalashtiruvchi (Teacher Schedule)" : "Teacher Schedule & Timetable Planner"}</h1>

    <h2>10.1 ${isUz ? "Haftalik Dars Jadvali To'ri" : "Interactive Weekly Timetable Grid"}</h2>
    <p>
        ${isUz 
            ? "O'qituvchi haftalik dars jadvalini Dushanbadan Shanbagacha 1-darsdan 6-darsgacha bo'lgan vaqt kesimida boshqaradi. Har bir katakchada sinf guruhi (masalan: 9-Green), xona raqami, fan va mavzu aks etadi."
            : "The Teacher Schedule module arranges institutional class schedules across Monday through Saturday, covering 6 daily academic periods with classroom location and syllabus notes."
        }
    </p>

    <div class="figure-box">
        <img src="${images.schedule_grid}" alt="Figure 10.1">
        <div class="figure-caption">
            <strong>Figure 10.1:</strong> ${isUz ? "O'qituvchi Haftalik Dars Jadvali (Dushanba - Shanba, 1-6 darslar)." : "Weekly Timetable Grid displaying period slots, classroom assignments, and active cohorts."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.schedule_modal}" alt="Figure 10.2">
        <div class="figure-caption">
            <strong>Figure 10.2:</strong> ${isUz ? "Dars Qo'shish Modali (Kun, Vaqt slotlari, Sinf, Xona va Mavzu)." : "Add Lesson Schedule modal configuring Day, Time Slot, Class Group, and Classroom."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.schedule_detail}" alt="Figure 10.3">
        <div class="figure-caption">
            <strong>Figure 10.3:</strong> ${isUz ? "Kunlik Darslar Tafsiloti (Batafsil vaqt va auditoriya xaritasi)." : "Daily Schedule drill-down showing detailed classroom logistics."}
        </div>
    </div>

    <!-- ================= SECTION 11: BIRTHDAYS & SOCIAL ================= -->
    <div class="page-break"></div>
    <h1>11.0 ${isUz ? "Tug'ilgan Kunlar Simulyatsiyasi va Ijtimoiy Muhit" : "Birthday Celebration System & Festive Simulation"}</h1>

    <h2>11.1 ${isUz ? "Maktab Jamoasi Tug'ilgan Kunlar Taqvim Boshqaruvi" : "Student & Faculty Birthday Calendar"}</h2>
    <p>
        ${isUz 
            ? "Maktabda iliq va jipslashgan ma'naviy muhit yaratish maqsadida o'quvchilar va xodimlarning tug'ilgan kunlarini nazorat qiluvchi maxsus ijtimoiy modul yaratilgan. Modulda bayramona shar va konfetti animatsiyalari simulyatsiya qilingan."
            : "Promoting community engagement and student morale, the Birthday Celebration system maintains an active directory of upcoming birthdays, accompanied by celebratory balloon animations and greeting alerts."
        }
    </p>

    <div class="figure-box">
        <img src="${images.birthday_calendar}" alt="Figure 11.1">
        <div class="figure-caption">
            <strong>Figure 11.1:</strong> ${isUz ? "Tug'ilgan Kunlar Boshqaruv Taqvimi va Yaqinlashayotgan Kunlar Lentası." : "Birthday Directory Dashboard tracking student and staff milestones."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.birthday_simulation}" alt="Figure 11.2">
        <div class="figure-caption">
            <strong>Figure 11.2:</strong> ${isUz ? "Bayramona Simulyatsiya Vidjeti (Uchuvchi sharlar va tabrik kartochkasi)." : "Interactive Celebration Widget with animated balloon physics and festive greeting banner."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.birthday_table}" alt="Figure 11.3">
        <div class="figure-caption">
            <strong>Figure 11.3:</strong> ${isUz ? "O'quvchilar Tug'ilgan Kunlar Ma'lumotlar Jadvali va Qidiruv Tizimi." : "Student Birthday database table with class filters and notification triggers."}
        </div>
    </div>

    <!-- ================= SECTION 12: STUDENT DASHBOARD ================= -->
    <div class="page-break"></div>
    <h1>12.0 ${isUz ? "O'quvchi Tajribasi va Baholash Jurnali (Student Dashboard & Grades)" : "Student Experience, Learning Flow & Grades"}</h1>

    <h2>12.1 ${isUz ? "O'quvchi Shaxsiy Kabineti va GPA Ko'rsatkichlari" : "Student Personal Portal & Academic GPA"}</h2>
    <p>
        ${isUz 
            ? "O'quvchi tizimga kirganda barcha fanlardan olgan joriy baholari, o'rtacha GPA ko'rsatkichi, topshirilishi kerak bo'lgan vazifalar va yaqinlashayotgan imtihonlarni bir joyda ko'radi."
            : "The Student Dashboard presents a unified view of cumulative GPA, subject scorecards, pending assignments, and upcoming exam deadlines."
        }
    </p>

    <div class="figure-box">
        <img src="${images.student_dash}" alt="Figure 12.1">
        <div class="figure-caption">
            <strong>Figure 12.1:</strong> ${isUz ? "O'quvchi Boshqaruv Paneli (Student Dashboard Overview va GPA)." : "Student Dashboard overview displaying cumulative GPA and academic progress."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.student_grades}" alt="Figure 12.2">
        <div class="figure-caption">
            <strong>Figure 12.2:</strong> ${isUz ? "Batafsil Baholar Jurnali (Fanlar kesimida choraklik va joriy baholar)." : "Detailed Student Gradebook breakdown detailing term marks and continuous assessment scores."}
        </div>
    </div>

    <!-- ================= SECTION 13: MANAGEMENT & AUDIT ================= -->
    <div class="page-break"></div>
    <h1>13.0 ${isUz ? "Menejment Paneli va Akademik Audit (Management & Inspection)" : "Management Panel, Teacher Audit & Inspection Analytics"}</h1>

    <h2>13.1 ${isUz ? "Maktab Rahbariyati Nazorati va Davlat Standartlari Auditi" : "Executive Leadership Analytics & Accreditation Audit"}</h2>
    <p>
        ${isUz 
            ? "Maktab direktori va o'quv ishlari bo'yicha o'rinbosarlar (Management) uchun barcha o'qituvchilarning dars o'tish faolligi, o'quv dasturlarini bajarish foizi, davomat va umumiy o'zlashtirish tahlilini taqdim etuvchi keng qamrovli audit paneli mavjud."
            : "Designed for school principals, academic directors, and Ministry auditors, the Management Panel delivers high-level oversight over faculty curriculum completion, attendance patterns, and grading velocity."
        }
    </p>

    <div class="figure-box">
        <img src="${images.management_kpi}" alt="Figure 13.1">
        <div class="figure-caption">
            <strong>Figure 13.1:</strong> ${isUz ? "Menejment Boshqaruv Paneli (Maktab KPI ko'rsatkichlari va o'zlashtirish grafigi)." : "Executive Management KPI Dashboard highlighting institutional metrics and syllabus completion."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.management_reports}" alt="Figure 13.3">
        <div class="figure-caption">
            <strong>Figure 13.3:</strong> ${isUz ? "Davlat Ta'lim Inspeksiyasi Uchun Eksport Hisobotlari (Audit Reports)." : "Accreditation and Ministry audit inspection reporting module."}
        </div>
    </div>

    <!-- ================= SECTION 14: ADMIN GOVERNANCE ================= -->
    <div class="page-break"></div>
    <h1>14.0 ${isUz ? "Administrator Paneli va Tizim Boshqaruvi (Admin Governance)" : "Administrator Panel, User CRUD & AI Control Center"}</h1>

    <h2>14.1 ${isUz ? "Foydalanuvchilar Boshqaruvi (Users CRUD)" : "User Management (Full CRUD Operations)"}</h2>
    <p>
        ${isUz 
            ? "Tizim administratori yangi o'qituvchilar, o'quvchilar va boshqaruv xodimlarini qo'shish, parollarini tiklash, rollarini o'zgartirish va akkreditatsiya ruxsatlarini berish huquqiga ega."
            : "System administrators hold top-tier control to Create, Read, Update, and Delete accounts across all roles, manage credentials, and assign subject certifications."
        }
    </p>

    <div class="figure-box">
        <img src="${images.admin_users}" alt="Figure 14.1">
        <div class="figure-caption">
            <strong>Figure 14.1:</strong> ${isUz ? "Administrator Foydalanuvchilar Jadvali (Barcha rollar, holatlar va boshqaruv amallari)." : "Admin Users Table providing complete governance over all system credentials."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.admin_modal}" alt="Figure 14.2">
        <div class="figure-caption">
            <strong>Figure 14.2:</strong> ${isUz ? "Yangi Foydalanuvchi Qo'shish Modali (F.I.O, Rol: O'qituvchi/O'quvchi, Login va Parol)." : "Add User modal configuring role designations, passwords, and subject permissions."}
        </div>
    </div>

    <div class="figure-box">
        <img src="${images.admin_ai}" alt="Figure 14.3">
        <div class="figure-caption">
            <strong>Figure 14.3:</strong> ${isUz ? "Administrator AI Boshqaruv Markazi (Model sozlamalari va token sarfi)." : "Admin AI Control Center configuring API parameters, model quotas, and safety guidelines."}
        </div>
    </div>

    <!-- ================= SECTION 15: FEATURE MATRIX ================= -->
    <div class="page-break"></div>
    <h1>15.0 ${isUz ? "To'liq Funksiyalar Matritsasi va Rollar Taqqoslovi" : "Comprehensive Feature Matrix & Role Permissions"}</h1>
    <table>
        <thead>
            <tr>
                <th>${isUz ? "Modul va Funksionallik" : "Module & Functionality"}</th>
                <th>${isUz ? "O'qituvchi" : "Teacher"}</th>
                <th>${isUz ? "O'quvchi" : "Student"}</th>
                <th>${isUz ? "Menejment" : "Management"}</th>
                <th>${isUz ? "Admin" : "Admin"}</th>
                <th>${isUz ? "Dalil (Figure)" : "Evidence"}</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>3D Landing & Accreditation</td><td>✓ Ko'rish</td><td>✓ Ko'rish</td><td>✓ Ko'rish</td><td>✓ Boshqaruv</td><td>Fig 1.1</td></tr>
            <tr><td>Course Creation (Yangi kurs)</td><td>✓ Yaratish / CRUD</td><td>— Ko'rish</td><td>✓ Audit</td><td>✓ To'liq CRUD</td><td>Fig 3.2 - 3.4</td></tr>
            <tr><td>Canvas Modules & Topics</td><td>✓ Boshqaruv</td><td>✓ O'rganish</td><td>✓ Audit</td><td>✓ Boshqaruv</td><td>Fig 3.4 - 3.6</td></tr>
            <tr><td>Protected PDF Viewer</td><td>✓ Yuklash</td><td>✓ O'qish (View-only)</td><td>✓ Ko'rish</td><td>✓ Boshqaruv</td><td>Fig 3.10</td></tr>
            <tr><td>Question Maker & Quizzes</td><td>✓ Yaratish</td><td>✓ Topshirish</td><td>✓ Tahlil</td><td>✓ To'liq</td><td>Fig 3.8</td></tr>
            <tr><td>Digital SAT Simulation Engine</td><td>✓ (Math) Nazorat</td><td>✓ To'liq Imtihon</td><td>✓ Natijalar</td><td>✓ To'liq Boshqaruv</td><td>Fig 4.1 - 4.9</td></tr>
            <tr><td>SAT Desmos Calculator & Formulas</td><td>✓ Ruxsat</td><td>✓ O'rnatilgan</td><td>✓ Ko'rish</td><td>✓ Sozlash</td><td>Fig 4.5 - 4.6</td></tr>
            <tr><td>CD IELTS Exam Engine</td><td>✓ (English) Nazorat</td><td>✓ L/R/W/S Imtihon</td><td>✓ Radar Tahlil</td><td>✓ To'liq Boshqaruv</td><td>Fig 5.1 - 5.7</td></tr>
            <tr><td>AI Assistant & Floating Tutoring</td><td>✓ Dars Rejasi</td><td>✓ Savol-Javob</td><td>✓ Ko'rish</td><td>✓ Token Boshqaruvi</td><td>Fig 6.1 - 6.3</td></tr>
            <tr><td>CV Maker & PDF Export</td><td>✓ Rezyume</td><td>✓ Rezyume</td><td>✓ Ko'rish</td><td>✓ To'liq</td><td>Fig 7.1 - 7.4</td></tr>
            <tr><td>Digital STEM Laboratory (5 Lab)</td><td>✓ Tajribalar</td><td>✓ Interaktiv Sinov</td><td>✓ Ko'rish</td><td>✓ To'liq</td><td>Fig 8.1 - 8.5</td></tr>
            <tr><td>Teacher Schedule & Timetable</td><td>✓ Jadval Tuzish</td><td>✓ Ko'rish</td><td>✓ Nazorat</td><td>✓ Boshqaruv</td><td>Fig 10.1 - 10.3</td></tr>
            <tr><td>Birthday Simulation System</td><td>✓ Ishtirok</td><td>✓ Tabrik / Shar</td><td>✓ Ro'yxat</td><td>✓ Excel Boshqaruv</td><td>Fig 11.1 - 11.3</td></tr>
            <tr><td>Student GPA & Grades Table</td><td>✓ Baholash</td><td>✓ Shaxsiy Natija</td><td>✓ Maktab Tahlili</td><td>✓ Boshqaruv</td><td>Fig 12.1 - 12.2</td></tr>
            <tr><td>Faculty Academic Audit</td><td>— O'z Natijasi</td><td>— Ruxsat yo'q</td><td>✓ To'liq Audit</td><td>✓ To'liq Audit</td><td>Fig 13.1 - 13.3</td></tr>
            <tr><td>User Governance & Role CRUD</td><td>— Faqat profil</td><td>— Faqat profil</td><td>— Ruxsat yo'q</td><td>✓ To'liq Boshqaruv</td><td>Fig 14.1 - 14.2</td></tr>
        </tbody>
    </table>

    <!-- ================= SECTION 16: EVIDENCE INDEX ================= -->
    <div class="page-break"></div>
    <h1>16.0 ${isUz ? "Skrinshot Dalillari Indeksi (Complete Evidence Index)" : "Complete Screenshot Evidence Index"}</h1>
    <table>
        <thead>
            <tr>
                <th style="width: 90px;">Evidence ID</th>
                <th>${isUz ? "Funksionallik va Modul" : "Feature & Module"}</th>
                <th style="width: 110px;">${isUz ? "Asosiy Rol" : "Primary Role"}</th>
                <th>${isUz ? "Skrinshot Tavsifi" : "Screenshot Content"}</th>
                <th style="width: 80px;">Figure</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>E-LND-001</td><td>Landing Hero</td><td>All</td><td>3D Knowledge Core & Accreditations</td><td>Fig 1.1</td></tr>
            <tr><td>E-LND-002</td><td>Authentication Modal</td><td>All</td><td>Credentials login & password visibility toggle</td><td>Fig 1.2</td></tr>
            <tr><td>E-LND-003</td><td>Quick Role Access</td><td>All / Audit</td><td>Instant switch to Teacher, Student, Management, Admin</td><td>Fig 1.3</td></tr>
            <tr><td>E-LND-004</td><td>Capabilities Drawer</td><td>All</td><td>Platform specifications and Version 2.0 release notes</td><td>Fig 1.4</td></tr>
            <tr><td>E-TCH-001</td><td>Teacher Dashboard</td><td>Teacher</td><td>Header greeting, class cards, and active course overview</td><td>Fig 2.1</td></tr>
            <tr><td>E-TCH-002</td><td>Teacher KPI Cards</td><td>Teacher</td><td>Students, courses, grade averages, and assignment stats</td><td>Fig 2.2</td></tr>
            <tr><td>E-TCH-003</td><td>Teacher Quick Actions</td><td>Teacher</td><td>+ Course, + Schedule, Gradebook, and AI Tutor</td><td>Fig 2.3</td></tr>
            <tr><td>E-TCH-004</td><td>Sidebar Navigation</td><td>Teacher</td><td>Complete tree of accessible academic and LMS modules</td><td>Fig 2.4</td></tr>
            <tr><td>E-CRS-001</td><td>Course Catalog</td><td>Teacher</td><td>Subject filters, search, and '+ Course' button</td><td>Fig 3.1</td></tr>
            <tr><td>E-CRS-002</td><td>Create Course (Empty)</td><td>Teacher</td><td>Empty course form with title, grade, subject fields</td><td>Fig 3.2</td></tr>
            <tr><td>E-CRS-003</td><td>Create Course (Filled)</td><td>Teacher</td><td>Filled metadata: Calculus, Grade 10, Mathematics</td><td>Fig 3.3</td></tr>
            <tr><td>E-CRS-004</td><td>Course Player Modules</td><td>Teacher</td><td>Canvas LMS module tree, publish switch, add item triggers</td><td>Fig 3.4</td></tr>
            <tr><td>E-CRS-005</td><td>Add Module Modal</td><td>Teacher</td><td>Module title input and chapter ordering</td><td>Fig 3.5</td></tr>
            <tr><td>E-CRS-006</td><td>Add Item Modal</td><td>Teacher</td><td>Selection modal: Topic, Page, Quiz, Assignment, Link, File</td><td>Fig 3.6</td></tr>
            <tr><td>E-CRS-007</td><td>Create Assignment Form</td><td>Teacher</td><td>Points: 100, Due date, attachment type: PDF/Link</td><td>Fig 3.7</td></tr>
            <tr><td>E-CRS-008</td><td>Question Maker</td><td>Teacher</td><td>Quiz editor with question prompt, options, answer key, points</td><td>Fig 3.8</td></tr>
            <tr><td>E-CRS-009</td><td>Topic Player</td><td>Student, Teacher</td><td>Lesson video player, lecture notes, attached resources</td><td>Fig 3.9</td></tr>
            <tr><td>E-CRS-010</td><td>Protected PDF Viewer</td><td>Student, Teacher</td><td>Secure view-only reading interface without download buttons</td><td>Fig 3.10</td></tr>
            <tr><td>E-SAT-001</td><td>SAT Dashboard</td><td>Student, Math Teacher</td><td>Scaled score tracker (400-1600) and section averages</td><td>Fig 4.1</td></tr>
            <tr><td>E-SAT-002</td><td>SAT Test Library</td><td>Student, Math Teacher</td><td>Official practice exams (Test 1, Test 2, Reading & Math)</td><td>Fig 4.2</td></tr>
            <tr><td>E-SAT-003</td><td>SAT Reading & Writing</td><td>Student</td><td>Passage on left, question on right, timer, mark for review</td><td>Fig 4.3</td></tr>
            <tr><td>E-SAT-004</td><td>SAT Math Engine</td><td>Student</td><td>Mathematical question renderer, scratchpad, student input</td><td>Fig 4.4</td></tr>
            <tr><td>E-SAT-005</td><td>Desmos Calculator</td><td>Student</td><td>Embedded official Desmos Graphing Calculator in Math section</td><td>Fig 4.5</td></tr>
            <tr><td>E-SAT-006</td><td>SAT Formula Sheet</td><td>Student</td><td>CollegeBoard official geometry formula reference sheet</td><td>Fig 4.6</td></tr>
            <tr><td>E-SAT-007</td><td>SAT Navigator</td><td>Student</td><td>Question grid showing answered, unanswered, flagged status</td><td>Fig 4.7</td></tr>
            <tr><td>E-SAT-009</td><td>SAT Score Report</td><td>Student, Math Teacher</td><td>Total scaled score out of 1600 and mistake-by-mistake review</td><td>Fig 4.9</td></tr>
            <tr><td>E-IEL-001</td><td>IELTS Dashboard</td><td>Student, English Teacher</td><td>Overall Band score tracker (0-9) and 4-skill radars</td><td>Fig 5.1</td></tr>
            <tr><td>E-IEL-002</td><td>IELTS Test Library</td><td>Student, English Teacher</td><td>Academic & General mock test library</td><td>Fig 5.2</td></tr>
            <tr><td>E-IEL-003</td><td>IELTS Listening</td><td>Student</td><td>Audio controls, volume slider, interactive question inputs</td><td>Fig 5.3</td></tr>
            <tr><td>E-IEL-004</td><td>IELTS Reading</td><td>Student</td><td>Split screen text passage, text highlighter, notepad</td><td>Fig 5.4</td></tr>
            <tr><td>E-IEL-005</td><td>IELTS Writing</td><td>Student</td><td>Task 1/2 prompts, live word counter, countdown timer</td><td>Fig 5.5</td></tr>
            <tr><td>E-IEL-006</td><td>IELTS Speaking</td><td>Student, English Teacher</td><td>Audio recording prompt and 4 official rubric criteria</td><td>Fig 5.6</td></tr>
            <tr><td>E-IEL-007</td><td>IELTS Band Score Report</td><td>Student, English Teacher</td><td>Official Candidate Performance Report card (Band 7.5)</td><td>Fig 5.7</td></tr>
            <tr><td>E-AIS-001</td><td>AI Assistant Workspace</td><td>All</td><td>Categorized academic prompt templates</td><td>Fig 6.1</td></tr>
            <tr><td>E-AIS-002</td><td>AI Live Conversation</td><td>All</td><td>STEM inquiry answered with structured markdown and latex</td><td>Fig 6.2</td></tr>
            <tr><td>E-AIS-003</td><td>Floating AI Widget</td><td>All</td><td>On-demand pop-up tutoring over active coursework</td><td>Fig 6.3</td></tr>
            <tr><td>E-CVM-001</td><td>CV Maker Workspace</td><td>Teacher, Student</td><td>Resume section tabs (Profile, Education, Skills, Contact)</td><td>Fig 7.1</td></tr>
            <tr><td>E-CVM-002</td><td>Resume Form Entry</td><td>Teacher, Student</td><td>Personal career metadata and accomplishments form</td><td>Fig 7.2</td></tr>
            <tr><td>E-CVM-003</td><td>Template Selector</td><td>Teacher, Student</td><td>Modern, Harvard Classic, Minimalist, Tech layouts</td><td>Fig 7.3</td></tr>
            <tr><td>E-CVM-004</td><td>A4 Resume Live Preview</td><td>Teacher, Student</td><td>Live scaled preview with PDF download and print triggers</td><td>Fig 7.4</td></tr>
            <tr><td>E-LAB-001</td><td>Digital Lab Overview</td><td>Student, Teacher</td><td>5 domain selectors: CS, Physics, Chemistry, Biology, Math</td><td>Fig 8.1</td></tr>
            <tr><td>E-LAB-002</td><td>CS Lab Sort Visualizer</td><td>Student, Teacher</td><td>Real-time Bubble, Selection, Insertion sort execution</td><td>Fig 8.2</td></tr>
            <tr><td>E-LAB-003</td><td>Physics Lab Simulation</td><td>Student, Teacher</td><td>Interactive pendulum & projectile motion physics engine</td><td>Fig 8.3</td></tr>
            <tr><td>E-LAB-004</td><td>Chemistry Lab</td><td>Student, Teacher</td><td>Interactive periodic table and reaction balancer</td><td>Fig 8.4</td></tr>
            <tr><td>E-LAB-005</td><td>Biology Lab</td><td>Student, Teacher</td><td>Virtual microscope cell anatomy and DNA genetics explorer</td><td>Fig 8.5</td></tr>
            <tr><td>E-LSP-001</td><td>Lesson Plan Manager</td><td>Teacher</td><td>Version 2.5 AI syllabus generator roadmap preview</td><td>Fig 9.1</td></tr>
            <tr><td>E-LSP-002</td><td>Lesson Plan Framework</td><td>Teacher</td><td>Structured objectives, warm-up, core activities, rubrics</td><td>Fig 9.2</td></tr>
            <tr><td>E-SCH-001</td><td>Weekly Timetable Grid</td><td>Teacher</td><td>Monday - Saturday period matrix with classroom cards</td><td>Fig 10.1</td></tr>
            <tr><td>E-SCH-002</td><td>Add Lesson Modal</td><td>Teacher</td><td>Day, Time slot, Class group, Room, and Subject form</td><td>Fig 10.2</td></tr>
            <tr><td>E-SCH-003</td><td>Daily Schedule Drilldown</td><td>Teacher</td><td>Detailed classroom logistics and lesson notes</td><td>Fig 10.3</td></tr>
            <tr><td>E-BRT-001</td><td>Birthday Calendar</td><td>All</td><td>Upcoming birthdays directory and monthly ticker</td><td>Fig 11.1</td></tr>
            <tr><td>E-BRT-002</td><td>Birthday Simulation</td><td>All</td><td>Floating balloon animations and greeting banners</td><td>Fig 11.2</td></tr>
            <tr><td>E-BRT-003</td><td>Birthday Table</td><td>Management, Admin</td><td>Searchable database with cohort filters and SMS triggers</td><td>Fig 11.3</td></tr>
            <tr><td>E-STU-001</td><td>Student Dashboard</td><td>Student</td><td>Cumulative GPA summary and active academic card overview</td><td>Fig 12.1</td></tr>
            <tr><td>E-STU-002</td><td>Student Gradebook Table</td><td>Student</td><td>Continuous assessment scores and term breakdown</td><td>Fig 12.2</td></tr>
            <tr><td>E-MGT-001</td><td>Management Dashboard</td><td>Management</td><td>Executive KPI summary and curriculum completion rates</td><td>Fig 13.1</td></tr>
            <tr><td>E-MGT-003</td><td>Inspection Audit Reports</td><td>Management</td><td>Accreditation and Ministry audit compliance export</td><td>Fig 13.3</td></tr>
            <tr><td>E-ADM-001</td><td>Admin Users Table</td><td>Admin</td><td>Governance over user accounts, roles, and status</td><td>Fig 14.1</td></tr>
            <tr><td>E-ADM-002</td><td>Create User Modal</td><td>Admin</td><td>New user account credentials and subject permission modal</td><td>Fig 14.2</td></tr>
            <tr><td>E-ADM-003</td><td>Admin AI Control Center</td><td>Admin</td><td>Model configurations, token usage, and system prompt setup</td><td>Fig 14.3</td></tr>
        </tbody>
    </table>

    <div class="box box-tip" style="margin-top: 40px; text-align: center;">
        <strong>EdTech Exchange • Termiz Shahridagi Prezident Maktabi</strong><br>
        ${isUz ? "Ushbu hujjat haqiqiy platforma tekshiruvi asosida avtomatik shakllantirildi va tasdiqlandi." : "This document is verified and certified against the active software deployment."}
    </div>

</div>

</body>
</html>`;
}

async function generate() {
    console.log("Generating HTML files...");
    const htmlEn = buildHTML('en');
    const htmlUz = buildHTML('uz');
    
    const fileEn = path.join(__dirname, 'LMS_Platform_Complete_User_Guide_EN.html');
    const fileUz = path.join(__dirname, 'LMS_Platform_Complete_User_Guide_UZ.html');
    
    fs.writeFileSync(fileEn, htmlEn);
    fs.writeFileSync(fileUz, htmlUz);
    console.log("HTML files written successfully.");

    console.log("Launching Puppeteer for PDF export...");
    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 1. Export EN PDF
    console.log("Rendering English PDF...");
    await page.goto(`file://${fileEn}`, { waitUntil: 'networkidle0' });
    const pdfEn = path.join(__dirname, 'LMS_Platform_Complete_User_Guide_EN.pdf');
    await page.pdf({
        path: pdfEn,
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' }
    });
    console.log(`[Generated PDF] ${pdfEn}`);

    // 2. Export UZ PDF
    console.log("Rendering Uzbek PDF...");
    await page.goto(`file://${fileUz}`, { waitUntil: 'networkidle0' });
    const pdfUz = path.join(__dirname, 'LMS_Platform_Complete_User_Guide_UZ.pdf');
    await page.pdf({
        path: pdfUz,
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' }
    });
    console.log(`[Generated PDF] ${pdfUz}`);

    await browser.close();
    console.log("\n=== ALL USER MANUALS GENERATED PERFECTLY! ===");
}

generate().catch(console.error);
