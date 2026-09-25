const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Grade = require('../models/Grade');
const GradeUnlockRequest = require('../models/GradeUnlockRequest');
const { authMiddleware, adminOnly, teacherOrAdmin } = require('../middleware/auth');
const { getCurrentSemester, getCambridgeGrade, checkSemesterLock } = require('../utils/gradeHelpers');

// ── Teacher Courses ───────────────────────────────────────────────────────────
router.get('/teacher/courses', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const courses = req.user.role === 'admin'
            ? await Course.find().populate('instructor', 'username').sort({ createdAt: -1 })
            : await Course.find({ instructor: req.user.userId }).populate('instructor', 'username').sort({ createdAt: -1 });
        res.json(courses || []);
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

// ── Course Grades ─────────────────────────────────────────────────────────────
router.get('/courses/:id/grades', authMiddleware, async (req, res) => {
    try {
        const semester = req.query.semester || getCurrentSemester();
        res.json(await Grade.find({ courseId: req.params.id, semester }));
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

// ── Lock Status ───────────────────────────────────────────────────────────────
router.get('/courses/:id/lock-status', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const semester = req.query.semester || getCurrentSemester();
        const lockInfo = await checkSemesterLock(semester, req.params.id, req.user);
        res.json({ ...lockInfo, currentSemester: semester, autoDetectedSemester: getCurrentSemester() });
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

// ── Request Unlock ────────────────────────────────────────────────────────────
router.post('/teacher/request-unlock', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const { courseId, semester, reason } = req.body;
        if (!courseId || !semester || !reason) return res.status(400).json({ message: "Barcha maydonlarni to'ldiring" });
        const newRequest = new GradeUnlockRequest({ teacherId: req.user.userId, courseId, semester, reason, status: 'pending' });
        await newRequest.save();
        res.status(201).json({ message: "Ruxsat so'rovi adminga yuborildi!", request: newRequest });
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

// ── Delete Assessment ─────────────────────────────────────────────────────────
router.delete('/courses/:id/delete-assessment', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const { assessmentName, semester } = req.body;
        if (!assessmentName) return res.status(400).json({ message: "Assessment nomi ko'rsatilmadi" });
        const targetSemester = semester || getCurrentSemester();
        const lockCheck = await checkSemesterLock(targetSemester, req.params.id, req.user);
        if (lockCheck.isLocked) return res.status(403).json({ message: "🔒 Semester baholari yopilgan!" });
        await Grade.deleteMany({ courseId: req.params.id, semester: targetSemester, assessmentName });
        res.json({ message: `${assessmentName} o'chirildi!` });
    } catch { res.status(500).json({ message: "O'chirishda xatolik" }); }
});

// ── Save Grade ────────────────────────────────────────────────────────────────
router.post('/save-grade', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const { studentId, courseId, assessmentName, category, score, semester, academicYear } = req.body;
        if (!studentId || !courseId || !assessmentName) return res.status(400).json({ message: "Barcha maydonlarni to'ldiring" });
        const targetSemester = semester || getCurrentSemester();
        if (req.user.role === 'teacher') {
            const course = await Course.findById(courseId);
            if (course && course.instructor && course.instructor.toString() !== req.user.userId) return res.status(403).json({ message: "Siz faqat o'zingizga biriktirilgan kurs baholarini o'zgartira olasiz!" });
        }
        const lockCheck = await checkSemesterLock(targetSemester, courseId, req.user);
        if (lockCheck.isLocked) return res.status(403).json({ message: "🔒 Ushbu semester baholari yopilgan!", isLocked: true });
        const numericScore = Number(score);
        if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) return res.status(400).json({ message: "Baho 0 dan 100 gacha bo'lishi kerak" });
        const gradeCat = category || (assessmentName.toLowerCase().includes('end of semester') ? 'end_of_semester' : 'summative');
        const grade = await Grade.findOneAndUpdate(
            { studentId, courseId, semester: targetSemester, assessmentName },
            { studentId, courseId, semester: targetSemester, academicYear: academicYear || '2025-2026', assessmentName, category: gradeCat, score: numericScore, teacherId: req.user.userId, date: new Date() },
            { upsert: true, new: true }
        );
        res.json(grade);
    } catch (error) { console.error("Save grade error:", error); res.status(500).json({ message: "Baho saqlashda xatolik" }); }
});

// ── Student Grades Calculation ────────────────────────────────────────────────
router.get('/grades/student/:studentId', authMiddleware, async (req, res) => {
    try {
        const targetStudentId = req.params.studentId === 'me' ? req.user.userId : req.params.studentId;
        const enrolledCourses = await Course.find({ students: targetStudentId }).select('_id');
        const enrolledCourseIds = new Set(enrolledCourses.map(c => c._id.toString()));
        const grades = await Grade.find({ studentId: targetStudentId }).populate('courseId', 'title description coverImage');
        const courseMap = {};
        for (const g of grades) {
            if (!g.courseId) continue;
            const cId = g.courseId._id.toString();
            if (!enrolledCourseIds.has(cId)) continue;
            if (!courseMap[cId]) courseMap[cId] = { course: g.courseId, sem1: { summatives: [], endOfSemester: null }, sem2: { summatives: [], endOfSemester: null } };
            const targetSem = g.semester === 'Semester 2' ? 'sem2' : 'sem1';
            if (g.category === 'end_of_semester' || g.assessmentName.toLowerCase().includes('end of semester')) courseMap[cId][targetSem].endOfSemester = g.score;
            else courseMap[cId][targetSem].summatives.push(g);
        }
        const result = Object.values(courseMap).map(c => {
            const computeSem = (semData) => {
                const summatives = semData.summatives;
                const sumAvg = summatives.length > 0 ? summatives.reduce((acc, curr) => acc + curr.score, 0) / summatives.length : 0;
                const summativeWeighted = Number((sumAvg * 0.60).toFixed(2));
                const endOfSem = semData.endOfSemester !== null ? semData.endOfSemester : null;
                const endOfSemWeighted = endOfSem !== null ? Number((endOfSem * 0.40).toFixed(2)) : 0;
                const hasGrades = summatives.length > 0 || endOfSem !== null;
                
                let totalScore = null;
                if (hasGrades) {
                    if (summatives.length > 0 && endOfSem !== null) {
                        // Official Cambridge Weighting: 60% Summative + 40% Exam
                        totalScore = Number((summativeWeighted + endOfSemWeighted).toFixed(2));
                    } else if (summatives.length > 0) {
                        // Exam hali olinmagan bo'lsa, joriy natija 100% summativlar o'rtachasi bo'ladi
                        totalScore = Number(sumAvg.toFixed(2));
                    } else if (endOfSem !== null) {
                        totalScore = Number(endOfSem.toFixed(2));
                    }
                }
                return { summatives, summativeAvg: Number(sumAvg.toFixed(2)), summativeWeighted, endOfSemester: endOfSem, endOfSemesterWeighted: endOfSemWeighted, totalScore };
            };
            const sem1Result = computeSem(c.sem1);
            const sem2Result = computeSem(c.sem2);
            let eoyScores = [];
            if (sem1Result.totalScore !== null) eoyScores.push(sem1Result.totalScore);
            if (sem2Result.totalScore !== null) eoyScores.push(sem2Result.totalScore);
            const endOfYearAvg = eoyScores.length > 0 ? Number((eoyScores.reduce((a, b) => a + b, 0) / eoyScores.length).toFixed(2)) : 0;
            return { course: c.course, sem1: sem1Result, sem2: sem2Result, endOfYearAvg, cambridgeGrade: getCambridgeGrade(endOfYearAvg) };
        });
        res.json(result);
    } catch (error) { console.error("Student grades error:", error); res.status(500).json({ message: "Xatolik" }); }
});

// ── Admin Unlock Requests ─────────────────────────────────────────────────────
router.get('/admin/unlock-requests', authMiddleware, adminOnly, async (req, res) => {
    try { res.json(await GradeUnlockRequest.find().populate('teacherId', 'username email').populate('courseId', 'title').sort({ createdAt: -1 })); }
    catch { res.status(500).json({ message: "Xatolik" }); }
});

router.put('/admin/approve-unlock/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const durationHours = Number(req.body.durationHours) || 24;
        const approvedUntil = new Date(Date.now() + durationHours * 3600 * 1000);
        res.json(await GradeUnlockRequest.findByIdAndUpdate(req.params.id, { status: 'approved', approvedUntil, durationHours }, { new: true }).populate('teacherId', 'username').populate('courseId', 'title'));
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

router.put('/admin/reject-unlock/:id', authMiddleware, adminOnly, async (req, res) => {
    try { res.json(await GradeUnlockRequest.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true })); }
    catch { res.status(500).json({ message: "Xatolik" }); }
});

// ── Direct Grades Retrieval ───────────────────────────────────────────────────
router.get('/grades/:studentId', authMiddleware, async (req, res) => {
    try { res.json(await Grade.find({ studentId: req.params.studentId }).populate('courseId', 'title')); }
    catch { res.status(500).json({ message: "Xatolik" }); }
});

router.get('/all-grades', authMiddleware, teacherOrAdmin, async (req, res) => {
    res.json(await Grade.find().populate('studentId', 'username email').populate('courseId', 'title'));
});

module.exports = router;
