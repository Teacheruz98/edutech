const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Material = require('../models/Material');
const { Assignment, Quiz, Page, Submission } = require('../models/LMS');
const CourseDiscussion = require('../models/CourseDiscussion');
const Message = require('../models/Message');
const QuestionBank = require('../models/QuestionBank');
const User = require('../models/User');
const Grade = require('../models/Grade');
const { authMiddleware, teacherOrAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { getCurrentSemester } = require('../utils/gradeHelpers');

// Helper: Verify if user has management permissions (Original Instructor or Admin)
async function canManageCourse(courseId, user) {
    if (!courseId) return { allowed: false, notFound: true };
    const course = await Course.findById(courseId);
    if (!course) return { allowed: false, notFound: true };
    if (user.role === 'admin') return { allowed: true, course, isOwner: true, isAdmin: true };
    const isOwner = course.instructor && course.instructor.toString() === user.userId.toString();
    return { allowed: isOwner, isOwner, course };
}

// ── Courses CRUD ──────────────────────────────────────────────────────────────
router.get('/courses', authMiddleware, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'teacher') {
            filter = { $or: [{ instructor: req.user.userId }, { coTeachers: req.user.userId }] };
        } else if (req.user.role === 'student') {
            filter = { students: req.user.userId };
        }
        const courses = await Course.find(filter)
            .populate('instructor', 'username email')
            .populate('coTeachers', 'username email role')
            .sort({ createdAt: -1 });
        res.json(courses);
    } catch (error) { console.error("GET /api/courses error:", error); res.status(500).json({ message: "Xatolik" }); }
});

router.post('/courses', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const { title, description, coverImage, specificGrade, classSection, classGroup, gradeLevel, instructorId, coTeachers } = req.body || {};
        if (!title?.trim()) return res.status(400).json({ message: "Kurs nomi (title) majburiy!" });
        const assignedInstructor = (req.user.role === 'admin' && instructorId?.trim()) ? instructorId.trim() : req.user.userId;
        const gradeNum = Number(specificGrade) || 5;
        const section = classSection?.trim() || 'Blue';
        const group = classGroup?.trim() || `${gradeNum}-${section}`;
        const course = new Course({
            title: title.trim(),
            description: (description || '').trim(),
            coverImage: coverImage?.trim() || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80',
            specificGrade: gradeNum,
            classSection: section,
            classGroup: group,
            gradeLevel: gradeLevel || (gradeNum >= 8 ? '8-11' : '5-7'),
            instructor: assignedInstructor,
            coTeachers: Array.isArray(coTeachers) ? coTeachers : [],
            students: []
        });
        await course.save();
        const populated = await Course.findById(course._id)
            .populate('instructor', 'username email')
            .populate('coTeachers', 'username email role');
        res.status(201).json(populated);
    } catch (error) { console.error("POST /api/courses error:", error); res.status(500).json({ message: error.message || "Kurs yaratishda xatolik" }); }
});

router.put('/courses/:id', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const check = await canManageCourse(req.params.id, req.user);
        if (check.notFound) return res.status(404).json({ message: "Kurs topilmadi" });
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin kurs sozlamalarini o'zgartirishi mumkin" });

        const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('instructor', 'username email')
            .populate('coTeachers', 'username email role');
        res.json(course);
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

router.delete('/courses/:id', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const check = await canManageCourse(req.params.id, req.user);
        if (check.notFound) return res.status(404).json({ message: "Kurs topilmadi" });
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin kursni o'chira oladi" });

        const assignments = await Assignment.find({ courseId: check.course._id }).select('_id');
        const assignmentIds = assignments.map(a => a._id);

        await Promise.all([
            Module.deleteMany({ courseId: check.course._id }),
            Material.deleteMany({ courseId: check.course._id }),
            Assignment.deleteMany({ courseId: check.course._id }),
            Quiz.deleteMany({ courseId: check.course._id }),
            Page.deleteMany({ courseId: check.course._id }),
            Submission.deleteMany({ assignmentId: { $in: assignmentIds } }),
            CourseDiscussion.deleteMany({ courseId: check.course._id }),
            Message.deleteMany({ courseId: check.course._id }),
            Course.findByIdAndDelete(check.course._id)
        ]);

        res.json({ success: true, message: "Kurs va barcha tegishli resurslar muvaffaqiyatli o'chirildi" });
    } catch (error) {
        console.error("DELETE /courses/:id error:", error);
        res.status(500).json({ message: "Kursni o'chirishda xatolik: " + error.message });
    }
});

