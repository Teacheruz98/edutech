const express = require('express');
const router = express.Router();
const mammoth = require('mammoth');
const { QuestionMaker, QuestionResult } = require('../models/QuestionMaker');
const User = require('../models/User');
const { authMiddleware, teacherOrAdmin } = require('../middleware/auth');
const { uploadDocx } = require('../middleware/upload');

// ── Get All Question Maker Quizzes For Course ─────────────────────────────────
router.get('/courses/:courseId/question-maker', authMiddleware, async (req, res) => {
    try { res.json(await QuestionMaker.find({ courseId: req.params.courseId }).sort({ createdAt: -1 })); }
    catch (error) { res.status(500).json({ message: "Savollar to'plamini olishda xatolik" }); }
});

// ── Import Questions From DOCX ────────────────────────────────────────────────
router.post('/courses/:courseId/question-maker/import-docx', authMiddleware, teacherOrAdmin, uploadDocx.single('file'), async (req, res) => {
    try {
        if (!req.file?.buffer) return res.status(400).json({ message: ".DOCX fayli yuklanmadi!" });
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        const rawText = result.value || '';
        if (!rawText.trim()) return res.status(400).json({ message: ".DOCX fayli bo'sh!" });
        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const parsedQuestions = [];
        let currentQuestion = null;
        const questionPrefixRegex = /^(\d+[.\-\)]\s*|savol\s*\d*[.:\-]\s*)/i;
        const optionPrefixRegex = /^([a-hA-H][.\)]\s*|[-\*•]\s*)/i;
        lines.forEach((line) => {
            const isOpt = optionPrefixRegex.test(line);
            const isQLine = !isOpt && (questionPrefixRegex.test(line) || line.endsWith('?') || !currentQuestion || currentQuestion.options.length >= 2);
            if (isQLine) {
                if (currentQuestion?.questionText && currentQuestion.options.length > 0) parsedQuestions.push(currentQuestion);
                const cleanedQText = line.replace(/^(\d+[.\-\)]\s*|savol\s*\d*[.:\-]\s*)/i, '').trim();
                currentQuestion = { questionText: cleanedQText || line, options: [], correctIndex: 0 };
            } else if (currentQuestion) {
                let isCorrect = false, optText = line;
                if (optText.endsWith('*')) { isCorrect = true; optText = optText.slice(0, -1); }
                else if (optText.startsWith('*')) { isCorrect = true; optText = optText.slice(1); }
                optText = optText.replace(/^([a-hA-H][.\)]\s*|[-\*•]\s*)/i, '').trim();
                if (optText.endsWith('*')) { isCorrect = true; optText = optText.slice(0, -1).trim(); }
                if (optText) { if (isCorrect) currentQuestion.correctIndex = currentQuestion.options.length; currentQuestion.options.push(optText); }
            }
        });
        if (currentQuestion?.questionText && currentQuestion.options.length > 0) parsedQuestions.push(currentQuestion);
        if (parsedQuestions.length === 0) return res.status(400).json({ message: "Fayldan savollar topilmadi. Savollar raqamlangan bo'lishi kerak." });
        const fileName = req.file.originalname.replace(/\.[^/.]+$/, "") || "Docx Test";
        res.json({ suggestedTitle: fileName, questions: parsedQuestions });
    } catch (error) { console.error("Parse docx error:", error); res.status(500).json({ message: ".DOCX faylini o'qishda xatolik" }); }
});

// ── Create Quiz ───────────────────────────────────────────────────────────────
router.post('/courses/:courseId/question-maker', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const { title, authorName, timeLimit, questions } = req.body;
        if (!title || !questions || !Array.isArray(questions) || questions.length === 0) return res.status(400).json({ message: "Kamida bitta savol va sarlavha kiritilishi shart!" });
        const processedQuestions = questions.map(q => {
            let correctIdx = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
            const cleanedOptions = (q.options || []).map((opt, idx) => {
                let str = String(opt || '').trim();
                if (str.endsWith('*')) { correctIdx = idx; str = str.slice(0, -1).trim(); }
                else if (str.startsWith('*')) { correctIdx = idx; str = str.slice(1).trim(); }
                return str;
            });
            return { questionText: q.questionText || q.question || 'Savol matni', options: cleanedOptions, correctIndex: correctIdx };
        });
        const newQuiz = new QuestionMaker({
            courseId: req.params.courseId,
            title: title.trim(),
            authorName: authorName || req.user.username || "O'qituvchi",
            timeLimit: Number(timeLimit) || 15,
            questions: processedQuestions
        });
        await newQuiz.save();
        res.status(201).json(newQuiz);
    } catch (error) { console.error("Create QuestionMaker error:", error); res.status(500).json({ message: "Savol to'plamini saqlashda xatolik" }); }
});

// ── Delete Quiz ───────────────────────────────────────────────────────────────
router.delete('/question-maker/:id', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        await QuestionMaker.findByIdAndDelete(req.params.id);
        await QuestionResult.deleteMany({ quizId: req.params.id });
        res.json({ message: "Test o'chirildi" });
    } catch (error) { res.status(500).json({ message: "Testni o'chirishda xatolik" }); }
});

// ── Submit Quiz Attempt ───────────────────────────────────────────────────────
router.post('/question-maker/:id/submit', authMiddleware, async (req, res) => {
    try {
        const { answers, timeSpentSeconds } = req.body;
        const quiz = await QuestionMaker.findById(req.params.id);
        if (!quiz) return res.status(404).json({ message: "Test topilmadi" });
        const user = await User.findById(req.user.userId);
        let correctCount = 0;
        quiz.questions.forEach((q, idx) => { if (answers && answers[idx] !== undefined && Number(answers[idx]) === q.correctIndex) correctCount++; });
        const scorePercentage = quiz.questions.length > 0 ? Math.round((correctCount / quiz.questions.length) * 100) : 0;
        const result = await QuestionResult.findOneAndUpdate(
            { quizId: quiz._id, studentId: req.user.userId },
            {
                quizId: quiz._id,
                courseId: quiz.courseId,
                studentId: req.user.userId,
                studentName: user?.username || "O'quvchi",
                studentEmail: user?.email || '',
                answers: answers || [],
                scorePercentage,
                correctCount,
                totalQuestions: quiz.questions.length,
                timeSpentSeconds: Number(timeSpentSeconds) || 0,
                submittedAt: new Date()
            },
            { upsert: true, new: true }
        );
        res.json({ message: "Test topshirildi", result });
    } catch (error) { res.status(500).json({ message: "Test natijasini saqlashda xatolik" }); }
});

// ── Get Quiz Results ──────────────────────────────────────────────────────────
router.get('/question-maker/:id/results', authMiddleware, async (req, res) => {
    try { res.json(await QuestionResult.find({ quizId: req.params.id }).sort({ scorePercentage: -1, submittedAt: 1 })); }
    catch (error) { res.status(500).json({ message: "Natijalarni olishda xatolik" }); }
});

module.exports = router;
