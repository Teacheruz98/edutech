const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    fullName: { type: String, default: '' },
    avatar: { type: String, default: '👑' },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher', 'student', 'observer', 'management'], default: 'student' },
    grade: { type: String, default: '5-sinf' },
    isOwner: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    isEnglishTeacher: { type: Boolean, default: false },
    isMathTeacher: { type: Boolean, default: false },
    activityLog: [{
        action: String,
        timestamp: { type: Date, default: Date.now },
        metadata: Object
    }]
});

// BU QATOR JUDA MUHIM:
module.exports = mongoose.model('User', userSchema);