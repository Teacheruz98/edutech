const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { 
    SATTest, 
    SATQuestion, 
    SATAssignment, 
    SATAttempt, 
    SATEvaluation, 
    SATMistake, 
    SATMedia 
} = require('../models/SAT');
const User = require('../models/User');
const Course = require('../models/Course');

// Media Upload Configuration for Digital SAT (Graphs, Diagrams, Geometry Figures)
const satMediaUploadDir = path.join(__dirname, '..', 'uploads', 'sat-media');
if (!fs.existsSync(satMediaUploadDir)) {
    fs.mkdirSync(satMediaUploadDir, { recursive: true });
}

const satMediaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, satMediaUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const cleanName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `sat-media-${uniqueSuffix}-${cleanName}`);
    }
});

const uploadMedia = multer({
    storage: satMediaStorage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Import File Upload (in-memory for CSV & JSON parsing)
const uploadImport = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// ==========================================
// ROLE & PERMISSION MIDDLEWARES
// ==========================================

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

// CRITICAL: Strictly restricts SAT Math qualitative evaluation, authoring, and management to Math Teachers & Admins
const mathTeacherOrAdmin = async (req, res, next) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        if (['admin', 'superadmin'].includes(role)) {
            return next();
        }
        if (role === 'teacher') {
            const userId = req.user?.userId || req.user?._id;
            const user = await User.findById(userId).select('isMathTeacher isEnglishTeacher role');
            if (user && user.isMathTeacher === true) {
                req.user.isMathTeacher = true;
                return next();
            }
            return res.status(403).json({
                message: "Ruxsat etilmagan. Digital SAT boshqaruvi, test tuzish va baholash faqat matematika o'qituvchilari (Math Teachers) uchun ruxsat etilgan.",
                code: "MATH_TEACHER_REQUIRED"
            });
        }
        return res.status(403).json({
            message: "Faqat Administratorlar va Matematika o'qituvchilari uchun ruxsat etilgan.",
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

// ==========================================
// HELPER: DIGITAL SAT SCORING & ADAPTIVE SCALING
// ==========================================
// Total Scale: 400 - 1600 (RW: 200 - 800, Math: 200 - 800)
// RW: Module 1 (27 Qs), Module 2 (27 Qs) = 54 Qs total
// Math: Module 1 (22 Qs), Module 2 (22 Qs) = 44 Qs total

const calculateScaledScore = (rawScore, totalQuestions, section, isHardTier) => {
    if (totalQuestions <= 0) return 200;
    const ratio = Math.max(0, Math.min(1, rawScore / totalQuestions));

    if (section === 'READING_WRITING') {
        if (isHardTier) {
            // Hard tier: range ~ 450 - 800
            const scaled = Math.round(450 + (ratio * 350));
            return Math.min(800, Math.max(200, Math.round(scaled / 10) * 10));
        } else {
            // Easy tier: range ~ 200 - 620
            const scaled = Math.round(200 + (ratio * 420));
            return Math.min(620, Math.max(200, Math.round(scaled / 10) * 10));
        }
    } else { // MATH
        if (isHardTier) {
            // Hard tier: range ~ 460 - 800
            const scaled = Math.round(460 + (ratio * 340));
            return Math.min(800, Math.max(200, Math.round(scaled / 10) * 10));
        } else {
            // Easy tier: range ~ 200 - 610
            const scaled = Math.round(200 + (ratio * 410));
            return Math.min(610, Math.max(200, Math.round(scaled / 10) * 10));
        }
    }
};

const calculatePercentile = (totalScore) => {
    if (totalScore >= 1550) return 99;
    if (totalScore >= 1500) return 98;
    if (totalScore >= 1450) return 96;
    if (totalScore >= 1400) return 93;
    if (totalScore >= 1350) return 89;
    if (totalScore >= 1300) return 84;
    if (totalScore >= 1250) return 78;
    if (totalScore >= 1200) return 71;
    if (totalScore >= 1150) return 63;
    if (totalScore >= 1100) return 55;
    if (totalScore >= 1050) return 46;
    if (totalScore >= 1000) return 38;
    if (totalScore >= 950) return 29;
    if (totalScore >= 900) return 21;
    if (totalScore >= 800) return 11;
    return 5;
};

// Check if student produced response (grid-in) matches acceptable values
const isGridInCorrect = (userAns, correctAns, acceptableAnswers = []) => {
    if (userAns === undefined || userAns === null || correctAns === undefined || correctAns === null) return false;
    const cleanUser = String(userAns).trim().toLowerCase();
    const cleanCorrect = String(correctAns).trim().toLowerCase();

    if (cleanUser === cleanCorrect) return true;

    // Check in acceptableAnswers list
    if (Array.isArray(acceptableAnswers)) {
        for (const alt of acceptableAnswers) {
            if (String(alt).trim().toLowerCase() === cleanUser) return true;
        }
    }

    // Try numeric/fraction evaluation
    const parseValue = (val) => {
        if (!val) return NaN;
        const str = String(val).trim();
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 2) {
                const num = parseFloat(parts[0]);
                const denom = parseFloat(parts[1]);
                if (denom !== 0 && !isNaN(num) && !isNaN(denom)) {
                    return num / denom;
                }
            }
        }
        return parseFloat(str);
    };

    const userNum = parseValue(cleanUser);
    const correctNum = parseValue(cleanCorrect);

    if (!isNaN(userNum) && !isNaN(correctNum)) {
        return Math.abs(userNum - correctNum) < 0.0001;
    }

    return false;
};

// Intelligent SAT AI Feedback Generator
const generateDiagnosticFeedback = (attempt, questionsMap) => {
    const mathErrors = [];
    const rwErrors = [];
    const domainCounters = {
        'Craft and Structure': { missed: 0, total: 0 },
        'Information and Ideas': { missed: 0, total: 0 },
        'Standard English Conventions': { missed: 0, total: 0 },
        'Expression of Ideas': { missed: 0, total: 0 },
        'Algebra': { missed: 0, total: 0 },
        'Advanced Math': { missed: 0, total: 0 },
        'Problem-Solving and Data Analysis': { missed: 0, total: 0 },
        'Geometry and Trigonometry': { missed: 0, total: 0 }
    };

    attempt.answers.forEach(ans => {
        const q = questionsMap[ans.questionId?.toString()];
        if (q && domainCounters[q.domain]) {
            domainCounters[q.domain].total += 1;
            if (!ans.isCorrect) {
                domainCounters[q.domain].missed += 1;
                if (q.section === 'MATH') {
                    mathErrors.push({ prompt: q.prompt, domain: q.domain, skill: q.skill });
                } else {
                    rwErrors.push({ prompt: q.prompt, domain: q.domain, skill: q.skill });
                }
            }
        }
    });

    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    Object.entries(domainCounters).forEach(([domain, data]) => {
        if (data.total > 0) {
            const acc = ((data.total - data.missed) / data.total) * 100;
            if (acc >= 75) {
                strengths.push(`${domain} (${Math.round(acc)}% to'g'ri) - kuchli poydevor.`);
            } else if (acc < 50) {
                weaknesses.push(`${domain} (${Math.round(acc)}% aniqlik) - ko'proq mashq talab qiladi.`);
            }
        }
    });

    if (mathErrors.length > 0) {
        recommendations.push("Matematika bo'limida Desmos grafik kalkulyatoridan formulalarni vizual tekshirishda faolroq foydalaning.");
        recommendations.push("Algebraik tenglamalarda kasrli va manfiy yechimlarni tekshirib chiqishga alohida e'tibor bering.");
    }
    if (rwErrors.length > 0) {
        recommendations.push("Reading & Writing qismida matn kontekstidan dalillar (textual evidence) izlash strategiyasini mustahkamlang.");
        recommendations.push("Grammatika qoidalarida vergul bilan bog'langan qo'shma gaplar (comma splice) tuzilmasini takrorlang.");
    }

    return {
        overallSummary: `Digital SAT testida jami ${attempt.scaledScores?.total || 400} ball to'plandi (RW: ${attempt.scaledScores?.readingWriting || 200}, Math: ${attempt.scaledScores?.math || 200}).`,
        mathDiagnostics: mathErrors.slice(0, 5).map(e => `[${e.domain}] ${e.skill || 'Tenglama va masalalar'}: hisoblash yoki konsepsiya xatoligi.`),
        readingDiagnostics: rwErrors.slice(0, 5).map(e => `[${e.domain}] ${e.skill || 'Kontekst tahlili'}: matn dalillari va mantiqiy bog'liqlik.`),
        strengths: strengths.length ? strengths : ["Asosiy savollarga javob berishda barqaror temp."],
        weaknesses: weaknesses.length ? weaknesses : ["Murakkabroq darajadagi 2-modul savollarida diqqatni oshirish zarur."],
        recommendations: recommendations.length ? recommendations : ["Har kungi maqsadli mashg'ulotlar orqali natijani 1400+ ga olib chiqish mumkin."],
        generatedAt: new Date()
    };
};

// ==========================================
// 1. OVERVIEW ENDPOINT (PHASE 1)
// ==========================================
router.get('/overview', async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.userId || req.user._id;

        if (role === 'admin') {
            const [totalTests, totalQuestions, activeAssignments, totalAttempts, pendingEvaluations, mathTeachersCount] = await Promise.all([
                SATTest.countDocuments(),
                SATQuestion.countDocuments(),
                SATAssignment.countDocuments({ status: 'ACTIVE' }),
                SATAttempt.countDocuments({ status: { $in: ['COMPLETED', 'SUBMITTED', 'EVALUATED'] } }),
                SATAttempt.countDocuments({ 
                    'mathTeacherEvaluation.evaluatedAt': null, 
                    status: { $in: ['COMPLETED', 'SUBMITTED'] } 
                }),
                User.countDocuments({ role: 'teacher', isMathTeacher: true })
            ]);

            const recentAttempts = await SATAttempt.find({ status: { $in: ['COMPLETED', 'SUBMITTED', 'EVALUATED'] } })
                .sort({ completedAt: -1 })
                .limit(5)
                .populate('studentId', 'username email grade')
                .populate('testId', 'title code');

            return res.json({
                role: 'admin',
                totalTests,
                totalQuestions,
                activeAssignments,
                totalAttempts,
                pendingEvaluations,
                mathTeachersCount,
                recentAttempts
            });
        }

        if (role === 'teacher') {
            const user = await User.findById(userId).select('isMathTeacher');
            const isMathTeacher = !!user?.isMathTeacher;

            const [myAssignments, totalTests, totalQuestions] = await Promise.all([
                SATAssignment.countDocuments({ teacherId: userId }),
                SATTest.countDocuments({ isPublished: true }),
                SATQuestion.countDocuments()
            ]);

            let pendingEvaluations = 0;
            let completedEvaluations = 0;
            let reviewQueue = [];

            if (isMathTeacher) {
                pendingEvaluations = await SATAttempt.countDocuments({
                    'mathTeacherEvaluation.evaluatedAt': null,
                    status: { $in: ['COMPLETED', 'SUBMITTED'] }
                });
                completedEvaluations = await SATAttempt.countDocuments({
                    'mathTeacherEvaluation.evaluatedBy': userId
                });
                reviewQueue = await SATAttempt.find({
                    'mathTeacherEvaluation.evaluatedAt': null,
                    status: { $in: ['COMPLETED', 'SUBMITTED'] }
                })
                .sort({ completedAt: -1 })
                .limit(6)
                .populate('studentId', 'username email grade')
                .populate('testId', 'title code');
            }

            return res.json({
                role: 'teacher',
                isMathTeacher,
                myAssignments,
                totalTests,
                totalQuestions,
                pendingEvaluations,
                completedEvaluations,
                reviewQueue
            });
        }

        if (role === 'student') {
            const [completedTests, mistakesCount, activeAssignments] = await Promise.all([
                SATAttempt.countDocuments({ studentId: userId, status: { $in: ['COMPLETED', 'SUBMITTED', 'EVALUATED'] } }),
                SATMistake.countDocuments({ studentId: userId, isMastered: false }),
                SATAssignment.countDocuments({ 
                    status: 'ACTIVE',
                    $or: [{ targetType: 'ALL' }, { targetStudents: userId }]
                })
            ]);

            const recentAttempts = await SATAttempt.find({ studentId: userId, status: { $in: ['COMPLETED', 'SUBMITTED', 'EVALUATED'] } })
                .sort({ completedAt: -1 })
                .limit(5)
                .populate('testId', 'title code durationMinutes');

            let bestScore = 0;
            let avgScore = 0;
            if (recentAttempts.length > 0) {
                const scores = recentAttempts.map(a => a.scaledScores?.total || 0).filter(s => s > 0);
                if (scores.length > 0) {
                    bestScore = Math.max(...scores);
                    avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                }
            }

            return res.json({
                role: 'student',
                completedTests,
                mistakesCount,
                activeAssignments,
                bestScore,
                avgScore,
                recentAttempts
            });
        }

        if (role === 'management') {
            const [totalTests, totalAttempts, totalStudents] = await Promise.all([
                SATTest.countDocuments({ isPublished: true }),
                SATAttempt.countDocuments({ status: { $in: ['COMPLETED', 'SUBMITTED', 'EVALUATED'] } }),
                User.countDocuments({ role: 'student' })
            ]);

            const completed = await SATAttempt.find({ status: { $in: ['COMPLETED', 'SUBMITTED', 'EVALUATED'] } })
                .select('scaledScores');
            
            let institutionalAvg = 0;
            let rwAvg = 0;
            let mathAvg = 0;

            if (completed.length > 0) {
                const totalVals = completed.map(c => c.scaledScores?.total || 0).filter(v => v > 0);
                const rwVals = completed.map(c => c.scaledScores?.readingWriting || 0).filter(v => v > 0);
                const mathVals = completed.map(c => c.scaledScores?.math || 0).filter(v => v > 0);

                if (totalVals.length) institutionalAvg = Math.round(totalVals.reduce((a, b) => a + b, 0) / totalVals.length);
                if (rwVals.length) rwAvg = Math.round(rwVals.reduce((a, b) => a + b, 0) / rwVals.length);
                if (mathVals.length) mathAvg = Math.round(mathVals.reduce((a, b) => a + b, 0) / mathVals.length);
            }

            return res.json({
                role: 'management',
                totalTests,
                totalAttempts,
                totalStudents,
                institutionalAvg,
                rwAvg,
                mathAvg
            });
        }

        res.json({ role, message: "Digital SAT overview" });
    } catch (err) {
        console.error("SAT Overview error:", err);
        res.status(500).json({ message: "Overview xatoligi: " + err.message });
    }
});

