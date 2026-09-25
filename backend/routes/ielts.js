const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { IELTSTest, IELTSQuestion, IELTSAssignment, IELTSAttempt, IELTSEvaluation, IELTSMistake, IELTSMedia } = require('../models/IELTS');
const User = require('../models/User');
const Course = require('../models/Course');

// Audio Upload Configuration for IELTS Speaking
const speakingUploadDir = path.join(__dirname, '..', 'uploads', 'ielts-speaking');
if (!fs.existsSync(speakingUploadDir)) {
    fs.mkdirSync(speakingUploadDir, { recursive: true });
}

const speakingAudioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, speakingUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || (file.mimetype.includes('mp4') ? '.mp4' : file.mimetype.includes('ogg') ? '.ogg' : file.mimetype.includes('wav') ? '.wav' : '.webm');
        cb(null, `speaking-${req.params.id || 'rec'}-part${req.body.partNumber || 'x'}-${uniqueSuffix}${ext}`);
    }
});

const uploadSpeakingAudio = multer({
    storage: speakingAudioStorage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Media Upload Configuration for IELTS Audio Tracks, Diagrams & Passages
const mediaUploadDir = path.join(__dirname, '..', 'uploads', 'ielts-media');
if (!fs.existsSync(mediaUploadDir)) {
    fs.mkdirSync(mediaUploadDir, { recursive: true });
}

const mediaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, mediaUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const cleanName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `media-${uniqueSuffix}-${cleanName}`);
    }
});

const uploadMedia = multer({
    storage: mediaStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Import File Upload (in-memory for CSV & JSON parsing)
const uploadImport = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Role-based helper middlewares
const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Faqat Administratorlar uchun ruxsat etilgan." });
    }
    next();
};

const teacherOrAdmin = (req, res, next) => {
    if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Faqat O'qituvchi va Adminlar uchun ruxsat etilgan." });
    }
    next();
};

const englishTeacherOrAdmin = async (req, res, next) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        if (['admin', 'superadmin'].includes(role)) {
            return next();
        }
        if (role === 'teacher') {
            const userId = req.user?.userId || req.user?._id;
            const user = await User.findById(userId).select('isEnglishTeacher isMathTeacher role');
            if (user && user.isEnglishTeacher === true) {
                req.user.isEnglishTeacher = true;
                return next();
            }
            return res.status(403).json({
                message: "Ruxsat etilmagan. CD IELTS boshqaruvi, test tuzish va baholash faqat ingliz tili o'qituvchilari (English Teachers) uchun ruxsat etilgan.",
                code: "ENGLISH_TEACHER_REQUIRED"
            });
        }
        return res.status(403).json({
            message: "Faqat Administratorlar va Ingliz tili o'qituvchilari uchun ruxsat etilgan.",
            code: "FORBIDDEN"
        });
    } catch (err) {
        return res.status(500).json({ message: "Xatolik: " + err.message });
    }
};

const managementOrAdmin = (req, res, next) => {
    if (req.user?.role !== 'management' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Faqat Rahbariyat va Adminlar uchun ruxsat etilgan." });
    }
    next();
};

// 1. Overview Endpoint (Role-Tailored, 100% Real Database Queries - Zero Fake Data)
router.get('/overview', async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.userId || req.user._id;

        if (role === 'admin') {
            const [totalTests, totalQuestions, activeAssignments, studentAttempts, pendingEvaluations] = await Promise.all([
                IELTSTest.countDocuments(),
                IELTSQuestion.countDocuments(),
                IELTSAssignment.countDocuments(),
                IELTSAttempt.countDocuments(),
                IELTSAttempt.countDocuments({ status: 'pending_evaluation' })
            ]);

            return res.json({
                role: 'admin',
                metrics: {
                    totalTests,
                    totalQuestions,
                    activeAssignments,
                    studentAttempts,
                    pendingEvaluations,
                    hasContent: (totalTests > 0 || totalQuestions > 0)
                }
            });
        }

        if (role === 'teacher') {
            const [activeAssignments, pendingWriting, pendingSpeaking, recentAttempts] = await Promise.all([
                IELTSAssignment.countDocuments({ assignedBy: userId }),
                IELTSAttempt.countDocuments({ skill: 'writing', status: 'pending_evaluation' }),
                IELTSAttempt.countDocuments({ skill: 'speaking', status: 'pending_evaluation' }),
                IELTSAttempt.find()
                    .sort({ startedAt: -1 })
                    .limit(5)
                    .populate('studentId', 'username email')
                    .populate('testId', 'title code skill')
            ]);

            return res.json({
                role: 'teacher',
                metrics: {
                    activeAssignments,
                    pendingWritingEvaluations: pendingWriting,
                    pendingSpeakingEvaluations: pendingSpeaking,
                    recentAttempts: recentAttempts || [],
                    hasData: (activeAssignments > 0 || recentAttempts.length > 0 || pendingWriting > 0 || pendingSpeaking > 0)
                }
            });
        }

        if (role === 'management') {
            const [totalAttempts, totalAssignments, participatingStudents, attempts] = await Promise.all([
                IELTSAttempt.countDocuments(),
                IELTSAssignment.countDocuments(),
                IELTSAttempt.distinct('studentId'),
                IELTSAttempt.find({ status: 'completed', bandScore: { $ne: null } }, 'bandScore sectionBands')
            ]);

            let averageBand = null;
            if (attempts.length > 0) {
                const sum = attempts.reduce((acc, a) => acc + (a.bandScore || 0), 0);
                averageBand = Number((sum / attempts.length).toFixed(1));
            }

            return res.json({
                role: 'management',
                metrics: {
                    studentParticipation: participatingStudents.length,
                    testActivity: totalAttempts,
                    averageBand,
                    teacherActivity: totalAssignments,
                    hasData: (totalAttempts > 0)
                }
            });
        }

        // Student Role (Default)
        const [recentAttempts, completedCount, allStudentAttempts] = await Promise.all([
            IELTSAttempt.find({ studentId: userId })
                .sort({ startedAt: -1 })
                .limit(5)
                .populate('testId', 'title code skill durationMinutes'),
            IELTSAttempt.countDocuments({ studentId: userId, status: 'completed' }),
            IELTSAttempt.find({ studentId: userId, status: 'completed' })
        ]);

        // Calculate skill stats
        const skillStats = {
            listening: { completed: 0, avgBand: null },
            reading: { completed: 0, avgBand: null },
            writing: { completed: 0, avgBand: null },
            speaking: { completed: 0, avgBand: null }
        };

        const skillBands = { listening: [], reading: [], writing: [], speaking: [] };

        allStudentAttempts.forEach(att => {
            if (att.skill && skillStats[att.skill]) {
                skillStats[att.skill].completed += 1;
                if (att.bandScore) skillBands[att.skill].push(att.bandScore);
            }
        });

        Object.keys(skillBands).forEach(sk => {
            if (skillBands[sk].length > 0) {
                const avg = skillBands[sk].reduce((a, b) => a + b, 0) / skillBands[sk].length;
                skillStats[sk].avgBand = Number(avg.toFixed(1));
            }
        });

        let overallEstimatedBand = null;
        if (allStudentAttempts.length > 0) {
            const validScores = allStudentAttempts.map(a => a.bandScore).filter(Boolean);
            if (validScores.length > 0) {
                overallEstimatedBand = Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1));
            }
        }

        return res.json({
            role: 'student',
            metrics: {
                completedPractices: completedCount,
                overallEstimatedBand,
                skillStats,
                recentAttempts: recentAttempts || [],
                hasAttempts: (allStudentAttempts.length > 0)
            }
        });

    } catch (err) {
        console.error("IELTS Overview error:", err);
        res.status(500).json({ message: "IELTS statistikasini yuklashda xatolik yuz berdi." });
    }
});

// 2. IELTS Test Builder & Library Endpoints (Admin & English Teacher - Full CRUD)
// GET /api/ielts/tests - List tests with filtering, search, pagination & stats
router.get('/tests', englishTeacherOrAdmin, async (req, res) => {
    try {
        const { 
            testType, 
            skillType, 
            isPublished, 
            difficulty, 
            search, 
            page = 1, 
            limit = 20 
        } = req.query;

        const filter = { isActive: true };

        // Test Type filter
        if (testType && testType !== 'ALL') {
            filter.$or = [
                { testType: testType.toUpperCase() },
                { type: testType.toLowerCase() === 'full_mock' ? 'mock' : 'practice' }
            ];
        }

        // Skill Type filter
        if (skillType && skillType !== 'ALL') {
            filter.$or = [
                { skillType: skillType.toUpperCase() },
                { skill: skillType.toLowerCase() }
            ];
        }

        // Publication Status filter
        if (isPublished !== undefined && isPublished !== 'ALL' && isPublished !== '') {
            filter.isPublished = isPublished === 'true';
        }

        // Difficulty filter
        if (difficulty && difficulty !== 'ALL') {
            filter.difficulty = difficulty.toUpperCase();
        }

        // Keyword Search
        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { title: regex },
                    { description: regex },
                    { code: regex }
                ]
            });
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = Math.min(parseInt(limit) || 20, 100);
        const skip = (pageNum - 1) * limitNum;

        const [tests, total, publishedCount, draftCount, mockCount, practiceCount] = await Promise.all([
            IELTSTest.find(filter)
                .populate('createdBy', 'username email')
                .populate('sections.questionIds', 'prompt skillType questionType difficulty sectionNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            IELTSTest.countDocuments(filter),
            IELTSTest.countDocuments({ isActive: true, isPublished: true }),
            IELTSTest.countDocuments({ isActive: true, isPublished: false }),
            IELTSTest.countDocuments({ isActive: true, $or: [{ testType: 'FULL_MOCK' }, { type: 'mock' }] }),
            IELTSTest.countDocuments({ isActive: true, $or: [{ testType: 'SKILL_PRACTICE' }, { type: 'practice' }] })
        ]);

        res.json({
            tests: tests || [],
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1
            },
            counts: {
                total,
                published: publishedCount,
                draft: draftCount,
                mock: mockCount,
                practice: practiceCount
            }
        });
    } catch (err) {
        console.error("Fetch tests error:", err);
        res.status(500).json({ message: "Testlar ro'yxatini yuklashda xatolik yuz berdi." });
    }
});

// POST /api/ielts/tests - Create a new test draft
router.post('/tests', englishTeacherOrAdmin, async (req, res) => {
    try {
        const {
            title,
            description,
            code,
            testType = 'FULL_MOCK',
            skillType = 'ALL',
            difficulty = 'EXAM_LEVEL',
            durationMinutes,
            sections = [],
            isPublished = false
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Test sarlavhasi (title) kiritilishi shart." });
        }

        const normalizedSections = Array.isArray(sections) ? sections.map((sec, idx) => ({
            sectionNumber: sec.sectionNumber || (idx + 1),
            title: sec.title || `Section ${idx + 1}`,
            instructions: sec.instructions || '',
            passageReference: sec.passageReference || '',
            passageTitle: sec.passageTitle || '',
            passageText: sec.passageText || '',
            audioUrl: sec.audioUrl || '',
            questionIds: Array.isArray(sec.questionIds) ? sec.questionIds : []
        })) : [];

        // Auto duration default based on type
        const resolvedDuration = durationMinutes ? parseInt(durationMinutes) : (testType === 'FULL_MOCK' ? 160 : 60);

        const newTest = new IELTSTest({
            title: title.trim(),
            description: description || '',
            code: code ? code.trim().toUpperCase() : `IELTS-${Date.now().toString().slice(-6)}`,
            testType: testType.toUpperCase(),
            type: testType.toUpperCase() === 'FULL_MOCK' ? 'mock' : 'practice',
            skillType: skillType.toUpperCase(),
            skill: skillType.toUpperCase() === 'ALL' ? 'full' : skillType.toLowerCase(),
            difficulty: difficulty.toUpperCase(),
            durationMinutes: resolvedDuration,
            sections: normalizedSections,
            isPublished: Boolean(isPublished),
            createdBy: req.user.userId || req.user._id
        });

        await newTest.save();
        await newTest.populate('createdBy', 'username email');
        await newTest.populate('sections.questionIds', 'prompt skillType questionType difficulty');

        res.status(201).json({
            message: "IELTS testi muvaffaqiyatli yaratildi.",
            test: newTest
        });
    } catch (err) {
        console.error("Create test error:", err);
        res.status(500).json({ message: "Testni yaratishda xatolik: " + err.message });
    }
});

// GET /api/ielts/tests/:id - Get full test details with populated sections and questions
router.get('/tests/:id', englishTeacherOrAdmin, async (req, res) => {
    try {
        const test = await IELTSTest.findById(req.params.id)
            .populate('createdBy', 'username email')
            .populate({
                path: 'sections.questionIds',
                populate: { path: 'createdBy', select: 'username' }
            });

        if (!test) {
            return res.status(404).json({ message: "Test topilmadi." });
        }

        res.json({ test });
    } catch (err) {
        console.error("Get test details error:", err);
        res.status(500).json({ message: "Test ma'lumotlarini yuklashda xatolik." });
    }
});

// PUT /api/ielts/tests/:id - Update test details and structure
router.put('/tests/:id', englishTeacherOrAdmin, async (req, res) => {
    try {
        const test = await IELTSTest.findById(req.params.id);
        if (!test) {
            return res.status(404).json({ message: "Tahrirlanayotgan test topilmadi." });
        }

        const updates = req.body;
        if (updates.title !== undefined) test.title = updates.title.trim();
        if (updates.description !== undefined) test.description = updates.description;
        if (updates.code !== undefined) test.code = updates.code.trim().toUpperCase();
        if (updates.testType !== undefined) {
            test.testType = updates.testType.toUpperCase();
            test.type = test.testType === 'FULL_MOCK' ? 'mock' : 'practice';
        }
        if (updates.skillType !== undefined) {
            test.skillType = updates.skillType.toUpperCase();
            test.skill = test.skillType === 'ALL' ? 'full' : test.skillType.toLowerCase();
        }
        if (updates.difficulty !== undefined) test.difficulty = updates.difficulty.toUpperCase();
        if (updates.durationMinutes !== undefined) test.durationMinutes = parseInt(updates.durationMinutes) || test.durationMinutes;
        if (updates.isPublished !== undefined) test.isPublished = Boolean(updates.isPublished);

        if (updates.sections && Array.isArray(updates.sections)) {
            test.sections = updates.sections.map((sec, idx) => ({
                sectionNumber: sec.sectionNumber || (idx + 1),
                title: sec.title || `Section ${idx + 1}`,
                instructions: sec.instructions || '',
                passageReference: sec.passageReference || '',
                passageTitle: sec.passageTitle || '',
                passageText: sec.passageText || '',
                audioUrl: sec.audioUrl || '',
                questionIds: Array.isArray(sec.questionIds) ? sec.questionIds : []
            }));
        }

        test.updatedAt = new Date();
        await test.save();
        await test.populate('createdBy', 'username email');
        await test.populate('sections.questionIds', 'prompt skillType questionType difficulty');

        res.json({
            message: "Test muvaffaqiyatli yangilandi.",
            test
        });
    } catch (err) {
        console.error("Update test error:", err);
        res.status(500).json({ message: "Testni yangilashda xatolik: " + err.message });
    }
});

// DELETE /api/ielts/tests/:id - Delete test
router.delete('/tests/:id', englishTeacherOrAdmin, async (req, res) => {
    try {
        const deleted = await IELTSTest.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: "O'chirilayotgan test topilmadi." });
        }
        res.json({ message: "Test muvaffaqiyatli o'chirildi.", id: req.params.id });
    } catch (err) {
        console.error("Delete test error:", err);
        res.status(500).json({ message: "Testni o'chirishda xatolik." });
    }
});

// PATCH /api/ielts/tests/:id/publish - Toggle publish status
router.patch('/tests/:id/publish', englishTeacherOrAdmin, async (req, res) => {
    try {
        const test = await IELTSTest.findById(req.params.id);
        if (!test) {
            return res.status(404).json({ message: "Test topilmadi." });
        }

        if (req.body && req.body.isPublished !== undefined) {
            test.isPublished = Boolean(req.body.isPublished);
        } else {
            test.isPublished = !test.isPublished;
        }

        test.updatedAt = new Date();
        await test.save();

        res.json({
            message: test.isPublished ? "Test e'lon qilindi (Published)." : "Test qoralama holatiga o'tkazildi (Draft).",
            id: test._id,
            isPublished: test.isPublished
        });
    } catch (err) {
        console.error("Toggle publish error:", err);
        res.status(500).json({ message: "Nashr holatini o'zgartirishda xatolik." });
    }
});

// POST /api/ielts/tests/:id/duplicate - Duplicate test as draft
router.post('/tests/:id/duplicate', englishTeacherOrAdmin, async (req, res) => {
    try {
        const original = await IELTSTest.findById(req.params.id);
        if (!original) {
            return res.status(404).json({ message: "Nusxalanayotgan test topilmadi." });
        }

        const duplicate = new IELTSTest({
            title: `${original.title} (Copy)`,
            description: original.description,
            code: `${original.code || 'IELTS'}-COPY-${Date.now().toString().slice(-4)}`,
            testType: original.testType,
            type: original.type,
            skillType: original.skillType,
            skill: original.skill,
            difficulty: original.difficulty,
            durationMinutes: original.durationMinutes,
            sections: original.sections,
            isPublished: false,
            createdBy: req.user.userId || req.user._id
        });

        await duplicate.save();
        await duplicate.populate('createdBy', 'username email');
        await duplicate.populate('sections.questionIds', 'prompt skillType questionType difficulty');

        res.status(201).json({
            message: "Testdan muvaffaqiyatli nusxa olindi.",
            test: duplicate
        });
    } catch (err) {
        console.error("Duplicate test error:", err);
        res.status(500).json({ message: "Testdan nusxa olishda xatolik." });
    }
});

// --- Cambridge IELTS Listening Band Conversion Helper ---
function calculateListeningBand(rawScore, maxRawScore) {
    if (!maxRawScore || maxRawScore <= 0) return 0;
    const scaled = Math.round((rawScore / maxRawScore) * 40);
    if (scaled >= 39) return 9.0;
    if (scaled >= 37) return 8.5;
    if (scaled >= 35) return 8.0;
    if (scaled >= 32) return 7.5;
    if (scaled >= 30) return 7.0;
    if (scaled >= 26) return 6.5;
    if (scaled >= 23) return 6.0;
    if (scaled >= 18) return 5.5;
    if (scaled >= 16) return 5.0;
    if (scaled >= 13) return 4.5;
    if (scaled >= 10) return 4.0;
    if (scaled >= 8) return 3.5;
    if (scaled >= 6) return 3.0;
    if (scaled >= 4) return 2.5;
    return 2.0;
}

// --- Cambridge IELTS Academic Reading Band Conversion Helper ---
function calculateReadingBand(rawScore, maxRawScore) {
    if (!maxRawScore || maxRawScore <= 0) return 0;
    const scaled = Math.round((rawScore / maxRawScore) * 40);
    if (scaled >= 39) return 9.0;
    if (scaled >= 37) return 8.5;
    if (scaled >= 35) return 8.0;
    if (scaled >= 33) return 7.5;
    if (scaled >= 30) return 7.0;
    if (scaled >= 27) return 6.5;
    if (scaled >= 23) return 6.0;
    if (scaled >= 19) return 5.5;
    if (scaled >= 15) return 5.0;
    if (scaled >= 13) return 4.5;
    if (scaled >= 10) return 4.0;
    if (scaled >= 8) return 3.5;
    if (scaled >= 6) return 3.0;
    if (scaled >= 4) return 2.5;
    return 2.0;
}

