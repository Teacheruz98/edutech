/**
 * Settings Routes — /api/settings/*
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const SystemSetting = require('../models/SystemSetting');

let cachedSeasonValue = null;
let lastSeasonCachedAt = 0;

// GET /api/settings/season
router.get('/season', async (req, res) => {
    try {
        const now = Date.now();
        if (cachedSeasonValue && (now - lastSeasonCachedAt < 15000)) {
            return res.json({ season: cachedSeasonValue });
        }
        let setting = await SystemSetting.findOne({ key: 'season' }).lean();
        if (!setting) setting = await SystemSetting.create({ key: 'season', value: 'off' });
        cachedSeasonValue = setting.value || 'off';
        lastSeasonCachedAt = now;
        res.json({ season: cachedSeasonValue });
    } catch (err) { res.json({ season: cachedSeasonValue || 'off' }); }
});

// POST /api/settings/season
router.post('/season', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { season } = req.body;
        const validSeasons = ['off', 'spring', 'summer', 'autumn', 'winter'];
        if (!validSeasons.includes(season)) return res.status(400).json({ message: "Noto'g'ri fasl kiritildi" });
        const setting = await SystemSetting.findOneAndUpdate(
            { key: 'season' },
            { value: season, updatedBy: req.user.username, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        cachedSeasonValue = season;
        lastSeasonCachedAt = Date.now();
        res.json({ message: "Fasl rejimi muvaffaqiyatli sinxronlashtirildi", season: setting.value });
    } catch (err) { res.status(500).json({ message: "Xatolik yuz berdi" }); }
});

module.exports = router;