// ==========================================
// 2. QUESTION BANK APIS (PHASE 2)
// ==========================================

// GET /api/sat/questions - List questions with filters
router.get('/questions', async (req, res) => {
    try {
        const { section, domain, difficulty, difficultyTier, questionType, search, limit = 50, page = 1 } = req.query;
        const query = {};

        if (section) query.section = section.toUpperCase();
        if (domain) query.domain = domain;
        if (difficulty) query.difficulty = difficulty.toUpperCase();
        if (difficultyTier) query.difficultyTier = difficultyTier.toUpperCase();
        if (questionType) query.questionType = questionType;
        if (search) {
            query.$or = [
                { prompt: { $regex: search, $options: 'i' } },
                { stimulusText: { $regex: search, $options: 'i' } },
                { skill: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [questions, total] = await Promise.all([
            SATQuestion.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('createdBy', 'username email'),
            SATQuestion.countDocuments(query)
        ]);

        res.json({ questions, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ message: "Savollarni olishda xatolik: " + err.message });
    }
});

// GET /api/sat/questions/:id
router.get('/questions/:id', async (req, res) => {
    try {
        const question = await SATQuestion.findById(req.params.id).populate('createdBy', 'username');
        if (!question) return res.status(404).json({ message: "Savol topilmadi" });
        res.json(question);
    } catch (err) {
        res.status(500).json({ message: "Savol ma'lumotlarini olishda xatolik: " + err.message });
    }
});

// POST /api/sat/questions - Create question
router.post('/questions', mathTeacherOrAdmin, async (req, res) => {
    try {
        const {
            section, domain, skill, questionType, prompt, stimulusText, stimulusTitle,
            imageUrl, options, correctAnswer, acceptableAnswers, explanation, difficulty,
            difficultyTier, tags
        } = req.body;

        if (!section || !domain || !prompt || correctAnswer === undefined) {
            return res.status(400).json({ message: "Bo'lim, domen, savol matni va to'g'ri javob majburiy!" });
        }

        const question = new SATQuestion({
            section: section.toUpperCase(),
            domain,
            skill: skill || '',
            questionType: questionType || 'multiple_choice',
            prompt,
            stimulusText: stimulusText || '',
            stimulusTitle: stimulusTitle || '',
            imageUrl: imageUrl || '',
            options: options || [],
            correctAnswer,
            acceptableAnswers: acceptableAnswers || [],
            explanation: explanation || '',
            difficulty: difficulty || 'EXAM_LEVEL',
            difficultyTier: difficultyTier || 'STANDARD',
            tags: tags || [],
            createdBy: req.user.userId || req.user._id
        });

        await question.save();
        res.status(201).json({ message: "Savol muvaffaqiyatli saqlandi", question });
    } catch (err) {
        res.status(500).json({ message: "Savol yaratishda xatolik: " + err.message });
    }
});

// PUT /api/sat/questions/:id - Update question
router.put('/questions/:id', mathTeacherOrAdmin, async (req, res) => {
    try {
        const question = await SATQuestion.findById(req.params.id);
        if (!question) return res.status(404).json({ message: "Savol topilmadi" });

        const allowedUpdates = [
            'section', 'domain', 'skill', 'questionType', 'prompt', 'stimulusText',
            'stimulusTitle', 'imageUrl', 'options', 'correctAnswer', 'acceptableAnswers',
            'explanation', 'difficulty', 'difficultyTier', 'tags'
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                question[field] = req.body[field];
            }
        });

        await question.save();
        res.json({ message: "Savol muvaffaqiyatli yangilandi", question });
    } catch (err) {
        res.status(500).json({ message: "Savolni tahrirlashda xatolik: " + err.message });
    }
});

// DELETE /api/sat/questions/:id
router.delete('/questions/:id', mathTeacherOrAdmin, async (req, res) => {
    try {
        const question = await SATQuestion.findById(req.params.id);
        if (!question) return res.status(404).json({ message: "Savol topilmadi" });

        await SATQuestion.findByIdAndDelete(req.params.id);
        res.json({ message: "Savol muvaffaqiyatli o'chirildi" });
    } catch (err) {
        res.status(500).json({ message: "Savolni o'chirishda xatolik: " + err.message });
    }
});

// ==========================================
// 3. TEST BUILDER & LIBRARY APIS (PHASE 3)
// ==========================================

// GET /api/sat/tests - List all tests
router.get('/tests', async (req, res) => {
    try {
        const { testType, section, isPublished, search } = req.query;
        const query = { isActive: true };

        if (testType) query.testType = testType.toUpperCase();
        if (section && section !== 'ALL') query.section = section.toUpperCase();
        if (isPublished !== undefined) query.isPublished = isPublished === 'true';
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Students only see published tests
        if (req.user.role === 'student') {
            query.isPublished = true;
        }

        const tests = await SATTest.find(query)
            .sort({ createdAt: -1 })
            .populate('createdBy', 'username email');

        res.json(tests);
    } catch (err) {
        res.status(500).json({ message: "Testlarni olishda xatolik: " + err.message });
    }
});

// GET /api/sat/tests/:id - Single test details
router.get('/tests/:id', async (req, res) => {
    try {
        const test = await SATTest.findById(req.params.id)
            .populate({
                path: 'modules.questionIds',
                select: req.user.role === 'student' ? '-correctAnswer -acceptableAnswers -explanation' : ''
            })
            .populate('createdBy', 'username email');

        if (!test) return res.status(404).json({ message: "Test topilmadi" });
        res.json(test);
    } catch (err) {
        res.status(500).json({ message: "Testni yuklashda xatolik: " + err.message });
    }
});

// POST /api/sat/tests - Create test
router.post('/tests', mathTeacherOrAdmin, async (req, res) => {
    try {
        const {
            title, description, code, testType, section, difficulty,
            durationMinutes, modules, adaptiveThresholds, isPublished
        } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Test nomi majburiy!" });
        }

        const test = new SATTest({
            title,
            description: description || '',
            code: code || `SAT-${Date.now().toString().slice(-4)}`,
            testType: testType || 'FULL_MOCK',
            section: section || 'ALL',
            difficulty: difficulty || 'EXAM_LEVEL',
            durationMinutes: durationMinutes || (section === 'READING_WRITING' ? 64 : section === 'MATH' ? 70 : 134),
            modules: modules || [],
            adaptiveThresholds: adaptiveThresholds || { rwHardThreshold: 18, mathHardThreshold: 15 },
            isPublished: Boolean(isPublished),
            createdBy: req.user.userId || req.user._id
        });

        await test.save();
        res.status(201).json({ message: "Digital SAT testi muvaffaqiyatli yaratildi", test });
    } catch (err) {
        res.status(500).json({ message: "Test yaratishda xatolik: " + err.message });
    }
});

