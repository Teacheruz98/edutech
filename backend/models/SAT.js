const mongoose = require('mongoose');

// 1. Digital SAT Test Model (Full Adaptive Mocks & Section Practice)
const satModuleSchema = new mongoose.Schema({
    moduleNumber: { type: Number, default: 1 }, // 1 or 2
    section: { 
        type: String, 
        enum: ['READING_WRITING', 'MATH'], 
        required: true,
        uppercase: true 
    },
    difficultyTier: { 
        type: String, 
        enum: ['STANDARD', 'EASY', 'HARD'], 
        default: 'STANDARD',
        uppercase: true 
    },
    durationMinutes: { type: Number, default: 32 }, // RW: 32 min, Math: 35 min
    instructions: { type: String, default: '' },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SATQuestion' }]
}, { _id: true });

const satTestSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    code: { type: String, trim: true }, // e.g. 'SAT-PRACTICE-1'
    testType: { 
        type: String, 
        enum: ['FULL_MOCK', 'SECTION_PRACTICE'], 
        default: 'FULL_MOCK',
        uppercase: true 
    },
    section: { 
        type: String, 
        enum: ['ALL', 'READING_WRITING', 'MATH'], 
        default: 'ALL',
        uppercase: true 
    },
    difficulty: { 
        type: String, 
        enum: ['BEGINNER', 'MEDIUM', 'ADVANCED', 'EXAM_LEVEL'], 
        default: 'EXAM_LEVEL',
        uppercase: true 
    },
    durationMinutes: { type: Number, default: 134 }, // RW: 64 min (2x32), Math: 70 min (2x35) = 134 total
    totalQuestions: { type: Number, default: 98 }, // RW: 27+27=54, Math: 22+22=44 = 98 total
    modules: [satModuleSchema],
    adaptiveThresholds: {
        rwHardThreshold: { type: Number, default: 18 }, // Out of 27 in RW Module 1
        mathHardThreshold: { type: Number, default: 15 } // Out of 22 in Math Module 1
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

satTestSchema.pre('save', function() {
    if (Array.isArray(this.modules)) {
        this.totalQuestions = this.modules.reduce((acc, mod) => acc + (Array.isArray(mod.questionIds) ? mod.questionIds.length : 0), 0);
    }
    this.updatedAt = new Date();
});

// 2. Digital SAT Question Model (Question Bank)
const satQuestionSchema = new mongoose.Schema({
    section: { 
        type: String, 
        enum: ['READING_WRITING', 'MATH'], 
        required: true,
        uppercase: true 
    },
    domain: { 
        type: String, 
        required: true,
        trim: true
        // RW Domains: 'Craft and Structure', 'Information and Ideas', 'Standard English Conventions', 'Expression of Ideas'
        // Math Domains: 'Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry'
    },
    skill: { type: String, default: '', trim: true },
    questionType: { 
        type: String, 
        enum: ['multiple_choice', 'student_produced_response'], 
        default: 'multiple_choice' 
    },
    prompt: { type: String, required: true },
    stimulusText: { type: String, default: '' }, // Passage excerpt, context paragraph, or math scenario
    stimulusTitle: { type: String, default: '' },
    imageUrl: { type: String, default: '' }, // Diagrams, geometric figures, charts
    options: [{ type: String }], // Typically A, B, C, D for multiple_choice
    correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true }, // e.g. 'A' or '4.5' or '3/4'
    acceptableAnswers: [{ type: String }], // Alternative representations for grid-ins: ['0.75', '3/4', '.75']
    explanation: { type: String, default: '' },
    difficulty: { 
        type: String, 
        enum: ['BEGINNER', 'MEDIUM', 'ADVANCED', 'EXAM_LEVEL'], 
        default: 'EXAM_LEVEL',
        uppercase: true 
    },
    difficultyTier: {
        type: String,
        enum: ['STANDARD', 'EASY', 'HARD'],
        default: 'STANDARD',
        uppercase: true
    },
    tags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

satQuestionSchema.pre('save', function() {
    this.updatedAt = new Date();
});

// 3. Digital SAT Assignment Model
const satAssignmentSchema = new mongoose.Schema({
    title: { type: String, default: '' },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'SATTest', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { 
        type: String, 
        enum: ['CLASS', 'GROUP', 'STUDENT', 'ALL'], 
        default: 'ALL',
        uppercase: true 
    },
    targetClass: { type: String, default: '' },
    targetStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dueDate: { type: Date },
    instructions: { type: String, default: '' },
    status: {
        type: String,
        enum: ['ACTIVE', 'CLOSED', 'ARCHIVED'],
        default: 'ACTIVE',
        uppercase: true
    },
    allowLateSubmission: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// 4. Digital SAT Attempt Model (Real Student Exam Records & Multi-Stage Adaptive Routing)
const satAttemptSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'SATTest', required: true },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SATAssignment' },
    testType: { 
        type: String, 
        enum: ['FULL_MOCK', 'SECTION_PRACTICE'], 
        default: 'FULL_MOCK',
        uppercase: true 
    },
    sectionType: { 
        type: String, 
        enum: ['ALL', 'READING_WRITING', 'MATH'], 
        default: 'ALL',
        uppercase: true 
    },
    currentStage: {
        section: { type: String, enum: ['READING_WRITING', 'MATH'], default: 'READING_WRITING' },
        moduleNumber: { type: Number, default: 1 }
    },
    moduleRouting: {
        rwModule2Tier: { type: String, enum: ['HARD', 'EASY'], default: 'HARD' },
        rwModule1Raw: { type: Number, default: 0 },
        mathModule2Tier: { type: String, enum: ['HARD', 'EASY'], default: 'HARD' },
        mathModule1Raw: { type: Number, default: 0 }
    },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SATQuestion' },
        section: { type: String, enum: ['READING_WRITING', 'MATH'] },
        moduleNumber: { type: Number, default: 1 },
        questionNumber: Number,
        studentAnswer: mongoose.Schema.Types.Mixed,
        userAnswer: mongoose.Schema.Types.Mixed,
        isCorrect: { type: Boolean, default: null },
        scoreGiven: { type: Number, default: 0 },
        flaggedForReview: { type: Boolean, default: false },
        notes: { type: String, default: '' },
        timeSpentSeconds: { type: Number, default: 0 }
    }],
    rawScores: {
        readingWriting: { type: Number, default: 0 },
        math: { type: Number, default: 0 },
        rwModule1: { type: Number, default: 0 },
        rwModule2: { type: Number, default: 0 },
        mathModule1: { type: Number, default: 0 },
        mathModule2: { type: Number, default: 0 },
        totalRaw: { type: Number, default: 0 }
    },
    scaledScores: {
        readingWriting: { type: Number, default: null }, // 200 - 800
        math: { type: Number, default: null },           // 200 - 800
        total: { type: Number, default: null }           // 400 - 1600
    },
    percentile: { type: Number, default: null },
    domainScores: {
        craftAndStructure: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        informationAndIdeas: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        standardEnglishConventions: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        expressionOfIdeas: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        algebra: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        advancedMath: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        problemSolving: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        geometryTrig: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } }
    },
    durationSpent: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
    teacherFeedback: { type: String, default: '' },
    mathTeacherEvaluation: {
        evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        evaluatedAt: { type: Date },
        feedbackText: { type: String, default: '' },
        stepFeedback: [{
            questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SATQuestion' },
            feedback: { type: String, default: '' },
            partialScore: { type: Number, default: 0 }
        }]
    },
    aiFeedback: {
        overallSummary: { type: String, default: '' },
        mathDiagnostics: [{ type: String }],
        readingDiagnostics: [{ type: String }],
        strengths: [{ type: String }],
        weaknesses: [{ type: String }],
        recommendations: [{ type: String }],
        generatedAt: { type: Date, default: Date.now }
    },
    // Exam Security & Session Tracking
    tabSwitchCount: { type: Number, default: 0 },
    lastHeartbeat: { type: Date, default: Date.now },
    clientIp: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    isTerminatedByProctor: { type: Boolean, default: false },
    terminatedReason: { type: String, default: '' },
    terminatedAt: { type: Date },
    securityViolations: [{
        type: { 
            type: String, 
            enum: ['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY_PASTE', 'PROCTOR_TERMINATION', 'DEVTOOLS_OPEN', 'OTHER'], 
            default: 'TAB_SWITCH' 
        },
        timestamp: { type: Date, default: Date.now },
        details: { type: String, default: '' }
    }],
    status: { 
        type: String, 
        enum: ['IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'EVALUATED'], 
        default: 'IN_PROGRESS' 
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

satAttemptSchema.pre('save', function() {
    // Synchronize answers
    if (Array.isArray(this.answers)) {
        this.answers.forEach(a => {
            if (a.studentAnswer !== undefined && a.userAnswer === undefined) a.userAnswer = a.studentAnswer;
            if (a.userAnswer !== undefined && a.studentAnswer === undefined) a.studentAnswer = a.userAnswer;
        });
    }

    if (this.durationSpent && !this.timeSpentSeconds) this.timeSpentSeconds = this.durationSpent;
    if (this.timeSpentSeconds && !this.durationSpent) this.durationSpent = this.timeSpentSeconds;

    this.updatedAt = new Date();
});

// 5. Digital SAT Evaluation Model (Restricted to Math Teachers & Admins)
const satEvaluationSchema = new mongoose.Schema({
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'SATAttempt', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    qualitativeFeedback: { type: String, default: '' },
    mathWorkingAnalysis: { type: String, default: '' },
    strengths: [{ type: String }],
    areasForImprovement: [{ type: String }],
    questionNotes: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SATQuestion' },
        note: String,
        suggestedFormula: String
    }],
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    evaluatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// 6. Digital SAT Mistake Notebook Model (Student Intelligent Error Log & Mastery Tracker)
const satMistakeSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'SATTest', required: true },
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'SATAttempt', required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SATQuestion', required: true },
    section: { type: String, enum: ['READING_WRITING', 'MATH'], required: true },
    domain: { type: String, required: true },
    questionPrompt: { type: String, default: '' },
    questionType: { type: String, default: 'multiple_choice' },
    studentAnswer: { type: mongoose.Schema.Types.Mixed },
    correctAnswer: { type: mongoose.Schema.Types.Mixed },
    explanation: { type: String, default: '' },
    studentNotes: { type: String, default: '' },
    isMastered: { type: Boolean, default: false },
    masteredAt: { type: Date }
}, { timestamps: true });

