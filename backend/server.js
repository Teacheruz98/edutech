/**
 * EduTech Platform — server.js
 * Clean Modular Architecture
 * 
 * - App initialization, DB connection, global middleware & static files
 * - Routes modularized under routes/ directory
 */
require('dotenv').config();
console.log("🚀 STARTING SERVER VERSION 3.0 - CLEAN MODULAR ARCHITECTURE");

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const { authMiddleware } = require('./middleware/auth');

const app = express();

// ── Global Middleware ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.path.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    next();
}, express.static(path.join(__dirname, 'uploads')));

// ── Database Connection ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edutech')
    .then(() => console.log("✅ MongoDB muvaffaqiyatli ulandi"))
    .catch((err) => console.error("❌ MongoDB xatosi:", err));

// ── Modular Routes Mounting ────────────────────────────────────────────────────

// 1. Authentication & User Management
const authRoutes = require('./routes/auth.routes');
app.use('/api', authRoutes);

// 2. Courses, LMS (Materials, Modules, Assignments, Quizzes, Discussions, Messages, Question Bank)
const coursesRoutes = require('./routes/courses.routes');
app.use('/api', coursesRoutes);

// 3. Grades, Academic Performance & Semester Lock
const gradesRoutes = require('./routes/grades.routes');
app.use('/api', gradesRoutes);

// 4. Question Maker & DOCX Import
const questionMakerRoutes = require('./routes/questionMaker.routes');
app.use('/api', questionMakerRoutes);

// 5. AI Assistant & Admin AI Metrics
const aiRoutes = require('./routes/ai.routes');
app.use('/api', aiRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', aiRoutes);

// 6. Announcements
const announcementsRoutes = require('./routes/announcements.routes');
app.use('/api/announcements', announcementsRoutes);

// 7. System Settings
const settingsRoutes = require('./routes/settings.routes');
app.use('/api/settings', settingsRoutes);

// 8. Management Analytics & Audits
const managementRoutes = require('./routes/management.routes');
app.use('/api/management', managementRoutes);

// 9. Schedules & Deadlines
const schedulesRoutes = require('./routes/schedules.routes');
app.use('/api', schedulesRoutes);
app.use('/api/schedules', schedulesRoutes);

// 10. Staff Directory & Celebrations
const staffRoutes = require('./routes/staffRoutes');
app.use('/api/staff', staffRoutes);
app.use('/api/birthdays', staffRoutes);

const studentBirthdayRoutes = require('./routes/studentBirthdayRoutes');
app.use('/api/student-birthdays', studentBirthdayRoutes);

// 11. CD IELTS Exam Engine
const ieltsRoutes = require('./routes/ielts.routes');
app.use('/api/ielts', authMiddleware, ieltsRoutes);

// 12. Digital SAT Exam Engine
const satRoutes = require('./routes/sat.routes');
app.use('/api/sat', authMiddleware, satRoutes);

// 13. Cambridge Lesson Plans
const cambridgeLessonPlanRoutes = require('./routes/cambridge.routes');
app.use('/api/cambridge/lesson-plans', cambridgeLessonPlanRoutes);

// ── 404 Handler & Server Start ────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: "Route topilmadi" }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server http://localhost:${PORT}`));

module.exports = app;