// PUT /api/sat/tests/:id - Update test
router.put('/tests/:id', mathTeacherOrAdmin, async (req, res) => {
    try {
        const test = await SATTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: "Test topilmadi" });

        const allowedFields = [
            'title', 'description', 'code', 'testType', 'section', 'difficulty',
            'durationMinutes', 'modules', 'adaptiveThresholds', 'isPublished', 'isActive'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                test[field] = req.body[field];
            }
        });

        await test.save();
        res.json({ message: "Test yangilandi", test });
    } catch (err) {
        res.status(500).json({ message: "Testni tahrirlashda xatolik: " + err.message });
    }
});

// DELETE /api/sat/tests/:id - Delete test
router.delete('/tests/:id', mathTeacherOrAdmin, async (req, res) => {
    try {
        const test = await SATTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: "Test topilmadi" });

        await SATTest.findByIdAndDelete(req.params.id);
        res.json({ message: "Test muvaffaqiyatli o'chirildi" });
    } catch (err) {
        res.status(500).json({ message: "Testni o'chirishda xatolik: " + err.message });
    }
});

// ==========================================
// 4, 5 & 6. EXAM LIFECYCLE & ADAPTIVE ENGINE (PHASES 4, 5, 6, 8, 14)
// ==========================================

// POST /api/sat/attempts/start - Start or resume exam
router.post('/attempts/start', async (req, res) => {
    try {
        const { testId, assignmentId } = req.body;
        const studentId = req.user.userId || req.user._id;

        if (!testId) {
            return res.status(400).json({ message: "Test ID ko'rsatilmadi" });
        }

        const test = await SATTest.findById(testId).populate('modules.questionIds');
        if (!test) return res.status(404).json({ message: "Test topilmadi" });

        // Check for active in-progress attempt
        let attempt = await SATAttempt.findOne({
            studentId,
            testId,
            status: 'IN_PROGRESS'
        });

        if (attempt) {
            return res.json({ message: "Davom etayotgan imtihon sessiyasi yuklandi", attempt, test });
        }

        // Determine starting section and module
        const startingSection = test.section === 'MATH' ? 'MATH' : 'READING_WRITING';
        
        attempt = new SATAttempt({
            studentId,
            testId,
            assignmentId: assignmentId || null,
            testType: test.testType,
            sectionType: test.section,
            currentStage: {
                section: startingSection,
                moduleNumber: 1
            },
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            clientIp: req.ip || '',
            userAgent: req.headers['user-agent'] || ''
        });

        await attempt.save();
        res.status(201).json({ message: "Digital SAT imtihoni boshlandi", attempt, test });
    } catch (err) {
        console.error("Start attempt error:", err);
        res.status(500).json({ message: "Imtihonni boshlashda xatolik: " + err.message });
    }
});

