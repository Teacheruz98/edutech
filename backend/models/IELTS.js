const mongoose = require('mongoose');

// 1. IELTS Test Model (Mock Tests & Practice Tests)
const ieltsSectionSchema = new mongoose.Schema({
    sectionNumber: { type: Number, default: 1 },
    title: { type: String, default: '' },
    instructions: { type: String, default: '' },
    passageReference: { type: String, default: '' },
    passageTitle: { type: String, default: '' },
    passageText: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'IELTSQuestion' }]
}, { _id: true });

const ieltsTestSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    code: { type: String, trim: true }, // e.g., 'CAM-18-TEST-1'
    testType: { 
        type: String, 
        enum: ['FULL_MOCK', 'SKILL_PRACTICE'], 
        default: 'FULL_MOCK',
        uppercase: true
    },
    type: { 
        type: String, 
        enum: ['mock', 'practice'], 
        default: 'mock' 
    },
    skillType: { 
        type: String, 
        enum: ['ALL', 'LISTENING', 'READING', 'WRITING', 'SPEAKING'], 
        default: 'ALL',
        uppercase: true
    },
    skill: { 
        type: String, 
        enum: ['full', 'listening', 'reading', 'writing', 'speaking'], 
        default: 'full',
        lowercase: true
    },
    difficulty: { 
        type: String, 
        enum: ['BEGINNER', 'MEDIUM', 'ADVANCED', 'EXAM_LEVEL'], 
        default: 'EXAM_LEVEL',
        uppercase: true 
    },
    durationMinutes: { type: Number, default: 160 },
    totalQuestions: { type: Number, default: 0 },
    sections: [ieltsSectionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

ieltsTestSchema.pre('save', function() {
    // Synchronize testType and legacy type
    if (this.testType === 'FULL_MOCK') {
        this.type = 'mock';
    } else if (this.testType === 'SKILL_PRACTICE') {
        this.type = 'practice';
    } else if (this.type === 'mock') {
        this.testType = 'FULL_MOCK';
    } else if (this.type === 'practice') {
        this.testType = 'SKILL_PRACTICE';
    }

    // Synchronize skillType and legacy skill
    if (this.skillType) {
        this.skill = this.skillType === 'ALL' ? 'full' : this.skillType.toLowerCase();
    } else if (this.skill) {
        this.skillType = this.skill === 'full' ? 'ALL' : this.skill.toUpperCase();
    }

    // Compute totalQuestions from attached questions across all sections
    if (Array.isArray(this.sections)) {
        this.totalQuestions = this.sections.reduce((acc, sec) => acc + (Array.isArray(sec.questionIds) ? sec.questionIds.length : 0), 0);
    }

    this.updatedAt = new Date();
});

// 2. IELTS Question Model (Question Bank)
const ieltsQuestionSchema = new mongoose.Schema({
    skillType: { 
        type: String, 
        enum: ['LISTENING', 'READING', 'WRITING', 'SPEAKING'], 
        required: true,
        uppercase: true 
    },
    skill: { 
        type: String, 
        lowercase: true 
    },
    moduleType: { 
        type: String, 
        default: 'General' // e.g. 'Section 1', 'Passage 2', 'Task 1', 'Part 2'
    },
    sectionNumber: { type: Number, default: 1 }, // 1 to 4
    questionType: { 
        type: String, 
        required: true 
    },
    prompt: { type: String, required: true },
    passageReference: { type: String, default: '' }, // context, passage text excerpt, transcript, or cue card prompts
    passageText: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    options: [{ type: String }],
    correctAnswer: { type: mongoose.Schema.Types.Mixed }, // string, array of strings, or object
    explanation: { type: String, default: '' },
    difficulty: { 
        type: String, 
        enum: ['BEGINNER', 'MEDIUM', 'ADVANCED', 'EXAM_LEVEL'], 
        default: 'EXAM_LEVEL',
        uppercase: true 
    },
    tags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

ieltsQuestionSchema.pre('save', function() {
    if (this.skillType) {
        this.skill = this.skillType.toLowerCase();
    } else if (this.skill) {
        this.skillType = this.skill.toUpperCase();
    }
    this.updatedAt = new Date();
});

// 3. IELTS Assignment Model (Assigned by Teacher or Admin)
const ieltsAssignmentSchema = new mongoose.Schema({
    title: { type: String, default: '' },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'IELTSTest', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // backward-compatibility alias
    targetType: { 
        type: String, 
        enum: ['CLASS', 'GROUP', 'STUDENT', 'ALL', 'all_students', 'class', 'individual'], 
        default: 'ALL',
        uppercase: true
    },
    targetId: { type: mongoose.Schema.Types.ObjectId }, // Course / Group / Student
    targetClass: { type: String, default: '' },
    targetStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dueDate: { type: Date },
    deadline: { type: Date }, // backward-compatibility alias
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

// 4. IELTS Attempt Model (Student Test Taking Records)
const ieltsAttemptSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'IELTSTest', required: true },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'IELTSAssignment' },
    skillType: { 
        type: String, 
        enum: ['LISTENING', 'READING', 'WRITING', 'SPEAKING', 'FULL_MOCK'], 
        default: 'LISTENING',
        uppercase: true
    },
    skill: { 
        type: String, 
        enum: ['listening', 'reading', 'writing', 'speaking', 'full'], 
        default: 'listening',
        lowercase: true
    },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'IELTSQuestion' },
        questionNumber: Number,
        sectionNumber: Number,
        studentAnswer: mongoose.Schema.Types.Mixed,
        userAnswer: mongoose.Schema.Types.Mixed,
        isCorrect: { type: Boolean, default: null },
        scoreGiven: Number
    }],
    writingSubmissions: [{
        taskNumber: Number,
        promptText: String,
        content: String,
        wordCount: { type: Number, default: 0 },
        submittedAt: Date
    }],
    task1Answer: { type: String, default: '' },
    task1WordCount: { type: Number, default: 0 },
    task2Answer: { type: String, default: '' },
    task2WordCount: { type: Number, default: 0 },
    speakingSubmissions: [{
        partNumber: Number,
        promptText: String,
        audioUrl: String,
        durationSeconds: Number,
        submittedAt: Date
    }],
    part1AudioUrl: { type: String, default: '' },
    part2AudioUrl: { type: String, default: '' },
    part3AudioUrl: { type: String, default: '' },
    rawScore: { type: Number, default: 0 },
    bandScore: { type: Number, default: null }, // e.g. 6.5, 7.0
    overallBand: { type: Number, default: null },
    listeningBand: { type: Number, default: null },
    readingBand: { type: Number, default: null },
    writingBand: { type: Number, default: null },
    speakingBand: { type: Number, default: null },
    isFullMock: { type: Boolean, default: false },
    overallCefrLevel: { type: String, default: '' },
    sectionBands: {
        listening: { type: Number, default: null },
        reading: { type: Number, default: null },
        writing: { type: Number, default: null },
        speaking: { type: Number, default: null }
    },
    durationSpent: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
    teacherFeedback: { type: String, default: '' },
    evaluationReference: { type: mongoose.Schema.Types.ObjectId, ref: 'IELTSEvaluation' },
    aiFeedback: {
        criteriaScores: {
            taskAchievement: { type: Number, min: 0, max: 9 },
            coherenceCohesion: { type: Number, min: 0, max: 9 },
            lexicalResource: { type: Number, min: 0, max: 9 },
            grammaticalRange: { type: Number, min: 0, max: 9 },
            fluencyCoherence: { type: Number, min: 0, max: 9 },
            pronunciation: { type: Number, min: 0, max: 9 }
        },
        overallBand: { type: Number, min: 0, max: 9 },
        strengths: [{ type: String }],
        weaknesses: [{ type: String }],
        areasForImprovement: [{ type: String }],
        detailedComments: { type: String, default: '' },
        skill: { type: String, enum: ['writing', 'speaking', 'full'] },
        generatedAt: { type: Date, default: Date.now }
    },
    // Exam Security & Session Tracking (Phase 14)
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
        enum: [
            'IN_PROGRESS', 'COMPLETED', 'SUBMITTED', 'PENDING_EVALUATION', 'EVALUATED', 
            'in_progress', 'completed', 'submitted', 'pending_evaluation', 'evaluated'
        ], 
        default: 'IN_PROGRESS' 
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

