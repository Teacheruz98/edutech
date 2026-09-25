const mongoose = require('mongoose');

const studentBirthdaySettingsSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        default: true
    },
    showWidget: {
        type: Boolean,
        default: true
    },
    showProfilePhotos: {
        type: Boolean,
        default: true
    },
    showAge: {
        type: Boolean,
        default: true
    },
    confettiEnabled: {
        type: Boolean,
        default: true
    },
    automaticMessage: {
        type: Boolean,
        default: true
    },
    leapYearPolicy: {
        type: String,
        enum: ['feb28', 'mar01'],
        default: 'feb28'
    },
    simulationDate: {
        type: String,
        default: null // e.g. "2026-09-11" for date simulation
    },
    wishes: [{
        senderName: String,
        senderRole: String,
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentBirthday' },
        message: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('StudentBirthdaySettings', studentBirthdaySettingsSchema);
