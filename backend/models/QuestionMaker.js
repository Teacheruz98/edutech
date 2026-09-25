const mongoose = require('mongoose');

const SingleQuestionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true, default: 0 }
});

const QuestionMakerSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    authorName: { type: String, required: true },
    timeLimit: { type: Number, default: 15 }, // in minutes
    questions: [SingleQuestionSchema],
    createdAt: { type: Date, default: Date.now }
});

const QuestionResultSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionMaker', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String },
    answers: [{ type: Number }], // chosen option index per question
    scorePercentage: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    timeSpentSeconds: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now }
});

const QuestionMaker = mongoose.model('QuestionMaker', QuestionMakerSchema);
const QuestionResult = mongoose.model('QuestionResult', QuestionResultSchema);

module.exports = { QuestionMaker, QuestionResult };