ieltsAttemptSchema.pre('save', function() {
    // Synchronize skillType and skill
    if (this.skillType) {
        this.skill = this.skillType === 'FULL_MOCK' ? 'full' : this.skillType.toLowerCase();
    } else if (this.skill) {
        this.skillType = this.skill === 'full' ? 'FULL_MOCK' : this.skill.toUpperCase();
    }

    // Synchronize timestamps
    if (this.startTime && !this.startedAt) this.startedAt = this.startTime;
    if (this.startedAt && !this.startTime) this.startTime = this.startedAt;
    if (this.endTime && !this.completedAt) this.completedAt = this.endTime;
    if (this.completedAt && !this.endTime) this.endTime = this.completedAt;

    // Synchronize duration
    if (this.durationSpent && !this.timeSpentSeconds) this.timeSpentSeconds = this.durationSpent;
    if (this.timeSpentSeconds && !this.durationSpent) this.durationSpent = this.timeSpentSeconds;

    // Synchronize answers
    if (Array.isArray(this.answers)) {
        this.answers.forEach(a => {
            if (a.studentAnswer !== undefined && a.userAnswer === undefined) a.userAnswer = a.studentAnswer;
            if (a.userAnswer !== undefined && a.studentAnswer === undefined) a.studentAnswer = a.userAnswer;
        });
    }

    // Synchronize task1 / task2 answers with writingSubmissions
    if (this.task1Answer || this.task2Answer) {
        if (!Array.isArray(this.writingSubmissions)) this.writingSubmissions = [];
        if (this.task1Answer) {
            let t1 = this.writingSubmissions.find(w => w.taskNumber === 1);
            if (!t1) {
                t1 = { taskNumber: 1 };
                this.writingSubmissions.push(t1);
            }
            t1.content = this.task1Answer;
            t1.wordCount = this.task1WordCount || this.task1Answer.trim().split(/\s+/).filter(Boolean).length;
        }
        if (this.task2Answer) {
            let t2 = this.writingSubmissions.find(w => w.taskNumber === 2);
            if (!t2) {
                t2 = { taskNumber: 2 };
                this.writingSubmissions.push(t2);
            }
            t2.content = this.task2Answer;
            t2.wordCount = this.task2WordCount || this.task2Answer.trim().split(/\s+/).filter(Boolean).length;
        }
    }

    // Synchronize section bands with top-level skill fields
    if (this.sectionBands) {
        if (this.sectionBands.listening !== undefined && this.sectionBands.listening !== null) this.listeningBand = this.sectionBands.listening;
        if (this.sectionBands.reading !== undefined && this.sectionBands.reading !== null) this.readingBand = this.sectionBands.reading;
        if (this.sectionBands.writing !== undefined && this.sectionBands.writing !== null) this.writingBand = this.sectionBands.writing;
        if (this.sectionBands.speaking !== undefined && this.sectionBands.speaking !== null) this.speakingBand = this.sectionBands.speaking;
    } else {
        this.sectionBands = {};
    }

    if (this.listeningBand !== null && this.listeningBand !== undefined) this.sectionBands.listening = this.listeningBand;
    if (this.readingBand !== null && this.readingBand !== undefined) this.sectionBands.reading = this.readingBand;
    if (this.writingBand !== null && this.writingBand !== undefined) this.sectionBands.writing = this.writingBand;
    if (this.speakingBand !== null && this.speakingBand !== undefined) this.sectionBands.speaking = this.speakingBand;

    // Check if full mock (or multi-skill attempt)
    const activeSkills = [this.listeningBand, this.readingBand, this.writingBand, this.speakingBand].filter(s => s !== null && s !== undefined && !isNaN(s));
    if (this.skillType === 'FULL_MOCK' || this.skill === 'full' || activeSkills.length === 4) {
        this.isFullMock = true;
        if (activeSkills.length > 0) {
            const mean = activeSkills.reduce((a, b) => a + b, 0) / activeSkills.length;
            const overall = Math.min(9.0, Math.max(0, Math.round(mean * 2) / 2));
            this.overallBand = overall;
            this.bandScore = overall;
        }
    } else if (this.bandScore !== null && this.bandScore !== undefined && this.overallBand === null) {
        this.overallBand = this.bandScore;
    } else if (this.overallBand !== null && this.overallBand !== undefined && this.bandScore === null) {
        this.bandScore = this.overallBand;
    }

    // Set CEFR Level
    const targetBand = this.overallBand ?? this.bandScore;
    if (targetBand !== null && targetBand !== undefined) {
        if (targetBand >= 8.5) this.overallCefrLevel = 'C2';
        else if (targetBand >= 7.0) this.overallCefrLevel = 'C1';
        else if (targetBand >= 5.5) this.overallCefrLevel = 'B2';
        else if (targetBand >= 4.0) this.overallCefrLevel = 'B1';
        else if (targetBand >= 3.0) this.overallCefrLevel = 'A2';
        else this.overallCefrLevel = 'A1';
    }

    this.updatedAt = new Date();
});

