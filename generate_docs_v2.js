const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'frontend/screenshots');
const images = {
    landing: path.join(imgDir, 'landing_page.png'),
    teacher_dashboard: path.join(imgDir, 'teacher_dashboard.png'),
    courses: path.join(imgDir, 'courses.png'),
    digital_sat: path.join(imgDir, 'digital-sat.png'),
    cd_ielts: path.join(imgDir, 'cd-ielts.png'),
    ai: path.join(imgDir, 'ai.png'),
    cv: path.join(imgDir, 'cv.png'),
    digital_lab: path.join(imgDir, 'digital-lab.png'),
    lesson_plan: path.join(imgDir, 'lesson-plan.png'),
    schedule: path.join(imgDir, 'schedule.png'),
    birthdays: path.join(imgDir, 'student-birthdays.png')
};

const base64Images = {};
for (const [key, filepath] of Object.entries(images)) {
    if (fs.existsSync(filepath)) {
        const base64 = fs.readFileSync(filepath).toString('base64');
        base64Images[key] = `data:image/png;base64,${base64}`;
    } else {
        base64Images[key] = ''; 
    }
}

function generateHTML(lang) {
    const isUz = lang === 'uz';
    
    const t = {
        title: isUz ? "LMS Platformasi To'liq Qo'llanmasi" : "Comprehensive LMS Platform Documentation",
        subtitle: isUz ? "Asosiy oyna, AI, Digital SAT, IELTS va Barcha Tizim Modullari" : "Landing Page, AI, Digital SAT, IELTS and All Modules",
        prepared: isUz ? "Rasmiy foydalanish uchun • 2.0 Versiya" : "For Official Use • Version 2.0",
        
        sec1Title: isUz ? "1. Asosiy Oyna (Landing Page) va E'lonlar" : "1. Landing Page & Announcements",
        sec1Desc: isUz ? "Platformaga kirmasdan oldin o'quvchilar va mehmonlarni zamonaviy Asosiy Oyna (Landing Page) kutib oladi. Bu yerda yangiliklar va so'nggi e'lonlar markazlashgan holda taqdim etiladi." : "Before logging in, users are greeted by a modern Landing Page where announcements and updates are dynamically displayed.",
        
        sec2Title: isUz ? "2. Kurslar Yaratish va Boshqarish (Courses)" : "2. Course Creation & Management",
        sec2Desc: isUz ? "O'qituvchilar yangi kurslar yaratishlari, mavzular (topics) qoshishlari, va videodarslar hamda PDF materiallarni biriktirishlari mumkin. 'Question Maker' interfeysi orqali testlar qo'shiladi." : "Teachers can create courses, add topics, attach video lessons, and secure PDFs. The 'Question Maker' interface allows seamless quiz integration.",
        
        sec3Title: isUz ? "3. Digital SAT va CD IELTS Simulyatsiyalari" : "3. Digital SAT & CD IELTS Simulations",
        sec3Desc: isUz ? "Ushbu noyob modullar o'quvchilarga Haqiqiy Digital SAT (CollegeBoard) va CD IELTS testlarini topshirish hissini beradi. Taymer, savollar navigatsiyasi va ballarni baholash avtomatlashtirilgan." : "These unique modules provide students with realistic Digital SAT (CollegeBoard) and CD IELTS exam experiences. Timer, question navigation, and automated scoring are built-in.",
        
        sec4Title: isUz ? "4. Sun'iy Intellekt (AI) Yordamchisi" : "4. Artificial Intelligence (AI) Assistant",
        sec4Desc: isUz ? "Platformaga OpenAI negizida ishlovchi aqlli AI yordamchisi kiritilgan. Bu o'quvchilarga matnlarni tarjima qilish, tushuntirish berish va masalalar yechishda interaktiv darsxona vazifasini o'taydi." : "An OpenAI-powered intelligent assistant is integrated. It serves as an interactive tutor for students, helping with translation, explanations, and problem-solving.",
        
        sec5Title: isUz ? "5. CV Maker (Rezyume Yaratish)" : "5. CV Maker (Resume Generator)",
        sec5Desc: isUz ? "Bitiruvchilar va o'qituvchilar o'zlarining shaxsiy ma'lumotlarini to'ldirgan holda xalqaro standartlarga mos CV/Rezyume yaratib yuklab olishlari mumkin." : "Graduates and teachers can fill in their details to automatically generate and download internationally standardized CVs/Resumes.",
        
        sec6Title: isUz ? "6. Digital Lab va Lesson Plan" : "6. Digital Lab & Lesson Planner",
        sec6Desc: isUz ? "Digital Lab interaktiv laboratoriya vazifasini o'taydi. Lesson Plan (Dars rejasi) AI orqali o'qituvchilarga mavzu bo'yicha to'liq dars bayonnomasini ishlab chiqadi." : "Digital Lab serves as an interactive laboratory. The Lesson Planner uses AI to generate comprehensive lesson guides for teachers instantly.",
        
        sec7Title: isUz ? "7. Dars Jadvallari va Tug'ilgan kunlar (Simulyatsiya)" : "7. Timetable Schedules & Birthday Simulations",
        sec7Desc: isUz ? "Schedule (Jadval) qismi orqali ustozlar darslarini rejalashtiradi. Tug'ilgan kun qismida esa o'quvchilar tug'ilgan kunlarini kuzatib boruvchi qiziqarli elementlar joylashgan." : "The Schedule module lets teachers plan their classes. The Birthday section introduces fun, engaging elements tracking student birthdays."
    };

    return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <title>${t.title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
        
        body { font-family: 'Inter', sans-serif; color: #0f172a; line-height: 1.6; margin: 0; padding: 0; background: #f8fafc; }

        @page { size: A4; margin: 0; }
        @media print {
            body { background: white; }
            .page { box-shadow: none !important; margin: 0 !important; width: 100% !important; height: 100vh !important; page-break-after: always; }
        }

        .page { background: white; width: 210mm; min-height: 297mm; margin: 40px auto; padding: 20mm; box-sizing: border-box; box-shadow: 0 10px 30px rgba(0,0,0,0.05); position: relative; }
        
        h1 { font-size: 38px; font-weight: 800; color: #1e293b; margin-bottom: 10px; line-height: 1.2; text-align: center; }
        .subtitle { font-size: 20px; color: #64748b; font-weight: 300; margin-bottom: 40px; text-align: center; }
        h2 { font-size: 24px; font-weight: 800; color: #2563eb; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
        p { font-size: 15px; color: #475569; margin-bottom: 15px; }
        
        .image-box { background: #f1f5f9; border-radius: 12px; padding: 10px; margin: 20px 0; border: 1px solid #e2e8f0; text-align: center; }
        .image-box img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #cbd5e1; }
        
        .footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; font-weight: 600; }
    </style>
</head>
<body>

    <!-- Cover Page -->
    <div class="page" style="display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
        <h1>${t.title}</h1>
        <div class="subtitle">${t.subtitle}</div>
        <p style="margin-top: 60px; font-weight: 600;">${t.prepared}</p>
    </div>

    <!-- 1. Landing Page -->
    <div class="page">
        <h2>${t.sec1Title}</h2>
        <p>${t.sec1Desc}</p>
        <div class="image-box">
            ${base64Images.landing ? `<img src="${base64Images.landing}" alt="Landing Page">` : 'Image not available'}
        </div>
        <div class="footer"><span>LMS Documentation</span><span>Section 1</span></div>
    </div>

    <!-- 2. Courses -->
    <div class="page">
        <h2>${t.sec2Title}</h2>
        <p>${t.sec2Desc}</p>
        <div class="image-box">
            ${base64Images.courses ? `<img src="${base64Images.courses}" alt="Courses">` : 'Image not available'}
        </div>
        <div class="footer"><span>LMS Documentation</span><span>Section 2</span></div>
    </div>

    <!-- 3. SAT & IELTS -->
    <div class="page">
        <h2>${t.sec3Title}</h2>
        <p>${t.sec3Desc}</p>
        <div class="image-box">
            ${base64Images.digital_sat ? `<img src="${base64Images.digital_sat}" alt="Digital SAT">` : 'Image not available'}
        </div>
        <div class="image-box">
            ${base64Images.cd_ielts ? `<img src="${base64Images.cd_ielts}" alt="CD IELTS">` : 'Image not available'}
        </div>
        <div class="footer"><span>LMS Documentation</span><span>Section 3</span></div>
    </div>

    <!-- 4. AI Assistant -->
    <div class="page">
        <h2>${t.sec4Title}</h2>
        <p>${t.sec4Desc}</p>
        <div class="image-box">
            ${base64Images.ai ? `<img src="${base64Images.ai}" alt="AI Assistant">` : 'Image not available'}
        </div>
        <div class="footer"><span>LMS Documentation</span><span>Section 4</span></div>
    </div>

    <!-- 5. CV Maker -->
    <div class="page">
        <h2>${t.sec5Title}</h2>
        <p>${t.sec5Desc}</p>
        <div class="image-box">
            ${base64Images.cv ? `<img src="${base64Images.cv}" alt="CV Maker">` : 'Image not available'}
        </div>
        <div class="footer"><span>LMS Documentation</span><span>Section 5</span></div>
    </div>

    <!-- 6. Digital Lab & Lesson Plan -->
    <div class="page">
        <h2>${t.sec6Title}</h2>
        <p>${t.sec6Desc}</p>
        <div class="image-box">
            ${base64Images.digital_lab ? `<img src="${base64Images.digital_lab}" alt="Digital Lab">` : 'Image not available'}
        </div>
        <div class="image-box">
            ${base64Images.lesson_plan ? `<img src="${base64Images.lesson_plan}" alt="Lesson Plan">` : 'Image not available'}
        </div>
        <div class="footer"><span>LMS Documentation</span><span>Section 6</span></div>
    </div>

    <!-- 7. Timetable & Birthdays -->
    <div class="page">
        <h2>${t.sec7Title}</h2>
        <p>${t.sec7Desc}</p>
        <div class="image-box">
            ${base64Images.schedule ? `<img src="${base64Images.schedule}" alt="Schedule">` : 'Image not available'}
        </div>
        <div class="image-box">
            ${base64Images.birthdays ? `<img src="${base64Images.birthdays}" alt="Birthdays">` : 'Image not available'}
        </div>
        <div class="footer"><span>LMS Documentation</span><span>Section 7</span></div>
    </div>

</body>
</html>
    `;
}

fs.writeFileSync('/Users/safarmurodallakulov/Desktop/edutech-platform/LMS_Platform_Documentation_EN.html', generateHTML('en'));
fs.writeFileSync('/Users/safarmurodallakulov/Desktop/edutech-platform/LMS_Platform_Documentation_UZ.html', generateHTML('uz'));
console.log("Docs fully generated with dynamic screenshots!");