// 7. Digital SAT Media Model (Diagrams, Charts, Formula Sheets, Graphics)
const satMediaSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'diagram', 'document', 'other'], default: 'image' },
    category: { type: String, enum: ['math', 'reading_writing', 'general'], default: 'general' },
    description: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

// ==========================================
// MONGODB INDEXES FOR HIGH-CONCURRENCY EXAMS (PHASE 15)
// ==========================================

// 1. Tests indexing
satTestSchema.index({ isActive: 1, isPublished: 1 });
satTestSchema.index({ testType: 1, section: 1 });
satTestSchema.index({ createdBy: 1 });

// 2. Question Bank indexing
satQuestionSchema.index({ section: 1, domain: 1, difficultyTier: 1 });
satQuestionSchema.index({ questionType: 1 });
satQuestionSchema.index({ createdBy: 1 });

// 3. Assignments indexing
satAssignmentSchema.index({ teacherId: 1, status: 1 });
satAssignmentSchema.index({ targetType: 1, targetClass: 1 });
satAssignmentSchema.index({ testId: 1 });

// 4. Attempts indexing (High-frequency active exam sessions & autosaves)
satAttemptSchema.index({ studentId: 1, testId: 1, status: 1 });
satAttemptSchema.index({ assignmentId: 1 });
satAttemptSchema.index({ status: 1, 'currentStage.section': 1 });
satAttemptSchema.index({ createdAt: -1 });
satAttemptSchema.index({ lastHeartbeat: -1 });

// 5. Evaluations indexing (Strict Math Teacher query queues)
satEvaluationSchema.index({ teacherId: 1, status: 1 });
satEvaluationSchema.index({ studentId: 1 });
satEvaluationSchema.index({ attemptId: 1 });

// 6. Mistake Notebook indexing
satMistakeSchema.index({ studentId: 1, section: 1, domain: 1, isMastered: 1 });
satMistakeSchema.index({ attemptId: 1 });
satMistakeSchema.index({ testId: 1 });

// 7. Media Library indexing
satMediaSchema.index({ category: 1, mediaType: 1 });
satMediaSchema.index({ uploadedBy: 1 });

module.exports = {
    SATTest: mongoose.model('SATTest', satTestSchema),
    SATQuestion: mongoose.model('SATQuestion', satQuestionSchema),
    SATAssignment: mongoose.model('SATAssignment', satAssignmentSchema),
    SATAttempt: mongoose.model('SATAttempt', satAttemptSchema),
    SATEvaluation: mongoose.model('SATEvaluation', satEvaluationSchema),
    SATMistake: mongoose.model('SATMistake', satMistakeSchema),
    SATMedia: mongoose.model('SATMedia', satMediaSchema)
};