// 5. IELTS Evaluation Model (Teacher/Admin Writing & Speaking Grading)
const ieltsEvaluationSchema = new mongoose.Schema({
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'IELTSAttempt', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    skill: { type: String, enum: ['writing', 'speaking'], required: true },
    criteriaScores: {
        taskAchievement: { type: Number, min: 0, max: 9, default: 0 },
        coherenceCohesion: { type: Number, min: 0, max: 9, default: 0 },
        lexicalResource: { type: Number, min: 0, max: 9, default: 0 },
        grammaticalRange: { type: Number, min: 0, max: 9, default: 0 },
        fluencyCoherence: { type: Number, min: 0, max: 9, default: 0 },
        pronunciation: { type: Number, min: 0, max: 9, default: 0 },
        c1: { type: Number, min: 0, max: 9 },
        c2: { type: Number, min: 0, max: 9 },
        c3: { type: Number, min: 0, max: 9 },
        c4: { type: Number, min: 0, max: 9 }
    },
    overallBand: { type: Number, min: 0, max: 9, required: true },
    qualitativeFeedback: { type: String, default: '' },
    feedbackText: { type: String, default: '' },
    annotatedCorrections: { type: String, default: '' },
    aiFeedback: {
        criteriaScores: {
            taskAchievement: Number,
            coherenceCohesion: Number,
            lexicalResource: Number,
            grammaticalRange: Number,
            fluencyCoherence: Number,
            pronunciation: Number
        },
        overallBand: Number,
        strengths: [String],
        weaknesses: [String],
        areasForImprovement: [String],
        detailedComments: String,
        generatedAt: { type: Date, default: Date.now }
    },
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    evaluatedAt: { type: Date, default: Date.now }
});