// ── Co-Teachers Management ───────────────────────────────────────────────────
router.post('/courses/:id/co-teachers', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const check = await canManageCourse(req.params.id, req.user);
        if (check.notFound) return res.status(404).json({ message: "Kurs topilmadi" });
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin yordamchi o'qituvchi tayinlashi mumkin" });

        const { teacherId, email } = req.body;
        let teacher = null;
        if (teacherId) {
            teacher = await User.findById(teacherId);
        } else if (email) {
            teacher = await User.findOne({ email: email.trim().toLowerCase(), role: 'teacher' });
        }
        if (!teacher || teacher.role !== 'teacher') return res.status(404).json({ message: "O'qituvchi topilmadi" });
        if (teacher._id.toString() === check.course.instructor.toString()) {
            return res.status(400).json({ message: "Ushbu o'qituvchi allaqachon kursning asosiy muallifi" });
        }
        if ((check.course.coTeachers || []).some(ct => ct.toString() === teacher._id.toString())) {
            return res.status(400).json({ message: "Bu o'qituvchi allaqachon yordamchi o'qituvchi sifatida biriktirilgan" });
        }
        check.course.coTeachers = check.course.coTeachers || [];
        check.course.coTeachers.push(teacher._id);
        await check.course.save();

        const updated = await Course.findById(check.course._id)
            .populate('instructor', 'username email')
            .populate('coTeachers', 'username email role');
        res.json({ message: "Yordamchi o'qituvchi qo'shildi", course: updated });
    } catch (error) {
        res.status(500).json({ message: "Yordamchi o'qituvchini qo'shishda xatolik: " + error.message });
    }
});

router.delete('/courses/:id/co-teachers/:teacherId', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const check = await canManageCourse(req.params.id, req.user);
        if (check.notFound) return res.status(404).json({ message: "Kurs topilmadi" });
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin yordamchi o'qituvchini olib tashlashi mumkin" });

        check.course.coTeachers = (check.course.coTeachers || []).filter(ct => ct.toString() !== req.params.teacherId);
        await check.course.save();
        res.json({ message: "Yordamchi o'qituvchi olib tashlandi" });
    } catch (error) {
        res.status(500).json({ message: "Xatolik: " + error.message });
    }
});

router.get('/courses/:id/export', authMiddleware, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('instructor', 'username email');
        if (!course) return res.status(404).json({ message: "Kurs topilmadi" });
        const [modules, materials, assignments, quizzes, pages] = await Promise.all([
            Module.find({ courseId: course._id }).lean(),
            Material.find({ courseId: course._id }).lean(),
            Assignment.find({ courseId: course._id }).lean(),
            Quiz.find({ courseId: course._id }).lean(),
            Page.find({ courseId: course._id }).lean()
        ]);
        res.json({ version: '1.0', exportedAt: new Date(), course, modules, materials, assignments, quizzes, pages });
    } catch (error) { res.status(500).json({ message: "Kursni eksport qilishda xatolik: " + error.message }); }
});

// ── Course Students ───────────────────────────────────────────────────────────
router.get('/courses/:id/students', authMiddleware, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('students', 'username email role');
        if (!course) return res.status(404).json({ message: "Kurs topilmadi" });
        let students = course.students || [];
        if (!course.isInitialized && students.length === 0 && ['teacher','admin'].includes(req.user.role)) {
            students = await User.find({ role: 'student', isApproved: true }).select('username email role');
            course.students = students.map(s => s._id);
            course.isInitialized = true;
            await course.save();
        }
        res.json(students);
    } catch (error) { console.error("GET course students error:", error); res.status(500).json({ message: "Xatolik" }); }
});

