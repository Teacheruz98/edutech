const express = require('express');
const router = express.Router();
const CambridgeLessonPlan = require('../models/CambridgeLessonPlan');
const { authMiddleware, teacherOrAdmin } = require('../middleware/auth');

// All routes are strictly protected: Teachers and Admins only (Students get 403)
router.use(authMiddleware, teacherOrAdmin);

// ==========================================
// 1. GET /api/cambridge/lesson-plans
// List lesson plans with search, subject & stage filtering
// ==========================================
router.get('/', async (req, res) => {
    try {
        const role = (req.user.role || '').toLowerCase();
        const userId = req.user.userId || req.user._id;
        const { search, subject, stage, status } = req.query;

        const filter = {};

        // Role-based visibility: Teachers view their own; Admins & Management view all
        if (role === 'teacher') {
            filter.teacherId = userId;
        }

        if (subject && subject !== 'ALL') {
            filter.subject = new RegExp(subject.trim(), 'i');
        }

        if (stage && stage !== 'ALL') {
            filter.stage = stage.trim();
        }

        if (status && status !== 'ALL') {
            filter.status = status.toUpperCase();
        }

        if (search && search.trim()) {
            const queryRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { lessonTitle: queryRegex },
                { unitTitle: queryRegex },
                { subject: queryRegex },
                { curriculumCode: queryRegex },
                { keyVocabulary: queryRegex }
            ];
        }

        const plans = await CambridgeLessonPlan.find(filter)
            .populate('teacherId', 'username email')
            .sort({ createdAt: -1 });

        res.json({
            count: plans.length,
            plans
        });
    } catch (err) {
        console.error("Fetch Cambridge lesson plans error:", err);
        res.status(500).json({ message: "Dars rejalarini yuklashda xatolik yuz berdi: " + err.message });
    }
});

// ==========================================
// 2. POST /api/cambridge/lesson-plans
// Create a new Cambridge lesson plan
// ==========================================
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const {
            subject,
            stage,
            curriculumCode,
            unitTitle,
            lessonTitle,
            durationMinutes,
            learningObjectives,
            successCriteria,
            keyVocabulary,
            lessonPhases,
            differentiation,
            resourcesNeeded,
            reflection,
            status
        } = req.body;

        if (!subject || !unitTitle || !lessonTitle) {
            return res.status(400).json({ message: "Fan, Bo'lim (Unit) va Dars mavzusi kiritilishi shart." });
        }

        const newPlan = new CambridgeLessonPlan({
            teacherId: userId,
            subject: subject.trim(),
            stage: stage || 'Cambridge IGCSE',
            curriculumCode: curriculumCode ? curriculumCode.trim() : '',
            unitTitle: unitTitle.trim(),
            lessonTitle: lessonTitle.trim(),
            durationMinutes: Number(durationMinutes) || 45,
            learningObjectives: Array.isArray(learningObjectives) ? learningObjectives.filter(Boolean) : [],
            successCriteria: Array.isArray(successCriteria) ? successCriteria.filter(Boolean) : [],
            keyVocabulary: Array.isArray(keyVocabulary) ? keyVocabulary.filter(Boolean) : [],
            lessonPhases: lessonPhases || {
                starter: { durationMinutes: 10, teacherActivity: '', studentActivity: '', formativeCheck: '' },
                main: { durationMinutes: 25, teacherActivity: '', studentActivity: '', formativeCheck: '' },
                plenary: { durationMinutes: 10, teacherActivity: '', studentActivity: '', formativeCheck: '' }
            },
            differentiation: differentiation || { support: '', extension: '', guidedGroup: '' },
            resourcesNeeded: Array.isArray(resourcesNeeded) ? resourcesNeeded.filter(Boolean) : [],
            reflection: reflection || '',
            status: status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED'
        });

        await newPlan.save();
        await newPlan.populate('teacherId', 'username email');

        res.status(201).json({
            message: "Cambridge dars rejasi muvaffaqiyatli saqlandi.",
            plan: newPlan
        });
    } catch (err) {
        console.error("Create Cambridge lesson plan error:", err);
        res.status(500).json({ message: "Dars rejasini yaratishda xatolik: " + err.message });
    }
});

// ==========================================
// 3. GET /api/cambridge/lesson-plans/:id
// Get detailed view of single lesson plan
// ==========================================
router.get('/:id', async (req, res) => {
    try {
        const plan = await CambridgeLessonPlan.findById(req.params.id).populate('teacherId', 'username email');
        if (!plan) {
            return res.status(404).json({ message: "Dars rejasi topilmadi." });
        }

        const role = (req.user.role || '').toLowerCase();
        const userId = req.user.userId || req.user._id;

        // Teacher can only view their own plan; Admin can view all
        if (role === 'teacher' && plan.teacherId._id.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Siz faqat o'zingiz yaratgan dars rejalarini ko'ra olasiz." });
        }

        res.json({ plan });
    } catch (err) {
        console.error("Get lesson plan detail error:", err);
        res.status(500).json({ message: "Dars rejasini yuklashda xatolik." });
    }
});

