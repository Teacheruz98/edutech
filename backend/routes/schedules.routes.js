/**
 * Schedule & Deadline Routes
 * /api/admin/schedules, /api/admin/deadlines, /api/schedules, /api/deadlines
 */
const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const AssessmentDeadline = require('../models/AssessmentDeadline');
const { authMiddleware, adminOnly, teacherOrAdmin } = require('../middleware/auth');

// ── ADMIN SCHEDULE ────────────────────────────────────────────────────────────
router.get('/admin/schedules', authMiddleware, adminOnly, async (req, res) => {
    try {
        const schedules = await Schedule.find()
            .populate('teacherId', 'username email')
            .populate('courseId', 'title')
            .sort({ createdAt: -1 });
        res.json(schedules);
    } catch (e) { res.status(500).json({ message: "Xatolik" }); }
});

router.post('/admin/schedules', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { teacherId, courseId, classGroup, subject, dayOfWeek, timeSlot, room, topic } = req.body;
        const newSched = new Schedule({ teacherId, courseId, classGroup, subject, dayOfWeek, timeSlot, room, topic, createdBy: req.user.userId });
        await newSched.save();
        const populated = await Schedule.findById(newSched._id).populate('teacherId', 'username email').populate('courseId', 'title');
        res.status(201).json(populated);
    } catch (e) { res.status(500).json({ message: "Xatolik" }); }
});

router.delete('/admin/schedules/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await Schedule.findByIdAndDelete(req.params.id);
        res.json({ message: "Dars jadvali o'chirildi" });
    } catch (e) { res.status(500).json({ message: "Xatolik" }); }
});

// AI Auto-Generate Schedule
router.post('/admin/generate-ai-schedule', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { teacherId, classGroup, subject, daysCount } = req.body;
        const timeSlots = ['09:00 - 09:45', '10:00 - 10:45', '11:00 - 11:45', '14:00 - 14:45'];
        const days = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma'];
        const topics = ['Kirish va Asosiy Tushunchalar', 'Algoritmlar va Mantiqiy Tuzilish', 'Amaliy Laboratoriya Mashg\'uloti', 'Mustaqil Loyiha Ustida Ishlash', 'Semestr Yakuniy Tahlili'];
        const count = daysCount || 3;
        const generatedList = [];
        for (let i = 0; i < count; i++) {
            const item = new Schedule({
                teacherId, classGroup: classGroup || '9-Green', subject: subject || 'Computer Science',
                dayOfWeek: days[i % days.length], timeSlot: timeSlots[i % timeSlots.length],
                room: `Lab ${201 + i}`, topic: `[AI] ${topics[i % topics.length]}`, createdBy: req.user.userId
            });
            await item.save();
            generatedList.push(item);
        }
        res.json({ message: `${generatedList.length} ta dars AI yordamida yaratildi! 🪄`, items: generatedList });
    } catch (e) { res.status(500).json({ message: "AI Generator xatosi" }); }
});

// ── ADMIN DEADLINES ───────────────────────────────────────────────────────────
router.get('/admin/deadlines', authMiddleware, adminOnly, async (req, res) => {
    try {
        const deadlines = await AssessmentDeadline.find().populate('teacherId', 'username').sort({ deadlineDate: 1 });
        res.json(deadlines);
    } catch (e) { res.status(500).json({ message: "Xatolik" }); }
});

router.post('/admin/deadlines', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { title, classGroup, courseId, teacherId, semester, deadlineDate, urgency, description } = req.body;
        const deadline = new AssessmentDeadline({ title, classGroup, courseId, teacherId, semester, deadlineDate: deadlineDate || new Date(), urgency: urgency || 'high', description, createdBy: req.user.userId });
        await deadline.save();
        res.status(201).json(deadline);
    } catch (e) { res.status(500).json({ message: "Xatolik" }); }
});

