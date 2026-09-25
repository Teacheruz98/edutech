const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    classGroup: { type: String, required: true }, // e.g. "9-Green", "11-Blue"
    subject: { type: String, required: true },    // e.g. "Computer Science"
    dayOfWeek: { type: String, default: 'Dushanba' }, // e.g. Dushanba, Seshanba, etc.
    timeSlot: { type: String, required: true },   // e.g. "09:00 - 09:45"
    room: { type: String, default: 'Lab 204' },
    topic: { type: String, default: 'Dars mavzusi' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Schedule', ScheduleSchema);