router.post('/courses/:id/add-student', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const check = await canManageCourse(req.params.id, req.user);
        if (check.notFound) return res.status(404).json({ message: "Kurs topilmadi" });
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin o'quvchi qo'sha oladi" });

        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email kiritilmagan" });
        const cleanInput = email.trim();
        const safeRegex = new RegExp('^' + cleanInput.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i');
        const student = await User.findOne({ $or: [{ email: safeRegex }, { username: safeRegex }] });
        if (!student) return res.status(404).json({ message: `"${cleanInput}" topilmadi` });
        if (student.role !== 'student') return res.status(400).json({ message: `"${student.username}" student emas` });
        const course = check.course;
        if ((course.students || []).some(sId => sId.toString() === student._id.toString())) return res.status(400).json({ message: `${student.username} allaqachon qo'shilgan` });
        if (!course.students) course.students = [];
        course.students.push(student._id);
        course.isInitialized = true;
        await course.save();
        res.json({ message: `O'quvchi (@${student.username}) qo'shildi! 🎉`, student: { _id: student._id, username: student.username, email: student.email } });
    } catch (error) { res.status(500).json({ message: "O'quvchini qo'shishda xatolik" }); }
});

router.delete('/courses/:id/remove-student/:studentId', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const check = await canManageCourse(req.params.id, req.user);
        if (check.notFound) return res.status(404).json({ message: "Kurs topilmadi" });
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin o'quvchini chiqara oladi" });

        const course = check.course;
        course.students = (course.students || []).filter(sId => sId.toString() !== req.params.studentId);
        course.isInitialized = true;
        await course.save();
        res.json({ message: "O'quvchi olib tashlandi" });
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

// ── Modules ───────────────────────────────────────────────────────────────────
router.get('/courses/:id/modules', authMiddleware, async (req, res) => {
    try { const m = await Module.find({ courseId: req.params.id }).sort('order'); res.json(m); }
    catch { res.status(500).json({ message: "Xatolik" }); }
});

router.post('/courses/:id/modules', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const check = await canManageCourse(req.params.id, req.user);
        if (check.notFound) return res.status(404).json({ message: "Kurs topilmadi" });
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin yangi modul yarata oladi" });

        const m = new Module({ ...req.body, courseId: req.params.id });
        await m.save();
        res.status(201).json(m);
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

router.delete('/modules/:id', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const m = await Module.findById(req.params.id);
        if (!m) return res.status(404).json({ message: "Modul topilmadi" });
        const check = await canManageCourse(m.courseId, req.user);
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin modulni o'chira oladi" });

        await Module.findByIdAndDelete(req.params.id);
        res.json({ message: "O'chirildi" });
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

// ── Materials ─────────────────────────────────────────────────────────────────
router.get('/materials', authMiddleware, async (req, res) => {
    try {
        const { grade } = req.query;
        let query = {};
        if (grade && grade !== 'All') query.targetGrade = { $in: [grade, 'All'] };
        const data = await Material.find(query).populate('courseId', 'title').sort({ createdAt: -1 });
        const formatted = data.map(item => ({
            ...item._doc,
            title: item.title || item.name || 'Nomsiz',
            name: item.name || item.title || 'Nomsiz',
            fileUrl: item.fileUrl || item.url || '',
            url: item.url || item.fileUrl || '',
            fileType: item.fileType || item.type || 'link',
            type: item.type || item.fileType || 'link',
            targetGrade: item.targetGrade || 'All'
        }));
        res.json(formatted);
    } catch (error) { console.error("GET All Materials Error:", error); res.status(500).json({ message: "Xatolik" }); }
});

router.post('/materials', authMiddleware, teacherOrAdmin, upload.single('file'), async (req, res) => {
    try {
        const { name, title, description, url, fileUrl, type, fileType, subject, targetGrade } = req.body;
        let finalUrl = url || fileUrl || '';
        let detectedType = type || fileType || 'link';
        if (req.file) {
            finalUrl = `http://localhost:5001/uploads/${req.file.filename}`;
            const ext = path.extname(req.file.originalname).toLowerCase();
            if (ext === '.pdf') detectedType = 'pdf';
            else if (['.jpg','.jpeg','.png','.gif','.webp'].includes(ext)) detectedType = 'image';
            else if (['.mp4','.webm','.mov','.avi'].includes(ext)) detectedType = 'video';
            else if (['.mp3','.wav','.ogg','.m4a'].includes(ext)) detectedType = 'audio';
            else detectedType = 'file';
        }
        const materialTitle = title || name || (req.file ? req.file.originalname : 'Material');
        const item = new Material({
            name: materialTitle,
            title: materialTitle,
            description: description || '',
            url: finalUrl,
            fileUrl: finalUrl,
            type: detectedType,
            fileType: detectedType,
            subject: subject || 'General',
            targetGrade: targetGrade || 'All',
            tab: 'INFO'
        });
        await item.save();
        res.status(201).json(item);
    } catch (error) { console.error("POST Global Material Error:", error); res.status(500).json({ message: "Xatolik" }); }
});

router.get('/courses/:id/materials', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid Course ID" });
        const data = await Material.find({ courseId: req.params.id });
        res.json(data);
    } catch (error) { console.error("GET Course Materials Error:", error); res.status(500).json({ message: "Xatolik" }); }
});

router.post('/courses/:id/materials', authMiddleware, teacherOrAdmin, upload.single('file'), async (req, res) => {
    try {
        const check = await canManageCourse(req.params.id, req.user);
        if (check.notFound) return res.status(404).json({ message: "Kurs topilmadi" });
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin material qo'sha oladi" });

        const { title, name, description, url, content, type, moduleId, subTopicId, tab, targetGrade } = req.body || {};
        let finalUrl = url || '';
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        if (req.file) finalUrl = `${baseUrl}/uploads/${req.file.filename}`;

        let detectedType = type || 'link';
        if (req.file) {
            const ext = path.extname(req.file.originalname).toLowerCase();
            if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext) || req.file.mimetype?.startsWith('audio/')) {
                detectedType = 'audio';
            } else if (['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext) || req.file.mimetype?.startsWith('video/')) {
                detectedType = 'video';
            } else if (ext === '.pdf' || req.file.mimetype === 'application/pdf') {
                detectedType = 'pdf';
            } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext) || req.file.mimetype?.startsWith('image/')) {
                detectedType = 'image';
            } else {
                detectedType = type || 'file';
            }
        } else if (type === 'audio') {
            detectedType = 'audio';
        } else if (type === 'video') {
            detectedType = 'video';
        } else if (type === 'pdf') {
            detectedType = 'pdf';
        }

        const materialTitle = (title?.trim()) || (name?.trim()) || (req.file ? req.file.originalname : 'Yangi Material');
        const isHtmlOrText = detectedType === 'html' || detectedType === 'topic' || (content && (content.startsWith('<') || content.includes('<!DOCTYPE')));
        let materialUrl = (finalUrl && !isHtmlOrText) ? finalUrl : '';
        if (!materialUrl && !isHtmlOrText && content && (content.startsWith('http://') || content.startsWith('https://'))) {
            materialUrl = content;
        }

        let targetTab = tab;
        if (!targetTab) {
            if (detectedType === 'video') targetTab = 'VIDEOS';
            else if (detectedType === 'audio') targetTab = 'PODCAST';
            else if (detectedType === 'pdf') targetTab = 'EXTENDED';
            else targetTab = 'HOME';
        }

        const item = new Material({
            name: materialTitle,
            title: materialTitle,
            description: description || '',
            url: materialUrl,
            fileUrl: materialUrl,
            content: content || materialUrl,
            type: detectedType,
            fileType: detectedType,
            moduleId: (moduleId && moduleId !== 'undefined' && moduleId !== '') ? moduleId : null,
            subTopicId: (subTopicId && subTopicId !== 'undefined' && subTopicId !== '') ? subTopicId : null,
            tab: targetTab,
            targetGrade: targetGrade || 'All',
            courseId: req.params.id
        });
        await item.save();
        res.status(201).json(item);
    } catch (error) { console.error("POST Materials Error:", error); res.status(500).json({ message: "Material saqlashda xatolik: " + error.message }); }
});

