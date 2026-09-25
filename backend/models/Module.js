const mongoose = require('mongoose');

const ModuleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
    releaseDate: { type: Date }, // Drip scheduling
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Module', ModuleSchema);
