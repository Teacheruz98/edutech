const mongoose = require('mongoose');

const gradeUnlockRequestSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    semester: { type: String, enum: ['Semester 1', 'Semester 2'], required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedUntil: { type: Date },
    durationHours: { type: Number, default: 24 }
}, { timestamps: true });

module.exports = mongoose.model('GradeUnlockRequest', gradeUnlockRequestSchema);