// POST /api/sat/attempts/:id/autosave - Fault-tolerant background autosave
router.post('/attempts/:id/autosave', async (req, res) => {
    try {
        const { answers, timeSpentSeconds, currentStage } = req.body;
        const attempt = await SATAttempt.findById(req.params.id);

        if (!attempt) return res.status(404).json({ message: "Urinish topilmadi" });
        if (attempt.status !== 'IN_PROGRESS') {
            return res.status(400).json({ message: "Bu imtihon sessiyasi yakunlangan" });
        }

        // Verify student ownership
        const studentIdStr = (attempt.studentId?._id || attempt.studentId).toString();
        const userIdStr = (req.user.userId || req.user._id).toString();
        if (req.user.role === 'student' && studentIdStr !== userIdStr) {
            return res.status(403).json({ message: "Ruxsatsiz urinish" });
        }

        if (Array.isArray(answers)) {
            // Update or merge answers
            answers.forEach(newAns => {
                const existingIdx = attempt.answers.findIndex(
                    a => a.questionId?.toString() === newAns.questionId?.toString()
                );
                if (existingIdx > -1) {
                    attempt.answers[existingIdx].studentAnswer = newAns.studentAnswer;
                    attempt.answers[existingIdx].userAnswer = newAns.studentAnswer;
                    attempt.answers[existingIdx].flaggedForReview = Boolean(newAns.flaggedForReview);
                    attempt.answers[existingIdx].notes = newAns.notes || '';
                    if (newAns.timeSpentSeconds) attempt.answers[existingIdx].timeSpentSeconds = newAns.timeSpentSeconds;
                } else {
                    attempt.answers.push({
                        questionId: newAns.questionId,
                        section: newAns.section,
                        moduleNumber: newAns.moduleNumber || 1,
                        questionNumber: newAns.questionNumber,
                        studentAnswer: newAns.studentAnswer,
                        userAnswer: newAns.studentAnswer,
                        flaggedForReview: Boolean(newAns.flaggedForReview),
                        notes: newAns.notes || '',
                        timeSpentSeconds: newAns.timeSpentSeconds || 0
                    });
                }
            });
        }

        if (timeSpentSeconds !== undefined) {
            attempt.timeSpentSeconds = timeSpentSeconds;
            attempt.durationSpent = timeSpentSeconds;
        }

        if (currentStage) {
            attempt.currentStage = currentStage;
        }

        attempt.lastHeartbeat = new Date();
        await attempt.save();

        res.json({ message: "Autosave muvaffaqiyatli", savedAt: new Date() });
    } catch (err) {
        res.status(500).json({ message: "Autosave xatoligi: " + err.message });
    }
});