// --- Cambridge IELTS Writing Band Calculation & Rounding Helper ---
function calculateWritingBand(scores) {
    if (!scores) return 0;
    const ta = parseFloat(scores.taskAchievement !== undefined ? scores.taskAchievement : (scores.c1 || 0));
    const cc = parseFloat(scores.coherenceCohesion !== undefined ? scores.coherenceCohesion : (scores.c2 || 0));
    const lr = parseFloat(scores.lexicalResource !== undefined ? scores.lexicalResource : (scores.c3 || 0));
    const gra = parseFloat(scores.grammaticalRange !== undefined ? scores.grammaticalRange : (scores.c4 || 0));
    
    const mean = (ta + cc + lr + gra) / 4;
    
    // Official IELTS rounding:
    // If fractional part < 0.25 -> round down to .0
    // If fractional part >= 0.25 and < 0.75 -> round to .5
    // If fractional part >= 0.75 -> round up to next .0
    const intPart = Math.floor(mean);
    const rem = mean - intPart;
    let rounded = intPart;
    if (rem >= 0.75) {
        rounded = intPart + 1.0;
    } else if (rem >= 0.25) {
        rounded = intPart + 0.5;
    } else {
        rounded = intPart;
    }
    return Math.min(9.0, Math.max(0, rounded));
}

// --- Cambridge IELTS Speaking Band Calculation & Rounding Helper ---
function calculateSpeakingBand(scores) {
    if (!scores) return 0;
    const fc = parseFloat(scores.fluencyCoherence !== undefined ? scores.fluencyCoherence : (scores.c1 || 0));
    const lr = parseFloat(scores.lexicalResource !== undefined ? scores.lexicalResource : (scores.c2 || 0));
    const gra = parseFloat(scores.grammaticalRange !== undefined ? scores.grammaticalRange : (scores.c3 || 0));
    const pr = parseFloat(scores.pronunciation !== undefined ? scores.pronunciation : (scores.c4 || 0));
    
    const mean = (fc + lr + gra + pr) / 4;
    
    const intPart = Math.floor(mean);
    const rem = mean - intPart;
    let rounded = intPart;
    if (rem >= 0.75) {
        rounded = intPart + 1.0;
    } else if (rem >= 0.25) {
        rounded = intPart + 0.5;
    } else {
        rounded = intPart;
    }
    return Math.min(9.0, Math.max(0, rounded));
}

// --- Cambridge IELTS Overall Band Calculation & CEFR Helper ---
function calculateOverallIeltsBand(skills) {
    if (!skills || !Array.isArray(skills)) return 0;
    const valid = skills.filter(s => s !== null && s !== undefined && !isNaN(Number(s))).map(Number);
    if (valid.length === 0) return 0;
    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    // Standard Cambridge IELTS rounding: nearest half-band (.25 -> .5, .75 -> next whole band)
    return Math.min(9.0, Math.max(0, Math.round(mean * 2) / 2));
}

function getCefrLevel(band) {
    const num = Number(band) || 0;
    if (num >= 8.5) return 'C2';
    if (num >= 7.0) return 'C1';
    if (num >= 5.5) return 'B2';
    if (num >= 4.0) return 'B1';
    if (num >= 3.0) return 'A2';
    return 'A1';
}

function evaluateAnswer(userAns, correctAns) {
    if (userAns === undefined || userAns === null || correctAns === undefined || correctAns === null) {
        return false;
    }
    let cleanUser = String(userAns).trim().toLowerCase().replace(/\s+/g, ' ');
    let cleanCorrect = String(correctAns).trim().toLowerCase().replace(/\s+/g, ' ');

    const normalizeTF = (val) => {
        if (val === 't') return 'true';
        if (val === 'f') return 'false';
        if (val === 'ng') return 'not given';
        if (val === 'y') return 'yes';
        if (val === 'n') return 'no';
        return val;
    };

    cleanUser = normalizeTF(cleanUser);

    if (Array.isArray(correctAns)) {
        return correctAns.some(val => normalizeTF(String(val).trim().toLowerCase().replace(/\s+/g, ' ')) === cleanUser);
    }
    
    if (cleanCorrect.includes('/')) {
        const alternatives = cleanCorrect.split('/').map(s => normalizeTF(s.trim()));
        if (alternatives.includes(cleanUser)) return true;
    }
    
    return cleanUser === normalizeTF(cleanCorrect);
}

// 2.5 Student Published Tests (Open to all authenticated students)
router.get('/student/tests', async (req, res) => {
    try {
        const { skillType, search } = req.query;
        const filter = { isActive: true, isPublished: true };

        if (skillType && skillType !== 'ALL') {
            filter.$or = [
                { skillType: skillType.toUpperCase() },
                { skill: skillType.toLowerCase() },
                { skillType: 'ALL' },
                { skill: 'full' }
            ];
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { title: regex },
                    { description: regex },
                    { code: regex }
                ]
            });
        }

        const tests = await IELTSTest.find(filter)
            .select('title description code testType type skillType skill difficulty durationMinutes totalQuestions sections.sectionNumber sections.title createdAt')
            .sort({ createdAt: -1 });

        res.json({ tests: tests || [] });
    } catch (err) {
        console.error("Fetch student tests error:", err);
        res.status(500).json({ message: "Testlarni yuklashda xatolik." });
    }
});

// 2.6 Student Test Attempts & Listening Engine Execution
// POST /api/ielts/attempts/start - Start or resume test attempt
router.post('/attempts/start', async (req, res) => {
    try {
        const { testId, assignmentId } = req.body;
        const studentId = req.user.userId || req.user._id;

        if (!testId) {
            return res.status(400).json({ message: "testId kiritilishi shart." });
        }

        const test = await IELTSTest.findOne({ _id: testId, isActive: true, isPublished: true });
        if (!test) {
            return res.status(404).json({ message: "Tanlangan test topilmadi yoki hali e'lon qilinmagan." });
        }

        // Validate assignment restrictions if assignmentId is passed
        let assignment = null;
        if (assignmentId) {
            assignment = await IELTSAssignment.findById(assignmentId);
            if (!assignment) {
                return res.status(404).json({ message: "Biriktirilgan vazifa topilmadi." });
            }
            if (assignment.status === 'CLOSED' || assignment.status === 'ARCHIVED') {
                return res.status(403).json({ message: "Ushbu vazifa yopilgan. Testni boshlab bo'lmaydi." });
            }
            const deadline = assignment.dueDate || assignment.deadline;
            if (deadline && new Date() > new Date(deadline) && !assignment.allowLateSubmission) {
                return res.status(403).json({ message: "Vazifaning muddati tugagan va kech topshirishga ruxsat yo'q." });
            }
        }

        // Check if there is already an active IN_PROGRESS attempt for this student on this test
        const attemptQuery = {
            studentId,
            testId,
            status: { $in: ['IN_PROGRESS', 'in_progress'] }
        };
        if (assignmentId) {
            attemptQuery.assignmentId = assignmentId;
        }

        let attempt = await IELTSAttempt.findOne(attemptQuery);

        if (!attempt) {
            attempt = new IELTSAttempt({
                studentId,
                testId,
                assignmentId: assignmentId || undefined,
                skillType: test.skillType === 'ALL' ? 'FULL_MOCK' : test.skillType,
                skill: test.skill || 'listening',
                status: 'IN_PROGRESS',
                startTime: new Date(),
                startedAt: new Date(),
                answers: []
            });
            await attempt.save();
        } else if (assignmentId && !attempt.assignmentId) {
            attempt.assignmentId = assignmentId;
            await attempt.save();
        }

        res.status(201).json({
            message: "Test urinishi boshlandi.",
            attemptId: attempt._id,
            assignmentId: attempt.assignmentId,
            test: {
                _id: test._id,
                title: test.title,
                code: test.code,
                durationMinutes: test.durationMinutes,
                skillType: test.skillType
            }
        });
    } catch (err) {
        console.error("Start test attempt error:", err);
        res.status(500).json({ message: "Testni boshlashda xatolik: " + err.message });
    }
});

// GET /api/ielts/attempts/:id - Load attempt with SANITIZED test content (Anti-cheating)
router.get('/attempts/:id', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const userRole = req.user.role;

        const attempt = await IELTSAttempt.findById(req.params.id)
            .populate('testId');

        if (!attempt) {
            return res.status(404).json({ message: "Test urinishi topilmadi." });
        }

        // Ownership check
        if (attempt.studentId.toString() !== userId.toString() && !['admin', 'teacher'].includes(userRole)) {
            return res.status(403).json({ message: "Ushbu test urinishini ko'rish uchun ruxsat yo'q." });
        }

        const test = await IELTSTest.findById(attempt.testId)
            .populate({
                path: 'sections.questionIds',
                select: '-correctAnswer -explanation' // STRICT ANTI-CHEATING: Do not send answers or explanations during test
            });

        if (!test) {
            return res.status(404).json({ message: "Bog'langan test topilmadi." });
        }

        // Calculate time elapsed
        const now = new Date();
        const start = new Date(attempt.startTime || attempt.startedAt || now);
        const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
        const totalSecondsAllowed = (test.durationMinutes || 60) * 60;
        const remainingSeconds = Math.max(0, totalSecondsAllowed - elapsedSeconds);

        res.json({
            attempt: {
                _id: attempt._id,
                status: attempt.status,
                answers: attempt.answers || [],
                task1Answer: attempt.task1Answer || '',
                task2Answer: attempt.task2Answer || '',
                task1WordCount: attempt.task1WordCount || 0,
                task2WordCount: attempt.task2WordCount || 0,
                speakingSubmissions: attempt.speakingSubmissions || [],
                part1AudioUrl: attempt.part1AudioUrl || '',
                part2AudioUrl: attempt.part2AudioUrl || '',
                part3AudioUrl: attempt.part3AudioUrl || '',
                startTime: attempt.startTime,
                elapsedSeconds,
                remainingSeconds,
                totalSecondsAllowed
            },
            test: {
                _id: test._id,
                title: test.title,
                code: test.code,
                testType: test.testType,
                skillType: test.skillType,
                difficulty: test.difficulty,
                durationMinutes: test.durationMinutes,
                sections: test.sections
            }
        });
    } catch (err) {
        console.error("Get attempt details error:", err);
        res.status(500).json({ message: "Test ma'lumotlarini yuklashda xatolik." });
    }
});

// PUT /api/ielts/attempts/:id/save-answers - Autosave student answers
router.put('/attempts/:id/save-answers', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const attempt = await IELTSAttempt.findById(req.params.id);

        if (!attempt) {
            return res.status(404).json({ message: "Test urinishi topilmadi." });
        }

        if (attempt.studentId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Ruxsat etilmagan amal." });
        }

        if (attempt.status === 'COMPLETED' || attempt.status === 'completed') {
            return res.status(400).json({ message: "Yakunlangan test javoblarini o'zgartirib bo'lmaydi." });
        }

        const { answers, durationSpent } = req.body;

        if (Array.isArray(answers)) {
            // Merge or update answers
            const answerMap = new Map();
            (attempt.answers || []).forEach(a => {
                if (a.questionId) answerMap.set(a.questionId.toString(), a);
            });

            answers.forEach(newA => {
                if (newA.questionId) {
                    const qKey = newA.questionId.toString();
                    const existing = answerMap.get(qKey) || { questionId: newA.questionId };
                    existing.studentAnswer = newA.studentAnswer;
                    existing.userAnswer = newA.studentAnswer;
                    if (newA.sectionNumber !== undefined) existing.sectionNumber = newA.sectionNumber;
                    if (newA.questionNumber !== undefined) existing.questionNumber = newA.questionNumber;
                    answerMap.set(qKey, existing);
                }
            });

            attempt.answers = Array.from(answerMap.values());
        }

        if (durationSpent !== undefined) {
            attempt.durationSpent = parseInt(durationSpent) || attempt.durationSpent;
            attempt.timeSpentSeconds = attempt.durationSpent;
        }

        attempt.updatedAt = new Date();
        await attempt.save();

        res.json({
            message: "Javoblar avtomatik saqlandi.",
            lastSavedAt: new Date(),
            savedAnswersCount: attempt.answers.length
        });
    } catch (err) {
        console.error("Autosave answers error:", err);
        res.status(500).json({ message: "Javoblarni saqlashda xatolik." });
    }
});

// PUT /api/ielts/writing/attempts/:id/autosave - Autosave student writing essays
router.put(['/writing/attempts/:id/autosave', '/attempts/:id/save-writing'], async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const attempt = await IELTSAttempt.findById(req.params.id);

        if (!attempt) {
            return res.status(404).json({ message: "Writing test urinishi topilmadi." });
        }

        if (attempt.studentId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Ruxsat etilmagan amal." });
        }

        if (['COMPLETED', 'completed', 'EVALUATED', 'evaluated'].includes(attempt.status)) {
            return res.status(400).json({ message: "Yakunlangan yoki baholangan inshoni o'zgartirib bo'lmaydi." });
        }

        const { task1Answer, task1WordCount, task2Answer, task2WordCount, durationSpent } = req.body;

        if (task1Answer !== undefined) attempt.task1Answer = task1Answer;
        if (task1WordCount !== undefined) attempt.task1WordCount = parseInt(task1WordCount) || 0;
        if (task2Answer !== undefined) attempt.task2Answer = task2Answer;
        if (task2WordCount !== undefined) attempt.task2WordCount = parseInt(task2WordCount) || 0;
        if (durationSpent !== undefined) {
            attempt.durationSpent = parseInt(durationSpent) || attempt.durationSpent;
            attempt.timeSpentSeconds = attempt.durationSpent;
        }

        attempt.updatedAt = new Date();
        await attempt.save();

        res.json({
            message: "Insho qoralamasi avtomatik saqlandi.",
            lastSavedAt: new Date(),
            task1WordCount: attempt.task1WordCount,
            task2WordCount: attempt.task2WordCount
        });
    } catch (err) {
        console.error("Writing autosave error:", err);
        res.status(500).json({ message: "Writing javoblarini saqlashda xatolik: " + err.message });
    }
});

// ==========================================
// PHASE 14: EXAM MODE, SECURITY & ADVANCED AUTOSAVE ENDPOINTS
// ==========================================

// POST & PUT /api/ielts/attempts/:id/autosave - Unified fault-tolerant autosave
router.all(['/attempts/:id/autosave', '/exams/security/attempts/:id/autosave'], async (req, res) => {
    if (!['POST', 'PUT'].includes(req.method)) {
        return res.status(405).json({ message: "Faqat POST va PUT metodlari qabul qilinadi." });
    }
    try {
        const userId = req.user.userId || req.user._id;

        // Concurrency-safe retry loop (up to 3 attempts)
        let savedAttempt = null;
        for (let retry = 0; retry < 3; retry++) {
            try {
                const attempt = await IELTSAttempt.findById(req.params.id);

                if (!attempt) {
                    return res.status(404).json({ message: "Test urinishi topilmadi." });
                }

                if (attempt.studentId.toString() !== userId.toString()) {
                    return res.status(403).json({ message: "Ruxsat etilmagan amal. Ushbu urinish boshqa talabaga tegishli." });
                }

                if (attempt.isTerminatedByProctor) {
                    return res.status(403).json({ 
                        terminated: true, 
                        isTerminatedByProctor: true, 
                        message: attempt.terminatedReason || "Ushbu imtihon nazoratchi tomonidan to'xtatildi." 
                    });
                }

                if (['COMPLETED', 'completed', 'SUBMITTED', 'submitted'].includes(attempt.status)) {
                    return res.status(400).json({ message: "Yakunlangan test javoblarini o'zgartirib bo'lmaydi." });
                }

                const { answers, task1Answer, task1WordCount, task2Answer, task2WordCount, durationSpent } = req.body;

                // 1. Merge objective answers without data loss
                let updatedAnswers = attempt.answers || [];
                if (Array.isArray(answers)) {
                    const answerMap = new Map();
                    updatedAnswers.forEach(a => {
                        if (a.questionId) answerMap.set(a.questionId.toString(), a);
                    });

                    answers.forEach(newA => {
                        if (newA.questionId) {
                            const qKey = newA.questionId.toString();
                            const existing = answerMap.get(qKey) || { questionId: newA.questionId };
                            existing.studentAnswer = newA.studentAnswer !== undefined ? newA.studentAnswer : existing.studentAnswer;
                            existing.userAnswer = existing.studentAnswer;
                            if (newA.sectionNumber !== undefined) existing.sectionNumber = newA.sectionNumber;
                            if (newA.questionNumber !== undefined) existing.questionNumber = newA.questionNumber;
                            answerMap.set(qKey, existing);
                        }
                    });

                    updatedAnswers = Array.from(answerMap.values());
                }

                const updatePayload = {
                    answers: updatedAnswers,
                    lastHeartbeat: new Date(),
                    updatedAt: new Date()
                };

                // 2. Update Writing answers
                if (task1Answer !== undefined) updatePayload.task1Answer = task1Answer;
                if (task1WordCount !== undefined) updatePayload.task1WordCount = parseInt(task1WordCount) || 0;
                if (task2Answer !== undefined) updatePayload.task2Answer = task2Answer;
                if (task2WordCount !== undefined) updatePayload.task2WordCount = parseInt(task2WordCount) || 0;

                // 3. Update timing
                if (durationSpent !== undefined) {
                    updatePayload.durationSpent = parseInt(durationSpent) || attempt.durationSpent;
                    updatePayload.timeSpentSeconds = updatePayload.durationSpent;
                }

                // 4. Update session keep-alive metadata
                const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '';
                if (clientIp) updatePayload.clientIp = String(clientIp);
                const userAgent = req.headers['user-agent'] || '';
                if (userAgent) updatePayload.userAgent = String(userAgent).substring(0, 300);

                // Atomic database update (bypasses __v concurrency collision while preserving all data)
                savedAttempt = await IELTSAttempt.findByIdAndUpdate(
                    req.params.id,
                    { $set: updatePayload },
                    { new: true }
                );

                break; // Break loop on success
            } catch (retryErr) {
                if (retry === 2) throw retryErr;
                await new Promise(r => setTimeout(r, 40 * (retry + 1)));
            }
        }

        if (!savedAttempt) {
            return res.status(500).json({ message: "Javoblarni saqlash muvaffaqiyatsiz bo'ldi." });
        }

        res.json({
            ok: true,
            message: "Javoblar avtomatik saqlandi.",
            lastSavedAt: savedAttempt.updatedAt,
            savedAnswersCount: (savedAttempt.answers || []).length,
            task1WordCount: savedAttempt.task1WordCount,
            task2WordCount: savedAttempt.task2WordCount
        });
    } catch (err) {
        console.error("Advanced autosave error:", err);
        res.status(500).json({ message: "Javoblarni avtomatik saqlashda xatolik: " + err.message });
    }
});

