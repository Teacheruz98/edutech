/**
 * Announcements Routes — /api/announcements
 */
const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { authMiddleware, adminOnly, teacherOrAdmin } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const User = require('../models/User');

// Email transporter
const mailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: process.env.EMAIL_PORT || 587,
    auth: { user: process.env.EMAIL_USER || 'edutech@example.com', pass: process.env.EMAIL_PASS || 'secret' },
    tls: { rejectUnauthorized: false }
});

const sendAnnouncementEmailNotifications = async (title, content) => {
    try {
        const users = await User.find({}, 'email username role');
        const emails = users.map(u => u.email).filter(Boolean);
        if (!emails.length) return;
        mailTransporter.sendMail({
            from: '"EduTech Platform" <noreply@edutech.uz>',
            to: emails.join(','),
            subject: `📢 Yangi e'lon: ${title}`,
            html: `<div style="font-family:Arial,sans-serif;padding:20px"><h2>${title}</h2><p>${content.replace(/\n/g, '<br/>')}</p></div>`
        }).catch(() => {});
    } catch (err) { console.error('Email error:', err); }
};

// GET /api/announcements — only active (non-expired)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const now = new Date();
        const data = await Announcement.find({
            $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }]
        }).sort({ date: -1 }).limit(50);
        res.json(data);
    } catch (error) { res.status(500).json({ message: "Xatolik" }); }
});

// POST /api/announcements
router.post('/', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const { title, content, type, expiresAt } = req.body;
        if (!content) return res.status(400).json({ message: "Matn kiritilmagan" });
        if (!expiresAt) return res.status(400).json({ message: "Deadline (tugash vaqti) kiritilmagan" });
        const deadlineDate = new Date(expiresAt);
        if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
            return res.status(400).json({ message: "Deadline kelajakdagi sana bo'lishi kerak" });
        }
        const newAnn = new Announcement({
            title: title || "E'lon", content, type: type || 'announcement',
            isAI: false, createdBy: req.user?.userId, date: new Date(), expiresAt: deadlineDate
        });
        await newAnn.save();
        sendAnnouncementEmailNotifications(newAnn.title, newAnn.content);
        res.status(201).json(newAnn);
    } catch (error) {
        console.error("Save Announcement Error:", error);
        res.status(500).json({ message: "E'lonni saqlashda xatolik" });
    }
});

// DELETE /api/announcements/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: "E'lon o'chirildi" });
    } catch (error) { res.status(500).json({ message: "E'lonni o'chirishda xatolik" }); }
});

// PUT /api/announcements/:id
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { title, content, expiresAt } = req.body;
        const updateData = { title, content };
        if (expiresAt) {
            const d = new Date(expiresAt);
            if (!isNaN(d.getTime())) updateData.expiresAt = d;
        }
        const updated = await Announcement.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(updated);
    } catch (error) { res.status(500).json({ message: "E'lonni tahrirlashda xatolik" }); }
});

// AUTO-CLEANUP: Remove expired announcements every 60 seconds
setInterval(async () => {
    try {
        const result = await Announcement.deleteMany({ expiresAt: { $lte: new Date() } });
        if (result.deletedCount > 0) {
            console.log(`[AUTO-CLEANUP] ${result.deletedCount} ta muddati o'tgan e'lon o'chirildi.`);
        }
    } catch (err) { console.error('[AUTO-CLEANUP] Xatolik:', err.message); }
}, 60 * 1000);

module.exports = router;