router.put('/materials/:id', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const item = await Material.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Material topilmadi" });
        if (item.courseId) {
            const check = await canManageCourse(item.courseId, req.user);
            if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin materialni tahrirlashi mumkin" });
        }
        const updated = await Material.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

router.delete('/materials/:id', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const item = await Material.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Material topilmadi" });
        if (item.courseId) {
            const check = await canManageCourse(item.courseId, req.user);
            if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin materialni o'chira oladi" });
        }
        await Material.findByIdAndDelete(req.params.id);
        await Material.deleteMany({ subTopicId: req.params.id });
        res.json({ message: "O'chirildi" });
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

// ── LMS Assignments ───────────────────────────────────────────────────────────
router.get('/courses/:id/assignments', authMiddleware, async (req, res) => {
    try { res.json(await Assignment.find({ courseId: req.params.id })); }
    catch { res.status(500).json({ message: "Xatolik" }); }
});

router.post('/courses/:id/assignments', authMiddleware, teacherOrAdmin, upload.single('file'), async (req, res) => {
    try {
        const check = await canManageCourse(req.params.id, req.user);
        if (check.notFound) return res.status(404).json({ message: "Kurs topilmadi" });
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin vazifa yarata oladi" });

        let fileUrl = req.body.fileUrl || null, fileName = req.body.fileName || null;
        if (req.file) { fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`; fileName = req.file.originalname; }
        const pointsNum = req.body.points ? Number(req.body.points) : 100;
        const dueDateVal = req.body.dueDate ? new Date(req.body.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const item = new Assignment({
            title: req.body.title || 'Vazifa',
            description: req.body.description || '',
            points: isNaN(pointsNum) ? 100 : pointsNum,
            dueDate: dueDateVal,
            attachmentType: req.body.attachmentType || (fileUrl ? 'pdf' : req.body.url ? 'link' : 'none'),
            fileUrl,
            fileName,
            url: req.body.url || '',
            courseId: req.params.id,
            moduleId: (req.body.moduleId && req.body.moduleId !== 'undefined') ? req.body.moduleId : null,
            subTopicId: (req.body.subTopicId && req.body.subTopicId !== 'undefined') ? req.body.subTopicId : null,
            tab: req.body.tab || 'TASKS',
            createdBy: req.user.userId
        });
        await item.save();
        res.status(201).json(item);
    } catch (error) { console.error("Create Assignment error:", error); res.status(500).json({ message: "Vazifa yaratishda xatolik" }); }
});

router.put('/assignments/:id', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const item = await Assignment.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Vazifa topilmadi" });
        const check = await canManageCourse(item.courseId, req.user);
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin vazifani tahrirlashi mumkin" });

        res.json(await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true }));
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

router.delete('/assignments/:id', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const item = await Assignment.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Vazifa topilmadi" });
        const check = await canManageCourse(item.courseId, req.user);
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin vazifani o'chira oladi" });

        await Assignment.findByIdAndDelete(req.params.id);
        res.json({ message: "O'chirildi" });
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

router.get('/assignments/:id', authMiddleware, async (req, res) => {
    try { res.json(await Assignment.findById(req.params.id)); }
    catch { res.status(500).json({ message: "Xatolik" }); }
});

router.get('/assignments/:id/submissions', authMiddleware, teacherOrAdmin, async (req, res) => {
    try { res.json(await Submission.find({ assignmentId: req.params.id }).populate('studentId', 'username email role')); }
    catch { res.status(500).json({ message: "Topshiriqlarni olishda xatolik" }); }
});

router.get('/assignments/:id/my-submission', authMiddleware, async (req, res) => {
    try { res.json(await Submission.findOne({ assignmentId: req.params.id, studentId: req.user.userId }) || null); }
    catch { res.status(500).json({ message: "Xatolik" }); }
});

router.post('/assignments/:id/submit', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ message: "Vazifa topilmadi" });
        const { content, linkUrl } = req.body;
        let fileUrl = null, fileName = null;
        if (req.file) { fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`; fileName = req.file.originalname; }
        let submission = await Submission.findOne({ assignmentId: req.params.id, studentId: req.user.userId });
        if (submission) {
            if (content) submission.content = content;
            if (linkUrl) submission.linkUrl = linkUrl;
            if (fileUrl) { submission.fileUrl = fileUrl; submission.fileName = fileName; }
            submission.submittedAt = new Date();
            submission.status = 'submitted';
            await submission.save();
        } else {
            submission = new Submission({
                assignmentId: req.params.id,
                studentId: req.user.userId,
                content: content || '',
                linkUrl: linkUrl || '',
                fileUrl: fileUrl || '',
                fileName: fileName || '',
                status: 'submitted',
                submittedAt: new Date()
            });
            await submission.save();
        }
        res.status(200).json(submission);
    } catch (error) { console.error("Submit assignment error:", error); res.status(500).json({ message: "Vazifani yuborishda xatolik" }); }
});

router.post('/submissions/:id/grade', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const { grade, feedback } = req.body;
        const score = Number(grade);
        if (isNaN(score) || score < 0 || score > 100) return res.status(400).json({ message: "Baho 0-100 oralig'ida bo'lishi kerak!" });
        const submission = await Submission.findById(req.params.id).populate('assignmentId');
        if (!submission) return res.status(404).json({ message: "Topshiriq topilmadi" });
        submission.grade = score;
        submission.feedback = feedback || '';
        submission.status = 'graded';
        await submission.save();
        const assignment = submission.assignmentId;
        if (assignment) {
            const semester = getCurrentSemester();
            await Grade.findOneAndUpdate(
                { studentId: submission.studentId, courseId: assignment.courseId, assessmentName: assignment.title, semester },
                { score, category: 'Assignment', date: new Date(), createdBy: req.user.userId },
                { upsert: true, new: true }
            );
        }
        res.json({ message: "Baho saqlandi va Grades ga sinxronlashtirildi!", submission });
    } catch (error) { console.error("Grade submission error:", error); res.status(500).json({ message: "Baholashda xatolik" }); }
});