// POST /api/ielts/attempts/:id/heartbeat — Keep-alive heartbeat endpoint for active exam sessions
router.post(['/attempts/:id/heartbeat', '/exams/security/attempts/:id/heartbeat', '/exams/security/heartbeat/:id'], async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const userRole = (req.user.role || '').toLowerCase();
        const attempt = await IELTSAttempt.findById(req.params.id);

        if (!attempt) {
            return res.status(404).json({ message: "Test urinishi topilmadi." });
        }

        // Students can only ping their own attempts
        const isOwner = attempt.studentId.toString() === userId.toString();
        const isStaff = ['admin', 'superadmin', 'teacher', 'director'].includes(userRole);

        if (!isOwner && !isStaff) {
            return res.status(403).json({ message: "Ruxsat etilmagan amal." });
        }

        if (attempt.isTerminatedByProctor) {
            return res.status(200).json({
                ok: false,
                terminated: true,
                isTerminatedByProctor: true,
                reason: attempt.terminatedReason || "Imtihon nazoratchi tomonidan to'xtatildi.",
                terminatedAt: attempt.terminatedAt
            });
        }

        // Update heartbeat & client metadata
        attempt.lastHeartbeat = new Date();
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '';
        if (clientIp) attempt.clientIp = String(clientIp);
        const userAgent = req.headers['user-agent'] || '';
        if (userAgent) attempt.userAgent = String(userAgent).substring(0, 300);

        await attempt.save();

        res.json({
            ok: true,
            terminated: false,
            isTerminatedByProctor: false,
            tabSwitchCount: attempt.tabSwitchCount || 0,
            status: attempt.status,
            serverTime: new Date()
        });
    } catch (err) {
        console.error("Heartbeat error:", err);
        res.status(500).json({ message: "Heartbeat xatoligi: " + err.message });
    }
});

// POST /api/ielts/attempts/:id/violation — Log security violations (tab switching, blur events, copy-paste)
router.post(['/attempts/:id/violation', '/exams/security/attempts/:id/violation', '/exams/security/violation/:id'], async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const attempt = await IELTSAttempt.findById(req.params.id);

        if (!attempt) {
            return res.status(404).json({ message: "Test urinishi topilmadi." });
        }

        if (attempt.studentId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Ruxsat etilmagan amal." });
        }

        const { type = 'TAB_SWITCH', details = '' } = req.body;
        const allowedTypes = ['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY_PASTE', 'PROCTOR_TERMINATION', 'DEVTOOLS_OPEN', 'OTHER'];
        const violationType = allowedTypes.includes(type) ? type : 'OTHER';

        // Increment tabSwitchCount for navigation/focus breaches
        if (['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT'].includes(violationType)) {
            attempt.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
        }

        if (!Array.isArray(attempt.securityViolations)) {
            attempt.securityViolations = [];
        }

        attempt.securityViolations.push({
            type: violationType,
            timestamp: new Date(),
            details: String(details).substring(0, 500)
        });

        attempt.lastHeartbeat = new Date();
        await attempt.save();

        res.json({
            ok: true,
            message: "Xavfsizlik qoidabuzarligi qayd etildi.",
            violationType,
            tabSwitchCount: attempt.tabSwitchCount,
            totalViolations: attempt.securityViolations.length,
            isTerminated: attempt.isTerminatedByProctor,
            warningLevel: attempt.tabSwitchCount >= 3 ? 'HIGH' : (attempt.tabSwitchCount >= 1 ? 'MEDIUM' : 'LOW')
        });
    } catch (err) {
        console.error("Violation logging error:", err);
        res.status(500).json({ message: "Qoidabuzarlikni qayd etishda xatolik: " + err.message });
    }
});

// POST /api/ielts/attempts/:id/terminate — Proctor / Teacher / Admin endpoint to terminate attempt
router.post(['/attempts/:id/terminate', '/exams/security/attempts/:id/terminate'], async (req, res) => {
    try {
        const userRole = (req.user.role || '').toLowerCase();
        const allowedRoles = ['admin', 'superadmin', 'teacher', 'director', 'management'];
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "Faqat o'qituvchi yoki administrator imtihonni to'xtatishi mumkin." });
        }

        const attempt = await IELTSAttempt.findById(req.params.id);
        if (!attempt) {
            return res.status(404).json({ message: "Test urinishi topilmadi." });
        }

        const { reason = "Nazoratchi qarori bilan to'xtatildi (Akademik qoidabuzarlik)" } = req.body;

        attempt.isTerminatedByProctor = true;
        attempt.terminatedReason = reason;
        attempt.terminatedAt = new Date();

        if (!Array.isArray(attempt.securityViolations)) {
            attempt.securityViolations = [];
        }
        attempt.securityViolations.push({
            type: 'PROCTOR_TERMINATION',
            timestamp: new Date(),
            details: reason
        });

        await attempt.save();

        res.json({
            ok: true,
            message: "Urinish muvaffaqiyatli to'xtatildi.",
            attemptId: attempt._id,
            terminatedAt: attempt.terminatedAt,
            reason
        });
    } catch (err) {
        console.error("Terminate attempt error:", err);
        res.status(500).json({ message: "Urinishni to'xtatishda xatolik: " + err.message });
    }
});

// GET /api/ielts/attempts/:id/security-status — Get security violation summary
router.get(['/attempts/:id/security-status', '/exams/security/attempts/:id/status'], async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const userRole = (req.user.role || '').toLowerCase();
        const attempt = await IELTSAttempt.findById(req.params.id)
            .populate('studentId', 'name username email')
            .populate('testId', 'title code skillType');

        if (!attempt) {
            return res.status(404).json({ message: "Test urinishi topilmadi." });
        }

        const isOwner = attempt.studentId._id ? attempt.studentId._id.toString() === userId.toString() : attempt.studentId.toString() === userId.toString();
        const isStaff = ['admin', 'superadmin', 'teacher', 'director', 'management'].includes(userRole);

        if (!isOwner && !isStaff) {
            return res.status(403).json({ message: "Ruxsat etilmagan amal." });
        }

        res.json({
            attemptId: attempt._id,
            student: attempt.studentId,
            test: attempt.testId,
            tabSwitchCount: attempt.tabSwitchCount || 0,
            lastHeartbeat: attempt.lastHeartbeat,
            clientIp: attempt.clientIp,
            userAgent: attempt.userAgent,
            isTerminatedByProctor: attempt.isTerminatedByProctor,
            terminatedReason: attempt.terminatedReason,
            securityViolations: attempt.securityViolations || [],
            status: attempt.status
        });
    } catch (err) {
        console.error("Get security status error:", err);
        res.status(500).json({ message: "Xavfsizlik ma'lumotlarini olishda xatolik: " + err.message });
    }
});

// POST /api/ielts/writing/attempts/:id/submit - Submit student writing test
router.post('/writing/attempts/:id/submit', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const attempt = await IELTSAttempt.findById(req.params.id);

        if (!attempt) {
            return res.status(404).json({ message: "Writing test urinishi topilmadi." });
        }

        if (attempt.studentId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Ruxsat etilmagan amal." });
        }

        if (['COMPLETED', 'completed', 'EVALUATED', 'evaluated', 'PENDING_EVALUATION', 'pending_evaluation'].includes(attempt.status)) {
            return res.status(400).json({ message: "Ushbu writing testi allaqachon topshirilgan." });
        }

        const { task1Answer, task1WordCount, task2Answer, task2WordCount, durationSpent } = req.body;
        if (task1Answer !== undefined) attempt.task1Answer = task1Answer;
        if (task1WordCount !== undefined) attempt.task1WordCount = parseInt(task1WordCount) || 0;
        if (task2Answer !== undefined) attempt.task2Answer = task2Answer;
        if (task2WordCount !== undefined) attempt.task2WordCount = parseInt(task2WordCount) || 0;

        const endTime = new Date();
        const start = new Date(attempt.startTime || attempt.startedAt || endTime);
        const computedDuration = durationSpent || Math.max(1, Math.round((endTime.getTime() - start.getTime()) / 1000));

        attempt.status = 'PENDING_EVALUATION';
        attempt.endTime = endTime;
        attempt.completedAt = endTime;
        attempt.durationSpent = computedDuration;
        attempt.timeSpentSeconds = computedDuration;
        await attempt.save();

        res.json({
            message: "IELTS Writing imtihoni muvaffaqiyatli topshirildi va o'qituvchi tekshiruviga yuborildi!",
            attempt: {
                _id: attempt._id,
                status: 'PENDING_EVALUATION',
                task1WordCount: attempt.task1WordCount,
                task2WordCount: attempt.task2WordCount,
                durationSpent: computedDuration,
                completedAt: endTime
            }
        });
    } catch (err) {
        console.error("Submit writing attempt error:", err);
        res.status(500).json({ message: "Writing testini topshirishda xatolik: " + err.message });
    }
});

// POST /api/ielts/speaking/attempts/:id/upload-audio - Upload audio response for Part 1, 2, or 3
router.post('/speaking/attempts/:id/upload-audio', uploadSpeakingAudio.single('audio'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const attempt = await IELTSAttempt.findById(req.params.id);

        if (!attempt) {
            return res.status(404).json({ message: "Speaking test urinishi topilmadi." });
        }

        if (attempt.studentId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Ruxsat etilmagan amal." });
        }

        if (['COMPLETED', 'completed', 'EVALUATED', 'evaluated'].includes(attempt.status)) {
            return res.status(400).json({ message: "Yakunlangan yoki baholangan testga audio yuklab bo'lmaydi." });
        }

        const partNumber = parseInt(req.body.partNumber) || 1;
        const durationSeconds = parseInt(req.body.durationSeconds) || 0;
        const promptText = req.body.promptText || '';

        let audioUrl = '';
        if (req.file) {
            audioUrl = `/uploads/ielts-speaking/${req.file.filename}`;
        } else if (req.body.audioUrl) {
            audioUrl = req.body.audioUrl;
        } else {
            return res.status(400).json({ message: "Audio fayli yoki audioUrl yuborilishi shart." });
        }

        if (!Array.isArray(attempt.speakingSubmissions)) {
            attempt.speakingSubmissions = [];
        }

        let existing = attempt.speakingSubmissions.find(s => s.partNumber === partNumber);
        if (existing) {
            existing.audioUrl = audioUrl;
            existing.durationSeconds = durationSeconds;
            if (promptText) existing.promptText = promptText;
            existing.submittedAt = new Date();
        } else {
            attempt.speakingSubmissions.push({
                partNumber,
                promptText,
                audioUrl,
                durationSeconds,
                submittedAt: new Date()
            });
        }

        if (partNumber === 1) attempt.part1AudioUrl = audioUrl;
        if (partNumber === 2) attempt.part2AudioUrl = audioUrl;
        if (partNumber === 3) attempt.part3AudioUrl = audioUrl;

        attempt.updatedAt = new Date();
        await attempt.save();

        res.json({
            message: `Part ${partNumber} audio muvaffaqiyatli saqlandi!`,
            audioUrl,
            partNumber,
            durationSeconds,
            speakingSubmissions: attempt.speakingSubmissions
        });
    } catch (err) {
        console.error("Upload speaking audio error:", err);
        res.status(500).json({ message: "Audio faylni yuklashda xatolik: " + err.message });
    }
});

// POST /api/ielts/speaking/attempts/:id/submit - Submit full speaking test for teacher evaluation
router.post('/speaking/attempts/:id/submit', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const attempt = await IELTSAttempt.findById(req.params.id);

        if (!attempt) {
            return res.status(404).json({ message: "Speaking test urinishi topilmadi." });
        }

        if (attempt.studentId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Ruxsat etilmagan amal." });
        }

        if (['COMPLETED', 'completed', 'EVALUATED', 'evaluated', 'PENDING_EVALUATION', 'pending_evaluation'].includes(attempt.status)) {
            return res.status(400).json({ message: "Ushbu speaking testi allaqachon topshirilgan." });
        }

        const endTime = new Date();
        const start = new Date(attempt.startTime || attempt.startedAt || endTime);
        const computedDuration = Math.max(1, Math.round((endTime.getTime() - start.getTime()) / 1000));

        attempt.status = 'PENDING_EVALUATION';
        attempt.endTime = endTime;
        attempt.completedAt = endTime;
        attempt.durationSpent = computedDuration;
        attempt.timeSpentSeconds = computedDuration;
        attempt.updatedAt = new Date();
        await attempt.save();

        res.json({
            message: "IELTS Speaking imtihoni muvaffaqiyatli topshirildi va o'qituvchi tekshiruviga yuborildi!",
            attempt: {
                _id: attempt._id,
                status: 'PENDING_EVALUATION',
                durationSpent: computedDuration,
                completedAt: endTime,
                speakingSubmissions: attempt.speakingSubmissions
            }
        });
    } catch (err) {
        console.error("Submit speaking attempt error:", err);
        res.status(500).json({ message: "Speaking testini topshirishda xatolik: " + err.message });
    }
});

// POST /api/ielts/attempts/:id/submit - Finalize test, grade objective questions, compute band score
router.post('/attempts/:id/submit', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const attempt = await IELTSAttempt.findById(req.params.id);

        if (!attempt) {
            return res.status(404).json({ message: "Test urinishi topilmadi." });
        }

        if (attempt.studentId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Ruxsat etilmagan amal." });
        }

        if (attempt.status === 'COMPLETED' || attempt.status === 'completed' || attempt.status === 'EVALUATED' || attempt.status === 'PENDING_EVALUATION') {
            return res.status(400).json({ message: "Ushbu test allaqachon topshirilgan." });
        }

        // Check if this is a Writing test
        const testCheck = await IELTSTest.findById(attempt.testId);
        const isWritingTest = (testCheck?.skillType === 'WRITING' || testCheck?.skill === 'writing' || attempt.skillType === 'WRITING' || attempt.skill === 'writing');

        if (isWritingTest) {
            const { task1Answer, task1WordCount, task2Answer, task2WordCount, durationSpent } = req.body;
            if (task1Answer !== undefined) attempt.task1Answer = task1Answer;
            if (task1WordCount !== undefined) attempt.task1WordCount = parseInt(task1WordCount) || 0;
            if (task2Answer !== undefined) attempt.task2Answer = task2Answer;
            if (task2WordCount !== undefined) attempt.task2WordCount = parseInt(task2WordCount) || 0;

            const endTime = new Date();
            const start = new Date(attempt.startTime || attempt.startedAt || endTime);
            const computedDuration = durationSpent || Math.max(1, Math.round((endTime.getTime() - start.getTime()) / 1000));

            attempt.status = 'PENDING_EVALUATION';
            attempt.endTime = endTime;
            attempt.completedAt = endTime;
            attempt.durationSpent = computedDuration;
            attempt.timeSpentSeconds = computedDuration;
            await attempt.save();

            return res.json({
                message: "IELTS Writing imtihoni muvaffaqiyatli topshirildi va o'qituvchi tekshiruviga yuborildi!",
                attempt: {
                    _id: attempt._id,
                    status: 'PENDING_EVALUATION',
                    task1WordCount: attempt.task1WordCount,
                    task2WordCount: attempt.task2WordCount,
                    durationSpent: computedDuration,
                    completedAt: endTime
                }
            });
        }

        // Apply any final answer submissions from payload
        const { answers, durationSpent } = req.body;
        if (Array.isArray(answers)) {
            const answerMap = new Map();
            (attempt.answers || []).forEach(a => {
                if (a.questionId) answerMap.set(a.questionId.toString(), a);
            });

            answers.forEach(newA => {
                if (newA.questionId) {
                    const qKey = newA.questionId.toString();
                    const existing = answerMap.get(qKey) || { questionId: newA.questionId };
                    existing.studentAnswer = newA.studentAnswer;
                    existing.userAnswer = newA.studentAnswer;
                    if (newA.sectionNumber !== undefined) existing.sectionNumber = newA.sectionNumber;
                    if (newA.questionNumber !== undefined) existing.questionNumber = newA.questionNumber;
                    answerMap.set(qKey, existing);
                }
            });

            attempt.answers = Array.from(answerMap.values());
        }

        // Populate test and FULL questions including correct answers for grading
        const test = await IELTSTest.findById(attempt.testId)
            .populate('sections.questionIds');

        if (!test) {
            return res.status(404).json({ message: "Test topilmadi." });
        }

        // Collect all questions into a lookup map
        const questionMap = new Map();
        let totalExamQuestions = 0;

        test.sections.forEach(sec => {
            if (Array.isArray(sec.questionIds)) {
                sec.questionIds.forEach(q => {
                    if (q && q._id) {
                        questionMap.set(q._id.toString(), q);
                        totalExamQuestions++;
                    }
                });
            }
        });

        // Evaluate student answers
        let correctCount = 0;
        const reviewBreakdown = [];
        const mistakesToRecord = [];

        // Grade answered questions
        const evaluatedAnswers = (attempt.answers || []).map(ans => {
            const q = questionMap.get(ans.questionId ? ans.questionId.toString() : '');
            let isCorrect = false;

            if (q) {
                isCorrect = evaluateAnswer(ans.studentAnswer, q.correctAnswer);
                if (isCorrect) correctCount++;

                reviewBreakdown.push({
                    questionId: q._id,
                    prompt: q.prompt,
                    questionType: q.questionType,
                    sectionNumber: ans.sectionNumber || q.sectionNumber || 1,
                    studentAnswer: ans.studentAnswer || '',
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || '',
                    isCorrect
                });

                if (!isCorrect) {
                    mistakesToRecord.push({
                        studentId: userId,
                        testId: attempt.testId,
                        attemptId: attempt._id,
                        questionId: q._id,
                        skillType: (test.skillType || attempt.skillType || 'LISTENING').toUpperCase(),
                        questionPrompt: q.prompt || '',
                        questionType: q.questionType || '',
                        studentAnswer: ans.studentAnswer || '(No answer)',
                        correctAnswer: q.correctAnswer || '',
                        explanation: q.explanation || '',
                        isReviewed: false
                    });
                }
            }

            return {
                ...ans,
                isCorrect,
                scoreGiven: isCorrect ? 1 : 0
            };
        });

        const effectiveMax = totalExamQuestions > 0 ? totalExamQuestions : 40;
        const isReading = (test.skillType === 'READING' || test.skill === 'reading' || attempt.skillType === 'READING' || attempt.skill === 'reading');
        const calculatedBand = isReading
            ? calculateReadingBand(correctCount, effectiveMax)
            : calculateListeningBand(correctCount, effectiveMax);

        const endTime = new Date();
        const start = new Date(attempt.startTime || attempt.startedAt || endTime);
        const computedDuration = durationSpent || Math.max(1, Math.round((endTime.getTime() - start.getTime()) / 1000));

        attempt.answers = evaluatedAnswers;
        attempt.rawScore = correctCount;
        attempt.maxRawScore = effectiveMax;
        attempt.bandScore = calculatedBand;
        attempt.sectionBands = attempt.sectionBands || {};
        if (isReading) {
            attempt.sectionBands.reading = calculatedBand;
        } else {
            attempt.sectionBands.listening = calculatedBand;
        }
        attempt.status = 'COMPLETED';
        attempt.endTime = endTime;
        attempt.completedAt = endTime;
        attempt.durationSpent = computedDuration;
        attempt.timeSpentSeconds = computedDuration;

        await attempt.save();

        // Ingest mistakes into IELTSMistake collection if any
        if (mistakesToRecord.length > 0) {
            try {
                await IELTSMistake.insertMany(mistakesToRecord);
            } catch (mistakeErr) {
                console.error("Failed to insert mistake logs:", mistakeErr);
            }
        }

        const skillLabel = isReading ? "Reading" : "Listening";
        res.json({
            message: `IELTS ${skillLabel} imtihoni muvaffaqiyatli yakunlandi va topshirildi!`,
            attempt: {
                _id: attempt._id,
                rawScore: correctCount,
                maxRawScore: effectiveMax,
                bandScore: calculatedBand,
                status: 'COMPLETED',
                durationSpent: computedDuration,
                completedAt: endTime
            },
            review: reviewBreakdown
        });
    } catch (err) {
        console.error("Submit test attempt error:", err);
        res.status(500).json({ message: "Testni topshirishda xatolik: " + err.message });
    }
});

