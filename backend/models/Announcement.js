const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['announcement', 'birthday', 'event', 'news'], default: 'announcement' },
    isAI: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    expiresAt: { type: Date }
});

module.exports = mongoose.model('Announcement', announcementSchema);
