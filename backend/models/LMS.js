const mongoose = require('mongoose');

// Page Model (Content Delivery)
const PageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String }, // HTML Content
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
    subTopicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
    createdAt: { type: Date, default: Date.now }
});

// Assignment Model
const AssignmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
    subTopicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
    dueDate: { type: Date },
    points: { type: Number, default: 100 },
    attachmentType: { type: String, enum: ['none', 'pdf', 'link'], default: 'none' },
    fileUrl: { type: String },
    fileName: { type: String },
    url: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rubric: [{
        criterion: String,
        points: Number,
        description: String
    }],
    tab: { type: String, enum: ['TASKS', 'EXTENDED'], default: 'TASKS' },
    createdAt: { type: Date, default: Date.now }
});

// Submission Model (Student Work)
const SubmissionSchema = new mongoose.Schema({
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String }, // Optional text submission
    linkUrl: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    files: [{
        name: String,
        url: String
    }],
    grade: { type: Number },
    feedback: { type: String },
    status: { type: String, enum: ['submitted', 'graded', 'pending'], default: 'submitted' },
    submittedAt: { type: Date, default: Date.now }
});

// Quiz Model
const QuizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
    subTopicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
    questions: [{
        question: String,
        options: [String],
        correctIndex: Number,
        type: { type: String, default: 'multiple-choice' }
    }],
    url: { type: String },
    tab: { type: String, enum: ['QUIZZES', 'INFO'], default: 'QUIZZES' },
    createdAt: { type: Date, default: Date.now }
});

// Discussion Model
const DiscussionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        date: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = {
    Assignment: mongoose.model('Assignment', AssignmentSchema),
    Page: mongoose.model('Page', PageSchema),
    Submission: mongoose.model('Submission', SubmissionSchema),
    Quiz: mongoose.model('Quiz', QuizSchema),
    Discussion: mongoose.model('Discussion', DiscussionSchema)
};
