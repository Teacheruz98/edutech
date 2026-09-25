const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function runVerification() {
    console.log("=== STARTING PHASE 9 ASSIGNMENTS VERIFICATION ===");

    // 1. Authenticate Teacher and Student
    console.log("1. Authenticating test users...");
    const teacherLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'teacher',
        password: 'teacher123'
    });
    const teacherToken = teacherLogin.data.token;
    const teacherHeaders = { headers: { Authorization: `Bearer ${teacherToken}` } };

    const studentLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'student',
        password: 'student123'
    });
    const studentToken = studentLogin.data.token;
    const studentHeaders = { headers: { Authorization: `Bearer ${studentToken}` } };

    console.log("Teacher and Student authenticated successfully.");

    // 2. Fetch Metadata for assignment creation
    console.log("2. Fetching assignment metadata as teacher...");
    const metaRes = await axios.get(`${BASE_URL}/ielts/assignments/meta`, teacherHeaders);
    console.log(`Found ${metaRes.data.tests?.length} tests, ${metaRes.data.classes?.length} classes, ${metaRes.data.students?.length} students.`);
    if (!metaRes.data.tests || metaRes.data.tests.length === 0) {
        throw new Error("No tests available to assign!");
    }
    const targetTest = metaRes.data.tests[0];
    console.log(`Selected test for assignment: "${targetTest.title}" (${targetTest.skillType || targetTest.skill})`);

    // 3. Verify Role Security: Student cannot create assignment
    console.log("3. Testing role security: Student trying to create assignment (must return 403)...");
    try {
        await axios.post(`${BASE_URL}/ielts/assignments`, {
            testId: targetTest._id,
            title: "Hacked Assignment"
        }, studentHeaders);
        throw new Error("SECURITY FAILURE: Student was able to create an assignment!");
    } catch (err) {
        if (err.response?.status === 403) {
            console.log("Role security passed: Student received 403 Forbidden as expected.");
        } else {
            throw err;
        }
    }

    // 4. Teacher creates an assignment for ALL students with a future due date
    console.log("4. Teacher creating a new assignment for ALL students...");
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days in future
    const createRes = await axios.post(`${BASE_URL}/ielts/assignments`, {
        testId: targetTest._id,
        title: `Mock Test Homework - ${new Date().toLocaleDateString()}`,
        targetType: 'ALL',
        dueDate: dueDate.toISOString(),
        instructions: "Please complete this test before Friday. Pay close attention to timing.",
        allowLateSubmission: false
    }, teacherHeaders);

    const createdAssignment = createRes.data.assignment;
    console.log("Assignment created successfully:", createdAssignment._id, createdAssignment.title);

    // 5. Student checks their assignments list
    console.log("5. Student fetching their assignments list...");
    const studentAssignmentsRes = await axios.get(`${BASE_URL}/ielts/assignments/student`, studentHeaders);
    const myAssignment = studentAssignmentsRes.data.assignments.find(a => a._id === createdAssignment._id);
    if (!myAssignment) {
        throw new Error("Student did not receive the assigned test in their assignments list!");
    }
    console.log(`Found assigned test in student portal: "${myAssignment.title}", studentStatus: ${myAssignment.studentStatus}`);
    if (myAssignment.studentStatus !== 'PENDING') {
        throw new Error(`Expected studentStatus to be PENDING, got: ${myAssignment.studentStatus}`);
    }

    // 6. Student starts the assigned test with assignmentId attached
    console.log("6. Student starting the assigned test...");
    const startRes = await axios.post(`${BASE_URL}/ielts/attempts/start`, {
        testId: targetTest._id,
        assignmentId: createdAssignment._id
    }, studentHeaders);

    console.log("Attempt started successfully with attemptId:", startRes.data.attemptId, "assignmentId:", startRes.data.assignmentId);

    // Verify studentStatus transitioned to IN_PROGRESS
    const studentAssignmentsRes2 = await axios.get(`${BASE_URL}/ielts/assignments/student`, studentHeaders);
    const myAssignment2 = studentAssignmentsRes2.data.assignments.find(a => a._id === createdAssignment._id);
    console.log(`Updated studentStatus: ${myAssignment2.studentStatus}`);
    if (myAssignment2.studentStatus !== 'IN_PROGRESS') {
        throw new Error(`Expected studentStatus to be IN_PROGRESS, got: ${myAssignment2.studentStatus}`);
    }

    // 7. Teacher checks their assignment tracking list and completion stats
    console.log("7. Teacher fetching assignments dashboard & stats...");
    const teacherListRes = await axios.get(`${BASE_URL}/ielts/assignments/teacher`, teacherHeaders);
    const teacherAssignmentItem = teacherListRes.data.assignments.find(a => a._id === createdAssignment._id);
    console.log("Teacher assignment item stats:", teacherAssignmentItem.stats);
    if (teacherAssignmentItem.stats.inProgressCount < 1) {
        throw new Error("Teacher stats did not reflect student inProgressCount!");
    }

    // 8. Teacher updates assignment status to CLOSED
    console.log("8. Teacher closing assignment...");
    const updateRes = await axios.put(`${BASE_URL}/ielts/assignments/${createdAssignment._id}`, {
        status: 'CLOSED'
    }, teacherHeaders);
    console.log("Assignment status updated to:", updateRes.data.assignment.status);

    // 9. Teacher fetches submissions list for this assignment
    console.log("9. Teacher fetching submissions list for assignment...");
    const submissionsRes = await axios.get(`${BASE_URL}/ielts/assignments/${createdAssignment._id}/submissions`, teacherHeaders);
    console.log(`Submissions list retrieved: ${submissionsRes.data.submissions.length} submission(s)`);

    console.log("=== PHASE 9 BACKEND VERIFICATION COMPLETE & PASSED 100% ===");
}

runVerification().catch(err => {
    console.error("Verification failed:", err.response?.data || err.message);
    process.exit(1);
});