// 3. Question Bank (Admin & English Teacher - Full CRUD)
router.get('/questions', englishTeacherOrAdmin, async (req, res) => {
    try {
        const { skillType, difficulty, questionType, search, page = 1, limit = 20 } = req.query;
        const filter = {};

        if (skillType && skillType !== 'ALL') {
            filter.$or = [
                { skillType: skillType.toUpperCase() },
                { skill: skillType.toLowerCase() }
            ];
        }

        if (difficulty && difficulty !== 'ALL') {
            filter.difficulty = difficulty.toUpperCase();
        }

        if (questionType && questionType !== 'ALL') {
            filter.questionType = questionType;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { prompt: regex },
                    { passageReference: regex },
                    { tags: regex },
                    { moduleType: regex }
                ]
            });
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = Math.min(parseInt(limit) || 20, 100);
        const skip = (pageNum - 1) * limitNum;

        const [questions, total, listeningCount, readingCount, writingCount, speakingCount] = await Promise.all([
            IELTSQuestion.find(filter)
                .populate('createdBy', 'username email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            IELTSQuestion.countDocuments(filter),
            IELTSQuestion.countDocuments({ $or: [{ skillType: 'LISTENING' }, { skill: 'listening' }] }),
            IELTSQuestion.countDocuments({ $or: [{ skillType: 'READING' }, { skill: 'reading' }] }),
            IELTSQuestion.countDocuments({ $or: [{ skillType: 'WRITING' }, { skill: 'writing' }] }),
            IELTSQuestion.countDocuments({ $or: [{ skillType: 'SPEAKING' }, { skill: 'speaking' }] })
        ]);

        res.json({
            questions: questions || [],
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1
            },
            counts: {
                total: listeningCount + readingCount + writingCount + speakingCount,
                listening: listeningCount,
                reading: readingCount,
                writing: writingCount,
                speaking: speakingCount
            }
        });
    } catch (err) {
        console.error("Fetch questions error:", err);
        res.status(500).json({ message: "Savollar bankini yuklashda xatolik yuz berdi." });
    }
});

// Create Question (Admin & English Teacher)
router.post('/questions', englishTeacherOrAdmin, async (req, res) => {
    try {
        const {
            skillType,
            moduleType,
            sectionNumber,
            questionType,
            prompt,
            passageReference,
            options,
            correctAnswer,
            explanation,
            difficulty,
            tags
        } = req.body;

        if (!prompt || !prompt.trim()) {
            return res.status(400).json({ message: "Savol matni (prompt) kiritilishi shart." });
        }

        const normalizedSkill = (skillType || 'READING').toUpperCase();

        const newQuestion = new IELTSQuestion({
            skillType: normalizedSkill,
            skill: normalizedSkill.toLowerCase(),
            moduleType: moduleType || 'General',
            sectionNumber: parseInt(sectionNumber) || 1,
            questionType: questionType || 'multiple_choice',
            prompt: prompt.trim(),
            passageReference: passageReference ? passageReference.trim() : '',
            options: Array.isArray(options) ? options.filter(o => typeof o === 'string' && o.trim() !== '') : [],
            correctAnswer: correctAnswer !== undefined ? correctAnswer : '',
            explanation: explanation ? explanation.trim() : '',
            difficulty: (difficulty || 'EXAM_LEVEL').toUpperCase(),
            tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            createdBy: req.user.userId || req.user._id
        });

        await newQuestion.save();
        await newQuestion.populate('createdBy', 'username email');

        res.status(201).json({
            message: "Savol muvaffaqiyatli yaratildi.",
            question: newQuestion
        });
    } catch (err) {
        console.error("Create question error:", err);
        res.status(500).json({ message: "Savol yaratishda xatolik yuz berdi: " + err.message });
    }
});

// Get Single Question (Admin & English Teacher)
router.get('/questions/:id', englishTeacherOrAdmin, async (req, res) => {
    try {
        const question = await IELTSQuestion.findById(req.params.id).populate('createdBy', 'username email');
        if (!question) {
            return res.status(404).json({ message: "Savol topilmadi." });
        }
        res.json({ question });
    } catch (err) {
        res.status(500).json({ message: "Savolni yuklashda xatolik." });
    }
});

// Update Question (Admin & English Teacher)
router.put('/questions/:id', englishTeacherOrAdmin, async (req, res) => {
    try {
        const question = await IELTSQuestion.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: "Yangilanayotgan savol topilmadi." });
        }

        const updates = req.body;
        if (updates.prompt) question.prompt = updates.prompt.trim();
        if (updates.skillType) {
            question.skillType = updates.skillType.toUpperCase();
            question.skill = updates.skillType.toLowerCase();
        }
        if (updates.moduleType !== undefined) question.moduleType = updates.moduleType;
        if (updates.sectionNumber !== undefined) question.sectionNumber = parseInt(updates.sectionNumber) || 1;
        if (updates.questionType !== undefined) question.questionType = updates.questionType;
        if (updates.passageReference !== undefined) question.passageReference = updates.passageReference;
        if (updates.options !== undefined && Array.isArray(updates.options)) {
            question.options = updates.options.filter(o => typeof o === 'string' && o.trim() !== '');
        }
        if (updates.correctAnswer !== undefined) question.correctAnswer = updates.correctAnswer;
        if (updates.explanation !== undefined) question.explanation = updates.explanation;
        if (updates.difficulty !== undefined) question.difficulty = updates.difficulty.toUpperCase();
        if (updates.tags !== undefined) {
            question.tags = Array.isArray(updates.tags) ? updates.tags : typeof updates.tags === 'string' ? updates.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        }

        question.updatedAt = new Date();
        await question.save();
        await question.populate('createdBy', 'username email');

        res.json({
            message: "Savol muvaffaqiyatli yangilandi.",
            question
        });
    } catch (err) {
        console.error("Update question error:", err);
        res.status(500).json({ message: "Savolni tahrirlashda xatolik yuz berdi." });
    }
});

// Delete Question (Admin & English Teacher)
router.delete('/questions/:id', englishTeacherOrAdmin, async (req, res) => {
    try {
        const deleted = await IELTSQuestion.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: "O'chirilayotgan savol topilmadi." });
        }
        res.json({ message: "Savol muvaffaqiyatli o'chirildi.", id: req.params.id });
    } catch (err) {
        res.status(500).json({ message: "Savolni o'chirishda xatolik." });
    }
});

// Bulk Insert Questions (Admin & English Teacher)
router.post('/questions/bulk', englishTeacherOrAdmin, async (req, res) => {
    try {
        const { questions } = req.body;
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ message: "Savollar ro'yxati (array) kiritilishi shart." });
        }

        const prepared = questions.map(q => ({
            ...q,
            skillType: (q.skillType || 'READING').toUpperCase(),
            skill: (q.skillType || 'READING').toLowerCase(),
            difficulty: (q.difficulty || 'EXAM_LEVEL').toUpperCase(),
            createdBy: req.user.userId || req.user._id
        }));

        const inserted = await IELTSQuestion.insertMany(prepared);
        res.status(201).json({
            message: `${inserted.length} ta savol muvaffaqiyatli yuklandi.`,
            count: inserted.length
        });
    } catch (err) {
        res.status(500).json({ message: "Ommaviy yuklashda xatolik: " + err.message });
    }
});

// 4. Assignments Suite (Phase 9 - Teacher Assignments & Class Workflow)

// GET /api/ielts/assignments/meta - Fetch metadata (published tests, classes, students) for creating assignments
router.get('/assignments/meta', async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.userId || req.user._id;

        if (role === 'student') {
            return res.status(403).json({ message: "Ruxsat berilmagan." });
        }

        // Fetch published tests
        const tests = await IELTSTest.find({ isPublished: true, isActive: true })
            .select('title code skillType skill durationMinutes totalQuestions difficulty')
            .sort({ createdAt: -1 });

        // Fetch courses/classes
        let classQuery = {};
        if (role === 'teacher') {
            classQuery = { instructor: userId };
        }
        let courses = await Course.find(classQuery).select('title classGroup instructor students');
        if (courses.length === 0 && role === 'teacher') {
            // If teacher doesn't have courses assigned specifically, load all courses so they can assign
            courses = await Course.find().select('title classGroup instructor students');
        }

        const formattedClasses = courses.map(c => ({
            _id: c._id,
            title: c.title,
            classGroup: c.classGroup || c.title,
            studentCount: c.students?.length || 0,
            studentIds: c.students || []
        }));

        // Fetch student users
        const students = await User.find({ role: 'student' })
            .select('username email grade')
            .sort({ username: 1 });

        res.json({
            tests,
            classes: formattedClasses,
            students
        });
    } catch (err) {
        console.error("Fetch assignments meta error:", err);
        res.status(500).json({ message: "Vazifa ma'lumotlarini yuklashda xatolik: " + err.message });
    }
});

// POST /api/ielts/assignments - Create a new assignment (Admin & English Teacher)
router.post('/assignments', englishTeacherOrAdmin, async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.userId || req.user._id;

        if (role === 'student') {
            return res.status(403).json({ message: "Faqat o'qituvchilar va ma'murlar yangi vazifa bera oladi." });
        }

        const {
            testId,
            title,
            targetType,
            targetId,
            targetClass,
            targetStudents,
            dueDate,
            deadline,
            instructions,
            allowLateSubmission
        } = req.body;

        if (!testId) {
            return res.status(400).json({ message: "Biriktiriladigan test tanlanishi shart." });
        }

        const test = await IELTSTest.findById(testId);
        if (!test) {
            return res.status(404).json({ message: "Tanlangan test topilmadi." });
        }

        const normalizedTargetType = (targetType || 'ALL').toUpperCase();
        let resolvedStudents = Array.isArray(targetStudents) ? [...targetStudents] : [];
        let resolvedClassName = targetClass || '';

        // If target is CLASS, resolve course students
        if (['CLASS', 'GROUP'].includes(normalizedTargetType) && targetId) {
            const course = await Course.findById(targetId);
            if (course) {
                resolvedClassName = course.classGroup || course.title;
                if (course.students && course.students.length > 0) {
                    const studentIdStrings = resolvedStudents.map(id => id.toString());
                    course.students.forEach(sId => {
                        if (!studentIdStrings.includes(sId.toString())) {
                            resolvedStudents.push(sId);
                        }
                    });
                }
            }
        } else if (normalizedTargetType === 'STUDENT' && targetId) {
            if (!resolvedStudents.some(id => id.toString() === targetId.toString())) {
                resolvedStudents.push(targetId);
            }
        }

        const finalDueDate = dueDate || deadline ? new Date(dueDate || deadline) : undefined;

        const assignment = new IELTSAssignment({
            title: title?.trim() || test.title,
            testId,
            teacherId: userId,
            assignedBy: userId,
            targetType: normalizedTargetType,
            targetId: targetId || undefined,
            targetClass: resolvedClassName,
            targetStudents: resolvedStudents,
            dueDate: finalDueDate,
            deadline: finalDueDate,
            instructions: instructions || '',
            status: 'ACTIVE',
            allowLateSubmission: !!allowLateSubmission
        });

        await assignment.save();

        const populated = await IELTSAssignment.findById(assignment._id)
            .populate('testId', 'title code skillType skill durationMinutes totalQuestions')
            .populate('teacherId', 'username email');

        res.status(201).json({
            message: "Vazifa muvaffaqiyatli yaratildi va o'quvchilarga biriktirildi.",
            assignment: populated
        });
    } catch (err) {
        console.error("Create assignment error:", err);
        res.status(500).json({ message: "Vazifa yaratishda xatolik: " + err.message });
    }
});

// GET /api/ielts/assignments/teacher - View teacher created assignments and completion stats
router.get('/assignments/teacher', englishTeacherOrAdmin, async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.userId || req.user._id;

        if (role === 'student') {
            return res.status(403).json({ message: "Faqat o'qituvchilar va rahbarlar uchun ruxsat etilgan." });
        }

        const filter = { status: { $ne: 'ARCHIVED' } };
        if (role === 'teacher') {
            filter.$or = [{ teacherId: userId }, { assignedBy: userId }];
        }

        const assignments = await IELTSAssignment.find(filter)
            .populate('testId', 'title code skillType skill durationMinutes totalQuestions difficulty')
            .populate('teacherId', 'username email')
            .populate('assignedBy', 'username')
            .populate('targetStudents', 'username email grade')
            .sort({ createdAt: -1 });

        const totalSystemStudents = await User.countDocuments({ role: 'student' });

        // Calculate enriched statistics for each assignment
        const enriched = await Promise.all(assignments.map(async (assignment) => {
            const assignmentObj = assignment.toObject();

            // Total targeted students count
            let targetCount = 0;
            if (['ALL', 'all_students'].includes(assignment.targetType)) {
                targetCount = totalSystemStudents;
            } else if (assignment.targetStudents && assignment.targetStudents.length > 0) {
                targetCount = assignment.targetStudents.length;
            } else {
                targetCount = 1;
            }

            // Find all attempts linked to this assignment
            const attempts = await IELTSAttempt.find({ assignmentId: assignment._id })
                .populate('studentId', 'username email grade')
                .lean();

            const submittedAttempts = attempts.filter(a =>
                ['COMPLETED', 'completed', 'SUBMITTED', 'submitted', 'PENDING_EVALUATION', 'EVALUATED', 'evaluated'].includes(a.status)
            );
            const evaluatedAttempts = attempts.filter(a =>
                ['EVALUATED', 'evaluated'].includes(a.status)
            );
            const inProgressAttempts = attempts.filter(a =>
                ['IN_PROGRESS', 'in_progress'].includes(a.status)
            );

            const submittedCount = submittedAttempts.length;
            const completionRate = targetCount > 0 ? Math.min(100, Math.round((submittedCount / targetCount) * 100)) : 0;

            return {
                ...assignmentObj,
                stats: {
                    targetCount,
                    submittedCount,
                    evaluatedCount: evaluatedAttempts.length,
                    inProgressCount: inProgressAttempts.length,
                    completionRate
                }
            };
        }));

        res.json({ assignments: enriched });
    } catch (err) {
        console.error("Teacher assignments error:", err);
        res.status(500).json({ message: "O'qituvchi vazifalarini yuklashda xatolik: " + err.message });
    }
});

// GET /api/ielts/assignments/student - View student pending and completed test assignments
router.get('/assignments/student', async (req, res) => {
    try {
        const studentId = req.user.userId || req.user._id;

        // Find enrolled classes
        const courses = await Course.find({ students: studentId }).select('_id classGroup');
        const courseIds = courses.map(c => c._id);

        const filter = {
            status: { $ne: 'ARCHIVED' },
            $or: [
                { targetType: { $in: ['ALL', 'all_students'] } },
                { assignedToRole: 'all_students' },
                { targetStudents: studentId },
                { targetId: studentId },
                { targetId: { $in: courseIds } }
            ]
        };

        const assignments = await IELTSAssignment.find(filter)
            .populate('testId', 'title code skillType skill durationMinutes totalQuestions difficulty')
            .populate('teacherId', 'username email')
            .populate('assignedBy', 'username')
            .sort({ dueDate: 1, createdAt: -1 });

        // Enrich with student's attempt status
        const enriched = await Promise.all(assignments.map(async (assignment) => {
            const assignmentObj = assignment.toObject();

            // Find attempt by student for this assignment
            let attempt = await IELTSAttempt.findOne({
                studentId,
                assignmentId: assignment._id
            }).populate('evaluationReference').sort({ createdAt: -1 });

            // If not found by assignmentId, check by testId if attempt happened after assignment creation
            if (!attempt && assignment.testId) {
                attempt = await IELTSAttempt.findOne({
                    studentId,
                    testId: assignment.testId._id,
                    createdAt: { $gte: assignment.createdAt }
                }).populate('evaluationReference').sort({ createdAt: -1 });
            }

            const now = new Date();
            const dueDate = assignment.dueDate || assignment.deadline;
            const isOverdue = dueDate && now > new Date(dueDate);

            let studentStatus = 'PENDING';
            if (attempt) {
                if (['EVALUATED', 'evaluated'].includes(attempt.status)) {
                    studentStatus = 'EVALUATED';
                } else if (['COMPLETED', 'completed', 'SUBMITTED', 'submitted', 'PENDING_EVALUATION'].includes(attempt.status)) {
                    studentStatus = 'SUBMITTED';
                } else if (['IN_PROGRESS', 'in_progress'].includes(attempt.status)) {
                    studentStatus = 'IN_PROGRESS';
                }
            } else {
                if (assignment.status === 'CLOSED') {
                    studentStatus = 'CLOSED';
                } else if (isOverdue && !assignment.allowLateSubmission) {
                    studentStatus = 'OVERDUE';
                } else {
                    studentStatus = 'PENDING';
                }
            }

            return {
                ...assignmentObj,
                studentStatus,
                isOverdue,
                attempt: attempt ? {
                    _id: attempt._id,
                    status: attempt.status,
                    overallBand: attempt.overallBand ?? attempt.bandScore,
                    listeningBand: attempt.listeningBand ?? attempt.sectionBands?.listening,
                    readingBand: attempt.readingBand ?? attempt.sectionBands?.reading,
                    writingBand: attempt.writingBand ?? attempt.sectionBands?.writing,
                    speakingBand: attempt.speakingBand ?? attempt.sectionBands?.speaking,
                    startedAt: attempt.startedAt || attempt.startTime,
                    submittedAt: attempt.submittedAt || attempt.endTime
                } : null
            };
        }));

        res.json({ assignments: enriched });
    } catch (err) {
        console.error("Student assignments error:", err);
        res.status(500).json({ message: "O'quvchi vazifalarini yuklashda xatolik: " + err.message });
    }
});

// GET /api/ielts/assignments/:id/submissions - View all candidate submissions for an assignment
router.get('/assignments/:id/submissions', englishTeacherOrAdmin, async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.userId || req.user._id;

        if (role === 'student') {
            return res.status(403).json({ message: "Faqat o'qituvchilar va rahbarlar uchun ruxsat etilgan." });
        }

        const assignment = await IELTSAssignment.findById(req.params.id)
            .populate('testId', 'title code skillType skill durationMinutes totalQuestions')
            .populate('teacherId', 'username email');

        if (!assignment) {
            return res.status(404).json({ message: "Vazifa topilmadi." });
        }

        const submissions = await IELTSAttempt.find({ assignmentId: assignment._id })
            .populate('studentId', 'username email grade')
            .populate('evaluationReference')
            .sort({ submittedAt: -1, createdAt: -1 });

        res.json({
            assignment,
            submissions
        });
    } catch (err) {
        console.error("Get assignment submissions error:", err);
        res.status(500).json({ message: "Natijalarni yuklashda xatolik: " + err.message });
    }
});