// ── LMS Quizzes ───────────────────────────────────────────────────────────────
router.get('/courses/:id/quizzes', authMiddleware, async (req, res) => {
    try { res.json(await Quiz.find({ courseId: req.params.id })); }
    catch { res.status(500).json({ message: "Xatolik" }); }
});

router.post('/courses/:id/quizzes', authMiddleware, teacherOrAdmin, upload.none(), async (req, res) => {
    try {
        const check = await canManageCourse(req.params.id, req.user);
        if (check.notFound) return res.status(404).json({ message: "Kurs topilmadi" });
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin test yarata oladi" });

        const item = new Quiz({
            ...req.body,
            courseId: req.params.id,
            subTopicId: (req.body.subTopicId && req.body.subTopicId !== 'undefined') ? req.body.subTopicId : null
        });
        await item.save();
        res.status(201).json(item);
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

router.put('/quizzes/:id', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const item = await Quiz.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Test topilmadi" });
        const check = await canManageCourse(item.courseId, req.user);
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin testni tahrirlashi mumkin" });

        res.json(await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true }));
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

router.delete('/quizzes/:id', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const item = await Quiz.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Test topilmadi" });
        const check = await canManageCourse(item.courseId, req.user);
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin testni o'chira oladi" });

        await Quiz.findByIdAndDelete(req.params.id);
        res.json({ message: "O'chirildi" });
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

router.get('/quizzes/:id', authMiddleware, async (req, res) => {
    try { res.json(await Quiz.findById(req.params.id)); }
    catch { res.status(500).json({ message: "Xatolik" }); }
});

// ── LMS Pages ─────────────────────────────────────────────────────────────────
router.get('/courses/:id/pages', authMiddleware, async (req, res) => {
    try { res.json(await Page.find({ courseId: req.params.id })); }
    catch { res.status(500).json({ message: "Xatolik" }); }
});

router.post('/courses/:id/pages', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const check = await canManageCourse(req.params.id, req.user);
        if (check.notFound) return res.status(404).json({ message: "Kurs topilmadi" });
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin sahifa yarata oladi" });

        const item = new Page({ ...req.body, courseId: req.params.id });
        await item.save();
        res.status(201).json(item);
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

router.put('/pages/:id', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const item = await Page.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Sahifa topilmadi" });
        const check = await canManageCourse(item.courseId, req.user);
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin sahifani tahrirlashi mumkin" });

        res.json(await Page.findByIdAndUpdate(req.params.id, req.body, { new: true }));
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

router.delete('/pages/:id', authMiddleware, teacherOrAdmin, async (req, res) => {
    try {
        const item = await Page.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Sahifa topilmadi" });
        const check = await canManageCourse(item.courseId, req.user);
        if (!check.allowed) return res.status(403).json({ message: "Faqat kurs muallifi yoki admin sahifani o'chira oladi" });

        await Page.findByIdAndDelete(req.params.id);
        res.json({ message: "O'chirildi" });
    } catch { res.status(500).json({ message: "Xatolik" }); }
});

// ── Course Discussions ────────────────────────────────────────────────────────
router.get('/courses/:id/discussions/general', authMiddleware, async (req, res) => {
    try {
        res.json(await CourseDiscussion.find({ courseId: req.params.id, type: 'general' })
            .populate('sender', 'username email role')
            .populate('pinnedBy', 'username role')
            .sort({ createdAt: 1 })
            .lean());
    } catch (error) { res.status(500).json({ message: "Muhokamalarni yuklashda xatolik: " + error.message }); }
});

router.post('/courses/:id/discussions/general', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message?.trim()) return res.status(400).json({ message: "Xabar matni bo'sh bo'lishi mumkin emas" });
        const newMsg = new CourseDiscussion({ courseId: req.params.id, type: 'general', sender: req.user.userId, message: message.trim() });
        await newMsg.save();
        res.status(201).json(await CourseDiscussion.findById(newMsg._id).populate('sender', 'username email role').lean());
    } catch (error) { res.status(500).json({ message: "Xabar yuborishda xatolik: " + error.message }); }
});

router.get('/courses/:id/discussions/individual', authMiddleware, async (req, res) => {
    try {
        let studentId = req.user.role === 'student' ? req.user.userId : req.query.studentId;
        if (!studentId) return res.status(400).json({ message: "O'quvchi tanlanmadi" });
        res.json(await CourseDiscussion.find({ courseId: req.params.id, type: 'individual', studentId })
            .populate('sender', 'username email role')
            .populate('recipient', 'username email role')
            .sort({ createdAt: 1 })
            .lean());
    } catch (error) { res.status(500).json({ message: "Shaxsiy suhbatni yuklashda xatolik: " + error.message }); }
});

router.post('/courses/:id/discussions/individual', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message?.trim()) return res.status(400).json({ message: "Xabar matni bo'sh bo'lishi mumkin emas" });
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: "Kurs topilmadi" });
        let studentId = null, recipientId = null;
        if (req.user.role === 'student') { studentId = req.user.userId; recipientId = course.instructor; }
        else { studentId = req.body.studentId; if (!studentId) return res.status(400).json({ message: "O'quvchi tanlanmadi" }); recipientId = studentId; }
        const newMsg = new CourseDiscussion({ courseId: req.params.id, type: 'individual', sender: req.user.userId, recipient: recipientId, studentId, message: message.trim() });
        await newMsg.save();
        res.status(201).json(await CourseDiscussion.findById(newMsg._id).populate('sender', 'username email role').populate('recipient', 'username email role').lean());
    } catch (error) { res.status(500).json({ message: "Shaxsiy xabar yuborishda xatolik: " + error.message }); }
});

