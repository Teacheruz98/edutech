const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
    name: { type: String },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    url: { type: String }, // For file/link
    fileUrl: { type: String },
    content: { type: String }, // For HTML code
    type: { type: String, default: 'link' },
    fileType: { type: String, default: 'link' },
    targetGrade: { type: String, default: 'All' }, // 'All', '5-sinf', '6-sinf', etc.
    subject: { type: String, default: 'General' },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
    subTopicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
    tab: { type: String, enum: ['HOME', 'TASKS', 'QUIZZES', 'VIDEOS', 'PODCAST', 'EXTENDED', 'INFO'], default: 'HOME' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Material', MaterialSchema);