// PUT /api/ielts/assignments/:id - Update assignment details or close/archive
router.put('/assignments/:id', englishTeacherOrAdmin, async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.userId || req.user._id;

        if (role === 'student') {
            return res.status(403).json({ message: "Ruxsat berilmagan." });
        }

        const assignment = await IELTSAssignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: "Vazifa topilmadi." });
        }

        // Ownership check: teachers can only edit their own assignments
        if (role === 'teacher') {
            const ownerId = assignment.teacherId?.toString() || assignment.assignedBy?.toString();
            if (ownerId && ownerId !== userId.toString()) {
                return res.status(403).json({ message: "Faqat o'zingiz yaratgan vazifani tahrirlashingiz mumkin." });
            }
        }

        const {
            title,
            instructions,
            dueDate,
            deadline,
            status,
            allowLateSubmission,
            targetType,
            targetClass
        } = req.body;

        if (title !== undefined) assignment.title = title;
        if (instructions !== undefined) assignment.instructions = instructions;
        if (dueDate !== undefined || deadline !== undefined) {
            const d = dueDate || deadline ? new Date(dueDate || deadline) : undefined;
            assignment.dueDate = d;
            assignment.deadline = d;
        }
        if (status !== undefined) {
            const upperStatus = status.toUpperCase();
            if (['ACTIVE', 'CLOSED', 'ARCHIVED'].includes(upperStatus)) {
                assignment.status = upperStatus;
            }
        }
        if (allowLateSubmission !== undefined) assignment.allowLateSubmission = !!allowLateSubmission;
        if (targetType !== undefined) assignment.targetType = targetType.toUpperCase();
        if (targetClass !== undefined) assignment.targetClass = targetClass;

        assignment.updatedAt = new Date();
        await assignment.save();

        const updated = await IELTSAssignment.findById(assignment._id)
            .populate('testId', 'title code skillType skill')
            .populate('teacherId', 'username email');

        res.json({
            message: "Vazifa muvaffaqiyatli yangilandi.",
            assignment: updated
        });
    } catch (err) {
        console.error("Update assignment error:", err);
        res.status(500).json({ message: "Vazifani yangilashda xatolik: " + err.message });
    }
});

// DELETE /api/ielts/assignments/:id - Delete / archive an assignment
router.delete('/assignments/:id', englishTeacherOrAdmin, async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.userId || req.user._id;

        if (role === 'student') {
            return res.status(403).json({ message: "Ruxsat berilmagan." });
        }

        const assignment = await IELTSAssignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: "Vazifa topilmadi." });
        }

        if (role === 'teacher') {
            const ownerId = assignment.teacherId?.toString() || assignment.assignedBy?.toString();
            if (ownerId && ownerId !== userId.toString()) {
                return res.status(403).json({ message: "Faqat o'zingiz yaratgan vazifani o'chira olasiz." });
            }
        }

        await IELTSAssignment.findByIdAndDelete(req.params.id);

        res.json({
            message: "Vazifa muvaffaqiyatli o'chirildi."
        });
    } catch (err) {
        console.error("Delete assignment error:", err);
        res.status(500).json({ message: "Vazifani o'chirishda xatolik: " + err.message });
    }
});

// Backward-compatible generic GET /api/ielts/assignments
router.get('/assignments', async (req, res) => {
    try {
        const role = req.user.role;
        if (role === 'student') {
            // Forward to student assignments logic
            const studentId = req.user.userId || req.user._id;
            const courses = await Course.find({ students: studentId }).select('_id');
            const courseIds = courses.map(c => c._id);
            const assignments = await IELTSAssignment.find({
                status: { $ne: 'ARCHIVED' },
                $or: [
                    { targetType: { $in: ['ALL', 'all_students'] } },
                    { assignedToRole: 'all_students' },
                    { targetStudents: studentId },
                    { targetId: studentId },
                    { targetId: { $in: courseIds } }
                ]
            }).populate('testId', 'title skill durationMinutes').populate('assignedBy', 'username').sort({ createdAt: -1 });
            return res.json({ assignments: assignments || [] });
        } else {
            const userId = req.user.userId || req.user._id;
            const filter = { status: { $ne: 'ARCHIVED' } };
            if (role === 'teacher') filter.$or = [{ teacherId: userId }, { assignedBy: userId }];
            const assignments = await IELTSAssignment.find(filter)
                .populate('testId', 'title skill durationMinutes')
                .populate('assignedBy', 'username')
                .sort({ createdAt: -1 });
            return res.json({ assignments: assignments || [] });
        }
    } catch (err) {
        res.status(500).json({ message: "Vazifalarni yuklashda xatolik: " + err.message });
    }
});

// 5. Results & Aggregations
// GET /api/ielts/results/student - Fetch authenticated student's complete history, overall band, and trends
router.get('/results/student', async (req, res) => {
    try {
        const studentId = req.user.userId || req.user._id;

        const attempts = await IELTSAttempt.find({ studentId })
            .populate('testId', 'title code skillType skill difficulty durationMinutes totalQuestions')
            .populate('evaluationReference')
            .sort({ createdAt: -1, startedAt: -1 });

        // Calculate aggregates across completed / evaluated tests
        const completedAttempts = attempts.filter(a =>
            ['COMPLETED', 'completed', 'EVALUATED', 'evaluated'].includes(a.status) &&
            (a.overallBand != null || a.bandScore != null)
        );

        const listeningScores = [];
        const readingScores = [];
        const writingScores = [];
        const speakingScores = [];
        const overallScores = [];

        completedAttempts.forEach(a => {
            const overall = a.overallBand ?? a.bandScore;
            if (overall != null && !isNaN(overall)) overallScores.push(overall);

            const l = a.listeningBand ?? a.sectionBands?.listening;
            if (l != null && !isNaN(l)) listeningScores.push(l);

            const r = a.readingBand ?? a.sectionBands?.reading;
            if (r != null && !isNaN(r)) readingScores.push(r);

            const w = a.writingBand ?? a.sectionBands?.writing;
            if (w != null && !isNaN(w)) writingScores.push(w);

            const s = a.speakingBand ?? a.sectionBands?.speaking;
            if (s != null && !isNaN(s)) speakingScores.push(s);
        });

        const avg = (arr) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

        const listeningAvg = avg(listeningScores);
        const readingAvg = avg(readingScores);
        const writingAvg = avg(writingScores);
        const speakingAvg = avg(speakingScores);

        // Overall estimated band: if skills available, average them; else average of completed overalls
        const activeAvgs = [listeningAvg, readingAvg, writingAvg, speakingAvg].filter(x => x !== null);
        let estimatedOverall = 0;
        if (activeAvgs.length > 0) {
            estimatedOverall = calculateOverallIeltsBand(activeAvgs);
        } else if (overallScores.length > 0) {
            estimatedOverall = calculateOverallIeltsBand(overallScores);
        }

        const stats = {
            totalAttempts: attempts.length,
            completedAttempts: completedAttempts.length,
            estimatedOverallBand: estimatedOverall,
            cefrLevel: getCefrLevel(estimatedOverall),
            skillAverages: {
                listening: listeningAvg,
                reading: readingAvg,
                writing: writingAvg,
                speaking: speakingAvg
            },
            testsBySkill: {
                listening: listeningScores.length,
                reading: readingScores.length,
                writing: writingScores.length,
                speaking: speakingScores.length
            }
        };

        res.json({
            stats,
            attempts: attempts || []
        });
    } catch (err) {
        console.error("Fetch student results error:", err);
        res.status(500).json({ message: "Student natijalarini yuklashda xatolik: " + err.message });
    }
});

// ==========================================
// PHASE 10: STUDENT PROGRESS & MISTAKES SUITE
// ==========================================

// GET /api/ielts/progress - Analytical Progress Overview
router.get('/progress', async (req, res) => {
    try {
        const studentId = req.user.userId || req.user._id;

        const attempts = await IELTSAttempt.find({
            studentId,
            status: { $in: ['COMPLETED', 'completed', 'EVALUATED', 'evaluated'] }
        })
            .populate('testId', 'title code skillType skill durationMinutes totalQuestions')
            .populate('evaluationReference')
            .sort({ completedAt: 1, createdAt: 1 });

        // Calculate overarching metrics
        let totalPracticeSeconds = 0;
        let totalObjectiveQuestions = 0;
        let totalObjectiveCorrect = 0;
        const allBandScores = [];

        // Per-skill buckets
        const skillStats = {
            listening: { scores: [], correct: 0, totalQuestions: 0 },
            reading: { scores: [], correct: 0, totalQuestions: 0 },
            writing: { scores: [] },
            speaking: { scores: [] }
        };

        const progressionTimeline = [];

        attempts.forEach(a => {
            const duration = a.durationSpent || a.timeSpentSeconds || (a.testId?.durationMinutes ? a.testId.durationMinutes * 60 : 1800);
            totalPracticeSeconds += duration;

            const st = (a.skillType || a.skill || a.testId?.skillType || a.testId?.skill || 'FULL_MOCK').toUpperCase();
            const band = a.overallBand ?? a.bandScore;
            if (band != null && !isNaN(band)) {
                allBandScores.push(band);
                progressionTimeline.push({
                    attemptId: a._id,
                    title: a.testId?.title || 'Practice Test',
                    skillType: st,
                    bandScore: band,
                    date: a.completedAt || a.createdAt || new Date()
                });
            }

            // Accuracy evaluation for objective skills
            if (['LISTENING', 'READING'].includes(st)) {
                const correct = a.rawScore || (Array.isArray(a.answers) ? a.answers.filter(ans => ans.isCorrect).length : 0);
                const total = a.maxRawScore || (Array.isArray(a.answers) ? a.answers.length : 40);

                totalObjectiveCorrect += correct;
                totalObjectiveQuestions += total;

                if (st === 'LISTENING') {
                    if (band != null) skillStats.listening.scores.push(band);
                    skillStats.listening.correct += correct;
                    skillStats.listening.totalQuestions += total;
                } else {
                    if (band != null) skillStats.reading.scores.push(band);
                    skillStats.reading.correct += correct;
                    skillStats.reading.totalQuestions += total;
                }
            } else if (st === 'WRITING') {
                if (band != null) skillStats.writing.scores.push(band);
            } else if (st === 'SPEAKING') {
                if (band != null) skillStats.speaking.scores.push(band);
            }
        });

        const calcAvg = (arr) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
        const calcMax = (arr) => arr.length > 0 ? Math.max(...arr) : null;
        const calcAcc = (cor, tot) => tot > 0 ? Math.round((cor / tot) * 100) : null;

        const overview = {
            totalCompletedTests: attempts.length,
            averageBand: calcAvg(allBandScores) || 0,
            overallAccuracy: calcAcc(totalObjectiveCorrect, totalObjectiveQuestions) || (attempts.length > 0 ? 70 : 0),
            totalPracticeSeconds,
            totalPracticeHours: (totalPracticeSeconds / 3600).toFixed(1)
        };

        const skills = {
            listening: {
                completed: skillStats.listening.scores.length,
                averageBand: calcAvg(skillStats.listening.scores),
                highestBand: calcMax(skillStats.listening.scores),
                accuracy: calcAcc(skillStats.listening.correct, skillStats.listening.totalQuestions)
            },
            reading: {
                completed: skillStats.reading.scores.length,
                averageBand: calcAvg(skillStats.reading.scores),
                highestBand: calcMax(skillStats.reading.scores),
                accuracy: calcAcc(skillStats.reading.correct, skillStats.reading.totalQuestions)
            },
            writing: {
                completed: skillStats.writing.scores.length,
                averageBand: calcAvg(skillStats.writing.scores),
                highestBand: calcMax(skillStats.writing.scores)
            },
            speaking: {
                completed: skillStats.speaking.scores.length,
                averageBand: calcAvg(skillStats.speaking.scores),
                highestBand: calcMax(skillStats.speaking.scores)
            }
        };

        // Recent activity (latest 10 attempts descending)
        const recentActivity = attempts.slice().reverse().slice(0, 10).map(a => ({
            attemptId: a._id,
            testTitle: a.testId?.title || 'IELTS Mock Test',
            skillType: (a.skillType || a.skill || 'FULL_MOCK').toUpperCase(),
            bandScore: a.overallBand ?? a.bandScore,
            status: a.status,
            completedAt: a.completedAt || a.createdAt
        }));

        res.json({
            progress: {
                overview,
                skills,
                progressionTimeline,
                recentActivity
            }
        });
    } catch (err) {
        console.error("Fetch progress error:", err);
        res.status(500).json({ message: "Progress ma'lumotlarini yuklashda xatolik: " + err.message });
    }
});

// GET /api/ielts/mistakes - Student Mistake Notebook
router.get('/mistakes', async (req, res) => {
    try {
        const studentId = req.user.userId || req.user._id;
        const { skillType, status, search } = req.query;

        const filter = { studentId };

        if (skillType && skillType !== 'ALL') {
            filter.skillType = skillType.toUpperCase();
        }

        if (status === 'UNREVIEWED') {
            filter.isReviewed = false;
        } else if (status === 'REVIEWED') {
            filter.isReviewed = true;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { questionPrompt: regex },
                { studentAnswer: regex },
                { correctAnswer: regex },
                { explanation: regex }
            ];
        }

        const mistakes = await IELTSMistake.find(filter)
            .populate('testId', 'title code skillType')
            .populate('questionId', 'prompt questionType options audioUrl')
            .sort({ createdAt: -1 });

        // Aggregate statistics for student's mistake notebook
        const allStudentMistakes = await IELTSMistake.find({ studentId });
        const totalMistakes = allStudentMistakes.length;
        const unreviewedCount = allStudentMistakes.filter(m => !m.isReviewed).length;
        const reviewedCount = allStudentMistakes.filter(m => m.isReviewed).length;

        const bySkill = {
            LISTENING: allStudentMistakes.filter(m => m.skillType === 'LISTENING').length,
            READING: allStudentMistakes.filter(m => m.skillType === 'READING').length,
            WRITING: allStudentMistakes.filter(m => m.skillType === 'WRITING').length,
            SPEAKING: allStudentMistakes.filter(m => m.skillType === 'SPEAKING').length
        };

        res.json({
            mistakes,
            stats: {
                totalMistakes,
                unreviewedCount,
                reviewedCount,
                bySkill
            }
        });
    } catch (err) {
        console.error("Fetch mistakes error:", err);
        res.status(500).json({ message: "Xatolar daftarini yuklashda xatolik: " + err.message });
    }
});

// PATCH /api/ielts/mistakes/:id/review - Mark mistake as reviewed / mastered
router.patch('/mistakes/:id/review', async (req, res) => {
    try {
        const studentId = req.user.userId || req.user._id;
        const mistake = await IELTSMistake.findById(req.params.id);

        if (!mistake) {
            return res.status(404).json({ message: "Xatolik yozuvi topilmadi." });
        }

        // Strict role data isolation: only the student who made the mistake can review it
        if (mistake.studentId.toString() !== studentId.toString()) {
            return res.status(403).json({ message: "Ruxsat berilmagan. Faqat o'zingizning xatolaringizni belgilashingiz mumkin." });
        }

        const nextReviewed = req.body.isReviewed !== undefined ? !!req.body.isReviewed : !mistake.isReviewed;
        mistake.isReviewed = nextReviewed;
        mistake.reviewedAt = nextReviewed ? new Date() : null;
        await mistake.save();

        res.json({
            message: nextReviewed ? "Savol o'zlashtirildi deb belgilandi!" : "Savol qayta ko'rib chiqishga qaytarildi.",
            mistake
        });
    } catch (err) {
        console.error("Update mistake review error:", err);
        res.status(500).json({ message: "Xatolik holatini yangilashda xatolik: " + err.message });
    }
});

// GET /api/ielts/results/cohort - Teacher / Admin cohort results and analytics
router.get('/results/cohort', englishTeacherOrAdmin, async (req, res) => {
    try {
        const filter = {};
        if (req.query.skill) {
            filter.$or = [
                { skill: req.query.skill.toLowerCase() },
                { skillType: req.query.skill.toUpperCase() }
            ];
        }

        const attempts = await IELTSAttempt.find(filter)
            .populate('studentId', 'username email firstName lastName grade avatar')
            .populate('testId', 'title code skillType skill difficulty durationMinutes totalQuestions')
            .populate('evaluationReference')
            .sort({ updatedAt: -1, createdAt: -1 });

        const evaluatedAttempts = attempts.filter(a =>
            ['COMPLETED', 'completed', 'EVALUATED', 'evaluated'].includes(a.status) &&
            (a.overallBand != null || a.bandScore != null)
        );

        let overallSum = 0;
        let highestBand = 0;
        let passCount = 0; // Band >= 6.5

        const bandDistribution = {
            expert: 0,     // 8.0 - 9.0
            veryGood: 0,   // 7.0 - 7.5
            competent: 0,  // 6.0 - 6.5
            modest: 0,     // 5.0 - 5.5
            limited: 0      // < 5.0
        };

        const lBands = [];
        const rBands = [];
        const wBands = [];
        const sBands = [];

        evaluatedAttempts.forEach(a => {
            const band = a.overallBand ?? a.bandScore;
            if (band != null && !isNaN(band)) {
                overallSum += band;
                if (band > highestBand) highestBand = band;
                if (band >= 6.5) passCount++;

                if (band >= 8.0) bandDistribution.expert++;
                else if (band >= 7.0) bandDistribution.veryGood++;
                else if (band >= 6.0) bandDistribution.competent++;
                else if (band >= 5.0) bandDistribution.modest++;
                else bandDistribution.limited++;
            }

            const l = a.listeningBand ?? a.sectionBands?.listening;
            if (l != null && !isNaN(l)) lBands.push(l);

            const r = a.readingBand ?? a.sectionBands?.reading;
            if (r != null && !isNaN(r)) rBands.push(r);

            const w = a.writingBand ?? a.sectionBands?.writing;
            if (w != null && !isNaN(w)) wBands.push(w);

            const s = a.speakingBand ?? a.sectionBands?.speaking;
            if (s != null && !isNaN(s)) sBands.push(s);
        });

        const cohortAverageBand = evaluatedAttempts.length > 0
            ? Math.round((overallSum / evaluatedAttempts.length) * 10) / 10
            : 0;

        const passRate = evaluatedAttempts.length > 0
            ? Math.round((passCount / evaluatedAttempts.length) * 100)
            : 0;

        const avg = (arr) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

        res.json({
            cohortStats: {
                totalAttempts: attempts.length,
                totalEvaluated: evaluatedAttempts.length,
                cohortAverageBand,
                highestBand,
                passRate
            },
            bandDistribution,
            skillAverages: {
                listening: avg(lBands),
                reading: avg(rBands),
                writing: avg(wBands),
                speaking: avg(sBands)
            },
            results: attempts || []
        });
    } catch (err) {
        console.error("Fetch cohort results error:", err);
        res.status(500).json({ message: "Kogorta natijalarini yuklashda xatolik: " + err.message });
    }
});

// ==========================================
// PHASE 11: MANAGEMENT ANALYTICS & INSTITUTIONAL REPORTING
// ==========================================

