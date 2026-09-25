const GradeUnlockRequest = require('../models/GradeUnlockRequest');

const getCurrentSemester = (date = new Date()) => {
    const month = date.getMonth() + 1;
    if (month >= 9 && month <= 12) return 'Semester 1';
    if (month >= 1 && month <= 6) return 'Semester 2';
    return 'Semester 1';
};

const getCambridgeGrade = (percentage, gradeLevel = '5-7') => {
    if (percentage === null || percentage === undefined || isNaN(percentage) || percentage <= 0) {
        return { score: '-', grade: 'Baho yo\'q', letterGrade: '-', label: 'Ungraded', level: 'Ungraded', color: '#64748b', description: 'Baho qo\'yilmagan' };
    }
    const num = Math.round(Number(percentage));
    if (num >= 90) return { score: '5*', grade: 'A*', letterGrade: 'A*', label: 'Grade A* (Mastery)', color: '#10b981' };
    if (num >= 80) return { score: '5', grade: 'A', letterGrade: 'A', label: 'Grade A (Excellent)', color: '#10b981' };
    if (num >= 70) return { score: '4', grade: 'B', letterGrade: 'B', label: 'Grade B (Good)', color: '#3b82f6' };
    if (num >= 60) return { score: '3', grade: 'C', letterGrade: 'C', label: 'Grade C (Satisfactory)', color: '#f59e0b' };
    if (num >= 50) return { score: '2', grade: 'D', letterGrade: 'D', label: 'Grade D (Developing)', color: '#ec4899' };
    if (num >= 40) return { score: '2', grade: 'E', letterGrade: 'E', label: 'Grade E (Beginning)', color: '#8b5cf6' };
    return { score: '1', grade: 'U', letterGrade: 'U', label: 'Grade U (Ungraded)', color: '#ef4444' };
};

const checkSemesterLock = async (semester, courseId, reqUser) => {
    if (reqUser.role === 'admin') return { isLocked: false, reason: 'admin' };
    const now = new Date();
    const currentYear = now.getFullYear();
    let isPastDeadline = false;
    if (semester === 'Semester 1') {
        const dl = new Date(currentYear, 11, 31, 23, 59, 59);
        if (now > dl && now.getMonth() >= 0 && now.getMonth() <= 5) isPastDeadline = true;
    } else if (semester === 'Semester 2') {
        const dl = new Date(currentYear, 5, 30, 23, 59, 59);
        if (now > dl && now.getMonth() >= 6) isPastDeadline = true;
    }
    const activeRequest = await GradeUnlockRequest.findOne({ courseId, semester, teacherId: reqUser.userId, status: 'approved', approvedUntil: { $gt: now } }).sort({ approvedUntil: -1 });
    if (activeRequest) return { isLocked: false, reason: 'unlocked_by_admin', activeRequest };
    if (isPastDeadline) {
        const pendingRequest = await GradeUnlockRequest.findOne({ courseId, semester, teacherId: reqUser.userId }).sort({ createdAt: -1 });
        return { isLocked: true, reason: 'deadline_passed', activeRequest: pendingRequest };
    }
    return { isLocked: false, reason: 'within_semester' };
};

module.exports = { getCurrentSemester, getCambridgeGrade, checkSemesterLock };