// ==========================================
// 4. PUT /api/cambridge/lesson-plans/:id
// Update an existing lesson plan
// ==========================================
router.put('/:id', async (req, res) => {
    try {
        const plan = await CambridgeLessonPlan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: "Yangilanayotgan dars rejasi topilmadi." });
        }

        const role = (req.user.role || '').toLowerCase();
        const userId = req.user.userId || req.user._id;

        if (role === 'teacher' && plan.teacherId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Faqat o'zingiz yaratgan dars rejasini tahrirlashingiz mumkin." });
        }

        const allowedFields = [
            'subject', 'stage', 'curriculumCode', 'unitTitle', 'lessonTitle',
            'durationMinutes', 'learningObjectives', 'successCriteria', 'keyVocabulary',
            'lessonPhases', 'differentiation', 'resourcesNeeded', 'reflection', 'status'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                plan[field] = req.body[field];
            }
        });

        await plan.save();
        await plan.populate('teacherId', 'username email');

        res.json({
            message: "Cambridge dars rejasi muvaffaqiyatli yangilandi.",
            plan
        });
    } catch (err) {
        console.error("Update lesson plan error:", err);
        res.status(500).json({ message: "Dars rejasini yangilashda xatolik: " + err.message });
    }
});

// ==========================================
// 5. DELETE /api/cambridge/lesson-plans/:id
// Delete a lesson plan
// ==========================================
router.delete('/:id', async (req, res) => {
    try {
        const plan = await CambridgeLessonPlan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: "O'chirilayotgan dars rejasi topilmadi." });
        }

        const role = (req.user.role || '').toLowerCase();
        const userId = req.user.userId || req.user._id;

        if (role === 'teacher' && plan.teacherId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Faqat o'zingiz yaratgan dars rejasini o'chira olasiz." });
        }

        await CambridgeLessonPlan.findByIdAndDelete(req.params.id);

        res.json({ message: "Dars rejasi muvaffaqiyatli o'chirildi.", id: req.params.id });
    } catch (err) {
        console.error("Delete lesson plan error:", err);
        res.status(500).json({ message: "Dars rejasini o'chirishda xatolik." });
    }
});

// ==========================================
// 6. POST /api/cambridge/lesson-plans/:id/ai-suggest or /ai-suggest
// Auto-generate Cambridge pedagogical recommendations
// ==========================================
router.post(['/:id/ai-suggest', '/ai-suggest'], async (req, res) => {
    try {
        let subject = req.body.subject || '';
        let stage = req.body.stage || 'Cambridge IGCSE';
        let lessonTitle = req.body.lessonTitle || '';
        let objectives = req.body.learningObjectives || [];

        // If called with an existing plan ID
        if (req.params.id && req.params.id !== 'ai-suggest') {
            const plan = await CambridgeLessonPlan.findById(req.params.id);
            if (plan) {
                subject = plan.subject;
                stage = plan.stage;
                lessonTitle = plan.lessonTitle;
                objectives = plan.learningObjectives;
            }
        }

        // Generate tailored Cambridge pedagogy recommendations
        const suggestions = {
            starterHook: `Interactive Think-Pair-Share on "${lessonTitle}": Present a real-world scenario or diagnostic misconception problem. Ask students 2 quick retrieval questions to activate prior Cambridge ${stage} foundations.`,
            formativeCheckpoints: [
                "Mini-whiteboard check after explaining core definitions to gauge baseline confidence.",
                "Peer assessment of student work using Cambridge mark scheme command words (Explain, Calculate, Justify).",
                "Traffic light self-assessment before transitioning to independent challenge tasks."
            ],
            differentiationSupport: `Scaffolding: Provide structured step-by-step formula templates, visual vocabulary mats, and worked examples. Group struggling students for targeted teacher-led guided coaching.`,
            differentiationExtension: `Higher-Order Challenge: Task advanced learners with designing their own exam-style question with a detailed mark scheme, or applying concepts to an unfamiliar Cambridge Paper 2 scenario.`,
            plenaryQuestions: [
                `What is the most crucial concept we discovered about ${lessonTitle} today?`,
                "How would you explain today's key formula/rule to a student who missed class?",
                "Complete the Exit Ticket: 1 key learning point, 1 question you still have."
            ]
        };

        res.json({
            message: "Cambridge AI pedagogik tavsiyalar muvaffaqiyatli tayyorlandi.",
            suggestions
        });
    } catch (err) {
        console.error("AI suggest error:", err);
        res.status(500).json({ message: "AI tavsiyalarini tayyorlashda xatolik: " + err.message });
    }
});

module.exports = router;