// POST /api/sat/attempts/:id/route-module - Multi-Stage Adaptive Module Routing
router.post('/attempts/:id/route-module', async (req, res) => {
    try {
        const { currentSection, module1Answers } = req.body;
        const attempt = await SATAttempt.findById(req.params.id);
        if (!attempt) return res.status(404).json({ message: "Urinish topilmadi" });

        const test = await SATTest.findById(attempt.testId).populate('modules.questionIds');
        if (!test) return res.status(404).json({ message: "Test topilmadi" });

        // Calculate Module 1 raw score to decide Hard or Easy Module 2
        let rawM1 = 0;
        const m1QuestionIds = [];

        // Save module 1 answers
        if (Array.isArray(module1Answers)) {
            for (const ans of module1Answers) {
                m1QuestionIds.push(ans.questionId);
                const q = await SATQuestion.findById(ans.questionId);
                if (q) {
                    let correct = false;
                    if (q.questionType === 'student_produced_response') {
                        correct = isGridInCorrect(ans.studentAnswer, q.correctAnswer, q.acceptableAnswers);
                    } else {
                        correct = String(ans.studentAnswer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
                    }

                    if (correct) rawM1 += 1;

                    const existingIdx = attempt.answers.findIndex(
                        a => a.questionId?.toString() === ans.questionId?.toString()
                    );
                    if (existingIdx > -1) {
                        attempt.answers[existingIdx].studentAnswer = ans.studentAnswer;
                        attempt.answers[existingIdx].isCorrect = correct;
                        attempt.answers[existingIdx].scoreGiven = correct ? 1 : 0;
                    } else {
                        attempt.answers.push({
                            questionId: ans.questionId,
                            section: currentSection,
                            moduleNumber: 1,
                            questionNumber: ans.questionNumber,
                            studentAnswer: ans.studentAnswer,
                            isCorrect: correct,
                            scoreGiven: correct ? 1 : 0
                        });
                    }
                }
            }
        }

        let assignedTier = 'HARD';
        if (currentSection === 'READING_WRITING') {
            const threshold = test.adaptiveThresholds?.rwHardThreshold || 18;
            assignedTier = rawM1 >= threshold ? 'HARD' : 'EASY';
            attempt.moduleRouting.rwModule1Raw = rawM1;
            attempt.moduleRouting.rwModule2Tier = assignedTier;
            attempt.rawScores.rwModule1 = rawM1;
            attempt.currentStage = { section: 'READING_WRITING', moduleNumber: 2 };
        } else { // MATH
            const threshold = test.adaptiveThresholds?.mathHardThreshold || 15;
            assignedTier = rawM1 >= threshold ? 'HARD' : 'EASY';
            attempt.moduleRouting.mathModule1Raw = rawM1;
            attempt.moduleRouting.mathModule2Tier = assignedTier;
            attempt.rawScores.mathModule1 = rawM1;
            attempt.currentStage = { section: 'MATH', moduleNumber: 2 };
        }

        await attempt.save();

        // Find matching module questions in test
        let targetModule = test.modules.find(
            m => m.section === currentSection && m.moduleNumber === 2 && m.difficultyTier === assignedTier
        );

        // Fallback to any module 2 if tier not specifically isolated
        if (!targetModule) {
            targetModule = test.modules.find(m => m.section === currentSection && m.moduleNumber === 2);
        }

        res.json({
            message: `Adaptiv 2-modul tanlandi (${assignedTier} daraja)`,
            currentSection,
            moduleNumber: 2,
            assignedTier,
            rawModule1: rawM1,
            module: targetModule || null
        });
    } catch (err) {
        console.error("Module routing error:", err);
        res.status(500).json({ message: "Modul yo'naltirishda xatolik: " + err.message });
    }
});

// POST /api/sat/attempts/:id/submit - Final Exam Submission & Scoring (Phase 8)
router.post('/attempts/:id/submit', async (req, res) => {
    try {
        const { answers, timeSpentSeconds } = req.body;
        const attempt = await SATAttempt.findById(req.params.id);
        if (!attempt) return res.status(404).json({ message: "Urinish topilmadi" });

        const test = await SATTest.findById(attempt.testId).populate('modules.questionIds');
        if (!test) return res.status(404).json({ message: "Test topilmadi" });

        // Merge incoming final answers
        if (Array.isArray(answers)) {
            answers.forEach(newAns => {
                const existingIdx = attempt.answers.findIndex(
                    a => a.questionId?.toString() === newAns.questionId?.toString()
                );
                if (existingIdx > -1) {
                    attempt.answers[existingIdx].studentAnswer = newAns.studentAnswer;
                    attempt.answers[existingIdx].userAnswer = newAns.studentAnswer;
                    attempt.answers[existingIdx].notes = newAns.notes || '';
                } else {
                    attempt.answers.push({
                        questionId: newAns.questionId,
                        section: newAns.section,
                        moduleNumber: newAns.moduleNumber || 1,
                        questionNumber: newAns.questionNumber,
                        studentAnswer: newAns.studentAnswer,
                        userAnswer: newAns.studentAnswer,
                        notes: newAns.notes || ''
                    });
                }
            });
        }

        // Collect all question IDs to evaluate
        const allQuestionIds = attempt.answers.map(a => a.questionId).filter(Boolean);
        const questions = await SATQuestion.find({ _id: { $in: allQuestionIds } });
        const questionsMap = {};
        questions.forEach(q => { questionsMap[q._id.toString()] = q; });

        // Grading variables
        let rwM1Correct = 0, rwM1Total = 0;
        let rwM2Correct = 0, rwM2Total = 0;
        let mathM1Correct = 0, mathM1Total = 0;
        let mathM2Correct = 0, mathM2Total = 0;

        const mistakesToCreate = [];

        const domainScores = {
            craftAndStructure: { correct: 0, total: 0 },
            informationAndIdeas: { correct: 0, total: 0 },
            standardEnglishConventions: { correct: 0, total: 0 },
            expressionOfIdeas: { correct: 0, total: 0 },
            algebra: { correct: 0, total: 0 },
            advancedMath: { correct: 0, total: 0 },
            problemSolving: { correct: 0, total: 0 },
            geometryTrig: { correct: 0, total: 0 }
        };

        const mapDomainToKey = (domain) => {
            if (!domain) return null;
            const d = domain.toLowerCase();
            if (d.includes('craft')) return 'craftAndStructure';
            if (d.includes('information')) return 'informationAndIdeas';
            if (d.includes('standard') || d.includes('convention')) return 'standardEnglishConventions';
            if (d.includes('expression')) return 'expressionOfIdeas';
            if (d.includes('algebra')) return 'algebra';
            if (d.includes('advanced')) return 'advancedMath';
            if (d.includes('problem') || d.includes('data')) return 'problemSolving';
            if (d.includes('geometry') || d.includes('trig')) return 'geometryTrig';
            return null;
        };

        // Evaluate each answer
        attempt.answers.forEach(ans => {
            const q = questionsMap[ans.questionId?.toString()];
            if (q) {
                let isCorrect = false;
                if (q.questionType === 'student_produced_response') {
                    isCorrect = isGridInCorrect(ans.studentAnswer, q.correctAnswer, q.acceptableAnswers);
                } else {
                    isCorrect = String(ans.studentAnswer || '').trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase();
                }

                ans.isCorrect = isCorrect;
                ans.scoreGiven = isCorrect ? 1 : 0;

                // Domain breakdown
                const domainKey = mapDomainToKey(q.domain);
                if (domainKey && domainScores[domainKey]) {
                    domainScores[domainKey].total += 1;
                    if (isCorrect) domainScores[domainKey].correct += 1;
                }

                // Section & Module breakdown
                if (q.section === 'READING_WRITING') {
                    if (ans.moduleNumber === 2) {
                        rwM2Total += 1;
                        if (isCorrect) rwM2Correct += 1;
                    } else {
                        rwM1Total += 1;
                        if (isCorrect) rwM1Correct += 1;
                    }
                } else { // MATH
                    if (ans.moduleNumber === 2) {
                        mathM2Total += 1;
                        if (isCorrect) mathM2Correct += 1;
                    } else {
                        mathM1Total += 1;
                        if (isCorrect) mathM1Correct += 1;
                    }
                }

                // If incorrect, queue for Mistake Notebook
                if (!isCorrect) {
                    mistakesToCreate.push({
                        studentId: attempt.studentId,
                        testId: attempt.testId,
                        attemptId: attempt._id,
                        questionId: q._id,
                        section: q.section,
                        domain: q.domain,
                        questionPrompt: q.prompt,
                        questionType: q.questionType,
                        studentAnswer: ans.studentAnswer,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation || ''
                    });
                }
            }
        });

        // Compute Raw & Scaled Scores
        const totalRwRaw = rwM1Correct + rwM2Correct;
        const totalRwQuestions = Math.max(1, rwM1Total + rwM2Total);
        const isRwHardTier = attempt.moduleRouting?.rwModule2Tier !== 'EASY';

        const totalMathRaw = mathM1Correct + mathM2Correct;
        const totalMathQuestions = Math.max(1, mathM1Total + mathM2Total);
        const isMathHardTier = attempt.moduleRouting?.mathModule2Tier !== 'EASY';

        const rwScaled = test.section === 'MATH' ? 0 : calculateScaledScore(totalRwRaw, totalRwQuestions, 'READING_WRITING', isRwHardTier);
        const mathScaled = test.section === 'READING_WRITING' ? 0 : calculateScaledScore(totalMathRaw, totalMathQuestions, 'MATH', isMathHardTier);

        let totalScaled = 0;
        if (test.section === 'READING_WRITING') totalScaled = rwScaled;
        else if (test.section === 'MATH') totalScaled = mathScaled;
        else totalScaled = rwScaled + mathScaled;

        attempt.rawScores = {
            readingWriting: totalRwRaw,
            math: totalMathRaw,
            rwModule1: rwM1Correct,
            rwModule2: rwM2Correct,
            mathModule1: mathM1Correct,
            mathModule2: mathM2Correct,
            totalRaw: totalRwRaw + totalMathRaw
        };

        attempt.scaledScores = {
            readingWriting: rwScaled,
            math: mathScaled,
            total: totalScaled
        };

        attempt.percentile = calculatePercentile(totalScaled);
        attempt.domainScores = domainScores;
        attempt.status = 'COMPLETED';
        attempt.completedAt = new Date();
        if (timeSpentSeconds) {
            attempt.timeSpentSeconds = timeSpentSeconds;
            attempt.durationSpent = timeSpentSeconds;
        }

        // Generate intelligent AI diagnostic breakdown
        attempt.aiFeedback = generateDiagnosticFeedback(attempt, questionsMap);

        await attempt.save();

        // Bulk insert mistakes into Mistake Notebook
        if (mistakesToCreate.length > 0) {
            try {
                await SATMistake.insertMany(mistakesToCreate, { ordered: false });
            } catch (mErr) {
                console.warn("Some mistakes already existed or duplicate error:", mErr.message);
            }
        }

        res.json({
            message: "Imtihon muvaffaqiyatli topshirildi va ballar hisoblandi!",
            attemptId: attempt._id,
            scaledScores: attempt.scaledScores,
            rawScores: attempt.rawScores,
            percentile: attempt.percentile,
            domainScores: attempt.domainScores,
            aiFeedback: attempt.aiFeedback
        });
    } catch (err) {
        console.error("Submit exam error:", err);
        res.status(500).json({ message: "Imtihonni topshirishda xatolik: " + err.message });
    }
});

// GET /api/sat/attempts/my-history - Student personal test history
router.get('/attempts/my-history', async (req, res) => {
    try {
        const studentId = req.user.userId || req.user._id;
        const attempts = await SATAttempt.find({ studentId })
            .sort({ createdAt: -1 })
            .populate('testId', 'title code durationMinutes testType section');
        res.json(attempts);
    } catch (err) {
        res.status(500).json({ message: "Tarixni olishda xatolik: " + err.message });
    }
});

// GET /api/sat/attempts - Cohort list of attempts (Teacher/Admin/Management)
router.get('/attempts', async (req, res) => {
    try {
        const { testId, status, search, limit = 50, page = 1 } = req.query;
        const query = {};

        if (testId) query.testId = testId;
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [attempts, total] = await Promise.all([
            SATAttempt.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('studentId', 'username email grade')
                .populate('testId', 'title code durationMinutes'),
            SATAttempt.countDocuments(query)
        ]);

        res.json({ attempts, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ message: "Natijalarni olishda xatolik: " + err.message });
    }
});

// GET /api/sat/attempts/:id - Single attempt scorecard
router.get('/attempts/:id', async (req, res) => {
    try {
        const attempt = await SATAttempt.findById(req.params.id)
            .populate('studentId', 'username email grade')
            .populate('testId', 'title code durationMinutes modules testType section')
            .populate('answers.questionId')
            .populate('mathTeacherEvaluation.evaluatedBy', 'username email');

        if (!attempt) return res.status(404).json({ message: "Urinish topilmadi" });

        // Security check: Only the student themselves, math teachers, or admins can view full answers
        const studentIdStr = (attempt.studentId?._id || attempt.studentId)?.toString();
        const userIdStr = (req.user.userId || req.user._id)?.toString();
        if (req.user.role === 'student' && studentIdStr !== userIdStr) {
            return res.status(403).json({ message: "Boshqa o'quvchi natijalarini ko'rish taqiqlanadi" });
        }

        res.json(attempt);
    } catch (err) {
        res.status(500).json({ message: "Natijani yuklashda xatolik: " + err.message });
    }
});

// ==========================================
// 7. STRICT MATH TEACHER EVALUATION WORKBENCH (PHASE 7)
// ==========================================

// GET /api/sat/evaluations/queue - Math Teacher evaluation review queue
// STRICT ACCESS: Only designated Math Teachers (isMathTeacher: true) and Admins!
router.get('/evaluations/queue', mathTeacherOrAdmin, async (req, res) => {
    try {
        const { status = 'pending' } = req.query;
        const query = {
            status: { $in: ['COMPLETED', 'SUBMITTED', 'EVALUATED'] }
        };

        if (status === 'pending') {
            query['mathTeacherEvaluation.evaluatedAt'] = null;
        } else if (status === 'evaluated') {
            query['mathTeacherEvaluation.evaluatedAt'] = { $ne: null };
        }

        const queue = await SATAttempt.find(query)
            .sort({ completedAt: -1 })
            .populate('studentId', 'username email grade')
            .populate('testId', 'title code durationMinutes');

        res.json(queue);
    } catch (err) {
        res.status(500).json({ message: "Navbatni yuklashda xatolik: " + err.message });
    }
});

// GET /api/sat/evaluations/:attemptId - Detailed workbench data
router.get('/evaluations/:attemptId', mathTeacherOrAdmin, async (req, res) => {
    try {
        const attempt = await SATAttempt.findById(req.params.attemptId)
            .populate('studentId', 'username email grade')
            .populate('testId', 'title code modules')
            .populate('answers.questionId');

        if (!attempt) return res.status(404).json({ message: "Urinish topilmadi" });

        // Filter out Math questions for workbench
        const mathAnswers = attempt.answers.filter(a => {
            const q = a.questionId;
            return q && q.section === 'MATH';
        });

        const existingEvaluation = await SATEvaluation.findOne({ attemptId: attempt._id })
            .populate('teacherId', 'username email');

        res.json({
            attempt,
            mathAnswers,
            existingEvaluation
        });
    } catch (err) {
        res.status(500).json({ message: "Baholash ma'lumotlarini olishda xatolik: " + err.message });
    }
});

// POST /api/sat/evaluations/:attemptId - Submit qualitative feedback & step review
router.post('/evaluations/:attemptId', mathTeacherOrAdmin, async (req, res) => {
    try {
        const {
            qualitativeFeedback,
            mathWorkingAnalysis,
            strengths,
            areasForImprovement,
            questionNotes,
            stepFeedback
        } = req.body;

        const teacherId = req.user.userId || req.user._id;
        const attempt = await SATAttempt.findById(req.params.attemptId);
        if (!attempt) return res.status(404).json({ message: "Urinish topilmadi" });

        let evaluation = await SATEvaluation.findOne({ attemptId: attempt._id });
        if (!evaluation) {
            evaluation = new SATEvaluation({
                attemptId: attempt._id,
                studentId: attempt.studentId,
                teacherId
            });
        }

        evaluation.teacherId = teacherId;
        evaluation.qualitativeFeedback = qualitativeFeedback || '';
        evaluation.mathWorkingAnalysis = mathWorkingAnalysis || '';
        evaluation.strengths = strengths || [];
        evaluation.areasForImprovement = areasForImprovement || [];
        evaluation.questionNotes = questionNotes || [];
        evaluation.status = 'published';
        evaluation.evaluatedAt = new Date();
        await evaluation.save();

        // Update attempt's embedded mathTeacherEvaluation
        attempt.mathTeacherEvaluation = {
            evaluatedBy: teacherId,
            evaluatedAt: new Date(),
            feedbackText: qualitativeFeedback || '',
            stepFeedback: stepFeedback || []
        };
        attempt.status = 'EVALUATED';
        await attempt.save();

        res.json({
            message: "Matematika o'qituvchisi taqrizi muvaffaqiyatli saqlandi!",
            evaluation,
            attempt
        });
    } catch (err) {
        console.error("Submit evaluation error:", err);
        res.status(500).json({ message: "Baholashni saqlashda xatolik: " + err.message });
    }
});

// ==========================================
// 9. TEACHER ASSIGNMENTS (PHASE 9)
// ==========================================

// POST /api/sat/assignments - Create assignment
router.post('/assignments', mathTeacherOrAdmin, async (req, res) => {
    try {
        const { title, testId, targetType, targetClass, targetStudents, dueDate, instructions, allowLateSubmission } = req.body;
        const teacherId = req.user.userId || req.user._id;

        if (!testId) {
            return res.status(400).json({ message: "Test tanlanishi shart!" });
        }

        const assignment = new SATAssignment({
            title: title || 'Digital SAT Topshirig\'i',
            testId,
            teacherId,
            targetType: targetType || 'ALL',
            targetClass: targetClass || '',
            targetStudents: targetStudents || [],
            dueDate: dueDate ? new Date(dueDate) : null,
            instructions: instructions || '',
            allowLateSubmission: Boolean(allowLateSubmission),
            status: 'ACTIVE'
        });

        await assignment.save();
        res.status(201).json({ message: "Topshiriq muvaffaqiyatli yaratildi", assignment });
    } catch (err) {
        res.status(500).json({ message: "Topshiriq yaratishda xatolik: " + err.message });
    }
});

// GET /api/sat/assignments - List assignments
router.get('/assignments', async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.userId || req.user._id;
        const query = {};

        if (role === 'teacher') {
            query.teacherId = userId;
        }

        const assignments = await SATAssignment.find(query)
            .sort({ createdAt: -1 })
            .populate('testId', 'title code durationMinutes testType section')
            .populate('teacherId', 'username email');

        res.json(assignments);
    } catch (err) {
        res.status(500).json({ message: "Topshiriqlarni olishda xatolik: " + err.message });
    }
});

