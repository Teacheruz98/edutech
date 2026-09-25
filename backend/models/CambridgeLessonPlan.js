const mongoose = require('mongoose');

const cambridgeLessonPlanSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    stage: {
        type: String,
        required: true,
        enum: [
            'Cambridge Primary',
            'Cambridge Lower Secondary',
            'Cambridge IGCSE',
            'Cambridge International AS & A Level',
            'General Cambridge'
        ],
        default: 'Cambridge IGCSE',
        index: true
    },
    curriculumCode: {
        type: String,
        trim: true,
        default: ''
    },
    unitTitle: {
        type: String,
        required: true,
        trim: true
    },
    lessonTitle: {
        type: String,
        required: true,
        trim: true
    },
    durationMinutes: {
        type: Number,
        default: 45,
        min: 15,
        max: 180
    },
    learningObjectives: [{
        type: String,
        trim: true
    }],
    successCriteria: [{
        type: String,
        trim: true
    }],
    keyVocabulary: [{
        type: String,
        trim: true
    }],
    lessonPhases: {
        starter: {
            durationMinutes: { type: Number, default: 10 },
            teacherActivity: { type: String, default: '' },
            studentActivity: { type: String, default: '' },
            formativeCheck: { type: String, default: '' }
        },
        main: {
            durationMinutes: { type: Number, default: 25 },
            teacherActivity: { type: String, default: '' },
            studentActivity: { type: String, default: '' },
            formativeCheck: { type: String, default: '' }
        },
        plenary: {
            durationMinutes: { type: Number, default: 10 },
            teacherActivity: { type: String, default: '' },
            studentActivity: { type: String, default: '' },
            formativeCheck: { type: String, default: '' }
        }
    },
    differentiation: {
        support: {
            type: String,
            default: ''
        },
        extension: {
            type: String,
            default: ''
        },
        guidedGroup: {
            type: String,
            default: ''
        }
    },
    resourcesNeeded: [{
        type: String,
        trim: true
    }],
    reflection: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['DRAFT', 'PUBLISHED'],
        default: 'PUBLISHED',
        index: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CambridgeLessonPlan', cambridgeLessonPlanSchema);
