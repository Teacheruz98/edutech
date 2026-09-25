const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function runVerification() {
    console.log("=== STARTING PHASE 11: MANAGEMENT ANALYTICS VERIFICATION ===");

    // 1. Authenticate Management Director, Student, and Teacher
    console.log("1. Authenticating Management, Student, and Teacher...");
    const managementLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'management_director',
        password: 'director123'
    });
    const managementHeaders = { headers: { Authorization: `Bearer ${managementLogin.data.token}` } };

    const studentLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'student',
        password: 'student123'
    });
    const studentHeaders = { headers: { Authorization: `Bearer ${studentLogin.data.token}` } };

    const teacherLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'teacher',
        password: 'teacher123'
    });
    const teacherHeaders = { headers: { Authorization: `Bearer ${teacherLogin.data.token}` } };

    console.log("Authentication successful.");

    // 2. Test GET /api/ielts/management/overview
    console.log("2. Testing GET /api/ielts/management/overview...");
    const overviewRes = await axios.get(`${BASE_URL}/ielts/management/overview`, managementHeaders);
    const kpis = overviewRes.data.kpis;
    console.log("Management KPIs retrieved:", {
        totalStudents: kpis.totalStudents,
        activeCandidates: kpis.activeCandidates,
        totalTeachers: kpis.totalTeachers,
        totalAttempts: kpis.totalAttempts,
        institutionAverageBand: kpis.institutionAverageBand,
        passRate: kpis.passRate
    });
    console.log("Band Distribution:", overviewRes.data.bandDistribution);
    console.log("Skill Averages:", overviewRes.data.skillAverages);
    if (!kpis || kpis.totalStudents === undefined) {
        throw new Error("Management overview response missing KPIs!");
    }

    // 3. Test GET /api/ielts/management/performance
    console.log("3. Testing GET /api/ielts/management/performance...");
    const perfRes = await axios.get(`${BASE_URL}/ielts/management/performance`, managementHeaders);
    const classPerformance = perfRes.data.classPerformance;
    console.log(`Class performance entries retrieved: ${classPerformance.length}`);
    if (classPerformance.length > 0) {
        console.log("Top class:", classPerformance[0].classGroup, "Avg Band:", classPerformance[0].averageBand);
    }

    // 4. Test GET /api/ielts/management/students
    console.log("4. Testing GET /api/ielts/management/students...");
    const studentsRes = await axios.get(`${BASE_URL}/ielts/management/students`, managementHeaders);
    const studentsList = studentsRes.data.students;
    console.log(`Candidate registry count: ${studentsList.length}`);
    if (studentsList.length > 0) {
        console.log("Candidate #1:", studentsList[0].username, "Tests Completed:", studentsList[0].testsCompleted, "Avg Band:", studentsList[0].averageBand);
    }

    // 5. Test GET /api/ielts/management/teachers
    console.log("5. Testing GET /api/ielts/management/teachers...");
    const teachersRes = await axios.get(`${BASE_URL}/ielts/management/teachers`, managementHeaders);
    const teacherReports = teachersRes.data.teachers;
    console.log(`Faculty reports count: ${teacherReports.length}`);
    console.log("Global Pending Queues:", teachersRes.data.globalPending);

    // 6. Test GET /api/ielts/management/reports
    console.log("6. Testing GET /api/ielts/management/reports...");
    const reportsRes = await axios.get(`${BASE_URL}/ielts/management/reports`, managementHeaders);
    const report = reportsRes.data.report;
    console.log("Report generated for:", report.institutionName, "Academic Year:", report.academicYear);
    console.log("Executive Summary:", report.executiveSummary);

    // 7. Security: Student accessing management endpoint must be rejected (403)
    console.log("7. Security check: Student trying to access /api/ielts/management/overview (expect 403)...");
    try {
        await axios.get(`${BASE_URL}/ielts/management/overview`, studentHeaders);
        throw new Error("SECURITY FAILURE: Student was able to access management overview!");
    } catch (err) {
        if (err.response?.status === 403) {
            console.log("Security passed: Student received 403 Forbidden as expected.");
        } else {
            throw err;
        }
    }

    // 8. Security: Teacher accessing management endpoint must be rejected (403)
    console.log("8. Security check: Teacher trying to access /api/ielts/management/overview (expect 403)...");
    try {
        await axios.get(`${BASE_URL}/ielts/management/overview`, teacherHeaders);
        throw new Error("SECURITY FAILURE: Teacher was able to access management overview!");
    } catch (err) {
        if (err.response?.status === 403) {
            console.log("Security passed: Teacher received 403 Forbidden as expected.");
        } else {
            throw err;
        }
    }

    // 9. Read-Only Oversight: Management cannot create questions (expect 403)
    console.log("9. Read-only oversight check: Management trying to create question (expect 403)...");
    try {
        await axios.post(`${BASE_URL}/ielts/questions`, {
            skillType: 'READING',
            prompt: 'Test Question'
        }, managementHeaders);
        throw new Error("SECURITY FAILURE: Management was able to create question!");
    } catch (err) {
        if (err.response?.status === 403) {
            console.log("Read-only oversight passed: Management received 403 Forbidden for content modification.");
        } else {
            throw err;
        }
    }

    console.log("=== PHASE 11 VERIFICATION COMPLETED AND PASSED 100% ===");
}

runVerification().catch(err => {
    console.error("Verification failed:", err.response?.data || err.message);
    process.exit(1);
});