router.get('/courses/:id/discussions/participants', authMiddleware, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('instructor', 'username email role').populate('students', 'username email role').lean();
        if (!course) return res.status(404).json({ message: "Kurs topilmadi" });
        const students = course.students || [];
        const studentStats = await Promise.all(students.map(async (st) => {
            const msgCount = await CourseDiscussion.countDocuments({ courseId: course._id, type: 'individual', studentId: st._id });
            const lastMsg = await CourseDiscussion.findOne({ courseId: course._id, type: 'individual', studentId: st._id }).sort({ createdAt: -1 }).select('message createdAt sender').lean();
            return { ...st, messageCount: msgCount, lastMessage: lastMsg };
        }));
        res.json({ instructor: course.instructor, students: studentStats });
    } catch (error) { res.status(500).json({ message: "Ishtirokchilarni yuklashda xatolik" }); }
});

router.delete('/courses/:id/discussions/:messageId', authMiddleware, async (req, res) => {
    try {
        const msg = await CourseDiscussion.findById(req.params.messageId);
        if (!msg) return res.status(404).json({ message: "Xabar topilmadi" });
        const course = await Course.findById(msg.courseId);
        const isInstructor = course && String(course.instructor) === String(req.user.userId);
        if (req.user.role !== 'admin' && !isInstructor && String(msg.sender) !== String(req.user.userId)) {
            return res.status(403).json({ message: "Ruxsat berilmagan" });
        }
        await CourseDiscussion.findByIdAndDelete(req.params.messageId);
        res.json({ success: true, message: "Xabar o'chirildi" });
    } catch (error) { res.status(500).json({ message: "Xabarni o'chirishda xatolik: " + error.message }); }
});

