const mongoose = require('mongoose');

const AssessmentDeadlineSchema = new mongoose.Schema({
    title: { type: String, required: true },       // e.g. "BSB-2 Amaliy topshiriq"
    classGroup: { type: String, required: true },  // e.g. "9-Green"
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    semester: { type: String, default: 'Semester 2' },
    deadlineDate: { type: Date, required: true },
    urgency: { type: String, default: 'high' },    // high, medium, done
    description: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AssessmentDeadline', AssessmentDeadlineSchema);
