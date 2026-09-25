const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    semester: { type: String, enum: ['Semester 1', 'Semester 2'], default: 'Semester 1' },
    academicYear: { type: String, default: '2025-2026' },
    assessmentName: { type: String, required: true }, // e.g., 'Summative 1', 'Summative 2', 'Summative 3', 'End of Semester'
    category: { type: String, enum: ['summative', 'end_of_semester'], default: 'summative' },
    score: { type: Number, required: true, min: 0, max: 100 }, // Percentage (0 - 100%)
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

gradeSchema.index({ studentId: 1, courseId: 1, semester: 1, assessmentName: 1 }, { unique: true });

module.exports = mongoose.model('Grade', gradeSchema);