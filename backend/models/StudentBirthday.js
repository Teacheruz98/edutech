const mongoose = require('mongoose');

const studentBirthdaySchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    classGroup: {
        type: String,
        required: true, // e.g. "5-Blue", "5-Green", "9-Blue", "11-Green"
        trim: true,
        index: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    birthDay: {
        type: Number,
        required: true,
        index: true
    },
    birthMonth: {
        type: Number,
        required: true,
        index: true
    },
    birthYear: {
        type: Number,
        required: true
    },
    profilePhoto: {
        type: String,
        default: null
    },
    phone: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true
});

// Optimized indexes for fast birthday queries and uniqueness
studentBirthdaySchema.index({ isActive: 1, birthMonth: 1, birthDay: 1 });
studentBirthdaySchema.index({ firstName: 1, lastName: 1, classGroup: 1, birthDay: 1, birthMonth: 1 });

module.exports = mongoose.model('StudentBirthday', studentBirthdaySchema);
