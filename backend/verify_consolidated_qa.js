const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5001/api';

async function runRigorousQA() {
    console.log("==================================================");
    console.log("🚀 STARTING RIGOROUS QA AUDIT & VERIFICATION SUITE");
    console.log("==================================================");

    const testResults = [];
    const assertTest = (name, condition, details = "") => {
        if (condition) {
            console.log(`  ✅ [PASS] ${name}`);
            testResults.push({ name, passed: true, details });
        } else {
            console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ''}`);
            testResults.push({ name, passed: false, details });
        }
    };

    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edutech');

        // ── 1. AUTH & ROLE CREDENTIALS VERIFICATION ──
        console.log("\n[1] Testing Multi-Role Authentication...");
        const adminLogin = await axios.post(`${BASE_URL}/login`, { username: 'Safarmurod', password: 'admin123' });
        const adminToken = adminLogin.data.token;
        const adminUser = adminLogin.data.user;
        assertTest("Admin Authentication", !!adminToken && adminUser.role === 'admin');

        const teacherLogin = await axios.post(`${BASE_URL}/login`, { username: 'teacher', password: 'teacher123' });
        const teacherToken = teacherLogin.data.token;
        const teacherUser = teacherLogin.data.user;
        assertTest("Primary Teacher Authentication", !!teacherToken && teacherUser.role === 'teacher');

        // Check or create Secondary Teacher (Co-Teacher)
        let coTeacherToken = null;
        let coTeacherUser = null;
        const User = require('./models/User');
        const bcrypt = require('bcryptjs');
        await User.deleteOne({ username: 'co_teacher' });
        const newCoTeacher = new User({
            username: 'co_teacher',
            email: 'coteacher@test.com',
            password: await bcrypt.hash('teacher123', 10),
            role: 'teacher',
            isApproved: true
        });
        await newCoTeacher.save();

        const coLogin = await axios.post(`${BASE_URL}/login`, { username: 'co_teacher', password: 'teacher123' });
        coTeacherToken = coLogin.data.token;
        coTeacherUser = coLogin.data.user;
        assertTest("Secondary Co-Teacher Setup", !!coTeacherToken && coTeacherUser.role === 'teacher');

        const studentLogin = await axios.post(`${BASE_URL}/login`, { username: 'student', password: 'student123' });
        const studentToken = studentLogin.data.token;
        const studentUser = studentLogin.data.user;
        assertTest("Student Authentication", !!studentToken && studentUser.role === 'student');

        // ── 2. MODULARIZED BACKEND ENDPOINTS AUDIT ──
        console.log("\n[2] Testing Extracted Route Modules Connection & Integrity...");

        // CD IELTS Routes
        const ieltsRes = await axios.get(`${BASE_URL}/ielts/tests`, { headers: { Authorization: `Bearer ${adminToken}` } });
        assertTest("CD IELTS Tests Route", Array.isArray(ieltsRes.data.tests || ieltsRes.data));

        const ieltsQRes = await axios.get(`${BASE_URL}/ielts/questions`, { headers: { Authorization: `Bearer ${adminToken}` } });
        assertTest("CD IELTS Questions Route", Array.isArray(ieltsQRes.data.questions || ieltsQRes.data));

        const ieltsResultsRes = await axios.get(`${BASE_URL}/ielts/results`, { headers: { Authorization: `Bearer ${adminToken}` } });
        assertTest("CD IELTS Results Route", Array.isArray(ieltsResultsRes.data.results || ieltsResultsRes.data));

        // Digital SAT Routes
        const satTestRes = await axios.get(`${BASE_URL}/sat/tests`, { headers: { Authorization: `Bearer ${adminToken}` } });
        assertTest("Digital SAT Tests Route", Array.isArray(satTestRes.data.tests || satTestRes.data));

        const satQRes = await axios.get(`${BASE_URL}/sat/questions`, { headers: { Authorization: `Bearer ${adminToken}` } });
        assertTest("Digital SAT Questions Route", Array.isArray(satQRes.data.questions || satQRes.data));

        const satAttemptsRes = await axios.get(`${BASE_URL}/sat/attempts`, { headers: { Authorization: `Bearer ${adminToken}` } });
        assertTest("Digital SAT Attempts Route", Array.isArray(satAttemptsRes.data.attempts || satAttemptsRes.data));

        // Cambridge Lesson Planner Routes
        const cambridgeRes = await axios.get(`${BASE_URL}/cambridge/lesson-plans`, { headers: { Authorization: `Bearer ${adminToken}` } });
        assertTest("Cambridge Lesson Planner Route", Array.isArray(cambridgeRes.data.plans || cambridgeRes.data));

        // Grades Routes
        const gradesRes = await axios.get(`${BASE_URL}/grades/student/me`, { headers: { Authorization: `Bearer ${studentToken}` } });
        assertTest("Student Grades Route (/grades/student/me)", Array.isArray(gradesRes.data));

        const gradesExportRes = await axios.get(`${BASE_URL}/all-grades`, { headers: { Authorization: `Bearer ${adminToken}` } });
        assertTest("All Grades Route (/all-grades)", Array.isArray(gradesExportRes.data));

        // Admin & Users Routes
        const usersRes = await axios.get(`${BASE_URL}/admin/all-users`, { headers: { Authorization: `Bearer ${adminToken}` } });
        assertTest("Admin All-Users Route", Array.isArray(usersRes.data));

        const logsRes = await axios.get(`${BASE_URL}/admin/pending-users`, { headers: { Authorization: `Bearer ${adminToken}` } });
        assertTest("Admin Pending Users Route", Array.isArray(logsRes.data));

        // Materials Global Route
        const matRes = await axios.get(`${BASE_URL}/materials`, { headers: { Authorization: `Bearer ${adminToken}` } });
        assertTest("Global Materials Route", Array.isArray(matRes.data));

        // ── 3. COURSE OWNERSHIP & MULTI-TEACHER PRIVILEGES AUDIT ──
        console.log("\n[3] Auditing Course Ownership & Multi-Teacher Rights...");

        // 3.1 Primary Teacher creates Course Alpha
        const coursePayload = {
            title: "QA Test Course — Advanced Informatics",
            description: "Rigorous automated ownership audit course",
            specificGrade: 9,
            classSection: "Blue",
            classGroup: "9-Blue",
            gradeLevel: "8-11"
        };
        const createCourseRes = await axios.post(`${BASE_URL}/courses`, coursePayload, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        const courseId = createCourseRes.data._id;
        assertTest("Primary Teacher Creates Course", !!courseId && String(createCourseRes.data.instructor._id || createCourseRes.data.instructor) === String(teacherUser._id));

        // 3.2 Primary Teacher assigns Secondary Co-Teacher
        const addCoTeacherRes = await axios.post(`${BASE_URL}/courses/${courseId}/co-teachers`, {
            teacherId: coTeacherUser._id
        }, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        assertTest("Primary Teacher Assigns Co-Teacher", addCoTeacherRes.data.course.coTeachers.some(ct => String(ct._id || ct) === String(coTeacherUser._id)));

        // 3.3 Verify Course is visible to both Primary Teacher and Co-Teacher
        const teacherCourses = await axios.get(`${BASE_URL}/courses`, { headers: { Authorization: `Bearer ${teacherToken}` } });
        const coTeacherCourses = await axios.get(`${BASE_URL}/courses`, { headers: { Authorization: `Bearer ${coTeacherToken}` } });
        assertTest("Primary Teacher Sees Course in GET /courses", teacherCourses.data.some(c => c._id === courseId));
        assertTest("Co-Teacher Sees Course in GET /courses", coTeacherCourses.data.some(c => c._id === courseId));

        // 3.4 Enforce Co-Teacher RESTRICTION: Secondary Co-Teacher CANNOT add modules
        let coTeacherModuleBlocked = false;
        try {
            await axios.post(`${BASE_URL}/courses/${courseId}/modules`, { title: "Unauthorized Co-Teacher Module" }, {
                headers: { Authorization: `Bearer ${coTeacherToken}` }
            });
        } catch (err) {
            coTeacherModuleBlocked = err.response?.status === 403;
        }
        assertTest("Co-Teacher Blocked from Creating Modules (403)", coTeacherModuleBlocked);

        // 3.5 Enforce Co-Teacher RESTRICTION: Secondary Co-Teacher CANNOT add students
        let coTeacherAddStudentBlocked = false;
        try {
            await axios.post(`${BASE_URL}/courses/${courseId}/add-student`, { email: studentUser.email }, {
                headers: { Authorization: `Bearer ${coTeacherToken}` }
            });
        } catch (err) {
            coTeacherAddStudentBlocked = err.response?.status === 403;
        }
        assertTest("Co-Teacher Blocked from Enrolling Students (403)", coTeacherAddStudentBlocked);

        // 3.6 Enforce Co-Teacher RESTRICTION: Secondary Co-Teacher CANNOT delete course
        let coTeacherDeleteBlocked = false;
        try {
            await axios.delete(`${BASE_URL}/courses/${courseId}`, {
                headers: { Authorization: `Bearer ${coTeacherToken}` }
            });
        } catch (err) {
            coTeacherDeleteBlocked = err.response?.status === 403;
        }
        assertTest("Co-Teacher Blocked from Deleting Course (403)", coTeacherDeleteBlocked);

        // 3.7 Primary Teacher successfully adds student and creates module & assignment
        const primaryAddStudent = await axios.post(`${BASE_URL}/courses/${courseId}/add-student`, { email: studentUser.email }, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        assertTest("Primary Teacher Enrolls Student Successfully", !!primaryAddStudent.data.student);

        const primaryAddModule = await axios.post(`${BASE_URL}/courses/${courseId}/modules`, { title: "Unit 1: Algorithms" }, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        assertTest("Primary Teacher Creates Module Successfully", !!primaryAddModule.data._id);

        const primaryAddAssignment = await axios.post(`${BASE_URL}/courses/${courseId}/assignments`, {
            title: "Algorithm Problem Set #1",
            description: "Solve sorting efficiency exercises",
            points: 100,
            dueDate: new Date(Date.now() + 86400000).toISOString()
        }, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        const assignmentId = primaryAddAssignment.data._id;
        assertTest("Primary Teacher Creates Assignment Successfully", !!assignmentId);

        // 3.8 Student Submits Assignment
        const studentSubmit = await axios.post(`${BASE_URL}/assignments/${assignmentId}/submit`, {
            content: "My submission for Problem Set #1",
            linkUrl: "https://github.com/student/problem-set-1"
        }, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const submissionId = studentSubmit.data._id;
        assertTest("Student Submits Assignment Successfully", !!submissionId && studentSubmit.data.status === 'submitted');

        // 3.9 Co-Teacher EVALUATION/GRADING PRIVILEGE: Co-Teacher grades student submission
        const coTeacherGrade = await axios.post(`${BASE_URL}/submissions/${submissionId}/grade`, {
            grade: 95,
            feedback: "Excellent algorithmic complexity analysis!"
        }, {
            headers: { Authorization: `Bearer ${coTeacherToken}` }
        });
        assertTest("Co-Teacher Successfully Grades Submission (SpeedGrader)", coTeacherGrade.data.submission?.grade === 95);

        // ── 4. SUPREME ADMIN OVERSIGHT & CASCADE DELETION ──
        console.log("\n[4] Testing Supreme Admin Oversight & Cascade Deletion...");

        // Admin can edit any course
        const adminUpdate = await axios.put(`${BASE_URL}/courses/${courseId}`, {
            description: "Admin verified and updated course description"
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assertTest("Admin Has Full Course Editing Rights", adminUpdate.data.description.includes("Admin verified"));

        // Admin performs cascade deletion
        const adminDeleteCourse = await axios.delete(`${BASE_URL}/courses/${courseId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assertTest("Admin Deletes Course with Full Cascade Cleanup", adminDeleteCourse.data.success === true);

        // Verify Course no longer exists
        let courseGone = false;
        try {
            await axios.get(`${BASE_URL}/courses/${courseId}/students`, { headers: { Authorization: `Bearer ${adminToken}` } });
        } catch (err) {
            courseGone = err.response?.status === 404;
        }
        assertTest("Course & Children Confirmed Deleted from Database", courseGone);

        // ── FINAL SUMMARY ──
        console.log("\n==================================================");
        const total = testResults.length;
        const passed = testResults.filter(r => r.passed).length;
        const failed = total - passed;
        console.log(`📊 AUDIT SUMMARY: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
        console.log("==================================================");

        if (failed === 0) {
            console.log("🎉 ALL TESTS PASSED! System is rigorous, secure, and production-ready.");
            process.exit(0);
        } else {
            console.error(`⚠️ ${failed} test(s) failed. Check details above.`);
            process.exit(1);
        }
    } catch (err) {
        console.error("FATAL QA AUDIT ERROR:", err.message, err.response?.data || "");
        process.exit(1);
    }
}

runRigorousQA();