router.delete('/admin/deadlines/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await AssessmentDeadline.findByIdAndDelete(req.params.id);
        res.json({ message: "Baholash sanasi o'chirildi" });
    } catch (e) { res.status(500).json({ message: "Xatolik" }); }
});

// ── USER SCHEDULE CRUD ────────────────────────────────────────────────────────
router.get(['/schedules/my-schedule', '/my-schedule'], authMiddleware, async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { teacherId: req.user.userId };
        const schedules = await Schedule.find(query).sort({ createdAt: -1 });
        res.json(schedules || []);
    } catch (e) { res.status(500).json({ message: "Xatolik: " + e.message }); }
});

router.get(['/schedules', '/'], authMiddleware, async (req, res) => {
    try {
        const query = req.user.role === 'teacher' ? { teacherId: req.user.userId } : {};
        const schedules = await Schedule.find(query).sort({ createdAt: -1 });
        res.json(schedules || []);
    } catch (e) { res.status(500).json({ message: "Xatolik: " + e.message }); }
});

router.post(['/schedules', '/'], authMiddleware, async (req, res) => {
    try {
        const { dayOfWeek, timeSlot, classGroup, room, topic, subject } = req.body;
        if (!dayOfWeek || !timeSlot) return res.status(400).json({ message: "Hafta kuni va soat majburiy" });
        const newSchedule = new Schedule({
            teacherId: req.user.userId, dayOfWeek, timeSlot,
            classGroup: classGroup || 'Sinf', room: room || 'Xona',
            topic: topic || 'Dars eslatmasi', subject: subject || 'Fan', createdBy: req.user.userId
        });
        await newSchedule.save();
        res.status(201).json(newSchedule);
    } catch (e) { res.status(500).json({ message: "Dars jadvalini saqlashda xatolik: " + e.message }); }
});

router.put(['/schedules/:id', '/:id'], authMiddleware, async (req, res) => {
    try {
        const { dayOfWeek, timeSlot, classGroup, room, topic, subject } = req.body;
        const schedule = await Schedule.findById(req.params.id);
        if (!schedule) return res.status(404).json({ message: "Dars jadvali topilmadi" });
        const isOwner = schedule.teacherId?.toString() === req.user.userId?.toString();
        if (req.user.role !== 'admin' && !isOwner) return res.status(403).json({ message: "Ruxsat berilmagan" });
        if (dayOfWeek) schedule.dayOfWeek = dayOfWeek;
        if (timeSlot) schedule.timeSlot = timeSlot;
        if (classGroup) schedule.classGroup = classGroup;
        if (room !== undefined) schedule.room = room;
        if (topic !== undefined) schedule.topic = topic;
        if (subject !== undefined) schedule.subject = subject;
        await schedule.save();
        res.json(schedule);
    } catch (e) { res.status(500).json({ message: "Dars jadvalini yangilashda xatolik: " + e.message }); }
});

router.delete(['/schedules/:id', '/:id'], authMiddleware, async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id);
        if (!schedule) return res.status(404).json({ message: "Dars jadvali topilmadi" });
        const isOwner = schedule.teacherId?.toString() === req.user.userId?.toString();
        if (req.user.role !== 'admin' && !isOwner) return res.status(403).json({ message: "Ruxsat berilmagan" });
        await Schedule.findByIdAndDelete(req.params.id);
        res.json({ message: "Dars jadvali o'chirildi" });
    } catch (e) { res.status(500).json({ message: "Dars jadvalini o'chirishda xatolik: " + e.message }); }
});

// GET /deadlines/my-deadlines
router.get(['/deadlines/my', '/deadlines'], authMiddleware, async (req, res) => {
    try {
        const deadlines = await AssessmentDeadline.find({ teacherId: req.user.userId }).sort({ deadlineDate: 1 });
        res.json(deadlines || []);
    } catch (e) { res.status(500).json({ message: "Xatolik: " + e.message }); }
});

module.exports = router;