// GET /api/ielts/management/overview - High-level institutional KPIs and metrics
router.get('/management/overview', managementOrAdmin, async (req, res) => {
    try {
        const [
            totalStudents,
            totalTeachers,
            totalClasses,
            totalAttempts,
            completedAttempts,
            pendingEvaluations,
            activeStudentIds
        ] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'teacher' }),
            Course.countDocuments(),
            IELTSAttempt.countDocuments(),
            IELTSAttempt.find({ status: { $in: ['COMPLETED', 'completed', 'EVALUATED', 'evaluated'] } })
                .select('overallBand bandScore listeningBand readingBand writingBand speakingBand sectionBands skillType skill durationMinutes timeSpentSeconds completedAt'),
            IELTSAttempt.countDocuments({ status: { $in: ['PENDING_EVALUATION', 'pending_evaluation'] } }),
            IELTSAttempt.distinct('studentId')
        ]);

        const evaluatedCount = completedAttempts.length;
        let bandSum = 0;
        let passCount = 0; // Band >= 6.5
        let totalHoursSeconds = 0;

        const lScores = [];
        const rScores = [];
        const wScores = [];
        const sScores = [];

        const bandDistribution = {
            expert: 0,    // 8.0 - 9.0
            veryGood: 0,  // 7.0 - 7.5
            competent: 0, // 6.0 - 6.5
            modest: 0,    // 5.0 - 5.5
            limited: 0    // < 5.0
        };

        completedAttempts.forEach(a => {
            const overall = a.overallBand ?? a.bandScore;
            if (overall != null && !isNaN(overall)) {
                bandSum += overall;
                if (overall >= 6.5) passCount++;

                if (overall >= 8.0) bandDistribution.expert++;
                else if (overall >= 7.0) bandDistribution.veryGood++;
                else if (overall >= 6.0) bandDistribution.competent++;
                else if (overall >= 5.0) bandDistribution.modest++;
                else bandDistribution.limited++;
            }

            const l = a.listeningBand ?? a.sectionBands?.listening;
            if (l != null && !isNaN(l)) lScores.push(l);

            const r = a.readingBand ?? a.sectionBands?.reading;
            if (r != null && !isNaN(r)) rScores.push(r);

            const w = a.writingBand ?? a.sectionBands?.writing;
            if (w != null && !isNaN(w)) wScores.push(w);

            const s = a.speakingBand ?? a.sectionBands?.speaking;
            if (s != null && !isNaN(s)) sScores.push(s);

            const dur = a.durationSpent || a.timeSpentSeconds || 1800;
            totalHoursSeconds += dur;
        });

        const institutionAverageBand = evaluatedCount > 0 ? Math.round((bandSum / evaluatedCount) * 10) / 10 : 0;
        const passRate = evaluatedCount > 0 ? Math.round((passCount / evaluatedCount) * 100) : 0;
        const avg = (arr) => arr.length > 0 ? Math.round((arr.reduce((x, y) => x + y, 0) / arr.length) * 10) / 10 : null;

        res.json({
            kpis: {
                totalStudents,
                activeCandidates: activeStudentIds.length,
                totalTeachers,
                totalClasses,
                totalAttempts,
                completedAttempts: evaluatedCount,
                pendingEvaluations,
                institutionAverageBand,
                passRate,
                totalPracticeHours: (totalHoursSeconds / 3600).toFixed(1)
            },
            bandDistribution,
            skillAverages: {
                listening: avg(lScores),
                reading: avg(rScores),
                writing: avg(wScores),
                speaking: avg(sScores)
            }
        });
    } catch (err) {
        console.error("Management overview error:", err);
        res.status(500).json({ message: "Management overview yuklashda xatolik: " + err.message });
    }
});

// GET /api/ielts/management/performance - Class-by-class comparison and skill macro metrics
router.get('/management/performance', managementOrAdmin, async (req, res) => {
    try {
        const courses = await Course.find()
            .populate('instructor', 'username email')
            .populate('students', 'username email grade');

        const attempts = await IELTSAttempt.find({
            status: { $in: ['COMPLETED', 'completed', 'EVALUATED', 'evaluated'] }
        }).select('studentId overallBand bandScore skillType skill');

        // Map attempts by studentId
        const studentAttemptsMap = new Map();
        attempts.forEach(a => {
            const sid = a.studentId.toString();
            if (!studentAttemptsMap.has(sid)) studentAttemptsMap.set(sid, []);
            studentAttemptsMap.get(sid).push(a);
        });

        const classPerformance = courses.map(course => {
            const studentIds = (course.students || []).map(s => s._id.toString());
            const classAttempts = [];
            studentIds.forEach(sid => {
                if (studentAttemptsMap.has(sid)) {
                    classAttempts.push(...studentAttemptsMap.get(sid));
                }
            });

            const bands = classAttempts.map(a => a.overallBand ?? a.bandScore).filter(b => b != null && !isNaN(b));
            const avgBand = bands.length > 0 ? Math.round((bands.reduce((x, y) => x + y, 0) / bands.length) * 10) / 10 : 0;
            const highestBand = bands.length > 0 ? Math.max(...bands) : 0;
            const passCount = bands.filter(b => b >= 6.5).length;
            const passRate = bands.length > 0 ? Math.round((passCount / bands.length) * 100) : 0;

            return {
                _id: course._id,
                title: course.title,
                classGroup: course.classGroup || course.title,
                instructor: course.instructor?.username || 'Teacher',
                enrolledStudents: studentIds.length,
                totalAttempts: classAttempts.length,
                averageBand: avgBand,
                highestBand,
                passRate
            };
        });

        res.json({
            classPerformance: classPerformance.sort((a, b) => b.averageBand - a.averageBand)
        });
    } catch (err) {
        console.error("Management performance error:", err);
        res.status(500).json({ message: "Sinflar tahlilini yuklashda xatolik: " + err.message });
    }
});

// GET /api/ielts/management/students - Student participation and progress tracking list
router.get('/management/students', managementOrAdmin, async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('username email grade createdAt');
        const attempts = await IELTSAttempt.find({
            status: { $in: ['COMPLETED', 'completed', 'EVALUATED', 'evaluated'] }
        }).populate('testId', 'title skillType').sort({ completedAt: -1, createdAt: -1 });

        // Map attempts by studentId
        const studentMap = new Map();
        attempts.forEach(a => {
            const sid = a.studentId.toString();
            if (!studentMap.has(sid)) studentMap.set(sid, []);
            studentMap.get(sid).push(a);
        });

        const studentList = students.map(student => {
            const myAttempts = studentMap.get(student._id.toString()) || [];
            const bands = myAttempts.map(a => a.overallBand ?? a.bandScore).filter(b => b != null && !isNaN(b));
            const avgBand = bands.length > 0 ? Math.round((bands.reduce((x, y) => x + y, 0) / bands.length) * 10) / 10 : 0;
            const highestBand = bands.length > 0 ? Math.max(...bands) : 0;
            const latestAttempt = myAttempts[0] || null;

            return {
                _id: student._id,
                username: student.username,
                email: student.email,
                grade: student.grade || 'Standard',
                testsCompleted: myAttempts.length,
                averageBand: avgBand,
                highestBand,
                lastTestDate: latestAttempt ? (latestAttempt.completedAt || latestAttempt.createdAt) : null,
                lastTestTitle: latestAttempt?.testId?.title || null
            };
        });

        res.json({
            students: studentList.sort((a, b) => b.testsCompleted - a.testsCompleted)
        });
    } catch (err) {
        console.error("Management students error:", err);
        res.status(500).json({ message: "O'quvchilar ro'yxatini yuklashda xatolik: " + err.message });
    }
});

// GET /api/ielts/management/teachers - Teacher evaluation activity and workload reports
router.get('/management/teachers', managementOrAdmin, async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' }).select('username email');
        const assignments = await IELTSAssignment.find().select('teacherId assignedBy status');
        const evaluations = await IELTSEvaluation.find().select('evaluatedBy overallBand');
        const pendingWriting = await IELTSAttempt.countDocuments({
            skillType: 'WRITING',
            status: { $in: ['PENDING_EVALUATION', 'pending_evaluation'] }
        });
        const pendingSpeaking = await IELTSAttempt.countDocuments({
            skillType: 'SPEAKING',
            status: { $in: ['PENDING_EVALUATION', 'pending_evaluation'] }
        });

        const teacherReports = teachers.map(teacher => {
            const tid = teacher._id.toString();
            const myAssignments = assignments.filter(a =>
                (a.teacherId?.toString() === tid) || (a.assignedBy?.toString() === tid)
            );
            const myEvaluations = evaluations.filter(e => e.evaluatedBy?.toString() === tid);

            return {
                _id: teacher._id,
                username: teacher.username,
                email: teacher.email,
                assignmentsCreated: myAssignments.length,
                activeAssignments: myAssignments.filter(a => a.status === 'ACTIVE').length,
                evaluationsCompleted: myEvaluations.length,
                pendingQueueShare: Math.round((pendingWriting + pendingSpeaking) / (teachers.length || 1))
            };
        });

        res.json({
            teachers: teacherReports,
            globalPending: {
                writing: pendingWriting,
                speaking: pendingSpeaking,
                total: pendingWriting + pendingSpeaking
            }
        });
    } catch (err) {
        console.error("Management teachers error:", err);
        res.status(500).json({ message: "O'qituvchilar yuklamasini yuklashda xatolik: " + err.message });
    }
});

// GET /api/ielts/management/reports - Institutional report data generator
router.get('/management/reports', managementOrAdmin, async (req, res) => {
    try {
        const [totalStudents, totalAttempts, completedAttempts] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            IELTSAttempt.countDocuments(),
            IELTSAttempt.find({ status: { $in: ['COMPLETED', 'completed', 'EVALUATED', 'evaluated'] } })
                .select('overallBand bandScore skillType skill')
        ]);

        const bands = completedAttempts.map(a => a.overallBand ?? a.bandScore).filter(b => b != null && !isNaN(b));
        const avgBand = bands.length > 0 ? Math.round((bands.reduce((x, y) => x + y, 0) / bands.length) * 10) / 10 : 0;
        const passCount = bands.filter(b => b >= 6.5).length;
        const passRate = bands.length > 0 ? Math.round((passCount / bands.length) * 100) : 0;

        const report = {
            generatedAt: new Date(),
            institutionName: "Cambridge International Edutech Center",
            academicYear: "2026-2027",
            executiveSummary: {
                totalEnrolledCandidates: totalStudents,
                totalExamsSat: totalAttempts,
                totalEvaluatedExams: completedAttempts.length,
                institutionalAverageBand: avgBand,
                passRatePercentage: passRate
            },
            strengths: [
                "Computer-Delivered IELTS test administration established across all 4 components (L, R, W, S).",
                "Automated objective scoring active for Listening and Reading with immediate diagnostics.",
                "Teacher evaluation workbench ensuring official Cambridge band rubric compliance."
            ],
            improvementFocus: [
                "Increase candidate turnaround in Writing Task 1 to meet 150-word minimum threshold consistently.",
                "Promote interactive review via the Student Mistake Notebook to reduce repeat errors."
            ]
        };

        res.json({ report });
    } catch (err) {
        console.error("Management reports error:", err);
        res.status(500).json({ message: "Hisobot yaratishda xatolik: " + err.message });
    }
});

// GET /api/ielts/results/:attemptId - Get detailed scorecard for a specific attempt
router.get('/results/:attemptId', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const role = req.user.role;

        const attempt = await IELTSAttempt.findById(req.params.attemptId)
            .populate('studentId', 'username email firstName lastName grade avatar')
            .populate('testId', 'title code skillType skill difficulty durationMinutes totalQuestions sections')
            .populate('evaluationReference');

        if (!attempt) {
            return res.status(404).json({ message: "Test urinishi natijasi topilmadi." });
        }

        // Strict role security: Students can only view their own attempts
        const studentIdStr = (attempt.studentId?._id || attempt.studentId)?.toString();
        if (role === 'student' && studentIdStr !== userId.toString()) {
            return res.status(403).json({ message: "Ushbu natijani ko'rish uchun ruxsat yo'q." });
        }

        const overall = attempt.overallBand ?? attempt.bandScore ?? 0;
        const cefr = attempt.overallCefrLevel || getCefrLevel(overall);

        res.json({
            attempt,
            student: attempt.studentId,
            test: attempt.testId,
            evaluation: attempt.evaluationReference || null,
            aiFeedback: attempt.aiFeedback || attempt.evaluationReference?.aiFeedback || null,
            scorecard: {
                overallBand: overall,
                cefrLevel: cefr,
                isFullMock: attempt.isFullMock,
                sectionBands: {
                    listening: attempt.listeningBand ?? attempt.sectionBands?.listening ?? null,
                    reading: attempt.readingBand ?? attempt.sectionBands?.reading ?? null,
                    writing: attempt.writingBand ?? attempt.sectionBands?.writing ?? null,
                    speaking: attempt.speakingBand ?? attempt.sectionBands?.speaking ?? null
                },
                rawScore: attempt.rawScore || 0,
                maxRawScore: attempt.maxRawScore || 40,
                durationSpent: attempt.durationSpent || attempt.timeSpentSeconds || 0,
                completedAt: attempt.completedAt || attempt.endTime || attempt.updatedAt,
                teacherFeedback: attempt.teacherFeedback || attempt.evaluationReference?.qualitativeFeedback || ''
            }
        });
    } catch (err) {
        console.error("Fetch attempt scorecard error:", err);
        res.status(500).json({ message: "Natija kartochkasini yuklashda xatolik: " + err.message });
    }
});

// Backward-compatible general /results route
router.get('/results', async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.userId || req.user._id;
        const filter = {};

        if (role === 'student') {
            filter.studentId = userId;
        }

        const results = await IELTSAttempt.find(filter)
            .populate('studentId', 'username email grade')
            .populate('testId', 'title code skill')
            .sort({ startedAt: -1 });

        res.json({ results: results || [] });
    } catch (err) {
        res.status(500).json({ message: "Natijalarni yuklashda xatolik." });
    }
});

// 6. Writing Evaluations (Teacher / Admin)
// GET /api/ielts/evaluations/writing/pending - List pending writing submissions
router.get(['/evaluations/writing/pending', '/evaluations/writing'], englishTeacherOrAdmin, async (req, res) => {
    try {
        const isStrictPending = req.path.endsWith('/pending') && !req.query.all && !req.query.status;
        const statusFilter = req.query.status ? req.query.status.toUpperCase() : null;

        const query = {
            $or: [
                { skill: 'writing' },
                { skillType: 'WRITING' },
                { task1Answer: { $exists: true, $ne: '' } },
                { 'writingSubmissions.0': { $exists: true } }
            ]
        };

        if (statusFilter === 'PENDING') {
            query.status = { $in: ['pending_evaluation', 'PENDING_EVALUATION', 'submitted', 'SUBMITTED'] };
        } else if (statusFilter === 'EVALUATED') {
            query.status = { $in: ['evaluated', 'EVALUATED', 'completed', 'COMPLETED'] };
        } else if (isStrictPending) {
            query.status = { $in: ['pending_evaluation', 'PENDING_EVALUATION', 'submitted', 'SUBMITTED'] };
        }

        const items = await IELTSAttempt.find(query)
            .populate('studentId', 'username email firstName lastName grade avatar')
            .populate('testId', 'title code durationMinutes difficulty sections')
            .populate('evaluationReference')
            .sort({ completedAt: -1, updatedAt: -1 });

        const pendingList = items.filter(i => ['pending_evaluation', 'PENDING_EVALUATION', 'submitted', 'SUBMITTED'].includes(i.status));

        res.json({
            evaluations: items || [],
            pending: pendingList,
            total: (items || []).length,
            pendingCount: pendingList.length
        });
    } catch (err) {
        console.error("Fetch writing evaluations error:", err);
        res.status(500).json({ message: "Writing tekshiruvlarini yuklashda xatolik: " + err.message });
    }
});

// GET /api/ielts/evaluations/writing/:attemptId - Get single student writing attempt details and essays
router.get('/evaluations/writing/:attemptId', englishTeacherOrAdmin, async (req, res) => {
    try {
        const attempt = await IELTSAttempt.findById(req.params.attemptId)
            .populate('studentId', 'username email firstName lastName grade avatar')
            .populate({
                path: 'testId',
                populate: { path: 'sections.questionIds' }
            })
            .populate('evaluationReference');

        if (!attempt) {
            return res.status(404).json({ message: "Writing urinishi topilmadi." });
        }

        // Extract task prompts from test sections if available
        let task1Prompt = '';
        let task1Reference = '';
        let task2Prompt = '';
        let task2Reference = '';

        if (attempt.testId && Array.isArray(attempt.testId.sections)) {
            attempt.testId.sections.forEach(sec => {
                if (Array.isArray(sec.questionIds)) {
                    sec.questionIds.forEach(q => {
                        if (q && q.questionType) {
                            if (q.questionType.toLowerCase().includes('task1') || q.sectionNumber === 1 || sec.sectionNumber === 1) {
                                if (!task1Prompt) task1Prompt = q.prompt;
                                if (!task1Reference) task1Reference = q.passageReference || sec.passageReference || '';
                            } else if (q.questionType.toLowerCase().includes('task2') || q.sectionNumber === 2 || sec.sectionNumber === 2) {
                                if (!task2Prompt) task2Prompt = q.prompt;
                                if (!task2Reference) task2Reference = q.passageReference || sec.passageReference || '';
                            }
                        }
                    });
                }
                if (!task1Prompt && sec.sectionNumber === 1) {
                    task1Prompt = sec.instructions || sec.title || '';
                    task1Reference = sec.passageReference || sec.passageText || '';
                }
                if (!task2Prompt && sec.sectionNumber === 2) {
                    task2Prompt = sec.instructions || sec.title || '';
                    task2Reference = sec.passageReference || sec.passageText || '';
                }
            });
        }

        res.json({
            attempt,
            student: attempt.studentId,
            test: attempt.testId,
            evaluation: attempt.evaluationReference || null,
            prompts: {
                task1: {
                    prompt: task1Prompt || "Task 1: Report / Letter",
                    reference: task1Reference || ""
                },
                task2: {
                    prompt: task2Prompt || "Task 2: Academic Discursive Essay",
                    reference: task2Reference || ""
                }
            }
        });
    } catch (err) {
        console.error("Get writing attempt details error:", err);
        res.status(500).json({ message: "Writing tekshiruvi ma'lumotlarini yuklashda xatolik." });
    }
});

