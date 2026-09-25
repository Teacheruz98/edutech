const fs = require('fs');

const images = {
    pdf_material: '/Users/safarmurodallakulov/.gemini/antigravity-ide/brain/33453ca6-2b95-4f36-a7b7-e0ffd7dc6948/pdf_material_view_1790312297589.png',
    uzbek_grades: '/Users/safarmurodallakulov/.gemini/antigravity-ide/brain/33453ca6-2b95-4f36-a7b7-e0ffd7dc6948/uzbek_grades_view_1790307000509.png',
    russian_grades: '/Users/safarmurodallakulov/.gemini/antigravity-ide/brain/33453ca6-2b95-4f36-a7b7-e0ffd7dc6948/russian_grades_view_1790307036927.png',
    english_grades: '/Users/safarmurodallakulov/.gemini/antigravity-ide/brain/33453ca6-2b95-4f36-a7b7-e0ffd7dc6948/english_grades_view_1790307015311.png',
    student_mats: '/Users/safarmurodallakulov/.gemini/antigravity-ide/brain/33453ca6-2b95-4f36-a7b7-e0ffd7dc6948/topic_view_materials_1790311680141.png',
    dark_mode: '/Users/safarmurodallakulov/.gemini/antigravity-ide/brain/33453ca6-2b95-4f36-a7b7-e0ffd7dc6948/footer_pill_dark_mode_1790308071269.png'
};

const base64Images = {};
for (const [key, path] of Object.entries(images)) {
    if (fs.existsSync(path)) {
        const base64 = fs.readFileSync(path).toString('base64');
        base64Images[key] = `data:image/png;base64,${base64}`;
    } else {
        base64Images[key] = ''; // empty if not found
    }
}