// GET /api/sat/assignments/student - Active assignments for student
router.get('/assignments/student', async (req, res) => {
    try {
        const studentId = req.user.userId || req.user._id;
        const assignments = await SATAssignment.find({
            status: 'ACTIVE',
            $or: [
                { targetType: 'ALL' },
                { targetStudents: studentId }
            ]
        })
        .sort({ dueDate: 1 })
        .populate('testId', 'title code durationMinutes testType section')
        .populate('teacherId', 'username');

        // Check which ones are already completed
        const completedAttempts = await SATAttempt.find({
            studentId,
            assignmentId: { $in: assignments.map(a => a._id) },
            status: { $in: ['COMPLETED', 'SUBMITTED', 'EVALUATED'] }
        }).select('assignmentId scaledScores completedAt');

        const completedMap = {};
        completedAttempts.forEach(ca => {
            completedMap[ca.assignmentId?.toString()] = ca;
        });

        const result = assignments.map(a => {
            const doc = a.toObject();
            doc.completedAttempt = completedMap[a._id.toString()] || null;
            doc.isCompleted = !!doc.completedAttempt;
            return doc;
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: "Talaba topshiriqlarini olishda xatolik: " + err.message });
    }
});

// PUT /api/sat/assignments/:id - Update assignment
router.put('/assignments/:id', mathTeacherOrAdmin, async (req, res) => {
    try {
        const assignment = await SATAssignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ message: "Topshiriq topilmadi" });

        const allowed = ['title', 'targetType', 'targetClass', 'targetStudents', 'dueDate', 'instructions', 'status', 'allowLateSubmission'];
        allowed.forEach(f => {
            if (req.body[f] !== undefined) assignment[f] = req.body[f];
        });

        await assignment.save();
        res.json({ message: "Topshiriq yangilandi", assignment });
    } catch (err) {
        res.status(500).json({ message: "Topshiriqni tahrirlashda xatolik: " + err.message });
    }
});