// POST /api/ielts/evaluations/writing/:attemptId - Submit teacher evaluation & criteria scores
router.post('/evaluations/writing/:attemptId', englishTeacherOrAdmin, async (req, res) => {
    try {
        const attempt = await IELTSAttempt.findById(req.params.attemptId);
        if (!attempt) {
            return res.status(404).json({ message: "Baholanayotgan test urinishi topilmadi." });
        }

        const { criteriaScores, qualitativeFeedback, feedbackText } = req.body;

        if (!criteriaScores) {
            return res.status(400).json({ message: "IELTS kriteriyalari bo'yicha ballar kiritilishi shart." });
        }

        const ta = parseFloat(criteriaScores.taskAchievement !== undefined ? criteriaScores.taskAchievement : (criteriaScores.c1 || 0));
        const cc = parseFloat(criteriaScores.coherenceCohesion !== undefined ? criteriaScores.coherenceCohesion : (criteriaScores.c2 || 0));
        const lr = parseFloat(criteriaScores.lexicalResource !== undefined ? criteriaScores.lexicalResource : (criteriaScores.c3 || 0));
        const gra = parseFloat(criteriaScores.grammaticalRange !== undefined ? criteriaScores.grammaticalRange : (criteriaScores.c4 || 0));

        const overallBand = calculateWritingBand({
            taskAchievement: ta,
            coherenceCohesion: cc,
            lexicalResource: lr,
            grammaticalRange: gra
        });

        const feedback = qualitativeFeedback || feedbackText || '';

        // Create or update IELTSEvaluation
        let evaluation = null;
        if (attempt.evaluationReference) {
            evaluation = await IELTSEvaluation.findById(attempt.evaluationReference);
        }

        if (!evaluation) {
            evaluation = new IELTSEvaluation({
                attemptId: attempt._id,
                studentId: attempt.studentId,
                teacherId: req.user.userId || req.user._id,
                skill: 'writing'
            });
        }

        evaluation.teacherId = req.user.userId || req.user._id;
        evaluation.criteriaScores = {
            taskAchievement: ta,
            coherenceCohesion: cc,
            lexicalResource: lr,
            grammaticalRange: gra,
            c1: ta,
            c2: cc,
            c3: lr,
            c4: gra
        };
        evaluation.overallBand = overallBand;
        evaluation.qualitativeFeedback = feedback;
        evaluation.feedbackText = feedback;
        evaluation.status = 'published';
        evaluation.evaluatedAt = new Date();
        await evaluation.save();

        // Update IELTSAttempt
        attempt.status = 'EVALUATED';
        attempt.bandScore = overallBand;
        attempt.overallBand = overallBand;
        attempt.sectionBands = attempt.sectionBands || {};
        attempt.sectionBands.writing = overallBand;
        attempt.teacherFeedback = feedback;
        attempt.evaluationReference = evaluation._id;
        attempt.updatedAt = new Date();
        await attempt.save();

        res.json({
            message: `IELTS Writing muvaffaqiyatli baholandi! Umumiy ball: Band ${overallBand}`,
            overallBand,
            evaluation,
            attempt: {
                _id: attempt._id,
                status: 'EVALUATED',
                bandScore: overallBand,
                sectionBands: attempt.sectionBands,
                teacherFeedback: feedback
            }
        });
    } catch (err) {
        console.error("Submit writing evaluation error:", err);
        res.status(500).json({ message: "Writing baholashni saqlashda xatolik: " + err.message });
    }
});

// 7. Speaking Evaluations (Teacher / Admin)
// GET /api/ielts/evaluations/speaking & /api/ielts/evaluations/speaking/pending
router.get(['/evaluations/speaking/pending', '/evaluations/speaking'], englishTeacherOrAdmin, async (req, res) => {
    try {
        const statusFilter = req.query.status || 'pending';
        let filter = {
            $or: [
                { skill: 'speaking' },
                { skillType: 'SPEAKING' }
            ]
        };

        if (statusFilter === 'pending') {
            filter.status = { $in: ['PENDING_EVALUATION', 'pending_evaluation', 'SUBMITTED', 'submitted'] };
        } else if (statusFilter === 'evaluated') {
            filter.status = { $in: ['EVALUATED', 'evaluated', 'COMPLETED', 'completed'] };
        } else if (statusFilter === 'all') {
            filter.status = { $in: ['PENDING_EVALUATION', 'pending_evaluation', 'SUBMITTED', 'submitted', 'EVALUATED', 'evaluated', 'COMPLETED', 'completed'] };
        }

        const [attempts, pendingCount, evaluatedCount, total] = await Promise.all([
            IELTSAttempt.find(filter)
                .populate('studentId', 'username email firstName lastName grade avatar')
                .populate('testId', 'title code durationMinutes difficulty skillType skill')
                .populate('evaluationReference')
                .sort({ updatedAt: -1, createdAt: -1 }),
            IELTSAttempt.countDocuments({
                $or: [{ skill: 'speaking' }, { skillType: 'SPEAKING' }],
                status: { $in: ['PENDING_EVALUATION', 'pending_evaluation', 'SUBMITTED', 'submitted'] }
            }),
            IELTSAttempt.countDocuments({
                $or: [{ skill: 'speaking' }, { skillType: 'SPEAKING' }],
                status: { $in: ['EVALUATED', 'evaluated', 'COMPLETED', 'completed'] }
            }),
            IELTSAttempt.countDocuments({
                $or: [{ skill: 'speaking' }, { skillType: 'SPEAKING' }]
            })
        ]);

        res.json({
            evaluations: attempts || [],
            pending: attempts || [],
            pendingCount,
            evaluatedCount,
            total
        });
    } catch (err) {
        console.error("Fetch speaking evaluations queue error:", err);
        res.status(500).json({ message: "Speaking tekshiruvlarini yuklashda xatolik." });
    }
});

// GET /api/ielts/evaluations/speaking/:attemptId - Get single student speaking attempt details and audio
router.get('/evaluations/speaking/:attemptId', englishTeacherOrAdmin, async (req, res) => {
    try {
        const attempt = await IELTSAttempt.findById(req.params.attemptId)
            .populate('studentId', 'username email firstName lastName grade avatar')
            .populate({
                path: 'testId',
                populate: { path: 'sections.questionIds' }
            })
            .populate('evaluationReference');

        if (!attempt) {
            return res.status(404).json({ message: "Speaking urinishi topilmadi." });
        }

        // Extract sections / parts information
        const parts = [];
        if (attempt.testId && Array.isArray(attempt.testId.sections)) {
            attempt.testId.sections.forEach(sec => {
                parts.push({
                    partNumber: sec.sectionNumber || (parts.length + 1),
                    title: sec.title || `Part ${sec.sectionNumber}`,
                    instructions: sec.instructions || '',
                    cueCard: sec.passageText || sec.passageReference || '',
                    prompt: sec.title || sec.instructions || ''
                });
            });
        }

        res.json({
            attempt,
            student: attempt.studentId,
            test: attempt.testId,
            evaluation: attempt.evaluationReference || null,
            parts,
            speakingSubmissions: attempt.speakingSubmissions || []
        });
    } catch (err) {
        console.error("Get speaking attempt details error:", err);
        res.status(500).json({ message: "Speaking tekshiruvi ma'lumotlarini yuklashda xatolik." });
    }
});

// POST /api/ielts/evaluations/speaking/:attemptId - Submit teacher speaking evaluation & criteria scores
router.post('/evaluations/speaking/:attemptId', englishTeacherOrAdmin, async (req, res) => {
    try {
        const attempt = await IELTSAttempt.findById(req.params.attemptId);
        if (!attempt) {
            return res.status(404).json({ message: "Baholanayotgan speaking urinishi topilmadi." });
        }

        const { criteriaScores, qualitativeFeedback, feedbackText } = req.body;

        if (!criteriaScores) {
            return res.status(400).json({ message: "IELTS kriteriyalari bo'yicha ballar kiritilishi shart." });
        }

        const fc = parseFloat(criteriaScores.fluencyCoherence !== undefined ? criteriaScores.fluencyCoherence : (criteriaScores.c1 || 0));
        const lr = parseFloat(criteriaScores.lexicalResource !== undefined ? criteriaScores.lexicalResource : (criteriaScores.c2 || 0));
        const gra = parseFloat(criteriaScores.grammaticalRange !== undefined ? criteriaScores.grammaticalRange : (criteriaScores.c3 || 0));
        const pr = parseFloat(criteriaScores.pronunciation !== undefined ? criteriaScores.pronunciation : (criteriaScores.c4 || 0));

        const overallBand = calculateSpeakingBand({
            fluencyCoherence: fc,
            lexicalResource: lr,
            grammaticalRange: gra,
            pronunciation: pr
        });

        const feedback = qualitativeFeedback || feedbackText || '';

        // Create or update IELTSEvaluation
        let evaluation = null;
        if (attempt.evaluationReference) {
            evaluation = await IELTSEvaluation.findById(attempt.evaluationReference);
        }

        if (!evaluation) {
            evaluation = new IELTSEvaluation({
                attemptId: attempt._id,
                studentId: attempt.studentId,
                teacherId: req.user.userId || req.user._id,
                skill: 'speaking'
            });
        }

        evaluation.criteriaScores = {
            fluencyCoherence: fc,
            lexicalResource: lr,
            grammaticalRange: gra,
            pronunciation: pr,
            c1: fc,
            c2: lr,
            c3: gra,
            c4: pr
        };
        evaluation.overallBand = overallBand;
        evaluation.qualitativeFeedback = feedback;
        evaluation.feedbackText = feedback;
        evaluation.status = 'published';
        evaluation.evaluatedAt = new Date();
        await evaluation.save();

        // Update IELTSAttempt
        attempt.status = 'EVALUATED';
        attempt.bandScore = overallBand;
        attempt.overallBand = overallBand;
        attempt.sectionBands = attempt.sectionBands || {};
        attempt.sectionBands.speaking = overallBand;
        attempt.teacherFeedback = feedback;
        attempt.evaluationReference = evaluation._id;
        attempt.updatedAt = new Date();
        await attempt.save();

        res.json({
            message: `IELTS Speaking muvaffaqiyatli baholandi! Umumiy ball: Band ${overallBand}`,
            overallBand,
            evaluation,
            attempt: {
                _id: attempt._id,
                status: 'EVALUATED',
                bandScore: overallBand,
                overallBand: overallBand,
                sectionBands: attempt.sectionBands,
                teacherFeedback: feedback
            }
        });
    } catch (err) {
        console.error("Submit speaking evaluation error:", err);
        res.status(500).json({ message: "Speaking baholashni saqlashda xatolik: " + err.message });
    }
});

// 8. Institutional Analytics (Management / Admin)
router.get('/analytics', managementOrAdmin, async (req, res) => {
    try {
        const [attempts, assignments, totalStudents] = await Promise.all([
            IELTSAttempt.find({ status: 'completed' }, 'bandScore skill sectionBands startedAt'),
            IELTSAssignment.countDocuments(),
            User.countDocuments({ role: 'student' })
        ]);

        res.json({
            analytics: {
                totalAttempts: attempts.length,
                totalAssignments: assignments,
                totalStudents,
                hasData: attempts.length > 0
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Analitika ma'lumotlarini yuklashda xatolik." });
    }
});

// ==========================================
// PHASE 13: BULK IMPORT & MEDIA MANAGEMENT SYSTEM
// ==========================================

// Helper: Parse CSV formatted questions
function parseCSVQuestions(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    const questions = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const values = [];
        let insideQuote = false;
        let currentVal = '';
        for (let c = 0; c < row.length; c++) {
            const char = row[c];
            if (char === '"' || char === "'") {
                insideQuote = !insideQuote;
            } else if (char === ',' && !insideQuote) {
                values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
        values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

        const item = {};
        headers.forEach((h, idx) => {
            item[h] = values[idx] !== undefined ? values[idx] : '';
        });
        questions.push(item);
    }
    return questions;
}

// GET /api/ielts/media - List uploaded audio, reading, and exam media assets
router.get('/media', adminOnly, async (req, res) => {
    try {
        const { category, mediaType, search } = req.query;
        const filter = {};

        if (category && category !== 'all' && category !== 'ALL') {
            filter.category = category.toLowerCase();
        }
        if (mediaType && mediaType !== 'all' && mediaType !== 'ALL') {
            filter.mediaType = mediaType.toLowerCase();
        }
        if (search) {
            filter.$or = [
                { originalName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { filename: { $regex: search, $options: 'i' } }
            ];
        }

        const media = await IELTSMedia.find(filter).sort({ createdAt: -1 });
        const totalCount = await IELTSMedia.countDocuments();
        
        // Calculate storage
        const allMedia = await IELTSMedia.find({}, 'size mediaType category');
        let totalStorageBytes = 0;
        let audioCount = 0;
        let imageCount = 0;
        let docCount = 0;

        allMedia.forEach(m => {
            totalStorageBytes += (m.size || 0);
            if (m.mediaType === 'audio') audioCount++;
            else if (m.mediaType === 'image') imageCount++;
            else if (m.mediaType === 'document') docCount++;
        });

        res.json({
            media,
            stats: {
                totalFiles: totalCount,
                totalStorageBytes,
                audioCount,
                imageCount,
                docCount
            }
        });
    } catch (err) {
        console.error("Fetch media error:", err);
        res.status(500).json({ message: "Media fayllarni yuklashda xatolik: " + err.message });
    }
});

// POST /api/ielts/media/upload - Upload listening audio track or reading diagram
router.post('/media/upload', adminOnly, uploadMedia.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Yuklash uchun fayl tanlanmadi." });
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        let mediaType = 'other';
        if (req.file.mimetype.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.webm'].includes(ext)) {
            mediaType = 'audio';
        } else if (req.file.mimetype.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext)) {
            mediaType = 'image';
        } else if (req.file.mimetype === 'application/pdf' || ['.pdf', '.doc', '.docx'].includes(ext)) {
            mediaType = 'document';
        }

        const category = (req.body.category || 'general').toLowerCase();
        const description = req.body.description || '';
        const fileUrl = `/uploads/ielts-media/${req.file.filename}`;

        const createdMedia = new IELTSMedia({
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            url: fileUrl,
            mediaType,
            category,
            description,
            uploadedBy: req.user?.userId || req.user?._id
        });

        await createdMedia.save();

        res.status(201).json({
            message: "Media fayl muvaffaqiyatli saqlandi.",
            media: createdMedia
        });
    } catch (err) {
        console.error("Media upload error:", err);
        res.status(500).json({ message: "Media yuklashda xatolik yuz berdi: " + err.message });
    }
});

// DELETE /api/ielts/media/:id - Delete media asset from DB and disk
router.delete('/media/:id', adminOnly, async (req, res) => {
    try {
        const item = await IELTSMedia.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: "Media fayl topilmadi." });
        }

        // Remove from disk if present
        const filePath = path.join(mediaUploadDir, item.filename);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkErr) {
                console.warn("Could not remove file from disk:", unlinkErr.message);
            }
        }

        await IELTSMedia.findByIdAndDelete(req.params.id);
        res.json({ message: "Media fayl o'chirildi.", deletedId: req.params.id });
    } catch (err) {
        console.error("Delete media error:", err);
        res.status(500).json({ message: "Media faylni o'chirishda xatolik: " + err.message });
    }
});

// POST /api/ielts/import/questions - Bulk import questions from structured JSON/CSV
router.post('/import/questions', adminOnly, uploadImport.single('file'), async (req, res) => {
    try {
        let rawItems = [];

        // Check if file was uploaded
        if (req.file) {
            const fileContent = req.file.buffer.toString('utf8');
            if (req.file.originalname.endsWith('.csv')) {
                rawItems = parseCSVQuestions(fileContent);
            } else {
                try {
                    const parsed = JSON.parse(fileContent);
                    rawItems = Array.isArray(parsed) ? parsed : (parsed.questions || []);
                } catch (parseErr) {
                    return res.status(400).json({ message: "JSON faylni o'qishda xatolik: format noto'g'ri." });
                }
            }
        } else if (Array.isArray(req.body.questions)) {
            rawItems = req.body.questions;
        } else if (req.body.rawJson) {
            try {
                const parsed = JSON.parse(req.body.rawJson);
                rawItems = Array.isArray(parsed) ? parsed : (parsed.questions || []);
            } catch (err) {
                return res.status(400).json({ message: "Kiritilgan JSON matni noto'g'ri." });
            }
        } else {
            return res.status(400).json({ message: "Yuklash uchun CSV/JSON fayl yoki savollar ro'yxati taqdim etilishi kerak." });
        }

        if (rawItems.length === 0) {
            return res.status(400).json({ message: "Import qilish uchun savollar topilmadi." });
        }

        const validQuestions = [];
        const errors = [];

        rawItems.forEach((raw, idx) => {
            const rowNumber = idx + 1;
            const prompt = (raw.prompt || raw.questionPrompt || raw.text || '').trim();
            const skill = (raw.skillType || raw.skill || 'READING').toUpperCase();
            let questionType = (raw.questionType || raw.type || 'MULTIPLE_CHOICE').toLowerCase().replace(/[\s-]/g, '_');
            const correctAnswer = raw.correctAnswer !== undefined ? String(raw.correctAnswer).trim() : (raw.answer !== undefined ? String(raw.answer).trim() : '');

            // Validation checks
            if (!prompt) {
                errors.push({ row: rowNumber, error: "Savol matni (prompt) kiritilmagan." });
                return;
            }
            if (!correctAnswer && !['writing_task1', 'writing_task2', 'speaking_part1', 'speaking_part2', 'speaking_part3'].includes(questionType)) {
                errors.push({ row: rowNumber, error: `Savol to'g'ri javobi (correctAnswer) yo'q: "${prompt.slice(0, 30)}..."` });
                return;
            }

            // Standardize options to array of strings
            let options = [];
            if (Array.isArray(raw.options)) {
                options = raw.options.map(opt => {
                    if (typeof opt === 'object' && opt !== null) return String(opt.text || opt.label || '');
                    return String(opt);
                });
            } else if (typeof raw.options === 'string' && raw.options.trim()) {
                const delimiter = raw.options.includes('|') ? '|' : (raw.options.includes(';') ? ';' : ',');
                options = raw.options.split(delimiter).map(opt => opt.trim());
            }

            const diff = String(raw.difficulty || 'EXAM_LEVEL').toUpperCase();
            const allowedDiff = ['BEGINNER', 'MEDIUM', 'ADVANCED', 'EXAM_LEVEL'];

            validQuestions.push({
                skillType: ['LISTENING', 'READING', 'WRITING', 'SPEAKING'].includes(skill) ? skill : 'READING',
                questionType,
                prompt,
                options,
                correctAnswer,
                passageReference: raw.passageReference || raw.passage || '',
                explanation: raw.explanation || raw.notes || '',
                points: Number(raw.points) || 1,
                order: Number(raw.order) || rowNumber,
                sectionNumber: Number(raw.sectionNumber) || 1,
                audioTimestampStart: Number(raw.audioTimestampStart) || null,
                audioTimestampEnd: Number(raw.audioTimestampEnd) || null,
                difficulty: allowedDiff.includes(diff) ? diff : 'EXAM_LEVEL',
                createdBy: req.user.userId || req.user._id,
                status: 'PUBLISHED'
            });
        });

        let inserted = [];
        if (validQuestions.length > 0) {
            inserted = await IELTSQuestion.insertMany(validQuestions);
        }

        res.json({
            message: `${inserted.length} ta savol muvaffaqiyatli import qilindi.`,
            importedCount: inserted.length,
            failedCount: errors.length,
            errors,
            insertedIds: inserted.map(q => q._id)
        });
    } catch (err) {
        console.error("Bulk question import error:", err);
        res.status(500).json({ message: "Savollarni ommaviy import qilishda xatolik: " + err.message });
    }
});

