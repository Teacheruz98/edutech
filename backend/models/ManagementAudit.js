const mongoose = require('mongoose');

const managementAuditSchema = new mongoose.Schema({
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorUsername: { type: String, required: true },
    targetCourseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    targetCourseTitle: { type: String, default: 'Umumiy Platforma Audit' },
    classGroup: { type: String, default: 'Barchasi' },
    auditCategory: { 
        type: String, 
        enum: ['Baholash Nazorati', 'O\'quv Jarayoni', 'O\'qituvchi Faoliyati', 'Tizim Xulosasi'], 
        default: 'Baholash Nazorati' 
    },
    summaryTitle: { type: String, required: true },
    executiveNote: { type: String, required: true },
    recommendations: { type: String, default: '' },
    overallRating: { type: Number, min: 1, max: 5, default: 5 },
    reactions: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: { type: String, required: true },
        emoji: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    comments: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: { type: String, required: true },
        userRole: { type: String, default: 'teacher' },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ManagementAudit', managementAuditSchema);
