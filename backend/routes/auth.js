const express = require('express');
const router = express.Router();
const User = require('../models/User');

// RO'YXATDAN O'TISH
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // 1. Email bandmi yoki yo'qligini tekshirish
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Bu email allaqachon ro'yxatdan o'tgan!" });
        }

        // 2. Yangi foydalanuvchini yaratish
        const newUser = new User({ name, email, password });
        await newUser.save();
        
        res.status(201).json({ message: "O'quvchi muvaffaqiyatli qo'shildi!" });
    } catch (error) {
        console.error(error); // Terminalda aniq xatoni ko'rish uchun
        res.status(500).json({ error: "Serverda ichki xatolik yuz berdi." });
    }
});

// LOGIN (KIRISH)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || user.password !== password) {
            return res.status(400).json({ error: "Email yoki parol xato!" });
        }

        res.json({ message: "Xush kelibsiz!", userName: user.name });
    } catch (error) {
        res.status(500).json({ error: "Login jarayonida xatolik." });
    }
});

module.exports = router;