router.patch('/courses/:id/discussions/:messageId/pin', authMiddleware, async (req, res) => {
    try {
        const msg = await CourseDiscussion.findById(req.params.messageId);
        if (!msg) return res.status(404).json({ message: "Xabar topilmadi" });
        const course = await Course.findById(msg.courseId);
        const isInstructor = course && String(course.instructor) === String(req.user.userId);
        if (req.user.role !== 'admin' && !isInstructor) return res.status(403).json({ message: "Ruxsat berilmagan" });
        msg.isPinned = !msg.isPinned;
        msg.pinnedBy = msg.isPinned ? req.user.userId : null;
        msg.pinnedAt = msg.isPinned ? new Date() : null;
        await msg.save();
        res.json(await CourseDiscussion.findById(msg._id).populate('sender', 'username email role').populate('pinnedBy', 'username role').lean());
    } catch (error) { res.status(500).json({ message: "Xabarni qadashda xatolik: " + error.message }); }
});

router.get('/courses/:id/discussions', authMiddleware, async (req, res) => {
    try { res.json(await CourseDiscussion.find({ courseId: req.params.id, type: 'general' }).populate('sender', 'username email role').sort({ createdAt: 1 })); }
    catch { res.status(500).json({ message: "Xatolik" }); }
});

// ── Messages ──────────────────────────────────────────────────────────────────
router.post('/messages', authMiddleware, async (req, res) => {
    const msg = new Message({ ...req.body, sender: req.user.userId });
    await msg.save();
    res.status(201).json(msg);
});

router.get('/messages/:courseId', authMiddleware, async (req, res) => {
    const data = await Message.find({ courseId: req.params.courseId }).populate('sender', 'username role');
    res.json(data);
});

// ── Question Bank ─────────────────────────────────────────────────────────────
router.post('/question-bank', authMiddleware, teacherOrAdmin, async (req, res) => {
    const q = new QuestionBank({ ...req.body, teacherId: req.user.userId });
    await q.save();
    res.status(201).json(q);
});

router.get('/question-bank', authMiddleware, teacherOrAdmin, async (req, res) => {
    const data = await QuestionBank.find({ teacherId: req.user.userId });
    res.json(data);
});

module.exports = router;