// 6. IELTS Mistake Model (Student Error Notebook & Diagnostic Review)
const ieltsMistakeSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'IELTSTest', required: true },
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'IELTSAttempt', required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'IELTSQuestion' },
    skillType: { 
        type: String, 
        enum: ['LISTENING', 'READING', 'WRITING', 'SPEAKING'], 
        required: true, 
        uppercase: true 
    },
    questionPrompt: { type: String, default: '' },
    questionType: { type: String, default: '' },
    studentAnswer: { type: String, default: '' },
    correctAnswer: { type: String, default: '' },
    explanation: { type: String, default: '' },
    isReviewed: { type: Boolean, default: false },
    reviewedAt: { type: Date }
}, { timestamps: true });

// 7. IELTS Media Model (Audio tracks, diagrams, passage attachments)
const ieltsMediaSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    mediaType: { type: String, enum: ['audio', 'image', 'document', 'other'], default: 'audio' },
    category: { type: String, enum: ['listening', 'reading', 'writing', 'speaking', 'general'], default: 'general' },
    description: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

// ==========================================
// MONGODB INDEXES FOR HIGH-CONCURRENCY EXAMS (PHASE 15)
// ==========================================

// 1. Tests indexing
ieltsTestSchema.index({ isActive: 1, isPublished: 1 });
ieltsTestSchema.index({ skillType: 1, testType: 1 });
ieltsTestSchema.index({ createdBy: 1 });

// 2. Question Bank indexing
ieltsQuestionSchema.index({ skillType: 1, difficulty: 1 });
ieltsQuestionSchema.index({ questionType: 1 });
ieltsQuestionSchema.index({ createdBy: 1 });

// 3. Assignments indexing
ieltsAssignmentSchema.index({ teacherId: 1, status: 1 });
ieltsAssignmentSchema.index({ targetType: 1, targetClassId: 1 });
ieltsAssignmentSchema.index({ testId: 1 });

// 4. Attempts indexing (High-frequency active exam monitoring)
ieltsAttemptSchema.index({ studentId: 1, testId: 1, status: 1 });
ieltsAttemptSchema.index({ assignmentId: 1 });
ieltsAttemptSchema.index({ status: 1, skillType: 1 });
ieltsAttemptSchema.index({ createdAt: -1 });
ieltsAttemptSchema.index({ lastHeartbeat: -1 });

// 5. Evaluations indexing
ieltsEvaluationSchema.index({ teacherId: 1, status: 1 });
ieltsEvaluationSchema.index({ studentId: 1 });
ieltsEvaluationSchema.index({ attemptId: 1 });

// 6. Mistake Notebook indexing
ieltsMistakeSchema.index({ studentId: 1, skillType: 1, isReviewed: 1 });
ieltsMistakeSchema.index({ attemptId: 1 });
ieltsMistakeSchema.index({ testId: 1 });

// 7. Media Library indexing
ieltsMediaSchema.index({ category: 1, mediaType: 1 });
ieltsMediaSchema.index({ uploadedBy: 1 });

module.exports = {
    IELTSTest: mongoose.model('IELTSTest', ieltsTestSchema),
    IELTSQuestion: mongoose.model('IELTSQuestion', ieltsQuestionSchema),
    IELTSAssignment: mongoose.model('IELTSAssignment', ieltsAssignmentSchema),
    IELTSAttempt: mongoose.model('IELTSAttempt', ieltsAttemptSchema),
    IELTSEvaluation: mongoose.model('IELTSEvaluation', ieltsEvaluationSchema),
    IELTSMistake: mongoose.model('IELTSMistake', ieltsMistakeSchema),
    IELTSMedia: mongoose.model('IELTSMedia', ieltsMediaSchema)
};

