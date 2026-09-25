const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
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
    profession: {
        type: String,
        default: 'O\'qituvchi',
        trim: true
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
    department: {
        type: String,
        default: 'General'
    },
    email: {
        type: String,
        default: ''
    },
    phone: {
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

// Compound index to optimize birthday query
staffSchema.index({ isActive: 1, birthMonth: 1, birthDay: 1 });
// Compound index for duplicate check
staffSchema.index({ firstName: 1, lastName: 1, birthDay: 1, birthMonth: 1, birthYear: 1 });

module.exports = mongoose.model('Staff', staffSchema);
