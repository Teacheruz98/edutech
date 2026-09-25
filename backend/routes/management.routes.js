/**
 * Management Routes — /api/management/*
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly, managementOrAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Grade = require('../models/Grade');
const Course = require('../models/Course');
const ManagementAudit = require('../models/ManagementAudit');

// GET /api/management/stats
router.get('/stats', authMiddleware, managementOrAdmin, async (req, res) => {
    try {
        const [totalStudents, totalTeachers, totalCourses, grades, auditsCount] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'teacher' }),
            Course.countDocuments(),
            Grade.find(),
            ManagementAudit.countDocuments()
        ]);

        const calculateCambridgeLetter = (pct) => {
            if (pct === null || pct === undefined || isNaN(pct) || pct <= 0) return 'U';
            const num = Math.round(Number(pct));
            if (num >= 90) return 'A*';
            if (num >= 80) return 'A';
            if (num >= 70) return 'B';
            if (num >= 60) return 'C';
            if (num >= 50) return 'D';
            if (num >= 40) return 'E';
            return 'U';
        };

        const totalGrades = grades.length;
        const totalPercentageSum = grades.reduce((acc, g) => acc + (g.percentage || g.score || 0), 0);
        const averageScore = totalGrades > 0 ? (totalPercentageSum / totalGrades).toFixed(1) : 0;
        const gradeDistribution = { 'A*': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'U': 0 };
        grades.forEach(g => {
            const pct = g.percentage || g.score || 0;
            const letter = g.grade && ['A*', 'A', 'B', 'C', 'D', 'E', 'U'].includes(g.grade.toUpperCase())
                ? g.grade.toUpperCase()
                : calculateCambridgeLetter(pct);
            if (gradeDistribution[letter] !== undefined) gradeDistribution[letter]++;
            else gradeDistribution['U']++;
        });
        res.json({ totalStudents, totalTeachers, totalCourses, totalGrades, averageScore, gradeDistribution, auditsCount });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/management/grades
router.get('/grades', authMiddleware, managementOrAdmin, async (req, res) => {
    try {
        const calculateCambridgeLetter = (pct) => {
            if (pct === null || pct === undefined || isNaN(pct) || pct <= 0) return 'U';
            const num = Math.round(Number(pct));
            if (num >= 90) return 'A*';
            if (num >= 80) return 'A';
            if (num >= 70) return 'B';
            if (num >= 60) return 'C';
            if (num >= 50) return 'D';
            if (num >= 40) return 'E';
            return 'U';
        };

        const { search, classGroup } = req.query;
        const grades = await Grade.find()
            .populate('studentId', 'username email grade')
            .populate('courseId', 'title code')
            .populate('teacherId', 'username')
            .sort({ date: -1 });

        let formatted = grades.map(g => {
            const pct = g.percentage || g.score || 0;
            const letter = g.grade && ['A*', 'A', 'B', 'C', 'D', 'E', 'U'].includes(g.grade.toUpperCase())
                ? g.grade.toUpperCase()
                : calculateCambridgeLetter(pct);
            return {
                _id: g._id,
                studentUsername: g.studentId?.username || "O'quvchi",
                studentEmail: g.studentId?.email || '-',
                classGroup: g.studentId?.grade || '5-sinf',
                courseTitle: g.courseId?.title || 'Umumiy Fan',
                teacherUsername: g.teacherId?.username || "O'qituvchi",
                assessmentType: g.type || 'BSB',
                score: g.score || 0,
                percentage: pct,
                cambridgeGrade: letter,
                feedback: g.comment || g.feedback || 'Yaxshi',
                date: g.date || g.createdAt
            };
        });

        if (search) {
            const q = search.toLowerCase();
            formatted = formatted.filter(g =>
                g.studentUsername.toLowerCase().includes(q) ||
                g.courseTitle.toLowerCase().includes(q) ||
                g.teacherUsername.toLowerCase().includes(q)
            );
        }
        if (classGroup && classGroup !== 'Barchasi') {
            formatted = formatted.filter(g => g.classGroup === classGroup);
        }
        res.json(formatted);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/management/audits
router.get('/audits', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'student') return res.status(403).json({ message: "O'quvchilar uchun ruxsat berilmagan" });
        const audits = await ManagementAudit.find().sort({ createdAt: -1 });
        res.json(audits);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/management/audit-note
router.post('/audit-note', authMiddleware, managementOrAdmin, async (req, res) => {
    try {
        const { targetCourseTitle, classGroup, auditCategory, summaryTitle, executiveNote, recommendations, overallRating } = req.body;
        if (!summaryTitle || !executiveNote) return res.status(400).json({ message: "Xulosa sarlavhasi va matnini kiriting!" });
        const newAudit = new ManagementAudit({
            authorId: req.user.userId, authorUsername: req.user.username,
            targetCourseTitle: targetCourseTitle || 'Umumiy Platforma Audit',
            classGroup: classGroup || 'Barchasi',
            auditCategory: auditCategory || 'Baholash Nazorati',
            summaryTitle, executiveNote, recommendations: recommendations || '',
            overallRating: Number(overallRating) || 5
        });
        await newAudit.save();
        res.status(201).json({ message: "Xulosa muvaffaqiyatli saqlandi! 📝", audit: newAudit });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/management/audit-note/:id
router.delete('/audit-note/:id', authMiddleware, managementOrAdmin, async (req, res) => {
    try {
        await ManagementAudit.findByIdAndDelete(req.params.id);
        res.json({ message: "Xulosa o'chirildi" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/management/audits/:id/reaction
router.post('/audits/:id/reaction', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'student') return res.status(403).json({ message: "O'quvchilar uchun ruxsat berilmagan" });
        const { emoji } = req.body;
        if (!emoji) return res.status(400).json({ message: "Emoji ko'rsatilmadi" });
        const audit = await ManagementAudit.findById(req.params.id);
        if (!audit) return res.status(404).json({ message: "Audit xulosasi topilmadi" });
        if (!audit.reactions) audit.reactions = [];
        const existingIdx = audit.reactions.findIndex(r => r.userId?.toString() === req.user.userId && r.emoji === emoji);
        if (existingIdx > -1) audit.reactions.splice(existingIdx, 1);
        else audit.reactions.push({ userId: req.user.userId, username: req.user.username, emoji, createdAt: new Date() });
        await audit.save();
        res.json(audit);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/management/audits/:id/reaction/:reactionId
router.delete('/audits/:id/reaction/:reactionId', authMiddleware, async (req, res) => {
    try {
        const audit = await ManagementAudit.findById(req.params.id);
        if (!audit) return res.status(404).json({ message: "Audit topilmadi" });
        const reaction = audit.reactions.id(req.params.reactionId);
        if (!reaction) return res.status(404).json({ message: "Reaksiya topilmadi" });
        if (req.user.role !== 'admin' && reaction.userId?.toString() !== req.user.userId) return res.status(403).json({ message: "Ruxsat berilmagan" });
        audit.reactions.pull(req.params.reactionId);
        await audit.save();
        res.json(audit);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/management/audits/:id/comment
router.post('/audits/:id/comment', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'student') return res.status(403).json({ message: "O'quvchilar uchun ruxsat berilmagan" });
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ message: "Izoh matnini kiriting" });
        const audit = await ManagementAudit.findById(req.params.id);
        if (!audit) return res.status(404).json({ message: "Audit topilmadi" });
        if (!audit.comments) audit.comments = [];
        audit.comments.push({ userId: req.user.userId, username: req.user.username, userRole: req.user.role, text: text.trim(), createdAt: new Date(), updatedAt: new Date() });
        await audit.save();
        res.json(audit);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/management/audits/:id/comment/:commentId
router.put('/audits/:id/comment/:commentId', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ message: "Izoh matnini kiriting" });
        const audit = await ManagementAudit.findById(req.params.id);
        if (!audit) return res.status(404).json({ message: "Audit topilmadi" });
        const comment = audit.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: "Izoh topilmadi" });
        if (req.user.role !== 'admin' && comment.userId?.toString() !== req.user.userId) return res.status(403).json({ message: "Ruxsat berilmagan" });
        comment.text = text.trim();
        comment.updatedAt = new Date();
        await audit.save();
        res.json(audit);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/management/audits/:id/comment/:commentId
router.delete('/audits/:id/comment/:commentId', authMiddleware, async (req, res) => {
    try {
        const audit = await ManagementAudit.findById(req.params.id);
        if (!audit) return res.status(404).json({ message: "Audit topilmadi" });
        const comment = audit.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: "Izoh topilmadi" });
        if (req.user.role !== 'admin' && comment.userId?.toString() !== req.user.userId) return res.status(403).json({ message: "Ruxsat berilmagan" });
        audit.comments.pull(req.params.commentId);
        await audit.save();
        res.json(audit);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