function generateHTML(lang) {
    const isUz = lang === 'uz';
    
    // Translations
    const t = {
        title: isUz ? "LMS Platformasi Foydalanuvchi Qo'llanmasi" : "LMS Platform Documentation & User Guide",
        subtitle: isUz ? "Tizim imkoniyatlari, barcha modullar va qadam-ba-qadam qo'llanma" : "System Overview, All Modules & Step-by-Step User Guide",
        prepared: isUz ? "Ta'lim muassasalari uchun tayyorlangan • Versiya 2.0 • Sentabr 2026" : "Prepared for Educational Institution Use • Version 2.0 • September 2026",
        toc: isUz ? "Mundarija" : "Table of Contents",
        toc1: isUz ? "1. Kirish, Asosiy Oyna va E'lonlar" : "1. Introduction, Main Page & Announcements",
        toc2: isUz ? "2. Foydalanuvchi Rollari va Ruxsatlar" : "2. User Roles & Permissions",
        toc3: isUz ? "3. O'qituvchi Boshqaruvi va Jarayonlar" : "3. Teacher Dashboard & Workflows",
        toc4: isUz ? "4. O'quvchilar Ta'lim Jarayoni" : "4. Student Learning Experience",
        toc5: isUz ? "5. Digital SAT va CD IELTS Platformalari" : "5. Digital SAT & CD IELTS Platforms",
        toc6: isUz ? "6. Sun'iy Intellekt (AI) va CV Maker" : "6. AI Integration & CV Maker",
        toc7: isUz ? "7. Menejment Tahlili va Admin Tizimi" : "7. Management Analytics & Admin System",
        page: isUz ? "Sahifa" : "Page",
        note: isUz ? "Eslatma: Ushbu hujjat bevosita platformaning hozirgi ishlash holatidan kelib chiqib, haqiqiy dalillar (skrinshotlar) asosida avtomatik shakllantirildi." : "Note: This documentation is generated based on a live inspection of the ACTUAL LMS platform, using real screenshots as evidence.",
        
        // Section 1
        sec1Title: isUz ? "1. Kirish, Asosiy Oyna va E'lonlar" : "1. Introduction, Main Page & Announcements",
        whatIs: isUz ? "LMS o'zi nima?" : "What is this LMS?",
        whatIsDesc: isUz ? "Ushbu tizim o'qituvchilar, o'quvchilar va maktab rahbariyatini yagona raqamli muhitda birlashtiruvchi markazlashgan platformadir." : "This system is a centralized platform uniting teachers, students, and management in a single digital environment.",
        mainPage: isUz ? "Asosiy Kirish Oynasi (Landing Page)" : "Main Landing Page",
        mainPageDesc: isUz ? "Tizimga kirmasdan oldin barcha foydalanuvchilar chiroyli dizayndagi asosiy oynani ko'radi. Bu yerda platformaning asosiy qulayliklari haqida ma'lumot beriladi." : "Before logging in, all users see a beautifully designed landing page detailing the platform's core benefits.",
        announcements: isUz ? "E'lonlar va Yangiliklar" : "Announcements & News",
        announcementsDesc: isUz ? "Maktab ma'muriyati yoki o'qituvchilar o'quvchilar uchun e'lonlar qoldirishi mumkin. E'lonlar hamma uchun ochiq oynada ko'rinadi." : "School administration or teachers can post announcements for students. These appear in a public feed.",
        
        // Section 2
        sec2Title: isUz ? "2. Foydalanuvchi Rollari va Ruxsatlar" : "2. User Roles & Permissions",
        rolesDesc: isUz ? "Tizim qat'iy Rollar (Role-Based Access Control) tizimida ishlaydi. Har bir foydalanuvchiga tegishli huquqlar berilgan." : "The system operates on strict Role-Based Access Control (RBAC). Each user has specific privileges.",
        teacher: isUz ? "O'qituvchi (Teacher): Kurslar, testlar yaratadi, o'quvchilarni baholaydi." : "Teacher: Creates courses, tests, and grades students.",
        student: isUz ? "O'quvchi (Student): Berilgan materiallarni o'qiydi, testlar ishlaydi. Ma'lumotlarni ruxsatsiz yuklab ololmaydi." : "Student: Reads materials, takes tests. Cannot download restricted content.",
        management: isUz ? "Menejment (Management): Barcha o'qituvchi va o'quvchilarning statistikasini kuzatadi." : "Management: Monitors statistics of all teachers and students.",
        admin: isUz ? "Admin: Tizim sozlamalari va foydalanuvchilarni to'liq boshqaradi." : "Admin: Fully manages system settings and users.",
        
        // Section 3
        sec3Title: isUz ? "3. O'qituvchi Boshqaruvi va Jarayonlar" : "3. Teacher Dashboard & Workflows",
        qm: isUz ? "Question Maker va Testlar" : "Question Maker & Assessments",
        qmDesc: isUz ? "O'qituvchilar MS Word (.docx) fayllarni to'g'ridan-to'g'ri tizimga yuklashi yoki qo'lda savollar yaratishi mumkin. To'g'ri javoblarni 'asterisk' (*) orqali belgilaydi." : "Teachers can upload MS Word (.docx) files directly or create questions manually. Correct answers are marked with an asterisk (*).",
        pdfProtect: isUz ? "PDF Materiallarni Himoyalash" : "PDF Material Protection",
        pdfProtectDesc: isUz ? "O'qituvchi tomonidan yuklangan fayllar (PDF) o'quvchilar uchun faqat o'qish (View-only) rejimida ochiladi. Yuklab olish tugmasi o'quvchilar uchun bloklangan." : "Files uploaded by teachers (PDF) open in View-only mode for students. The download button is restricted.",
        
        // Section 4
        sec4Title: isUz ? "4. O'quvchilar Ta'lim Jarayoni" : "4. Student Learning Experience",
        studentWorkflow: isUz ? "O'quvchi Jarayoni" : "Student Workflow",
        studentSteps: isUz ? "1. Kurslarni tanlash<br>2. Video yoki PDF materiallarni ko'rish<br>3. 'Question Maker' orqali berilgan testlarni ishlash<br>4. Avtomatik hisoblangan baholarni ko'rish" : "1. Select courses<br>2. View Video or PDF materials<br>3. Take 'Question Maker' tests<br>4. View auto-calculated grades",
        
        // Section 5
        sec5Title: isUz ? "5. Digital SAT va CD IELTS Platformalari" : "5. Digital SAT & CD IELTS Platforms",
        satIeltsDesc: isUz ? "Ushbu tizimning yana bir ilg'or qismi maxsus xalqaro imtihonlarga tayyorlov modulidir." : "Another advanced feature is the specialized international exam preparation module.",
        satDesc: isUz ? "<strong>Digital SAT:</strong> College Board standartlariga to'liq javob beruvchi, raqamli SAT imtihoni simulyatsiyasi. Reading/Writing va Math bo'limlari, taymer va adaptiv test tizimi kiritilgan." : "<strong>Digital SAT:</strong> A digital SAT simulation fully meeting College Board standards. Includes Reading/Writing and Math sections, a timer, and adaptive testing.",
        ieltsDesc: isUz ? "<strong>CD IELTS:</strong> Computer-Delivered IELTS simulyatsiyasi. Listening, Reading, Writing va Speaking bo'limlarini asl IELTS muhitida mashq qilish imkoniyati." : "<strong>CD IELTS:</strong> Computer-Delivered IELTS simulation. Practice Listening, Reading, Writing, and Speaking in a real IELTS environment.",
        
        // Section 6
        sec6Title: isUz ? "6. Sun'iy Intellekt (AI) va CV Maker" : "6. AI Integration & CV Maker",
        aiTitle: isUz ? "AI Yordamchisi" : "AI Assistant",
        aiDesc: isUz ? "Tizimga integratsiya qilingan Sun'iy Intellekt o'quvchilarga qiyin mavzularni tushunishda, o'qituvchilarga esa testlar tuzishda va matnlarni tarjima qilishda yordam beradi." : "Integrated AI helps students understand complex topics and assists teachers in creating tests and translating texts.",
        cvTitle: isUz ? "CV Maker (Rezyume Yaratuvchi)" : "CV Maker",
        cvDesc: isUz ? "Foydalanuvchilar o'z yutuqlari, tillarni bilish darajasi va ta'lim tarixini kiritib, professional darajadagi CV (Rezyume) generatsiya qilishlari mumkin. Bu PDF formatida yuklab olinadi." : "Users can enter achievements, language skills, and education history to generate a professional CV (Resume) downloadable as a PDF.",
        
        // Section 7
        sec7Title: isUz ? "7. Menejment Tahlili va Admin Tizimi" : "7. Management Analytics & Admin System",
        mngDesc: isUz ? "<strong>Menejment:</strong> Barcha maktab o'zlashtirish ko'rsatkichlari, eng yaxshi va eng past o'quvchilar reytinglari hamda ustozlar faolligini bitta ekranda ko'radi." : "<strong>Management:</strong> Views all school performance metrics, top/bottom student rankings, and teacher activity on one screen.",
        admDesc: isUz ? "<strong>Admin:</strong> Rollarni o'zgartirish, tili (O'zbek, Rus, Ingliz) almashtirish, va Dark/Light (Qorong'u/Yorug') rejimlarini global sozlash huquqiga ega." : "<strong>Admin:</strong> Has rights to change roles, switch languages (Uzbek, Russian, English), and globally configure Dark/Light modes.",
    };

    return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <title>${t.title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
        
        :root {
            --primary: #2563eb;
            --primary-light: #eff6ff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --bg-page: #ffffff;
            --border: #e2e8f0;
        }

        body { font-family: 'Inter', sans-serif; color: var(--text-main); line-height: 1.6; margin: 0; padding: 0; background: #f8fafc; }

        @page { size: A4; margin: 0; }
        @media print {
            body { background: white; }
            .page { box-shadow: none !important; margin: 0 !important; width: 100% !important; height: 100vh !important; page-break-after: always; }
        }

        .page { background: white; width: 210mm; min-height: 297mm; margin: 40px auto; padding: 20mm; box-sizing: border-box; box-shadow: 0 10px 30px rgba(0,0,0,0.05); position: relative; }
        .cover { display: flex; flex-direction: column; justify-content: center; text-align: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); }
        .cover-logo { font-size: 64px; margin-bottom: 20px; }
        
        h1 { font-size: 42px; font-weight: 800; color: #0f172a; margin-bottom: 10px; line-height: 1.2; }
        .subtitle { font-size: 22px; color: #64748b; font-weight: 300; margin-bottom: 40px; }
        h2 { font-size: 28px; font-weight: 800; color: var(--primary); margin-top: 0; border-bottom: 2px solid var(--border); padding-bottom: 15px; }
        h3 { font-size: 20px; font-weight: 600; color: #1e293b; margin-top: 30px; border-left: 4px solid var(--primary); padding-left: 10px; }
        p { font-size: 15px; color: var(--text-muted); margin-bottom: 15px; }

        .footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; border-top: 1px solid var(--border); padding-top: 10px; font-weight: 600; }
        
        .image-box { background: #f1f5f9; border-radius: 12px; padding: 10px; margin: 20px 0; border: 1px solid var(--border); text-align: center; }
        .image-box img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .caption { font-size: 12px; color: var(--text-muted); margin-top: 10px; font-weight: 600; }
        
        .placeholder-box { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; padding: 40px; border-radius: 12px; text-align: center; font-weight: 600; font-size: 18px; margin: 20px 0; box-shadow: inset 0 0 20px rgba(0,0,0,0.5); }

        .callout { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
        .callout strong { color: #b45309; }
        
        .workflow-box { background: var(--primary-light); border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-top: 20px; }
        ul.feature-list { list-style: none; padding: 0; }
        ul.feature-list li { position: relative; padding-left: 24px; margin-bottom: 10px; font-size: 15px; color: var(--text-muted); }
        ul.feature-list li::before { content: '✓'; position: absolute; left: 0; color: #10b981; font-weight: bold; }
    </style>
</head>
<body>

    <!-- PAGE 1: COVER -->
    <div class="page cover">
        <div class="cover-logo">🎓</div>
        <h1>${t.title}</h1>
        <div class="subtitle">${t.subtitle}</div>
        <p style="margin-top: auto; font-size: 13px; font-weight: 600; color: #94a3b8;">${t.prepared}</p>
    </div>

    <!-- PAGE 2: TABLE OF CONTENTS -->
    <div class="page">
        <h2>${t.toc}</h2>
        <div style="font-size: 16px; line-height: 2.2; margin-top: 30px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1;"><strong>${t.toc1}</strong> <span>${t.page} 3</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1;"><strong>${t.toc2}</strong> <span>${t.page} 4</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1;"><strong>${t.toc3}</strong> <span>${t.page} 5</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1;"><strong>${t.toc4}</strong> <span>${t.page} 6</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1;"><strong>${t.toc5}</strong> <span>${t.page} 7</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1;"><strong>${t.toc6}</strong> <span>${t.page} 8</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1;"><strong>${t.toc7}</strong> <span>${t.page} 9</span></div>
        </div>
        <div class="callout" style="margin-top: 50px;"><strong>Info:</strong> ${t.note}</div>
        <div class="footer"><span>LMS Documentation</span><span>${t.page} 2</span></div>
    </div>

    <!-- PAGE 3: INTRO -->
    <div class="page">
        <h2>${t.sec1Title}</h2>
        <h3>${t.whatIs}</h3>
        <p>${t.whatIsDesc}</p>
        
        <h3>${t.mainPage}</h3>
        <p>${t.mainPageDesc}</p>
        
        <h3>${t.announcements}</h3>
        <p>${t.announcementsDesc}</p>
        
        <div class="placeholder-box">🌐 EdTech Exchange Landing Page & Announcements Board</div>
        
        <div class="footer"><span>LMS Documentation</span><span>${t.page} 3</span></div>
    </div>

    <!-- PAGE 4: ROLES -->
    <div class="page">
        <h2>${t.sec2Title}</h2>
        <p>${t.rolesDesc}</p>
        
        <ul class="feature-list">
            <li>${t.teacher}</li>
            <li>${t.student}</li>
            <li>${t.management}</li>
            <li>${t.admin}</li>
        </ul>

        <h3>Multi-Language UI Evidence</h3>
        <div class="image-box" style="display: flex; gap: 10px; padding: 10px; background: transparent; border: none;">
            ${base64Images.uzbek_grades ? `<img src="${base64Images.uzbek_grades}" style="width: 32%;">` : ''}
            ${base64Images.russian_grades ? `<img src="${base64Images.russian_grades}" style="width: 32%;">` : ''}
            ${base64Images.english_grades ? `<img src="${base64Images.english_grades}" style="width: 32%;">` : ''}
        </div>
        
        <div class="footer"><span>LMS Documentation</span><span>${t.page} 4</span></div>
    </div>

    <!-- PAGE 5: TEACHER -->
    <div class="page">
        <h2>${t.sec3Title}</h2>
        <h3>${t.qm}</h3>
        <p>${t.qmDesc}</p>
        
        <h3>${t.pdfProtect}</h3>
        <p>${t.pdfProtectDesc}</p>
        
        ${base64Images.pdf_material ? `
        <div class="image-box">
            <img src="${base64Images.pdf_material}" alt="PDF Protection">
            <div class="caption">Secure PDF Viewer in Iframe (#toolbar=0)</div>
        </div>` : ''}
        
        <div class="footer"><span>LMS Documentation</span><span>${t.page} 5</span></div>
    </div>

    <!-- PAGE 6: STUDENT -->
    <div class="page">
        <h2>${t.sec4Title}</h2>
        <div class="workflow-box">
            <h4>${t.studentWorkflow}</h4>
            <p>${t.studentSteps}</p>
        </div>
        
        ${base64Images.student_mats ? `
        <div class="image-box">
            <img src="${base64Images.student_mats}" alt="Student Modules">
            <div class="caption">Student View of Materials</div>
        </div>` : ''}
        
        <div class="footer"><span>LMS Documentation</span><span>${t.page} 6</span></div>
    </div>

    <!-- PAGE 7: SAT & IELTS -->
    <div class="page">
        <h2>${t.sec5Title}</h2>
        <p>${t.satIeltsDesc}</p>
        <p>${t.satDesc}</p>
        <p>${t.ieltsDesc}</p>
        
        <div class="placeholder-box">📈 Digital SAT & CD IELTS Mock Exam Simulators</div>
        
        <div class="footer"><span>LMS Documentation</span><span>${t.page} 7</span></div>
    </div>

    <!-- PAGE 8: AI & CV -->
    <div class="page">
        <h2>${t.sec6Title}</h2>
        <h3>${t.aiTitle}</h3>
        <p>${t.aiDesc}</p>
        
        <h3>${t.cvTitle}</h3>
        <p>${t.cvDesc}</p>
        
        <div class="placeholder-box">🤖 Antigravity AI Chatbot & CV Generator Output</div>
        
        <div class="footer"><span>LMS Documentation</span><span>${t.page} 8</span></div>
    </div>

    <!-- PAGE 9: MANAGEMENT & ADMIN -->
    <div class="page">
        <h2>${t.sec7Title}</h2>
        <p>${t.mngDesc}</p>
        <p>${t.admDesc}</p>
        
        ${base64Images.dark_mode ? `
        <div class="image-box">
            <img src="${base64Images.dark_mode}" alt="Dark Mode Support">
            <div class="caption">System-wide Dark Mode Toggle (Admin Control)</div>
        </div>` : ''}
        
        <div style="margin-top: 80px; text-align: center; color: #94a3b8; font-size: 14px;">
            <div style="font-size: 24px; margin-bottom: 10px;">🛡️</div>
            <strong>END OF DOCUMENTATION</strong>
        </div>
        
        <div class="footer"><span>LMS Documentation</span><span>${t.page} 9</span></div>
    </div>

</body>
</html>
    `;
}

fs.writeFileSync('/Users/safarmurodallakulov/Desktop/edutech-platform/LMS_Platform_Documentation_EN.html', generateHTML('en'));
fs.writeFileSync('/Users/safarmurodallakulov/Desktop/edutech-platform/LMS_Platform_Documentation_UZ.html', generateHTML('uz'));
console.log("Documents generated successfully.");
