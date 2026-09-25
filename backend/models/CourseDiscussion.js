const mongoose = require('mongoose');

const CourseDiscussionSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    // 'general' = whole course group chat
    // 'individual' = 1-on-1 private chat between teacher and student
    type: {
        type: String,
        enum: ['general', 'individual'],
        default: 'general',
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Used for 'individual' messages: target recipient
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // For 'individual' messages: tracks which student this 1-on-1 thread belongs to
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    pinnedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    pinnedAt: {
        type: Date,
        default: null
    },
    reactions: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String, default: '👍' }
    }],
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

module.exports = mongoose.model('CourseDiscussion', CourseDiscussionSchema);
