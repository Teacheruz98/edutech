const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coverImage: { type: String, default: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80' },
    specificGrade: { type: Number, default: 5 },
    classSection: { type: String, default: 'Blue' },
    classGroup: { type: String, default: '5-Blue' },
    gradeLevel: { type: String, default: '5-7' },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    coTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isInitialized: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', CourseSchema);
