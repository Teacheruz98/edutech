const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function runVerification() {
    console.log("=== STARTING PHASE 10: PROGRESS & MISTAKES VERIFICATION ===");

    // 1. Authenticate test users
    console.log("1. Authenticating student and teacher...");
    const studentLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'student',
        password: 'student123'
    });
    const studentToken = studentLogin.data.token;
    const studentHeaders = { headers: { Authorization: `Bearer ${studentToken}` } };

    const teacherLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'teacher',
        password: 'teacher123'
    });
    const teacherToken = teacherLogin.data.token;
    const teacherHeaders = { headers: { Authorization: `Bearer ${teacherToken}` } };

    const adminLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'Safarmurod',
        password: 'admin123'
    });
    const adminHeaders = { headers: { Authorization: `Bearer ${adminLogin.data.token}` } };

    console.log("Users authenticated successfully.");

    // 2. Find a Reading test to take
    console.log("2. Fetching available tests...");
    const testsRes = await axios.get(`${BASE_URL}/ielts/student/tests?skillType=READING`, studentHeaders);
    const readingTests = testsRes.data.tests;
    if (!readingTests || readingTests.length === 0) {
        throw new Error("No Reading tests found for testing!");
    }
    const readingTest = readingTests[0];
    console.log(`Selected Reading test: "${readingTest.title}" (${readingTest._id})`);

    // 3. Start attempt
    console.log("3. Starting test attempt...");
    const startRes = await axios.post(`${BASE_URL}/ielts/attempts/start`, {
        testId: readingTest._id
    }, studentHeaders);
    const attemptId = startRes.data.attemptId;
    console.log(`Attempt started with id: ${attemptId}`);

    // Fetch full test to inspect questions
    const testDetails = await axios.get(`${BASE_URL}/ielts/tests/${readingTest._id}`, adminHeaders);
    const questions = [];
    (testDetails.data.test.sections || []).forEach(s => {
        (s.questionIds || []).forEach(q => {
            if (q && q._id) questions.push(q);
        });
    });

    if (questions.length === 0) {
        throw new Error("Test has no questions to grade!");
    }

    // Prepare answers: make 1 correct and 1 wrong deliberately
    const q1 = questions[0];
    const answersPayload = [
        {
            questionId: q1._id,
            studentAnswer: "DELIBERATELY_WRONG_ANSWER_12345"
        }
    ];
    if (questions.length > 1) {
        const q2 = questions[1];
        answersPayload.push({
            questionId: q2._id,
            studentAnswer: q2.correctAnswer || "TRUE"
        });
    }

    // 4. Submit test attempt
    console.log("4. Submitting test attempt with intentional mistake...");
    const submitRes = await axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/submit`, {
        answers: answersPayload,
        durationSpent: 600
    }, studentHeaders);
    console.log("Test submitted:", submitRes.data.message);

    // 5. Verify that IELTSMistake was automatically populated
    console.log("5. Fetching student mistakes notebook...");
    const mistakesRes = await axios.get(`${BASE_URL}/ielts/mistakes`, studentHeaders);
    console.log(`Total mistakes in notebook: ${mistakesRes.data.stats.totalMistakes}`);
    const loggedMistake = mistakesRes.data.mistakes.find(m => m.studentAnswer === "DELIBERATELY_WRONG_ANSWER_12345");
    if (!loggedMistake) {
        throw new Error("Deliberate mistake was NOT automatically logged into student's mistake notebook!");
    }
    console.log("Mistake logged successfully:", {
        id: loggedMistake._id,
        skillType: loggedMistake.skillType,
        studentAnswer: loggedMistake.studentAnswer,
        correctAnswer: loggedMistake.correctAnswer,
        isReviewed: loggedMistake.isReviewed
    });
    if (loggedMistake.isReviewed !== false) {
        throw new Error("Expected mistake isReviewed to default to false!");
    }

    // 6. Test Mark as Mastered / Reviewed
    console.log("6. Testing review toggle: Mark as Mastered...");
    const reviewRes = await axios.patch(`${BASE_URL}/ielts/mistakes/${loggedMistake._id}/review`, {
        isReviewed: true
    }, studentHeaders);
    if (!reviewRes.data.mistake.isReviewed || !reviewRes.data.mistake.reviewedAt) {
        throw new Error("Mistake was not marked as reviewed or reviewedAt was not recorded!");
    }
    console.log("Mistake mastered successfully:", reviewRes.data.message, "reviewedAt:", reviewRes.data.mistake.reviewedAt);

    // 7. Test Strict Data Isolation: Teacher or other user cannot alter student's mistake
    console.log("7. Testing strict data isolation: Other user trying to alter student mistake...");
    try {
        await axios.patch(`${BASE_URL}/ielts/mistakes/${loggedMistake._id}/review`, {
            isReviewed: false
        }, teacherHeaders);
        throw new Error("SECURITY FAILURE: Unauthorized user was able to modify student's mistake!");
    } catch (err) {
        if (err.response?.status === 403) {
            console.log("Data isolation passed: Received 403 Forbidden as expected.");
        } else {
            throw err;
        }
    }

    // 8. Test Student Progress API
    console.log("8. Testing Student Progress API (/api/ielts/progress)...");
    const progressRes = await axios.get(`${BASE_URL}/ielts/progress`, studentHeaders);
    const progress = progressRes.data.progress;
    console.log("Progress Overview:", progress.overview);
    console.log("Skills Summary:", {
        reading: progress.skills.reading,
        listening: progress.skills.listening
    });
    console.log(`Progression timeline entries: ${progress.progressionTimeline?.length}`);
    console.log(`Recent activity entries: ${progress.recentActivity?.length}`);

    if (progress.overview.totalCompletedTests < 1) {
        throw new Error("Progress API did not reflect completed tests count!");
    }

    console.log("=== PHASE 10 VERIFICATION COMPLETED AND PASSED 100% ===");
}

runVerification().catch(err => {
    console.error("Verification failed:", err.response?.data || err.message);
    process.exit(1);
});
