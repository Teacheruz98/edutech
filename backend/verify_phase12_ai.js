const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5001/api';

async function runVerification() {
    console.log("=== STARTING PHASE 12: AI IELTS EVALUATION VERIFICATION ===");

    // 1. Authenticate users
    console.log("1. Authenticating Admin, Teacher, and Student...");
    const adminLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'Safarmurod',
        password: 'admin123'
    });
    const adminToken = adminLogin.data.token;

    const teacherLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'teacher',
        password: 'teacher123'
    });
    const teacherToken = teacherLogin.data.token;

    const studentLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'student',
        password: 'student123'
    });
    const studentToken = studentLogin.data.token;
    const studentId = studentLogin.data.user?.id || studentLogin.data.user?._id;

    console.log("Authentication successful.");

    // Connect to MongoDB to find or create test attempts
    await mongoose.connect('mongodb://localhost:27017/edutech');
    const { IELTSTest, IELTSAttempt, User } = require('./models/IELTS');

    let writingTest = await IELTSTest.findOne({ skillType: 'WRITING' });
    if (!writingTest) {
        writingTest = await IELTSTest.findOne({});
    }

    // 2. Create or find a Writing Attempt for student
    console.log("2. Preparing student Writing Attempt with Task 1 & Task 2 essays...");
    const task1Sample = "The chart illustrates the consumption of energy across five distinct economic sectors between 2010 and 2020. " +
        "Overall, it is evident that industrial energy usage demonstrated a significant increase, whereas residential consumption fluctuated moderately. " +
        "In 2010, the industrial sector was responsible for predominantly 40 percent of total energy usage. " +
        "Furthermore, this proportion climbed substantially to reach an apex of 55 percent by the end of the decade. " +
        "Conversely, transportation energy demand diminished slightly from 25 percent to 20 percent over the same period. " +
        "In contrast, agricultural consumption remained virtually stable at approximately 10 percent. " +
        "In summary, the trajectory indicates that industrial processes became increasingly energy-intensive, contrasting with modest reductions in household consumption.";

    const task2Sample = "In the modern era, rapid technological advancement has significantly transformed global education systems. " +
        "While some individuals argue that traditional classroom settings will soon become obsolete, I firmly believe that blended pedagogical models offer the most effective learning trajectory. " +
        "On the one hand, digital learning platforms provide students with unprecedented flexibility and access to comprehensive academic resources. " +
        "For instance, candidates can explore complex concepts through interactive modules, which facilitates autonomous learning and critical thinking. " +
        "Moreover, artificial intelligence allows educational materials to be tailored to individual paces, thereby mitigating learning gaps that often arise in overcrowded classrooms. " +
        "On the other hand, the physical classroom environment fosters indispensable social interactions and collaborative problem-solving skills that cannot be entirely replicated by algorithms. " +
        "Face-to-face discussions with experienced educators encourage immediate clarification and cultivate emotional intelligence among peers. " +
        "Furthermore, cooperative group projects require negotiation and mutual accountability, both of which are paramount in contemporary professional environments. " +
        "In conclusion, although digital technologies provide substantial advantages in accessibility and efficiency, human mentorship remains crucial. " +
        "Therefore, an integrated educational framework that synthesizes digital innovation with classroom engagement represents the optimal approach for future generations.";

    const writingAttempt = new IELTSAttempt({
        studentId: studentId,
        testId: writingTest ? writingTest._id : new mongoose.Types.ObjectId(),
        skillType: 'WRITING',
        skill: 'writing',
        task1Answer: task1Sample,
        task1WordCount: task1Sample.split(/\s+/).length,
        task2Answer: task2Sample,
        task2WordCount: task2Sample.split(/\s+/).length,
        status: 'SUBMITTED',
        startedAt: new Date(Date.now() - 3600000),
        completedAt: new Date()
    });
    await writingAttempt.save();
    console.log(`Writing Attempt created: ID ${writingAttempt._id} (T1: ${writingAttempt.task1WordCount} words, T2: ${writingAttempt.task2WordCount} words)`);

    // 3. Test POST /api/ielts/ai/evaluate-writing/:attemptId (as Teacher)
    console.log("3. Testing POST /api/ielts/ai/evaluate-writing/:attemptId as Teacher...");
    const aiWritingRes = await axios.post(`${BASE_URL}/ielts/ai/evaluate-writing/${writingAttempt._id}`, {}, {
        headers: { Authorization: `Bearer ${teacherToken}` }
    });

    if (aiWritingRes.status !== 200 || !aiWritingRes.data.aiFeedback) {
        throw new Error("AI Writing evaluation failed to return aiFeedback structure.");
    }
    const aiFeedback = aiWritingRes.data.aiFeedback;
    console.log("AI Writing Evaluation Output:", {
        overallBand: aiFeedback.overallBand,
        criteriaScores: aiFeedback.criteriaScores,
        strengthsCount: aiFeedback.strengths?.length,
        areasForImprovementCount: aiFeedback.areasForImprovement?.length,
        summary: aiFeedback.detailedComments
    });

    if (!aiFeedback.criteriaScores.taskAchievement || !aiFeedback.criteriaScores.coherenceCohesion ||
        !aiFeedback.criteriaScores.lexicalResource || !aiFeedback.criteriaScores.grammaticalRange) {
        throw new Error("Missing criteria scores in AI Writing Evaluation.");
    }

    // 4. Test GET /api/ielts/ai/feedback/:attemptId as Student (Owner)
    console.log("4. Testing GET /api/ielts/ai/feedback/:attemptId as Student (Owner)...");
    const getAiFeedbackRes = await axios.get(`${BASE_URL}/ielts/ai/feedback/${writingAttempt._id}`, {
        headers: { Authorization: `Bearer ${studentToken}` }
    });

    if (getAiFeedbackRes.status !== 200 || !getAiFeedbackRes.data.aiFeedback) {
        throw new Error("Student failed to retrieve their own AI feedback.");
    }
    console.log(`Student retrieved AI feedback successfully: Band ${getAiFeedbackRes.data.aiFeedback.overallBand}`);

    // 5. Test Data Isolation & Security: Another student cannot access
    console.log("5. Testing Security: Verifying unauthorized student cannot fetch or evaluate another's attempt...");
    // Find or create another student
    const otherStudentLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'ali_valiyev',
        password: '1234'
    });
    const otherToken = otherStudentLogin.data.token;

    try {
        await axios.get(`${BASE_URL}/ielts/ai/feedback/${writingAttempt._id}`, {
            headers: { Authorization: `Bearer ${otherToken}` }
        });
        throw new Error("Security breach! Unauthorized student was able to access attempt feedback.");
    } catch (err) {
        if (err.response && err.response.status === 403) {
            console.log("Security passed: Unauthorized student received 403 Forbidden as expected.");
        } else {
            throw err;
        }
    }

    try {
        await axios.post(`${BASE_URL}/ielts/ai/evaluate-writing/${writingAttempt._id}`, {}, {
            headers: { Authorization: `Bearer ${otherToken}` }
        });
        throw new Error("Security breach! Unauthorized student was able to trigger evaluation on another student.");
    } catch (err) {
        if (err.response && err.response.status === 403) {
            console.log("Security passed: Unauthorized student trigger received 403 Forbidden as expected.");
        } else {
            throw err;
        }
    }

    // 6. Test Speaking AI Evaluation
    console.log("6. Testing POST /api/ielts/ai/evaluate-speaking/:attemptId...");
    const speakingAttempt = new IELTSAttempt({
        studentId: studentId,
        testId: writingTest ? writingTest._id : new mongoose.Types.ObjectId(),
        skillType: 'SPEAKING',
        skill: 'speaking',
        speakingSubmissions: [
            { partNumber: 1, promptText: "Where are you from?", durationSeconds: 65 },
            { partNumber: 2, promptText: "Describe a memorable journey", durationSeconds: 120 },
            { partNumber: 3, promptText: "How has transportation evolved?", durationSeconds: 140 }
        ],
        status: 'SUBMITTED',
        startedAt: new Date(Date.now() - 1800000),
        completedAt: new Date()
    });
    await speakingAttempt.save();

    const aiSpeakingRes = await axios.post(`${BASE_URL}/ielts/ai/evaluate-speaking/${speakingAttempt._id}`, {}, {
        headers: { Authorization: `Bearer ${teacherToken}` }
    });

    if (aiSpeakingRes.status !== 200 || !aiSpeakingRes.data.aiFeedback) {
        throw new Error("AI Speaking evaluation failed to return aiFeedback structure.");
    }
    const aiSpeakingFeedback = aiSpeakingRes.data.aiFeedback;
    console.log("AI Speaking Evaluation Output:", {
        overallBand: aiSpeakingFeedback.overallBand,
        criteriaScores: aiSpeakingFeedback.criteriaScores,
        strengths: aiSpeakingFeedback.strengths?.length,
        areasForImprovement: aiSpeakingFeedback.areasForImprovement?.length,
        comments: aiSpeakingFeedback.detailedComments
    });

    if (!aiSpeakingFeedback.criteriaScores.fluencyCoherence || !aiSpeakingFeedback.criteriaScores.pronunciation) {
        throw new Error("Missing speaking criteria in AI feedback.");
    }

    // 7. Test Results Scorecard Endpoint includes AI feedback
    console.log("7. Testing GET /api/ielts/results/:attemptId scorecard integration...");
    const scorecardRes = await axios.get(`${BASE_URL}/ielts/results/${writingAttempt._id}`, {
        headers: { Authorization: `Bearer ${studentToken}` }
    });

    if (scorecardRes.status !== 200 || !scorecardRes.data.aiFeedback) {
        throw new Error("Scorecard failed to include aiFeedback.");
    }
    console.log("Scorecard successfully included aiFeedback with predicted band:", scorecardRes.data.aiFeedback.overallBand);

    console.log("=== PHASE 12 VERIFICATION COMPLETED AND PASSED 100% ===");
    await mongoose.disconnect();
    process.exit(0);
}

runVerification().catch(err => {
    console.error("Verification failed:", err.message, err.response?.data || '');
    process.exit(1);
});