// DELETE /api/sat/assignments/:id - Delete assignment
router.delete('/assignments/:id', mathTeacherOrAdmin, async (req, res) => {
    try {
        const assignment = await SATAssignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ message: "Topshiriq topilmadi" });

        await SATAssignment.findByIdAndDelete(req.params.id);
        res.json({ message: "Topshiriq muvaffaqiyatli o'chirildi" });
    } catch (err) {
        res.status(500).json({ message: "Topshiriqni o'chirishda xatolik: " + err.message });
    }
});

// ==========================================
// 10. MISTAKE NOTEBOOK (PHASE 10)
// ==========================================

// GET /api/sat/mistakes - Student's mistake notebook
router.get('/mistakes', async (req, res) => {
    try {
        const studentId = req.user.userId || req.user._id;
        const { section, domain, isMastered } = req.query;
        const query = { studentId };

        if (section) query.section = section.toUpperCase();
        if (domain) query.domain = domain;
        if (isMastered !== undefined) query.isMastered = isMastered === 'true';

        const mistakes = await SATMistake.find(query)
            .sort({ createdAt: -1 })
            .populate('testId', 'title code')
            .populate('questionId');

        res.json(mistakes);
    } catch (err) {
        res.status(500).json({ message: "Xatolar daftarini olishda xatolik: " + err.message });
    }
});

// PATCH /api/sat/mistakes/:id/master - Mark question as mastered
router.patch('/mistakes/:id/master', async (req, res) => {
    try {
        const studentId = req.user.userId || req.user._id;
        const mistake = await SATMistake.findOne({ _id: req.params.id, studentId });
        if (!mistake) return res.status(404).json({ message: "Xatolik qaydi topilmadi" });

        mistake.isMastered = !mistake.isMastered;
        mistake.masteredAt = mistake.isMastered ? new Date() : null;
        await mistake.save();

        res.json({ message: mistake.isMastered ? "Savol o'zlashtirildi deb belgilandi!" : "O'zlashtirish bekor qilindi", mistake });
    } catch (err) {
        res.status(500).json({ message: "Holatni yangilashda xatolik: " + err.message });
    }
});

// PUT /api/sat/mistakes/:id/notes - Add personal student note
router.put('/mistakes/:id/notes', async (req, res) => {
    try {
        const studentId = req.user.userId || req.user._id;
        const { studentNotes } = req.body;
        const mistake = await SATMistake.findOne({ _id: req.params.id, studentId });
        if (!mistake) return res.status(404).json({ message: "Xatolik qaydi topilmadi" });

        mistake.studentNotes = studentNotes || '';
        await mistake.save();

        res.json({ message: "Eslatma saqlandi", mistake });
    } catch (err) {
        res.status(500).json({ message: "Eslatmani saqlashda xatolik: " + err.message });
    }
});

// ==========================================
// 11. MANAGEMENT ANALYTICS (PHASE 11)
// ==========================================
router.get('/analytics/management', managementOrAdmin, async (req, res) => {
    try {
        const [totalTests, totalAttempts, totalStudents] = await Promise.all([
            SATTest.countDocuments({ isPublished: true }),
            SATAttempt.countDocuments({ status: { $in: ['COMPLETED', 'SUBMITTED', 'EVALUATED'] } }),
            User.countDocuments({ role: 'student' })
        ]);

        const attempts = await SATAttempt.find({ status: { $in: ['COMPLETED', 'SUBMITTED', 'EVALUATED'] } })
            .select('scaledScores domainScores completedAt studentId')
            .populate('studentId', 'grade username');

        const scoreDistribution = {
            '1400-1600': 0,
            '1200-1390': 0,
            '1000-1190': 0,
            '800-990': 0,
            'Below 800': 0
        };

        let sumTotal = 0, sumRw = 0, sumMath = 0;
        let validScoresCount = 0;

        const gradeAverages = {};

        attempts.forEach(att => {
            const tot = att.scaledScores?.total || 0;
            const rw = att.scaledScores?.readingWriting || 0;
            const math = att.scaledScores?.math || 0;

            if (tot > 0) {
                sumTotal += tot;
                sumRw += rw;
                sumMath += math;
                validScoresCount++;

                if (tot >= 1400) scoreDistribution['1400-1600']++;
                else if (tot >= 1200) scoreDistribution['1200-1390']++;
                else if (tot >= 1000) scoreDistribution['1000-1190']++;
                else if (tot >= 800) scoreDistribution['800-990']++;
                else scoreDistribution['Below 800']++;

                const gr = att.studentId?.grade || 'Noma\'lum';
                if (!gradeAverages[gr]) gradeAverages[gr] = { sum: 0, count: 0 };
                gradeAverages[gr].sum += tot;
                gradeAverages[gr].count += 1;
            }
        });

        const institutionalAvg = validScoresCount ? Math.round(sumTotal / validScoresCount) : 0;
        const rwAvg = validScoresCount ? Math.round(sumRw / validScoresCount) : 0;
        const mathAvg = validScoresCount ? Math.round(sumMath / validScoresCount) : 0;

        const cohortBreakdown = Object.entries(gradeAverages).map(([grade, data]) => ({
            grade,
            avgScore: Math.round(data.sum / data.count),
            studentsCount: data.count
        }));

        res.json({
            totalTests,
            totalAttempts,
            totalStudents,
            institutionalAvg,
            rwAvg,
            mathAvg,
            scoreDistribution,
            cohortBreakdown
        });
    } catch (err) {
        res.status(500).json({ message: "Rahbariyat tahlilida xatolik: " + err.message });
    }
});