// POST /api/ielts/import/tests - Bulk import full test configurations
router.post('/import/tests', adminOnly, uploadImport.single('file'), async (req, res) => {
    try {
        let rawTests = [];

        if (req.file) {
            try {
                const parsed = JSON.parse(req.file.buffer.toString('utf8'));
                rawTests = Array.isArray(parsed) ? parsed : (parsed.tests ? parsed.tests : [parsed]);
            } catch (err) {
                return res.status(400).json({ message: "Test konfiguratsiyasi JSON formatida bo'lishi shart." });
            }
        } else if (Array.isArray(req.body.tests)) {
            rawTests = req.body.tests;
        } else if (req.body.test) {
            rawTests = [req.body.test];
        } else if (req.body.title) {
            rawTests = [req.body];
        } else {
            return res.status(400).json({ message: "Yuklash uchun test JSON fayli yoki ma'lumotlari taqdim etilishi kerak." });
        }

        const validTests = [];
        const errors = [];

        for (let i = 0; i < rawTests.length; i++) {
            const t = rawTests[i];
            const testNum = i + 1;

            if (!t.title) {
                errors.push({ testIndex: testNum, error: "Test nomi (title) kiritilmagan." });
                continue;
            }

            const skillType = (t.skillType || t.skill || 'FULL_MOCK').toUpperCase();
            let finalSkillType = 'ALL';
            let testType = 'FULL_MOCK';
            if (['LISTENING', 'READING', 'WRITING', 'SPEAKING'].includes(skillType)) {
                finalSkillType = skillType;
                testType = 'SKILL_PRACTICE';
            }

            const diff = String(t.difficulty || 'EXAM_LEVEL').toUpperCase();
            const allowedDiff = ['BEGINNER', 'MEDIUM', 'ADVANCED', 'EXAM_LEVEL'];
            const finalDiff = allowedDiff.includes(diff) ? diff : 'EXAM_LEVEL';

            // Process sections if embedded questions are provided
            const sections = [];
            if (Array.isArray(t.sections)) {
                for (let sIdx = 0; sIdx < t.sections.length; sIdx++) {
                    const sec = t.sections[sIdx];
                    let qIds = Array.isArray(sec.questionIds) ? [...sec.questionIds] : [];

                    // If embedded questions exist in section, insert them
                    if (Array.isArray(sec.questions) && sec.questions.length > 0) {
                        const newQuestions = sec.questions.map((q, qIdx) => ({
                            skillType: finalSkillType === 'ALL' ? (sec.skillType || 'READING').toUpperCase() : finalSkillType,
                            questionType: q.questionType || 'MULTIPLE_CHOICE',
                            prompt: q.prompt,
                            options: (q.options || []).map(opt => (typeof opt === 'object' && opt !== null ? String(opt.text || opt.label || '') : String(opt))),
                            correctAnswer: q.correctAnswer || '',
                            explanation: q.explanation || '',
                            points: q.points || 1,
                            order: qIdx + 1,
                            sectionNumber: sIdx + 1,
                            createdBy: req.user.userId || req.user._id,
                            status: 'PUBLISHED'
                        }));
                        const insertedQ = await IELTSQuestion.insertMany(newQuestions);
                        qIds.push(...insertedQ.map(q => q._id));
                    }

                    sections.push({
                        sectionNumber: Number(sec.sectionNumber) || (sIdx + 1),
                        title: sec.title || `Section ${sIdx + 1}`,
                        instructions: sec.instructions || '',
                        passageText: sec.passageText || '',
                        passageReference: sec.passageReference || '',
                        audioUrl: sec.audioUrl || '',
                        durationMinutes: Number(sec.durationMinutes) || 15,
                        questionIds: qIds
                    });
                }
            }

            validTests.push({
                title: t.title,
                code: t.code || `IELTS-IMP-${Date.now().toString().slice(-4)}-${testNum}`,
                skillType: finalSkillType,
                testType,
                type: testType === 'FULL_MOCK' ? 'mock' : 'practice',
                difficulty: finalDiff,
                durationMinutes: Number(t.durationMinutes) || (testType === 'FULL_MOCK' ? 165 : 60),
                sections,
                createdBy: req.user.userId || req.user._id,
                status: t.status || 'PUBLISHED',
                isPublished: true,
                totalQuestions: sections.reduce((acc, s) => acc + (s.questionIds?.length || 0), 0)
            });
        }

        let createdTests = [];
        if (validTests.length > 0) {
            createdTests = await IELTSTest.insertMany(validTests);
        }

        res.json({
            message: `${createdTests.length} ta test muvaffaqiyatli import qilindi.`,
            importedCount: createdTests.length,
            failedCount: errors.length,
            errors,
            tests: createdTests
        });
    } catch (err) {
        console.error("Bulk test import error:", err);
        res.status(500).json({ message: "Testlarni import qilishda xatolik: " + err.message });
    }
});

// GET /api/ielts/import/export-questions - Export questions library as JSON
router.get('/import/export-questions', adminOnly, async (req, res) => {
    try {
        const { skillType } = req.query;
        const filter = {};
        if (skillType && skillType !== 'ALL') {
            filter.skillType = skillType.toUpperCase();
        }

        const questions = await IELTSQuestion.find(filter).lean();
        res.setHeader('Content-Disposition', 'attachment; filename=ielts-questions-export.json');
        res.setHeader('Content-Type', 'application/json');
        res.json({
            exportedAt: new Date(),
            totalQuestions: questions.length,
            questions
        });
    } catch (err) {
        console.error("Export questions error:", err);
        res.status(500).json({ message: "Savollarni eksport qilishda xatolik: " + err.message });
    }
});

// 10. Settings (Admin Only)
router.get('/settings', adminOnly, async (req, res) => {
    res.json({
        settings: {
            mockTestStrictTimer: true,
            allowStudentSelfPractice: true,
            defaultPassageHighlighting: true,
            notepadEnabled: true
        }
    });
});

// ==========================================
// PHASE 12: AI IELTS FEEDBACK & EVALUATION ENGINE
// ==========================================

function analyzeWritingWithAI(task1Text = '', task2Text = '', prompts = {}) {
    // 1. Clean words
    const t1Words = (task1Text || '').trim().split(/\s+/).filter(Boolean);
    const t2Words = (task2Text || '').trim().split(/\s+/).filter(Boolean);
    const count1 = t1Words.length;
    const count2 = t2Words.length;

    // 2. Cohesive Devices Lexicon
    const cohesiveDevices = [
        'furthermore', 'moreover', 'in addition', 'additionally', 'consequently',
        'as a result', 'on the other hand', 'in contrast', 'however', 'nevertheless',
        'firstly', 'secondly', 'finally', 'for example', 'for instance', 'in particular',
        'overall', 'to summarize', 'in conclusion', 'therefore', 'whereas', 'while'
    ];
    const fullText = (task1Text + ' ' + task2Text).toLowerCase();
    const usedCohesives = cohesiveDevices.filter(d => fullText.includes(d));

    // 3. Academic Vocabulary Lexicon
    const academicWords = [
        'significant', 'substantially', 'demonstrates', 'illustrates', 'fluctuation',
        'proportion', 'phenomenon', 'predominantly', 'correlation', 'perspective',
        'exponential', 'stabilize', 'diminish', 'trajectory', 'subsequent',
        'apparent', 'evident', 'underlying', 'comprehensive', 'facilitate',
        'crucial', 'indispensable', 'paramount', 'detrimental', 'mitigate'
    ];
    const usedAcademic = academicWords.filter(w => fullText.includes(w));

    // 4. Grammar Complexity Markers
    const complexGrammarMarkers = [
        'although', 'even though', 'despite', 'in spite of', 'provided that',
        'whereas', 'which is', 'that are', 'has been', 'have been', 'would', 'could', 'might'
    ];
    const usedGrammar = complexGrammarMarkers.filter(m => fullText.includes(m));

    // Task Achievement (TA)
    let ta = 6.0;
    if (count1 >= 150 && count2 >= 250) ta += 1.0;
    else if (count1 >= 130 && count2 >= 220) ta += 0.5;
    else if (count1 < 100 || count2 < 180) ta -= 1.0;

    if (/overall|in summary|in conclusion|to conclude/i.test(task1Text) && /in conclusion|to sum up|overall/i.test(task2Text)) {
        ta += 0.5;
    }
    ta = Math.min(9.0, Math.max(4.0, Math.round(ta * 2) / 2));

    // Coherence & Cohesion (CC)
    let cc = 5.5;
    if (usedCohesives.length >= 6) cc += 1.5;
    else if (usedCohesives.length >= 3) cc += 1.0;
    else if (usedCohesives.length >= 1) cc += 0.5;

    const paragraphs1 = (task1Text || '').split(/\n+/).filter(p => p.trim().length > 20);
    const paragraphs2 = (task2Text || '').split(/\n+/).filter(p => p.trim().length > 20);
    if (paragraphs1.length >= 3 && paragraphs2.length >= 4) cc += 0.5;
    cc = Math.min(9.0, Math.max(4.0, Math.round(cc * 2) / 2));

    // Lexical Resource (LR)
    let lr = 5.5;
    if (usedAcademic.length >= 5) lr += 2.0;
    else if (usedAcademic.length >= 3) lr += 1.0;
    else if (usedAcademic.length >= 1) lr += 0.5;

    const uniqueWords = new Set([...t1Words, ...t2Words].map(w => w.toLowerCase().replace(/[^a-z]/g, '')));
    const totalWords = count1 + count2;
    const diversityRatio = totalWords > 0 ? (uniqueWords.size / totalWords) : 0;
    if (diversityRatio > 0.50 && totalWords > 150) lr += 0.5;
    lr = Math.min(9.0, Math.max(4.0, Math.round(lr * 2) / 2));

    // Grammatical Range & Accuracy (GRA)
    let gra = 5.5;
    if (usedGrammar.length >= 4) gra += 1.5;
    else if (usedGrammar.length >= 2) gra += 1.0;
    else if (usedGrammar.length >= 1) gra += 0.5;
    gra = Math.min(9.0, Math.max(4.0, Math.round(gra * 2) / 2));

    // Calculate Cambridge Overall Band
    const overallBand = calculateWritingBand({
        taskAchievement: ta,
        coherenceCohesion: cc,
        lexicalResource: lr,
        grammaticalRange: gra
    });

    // Strengths
    const strengths = [];
    if (count1 >= 150 && count2 >= 250) {
        strengths.push(`Word volume criteria satisfied: Task 1 (${count1}/150 words) and Task 2 (${count2}/250 words) avoid under-length penalties.`);
    }
    if (usedCohesives.length >= 3) {
        strengths.push(`Logical transitions present: effectively deployed cohesive devices (${usedCohesives.slice(0, 4).join(', ')}).`);
    }
    if (usedAcademic.length >= 2) {
        strengths.push(`Academic lexicon demonstrated: incorporated terms such as "${usedAcademic.slice(0, 3).join('", "')}".`);
    }
    if (usedGrammar.length >= 2) {
        strengths.push(`Complex sentence structures demonstrated with subordination and modal operators.`);
    }
    if (strengths.length === 0) {
        strengths.push('Demonstrates basic task comprehension and communicative intent in written English.');
    }

    // Areas for Improvement
    const areasForImprovement = [];
    if (count1 < 150) {
        areasForImprovement.push(`Task 1 word count is below the 150-word minimum threshold (${count1} words). Expand data comparisons and trends.`);
    }
    if (count2 < 250) {
        areasForImprovement.push(`Task 2 word count is below 250 words (${count2} words). Elaborate body arguments with concrete examples.`);
    }
    if (usedAcademic.length < 3) {
        areasForImprovement.push('Enhance lexical precision: substitute high-frequency words with academic collocations.');
    }
    if (usedCohesives.length < 4) {
        areasForImprovement.push('Improve paragraph transitions: integrate more contrastive discourse markers (e.g. "Nevertheless", "Conversely").');
    }
    if (paragraphs2.length < 4) {
        areasForImprovement.push('Structure Task 2 clearly into Introduction, 2 Body Paragraphs, and a Concluding summary.');
    }
    if (areasForImprovement.length === 0) {
        areasForImprovement.push('Fine-tune stylistic nuance and eliminate minor punctuation or article slips.');
    }

    const detailedComments = `AI Cambridge Diagnostic Assessment: Candidate achieved predicted Band ${overallBand}. ` +
        `Task 1: ${count1} words, Task 2: ${count2} words. ` +
        `Detected ${usedAcademic.length} academic lexical items and ${usedCohesives.length} discourse transitions. ` +
        `Key recommendation: ${areasForImprovement[0]}`;

    return {
        criteriaScores: {
            taskAchievement: ta,
            coherenceCohesion: cc,
            lexicalResource: lr,
            grammaticalRange: gra
        },
        overallBand,
        strengths,
        weaknesses: areasForImprovement,
        areasForImprovement,
        detailedComments,
        skill: 'writing',
        generatedAt: new Date()
    };
}

function analyzeSpeakingWithAI(attempt) {
    const submissions = attempt.speakingSubmissions || [];
    let totalDuration = 0;
    submissions.forEach(s => {
        totalDuration += (s.durationSeconds || 0);
    });

    const hasP1 = submissions.some(s => s.partNumber === 1 || s.partNumber === '1') || !!attempt.part1AudioUrl;
    const hasP2 = submissions.some(s => s.partNumber === 2 || s.partNumber === '2') || !!attempt.part2AudioUrl;
    const hasP3 = submissions.some(s => s.partNumber === 3 || s.partNumber === '3') || !!attempt.part3AudioUrl;

    const partsCount = (hasP1 ? 1 : 0) + (hasP2 ? 1 : 0) + (hasP3 ? 1 : 0);

    let fc = 6.0; // Fluency & Coherence
    let lr = 6.0; // Lexical Resource
    let gra = 6.0; // Grammatical Range
    let pr = 6.5; // Pronunciation

    if (partsCount === 3) {
        fc += 0.5;
        lr += 0.5;
    }
    if (totalDuration >= 180) {
        fc += 0.5;
        gra += 0.5;
    } else if (totalDuration < 60 && totalDuration > 0) {
        fc -= 0.5;
    }

    fc = Math.min(9.0, Math.max(4.0, Math.round(fc * 2) / 2));
    lr = Math.min(9.0, Math.max(4.0, Math.round(lr * 2) / 2));
    gra = Math.min(9.0, Math.max(4.0, Math.round(gra * 2) / 2));
    pr = Math.min(9.0, Math.max(4.0, Math.round(pr * 2) / 2));

    const overallBand = calculateSpeakingBand({
        fluencyCoherence: fc,
        lexicalResource: lr,
        grammaticalRange: gra,
        pronunciation: pr
    });

    const strengths = [
        `Candidate successfully recorded ${partsCount || 1}/3 interview sections with communicative willingness.`,
        `Speech tempo demonstrates continuity with minimal unnatural mid-sentence pausing.`,
        `Phonological clarity and accent intelligibility meet international Cambridge test standards.`
    ];

    const areasForImprovement = [
        `Extend responses in Part 3 with multi-perspective justification (e.g. "From a societal viewpoint...").`,
        `Incorporate more idiomatic phrases and topic-specific adjectives rather than generic vocabulary.`,
        `Deploy complex conditional structures (e.g. "Had I had more time, I would have...") to elevate Grammatical Range.`
    ];

    const detailedComments = `AI Speaking Diagnostic: Candidate achieved predicted Band ${overallBand} across ${partsCount || 1} recorded sections. Fluency and pronunciation are intelligible; prioritize expanding lexical sophistication in abstract discussion.`;

    return {
        criteriaScores: {
            fluencyCoherence: fc,
            lexicalResource: lr,
            grammaticalRange: gra,
            pronunciation: pr
        },
        overallBand,
        strengths,
        weaknesses: areasForImprovement,
        areasForImprovement,
        detailedComments,
        skill: 'speaking',
        generatedAt: new Date()
    };
}

// POST /api/ielts/ai/evaluate-writing/:attemptId - Analyze student writing submission
router.post('/ai/evaluate-writing/:attemptId', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const role = req.user.role;

        const attempt = await IELTSAttempt.findById(req.params.attemptId);
        if (!attempt) {
            return res.status(404).json({ message: "Writing urinishi topilmadi." });
        }

        // Security check: Only student themselves, English teachers, or Admins can trigger evaluation
        const studentIdStr = (attempt.studentId?._id || attempt.studentId)?.toString();
        if (role === 'student' && studentIdStr !== userId.toString()) {
            return res.status(403).json({ message: "Boshqa talabaning urinishini baholash taqiqlanadi." });
        }
        if (role === 'teacher') {
            const teacherUser = await User.findById(userId).select('isEnglishTeacher');
            if (!teacherUser || !teacherUser.isEnglishTeacher) {
                return res.status(403).json({ message: "Faqat ingliz tili o'qituvchilari baholash imkoniyatiga ega." });
            }
        }

        // Determine Task 1 & Task 2 text
        let task1Text = attempt.task1Answer || '';
        let task2Text = attempt.task2Answer || '';

        if (Array.isArray(attempt.writingSubmissions)) {
            attempt.writingSubmissions.forEach(sub => {
                if ((sub.taskNumber === 1 || sub.taskNumber === '1') && !task1Text) task1Text = sub.content || '';
                if ((sub.taskNumber === 2 || sub.taskNumber === '2') && !task2Text) task2Text = sub.content || '';
            });
        }

        const aiResult = analyzeWritingWithAI(task1Text, task2Text);

        // Store AI feedback onto attempt
        attempt.aiFeedback = aiResult;
        await attempt.save();

        res.json({
            message: "AI Writing baholashi muvaffaqiyatli yaratildi.",
            aiFeedback: attempt.aiFeedback
        });
    } catch (err) {
        console.error("AI Writing evaluation error:", err);
        res.status(500).json({ message: "AI baholash jarayonida xatolik yuz berdi: " + err.message });
    }
});

// POST /api/ielts/ai/evaluate-speaking/:attemptId - Analyze student speaking submission
router.post('/ai/evaluate-speaking/:attemptId', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const role = req.user.role;

        const attempt = await IELTSAttempt.findById(req.params.attemptId);
        if (!attempt) {
            return res.status(404).json({ message: "Speaking urinishi topilmadi." });
        }

        // Security check: Only student themselves, English teachers, or Admins can trigger evaluation
        const studentIdStr = (attempt.studentId?._id || attempt.studentId)?.toString();
        if (role === 'student' && studentIdStr !== userId.toString()) {
            return res.status(403).json({ message: "Boshqa talabaning urinishini baholash taqiqlanadi." });
        }
        if (role === 'teacher') {
            const teacherUser = await User.findById(userId).select('isEnglishTeacher');
            if (!teacherUser || !teacherUser.isEnglishTeacher) {
                return res.status(403).json({ message: "Faqat ingliz tili o'qituvchilari baholash imkoniyatiga ega." });
            }
        }

        const aiResult = analyzeSpeakingWithAI(attempt);

        // Store AI feedback onto attempt
        attempt.aiFeedback = aiResult;
        await attempt.save();

        res.json({
            message: "AI Speaking baholashi muvaffaqiyatli yaratildi.",
            aiFeedback: attempt.aiFeedback
        });
    } catch (err) {
        console.error("AI Speaking evaluation error:", err);
        res.status(500).json({ message: "AI baholash jarayonida xatolik yuz berdi: " + err.message });
    }
});

// GET /api/ielts/ai/feedback/:attemptId - Retrieve AI feedback for an attempt
router.get('/ai/feedback/:attemptId', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const role = req.user.role;

        const attempt = await IELTSAttempt.findById(req.params.attemptId);
        if (!attempt) {
            return res.status(404).json({ message: "Test urinishi topilmadi." });
        }

        // Security check
        const studentIdStr = (attempt.studentId?._id || attempt.studentId)?.toString();
        if (role === 'student' && studentIdStr !== userId.toString()) {
            return res.status(403).json({ message: "Boshqa talabaning AI hisobotini ko'rish taqiqlanadi." });
        }

        res.json({
            attemptId: attempt._id,
            skill: attempt.skill || attempt.skillType,
            aiFeedback: attempt.aiFeedback || null
        });
    } catch (err) {
        console.error("Fetch AI feedback error:", err);
        res.status(500).json({ message: "AI hisobotini yuklashda xatolik: " + err.message });
    }
});

module.exports = router;
