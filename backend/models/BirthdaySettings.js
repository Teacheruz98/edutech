const mongoose = require('mongoose');

const birthdaySettingsSchema = new mongoose.Schema({
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
        default: false
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
        default: null // e.g. "2026-09-06" for admin simulation testing
    },
    wishes: [{
        senderName: String,
        senderRole: String,
        staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
        message: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('BirthdaySettings', birthdaySettingsSchema);