// ==========================================
// 12. AI FEEDBACK ASSISTANT (PHASE 12)
// ==========================================
router.post('/attempts/:id/ai-feedback', async (req, res) => {
    try {
        const attempt = await SATAttempt.findById(req.params.id).populate('answers.questionId');
        if (!attempt) return res.status(404).json({ message: "Urinish topilmadi" });

        const questionsMap = {};
        attempt.answers.forEach(a => {
            if (a.questionId) {
                questionsMap[a.questionId._id.toString()] = a.questionId;
            }
        });

        const aiFeedback = generateDiagnosticFeedback(attempt, questionsMap);
        attempt.aiFeedback = aiFeedback;
        await attempt.save();

        res.json({ message: "AI tahlili yangilandi", aiFeedback });
    } catch (err) {
        res.status(500).json({ message: "AI tahlilida xatolik: " + err.message });
    }
});

// ==========================================
// 13. BULK IMPORT & MEDIA ASSETS (PHASE 13)
// ==========================================

// POST /api/sat/media/upload
router.post('/media/upload', mathTeacherOrAdmin, uploadMedia.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Fayl yuklanmadi" });

        const { category = 'general', description = '', mediaType = 'image' } = req.body;
        const fileUrl = `/uploads/sat-media/${req.file.filename}`;

        const media = new SATMedia({
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            url: fileUrl,
            mediaType,
            category,
            description,
            uploadedBy: req.user.userId || req.user._id
        });

        await media.save();
        res.status(201).json({ message: "Media fayl muvaffaqiyatli yuklandi", media });
    } catch (err) {
        res.status(500).json({ message: "Media yuklashda xatolik: " + err.message });
    }
});

// GET /api/sat/media
router.get('/media', async (req, res) => {
    try {
        const { category, mediaType } = req.query;
        const query = {};
        if (category) query.category = category;
        if (mediaType) query.mediaType = mediaType;

        const mediaList = await SATMedia.find(query).sort({ createdAt: -1 }).limit(100);
        res.json(mediaList);
    } catch (err) {
        res.status(500).json({ message: "Medialarni olishda xatolik: " + err.message });
    }
});

// DELETE /api/sat/media/:id
router.delete('/media/:id', mathTeacherOrAdmin, async (req, res) => {
    try {
        const media = await SATMedia.findById(req.params.id);
        if (!media) return res.status(404).json({ message: "Media topilmadi" });

        const filePath = path.join(satMediaUploadDir, media.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await SATMedia.findByIdAndDelete(req.params.id);
        res.json({ message: "Media muvaffaqiyatli o'chirildi" });
    } catch (err) {
        res.status(500).json({ message: "Mediani o'chirishda xatolik: " + err.message });
    }
});

// POST /api/sat/import - Bulk import questions from JSON or CSV
router.post('/import', mathTeacherOrAdmin, uploadImport.single('file'), async (req, res) => {
    try {
        let questionsToImport = [];

        if (req.file) {
            const rawContent = req.file.buffer.toString('utf-8');
            if (req.file.originalname.endsWith('.json')) {
                const parsed = JSON.parse(rawContent);
                questionsToImport = Array.isArray(parsed) ? parsed : [parsed];
            } else if (req.file.originalname.endsWith('.csv')) {
                // Parse CSV rows
                const lines = rawContent.split(/\r?\n/).filter(line => line.trim().length > 0);
                if (lines.length > 1) {
                    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                    for (let i = 1; i < lines.length; i++) {
                        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                        const obj = {};
                        headers.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
                        questionsToImport.push(obj);
                    }
                }
            }
        } else if (Array.isArray(req.body.questions)) {
            questionsToImport = req.body.questions;
        } else {
            return res.status(400).json({ message: "Fayl yoki savollar ro'yxati yuborilmadi" });
        }

        const validQuestions = [];
        const userId = req.user.userId || req.user._id;

        for (const item of questionsToImport) {
            if (item.prompt && item.section && item.correctAnswer !== undefined) {
                validQuestions.push({
                    section: String(item.section).toUpperCase().includes('MATH') ? 'MATH' : 'READING_WRITING',
                    domain: item.domain || (item.section === 'MATH' ? 'Algebra' : 'Craft and Structure'),
                    skill: item.skill || '',
                    questionType: item.questionType || (item.options && item.options.length ? 'multiple_choice' : 'student_produced_response'),
                    prompt: item.prompt,
                    stimulusText: item.stimulusText || '',
                    stimulusTitle: item.stimulusTitle || '',
                    imageUrl: item.imageUrl || '',
                    options: Array.isArray(item.options) ? item.options : (item.options ? String(item.options).split('|') : []),
                    correctAnswer: item.correctAnswer,
                    acceptableAnswers: Array.isArray(item.acceptableAnswers) ? item.acceptableAnswers : (item.acceptableAnswers ? String(item.acceptableAnswers).split('|') : []),
                    explanation: item.explanation || '',
                    difficulty: item.difficulty || 'EXAM_LEVEL',
                    difficultyTier: item.difficultyTier || 'STANDARD',
                    tags: Array.isArray(item.tags) ? item.tags : (item.tags ? String(item.tags).split(';') : []),
                    createdBy: userId
                });
            }
        }

        if (validQuestions.length === 0) {
            return res.status(400).json({ message: "Hech qanday to'g'ri formatdagi savol topilmadi" });
        }

        const inserted = await SATQuestion.insertMany(validQuestions);
        res.status(201).json({
            message: `${inserted.length} ta savol muvaffaqiyatli import qilindi!`,
            count: inserted.length
        });
    } catch (err) {
        res.status(500).json({ message: "Import jarayonida xatolik: " + err.message });
    }
});

// ==========================================
// 14. EXAM SECURITY & PROCTORING (PHASE 14)
// ==========================================

// POST /api/sat/attempts/:id/security-violation
router.post('/attempts/:id/security-violation', async (req, res) => {
    try {
        const { type, details } = req.body;
        const attempt = await SATAttempt.findById(req.params.id);
        if (!attempt) return res.status(404).json({ message: "Urinish topilmadi" });

        attempt.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
        attempt.securityViolations.push({
            type: type || 'TAB_SWITCH',
            details: details || `Oyna almashtirildi (${attempt.tabSwitchCount}-marta)`,
            timestamp: new Date()
        });

        await attempt.save();
        res.json({ message: "Xavfsizlik buzilishi qayd etildi", count: attempt.tabSwitchCount });
    } catch (err) {
        res.status(500).json({ message: "Xatolik: " + err.message });
    }
});

// POST /api/sat/proctor/terminate/:attemptId
router.post('/proctor/terminate/:attemptId', mathTeacherOrAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        const attempt = await SATAttempt.findById(req.params.attemptId);
        if (!attempt) return res.status(404).json({ message: "Urinish topilmadi" });

        attempt.isTerminatedByProctor = true;
        attempt.terminatedReason = reason || 'Proktor tomonidan qoidabuzarlik sababli to\'xtatildi';
        attempt.terminatedAt = new Date();
        attempt.status = 'COMPLETED';

        attempt.securityViolations.push({
            type: 'PROCTOR_TERMINATION',
            details: attempt.terminatedReason,
            timestamp: new Date()
        });

        await attempt.save();
        res.json({ message: "Imtihon proktor tomonidan to'xtatildi", attempt });
    } catch (err) {
        res.status(500).json({ message: "To'xtatishda xatolik: " + err.message });
    }
});

// GET /api/sat/proctor/live-sessions
router.get('/proctor/live-sessions', mathTeacherOrAdmin, async (req, res) => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeSessions = await SATAttempt.find({
            status: 'IN_PROGRESS',
            lastHeartbeat: { $gte: fiveMinutesAgo }
        })
        .populate('studentId', 'username email grade')
        .populate('testId', 'title code');

        res.json(activeSessions);
    } catch (err) {
        res.status(500).json({ message: "Jonli sessiyalarni olishda xatolik: " + err.message });
    }
});

module.exports = router;
