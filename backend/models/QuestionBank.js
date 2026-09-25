const mongoose = require('mongoose');

const QuestionBankSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [String],
    correctIndex: Number,
    type: { type: String, enum: ['multiple-choice', 'true-false', 'essay'], default: 'multiple-choice' },
    subject: String,
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuestionBank', QuestionBankSchema);
