const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('🧪 Starting Phase 6 Verification Test Suite...\n');

  try {
    // 1. Student Login
    console.log('1️⃣ Logging in as Student...');
    const studentLoginRes = await axios.post(`${API_URL}/login`, {
      username: 'student',
      password: 'student123'
    });
    const studentToken = studentLoginRes.data.token;
    console.log('   ✅ Student logged in successfully.');

    // 2. Fetch Published Writing Tests
    console.log('\n2️⃣ Fetching published Writing tests...');
    const testsRes = await axios.get(`${API_URL}/ielts/student/tests?skill=writing`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const writingTests = testsRes.data.tests || [];
    if (writingTests.length === 0) {
      throw new Error('No published writing tests found!');
    }
    const testId = writingTests[0]._id;
    console.log(`   ✅ Found test: "${writingTests[0].title}" (ID: ${testId})`);

    // 3. Start Writing Attempt
    console.log('\n3️⃣ Starting Writing Attempt...');
    const startRes = await axios.post(`${API_URL}/ielts/attempts/start`, {
      testId: testId,
      mode: 'PRACTICE'
    }, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const attemptId = startRes.data.attemptId || startRes.data.attempt?._id;
    console.log(`   ✅ Attempt started with ID: ${attemptId}`);

    // 4. Autosave Writing responses
    console.log('\n4️⃣ Testing Autosave for Task 1 and Task 2...');
    const task1Sample = "The chart illustrates the changes in renewable energy production across five distinct sectors between 2010 and 2020. Overall, solar and wind energy witnessed significant exponential growth, while hydroelectric power remained relatively stable throughout the decade. In 2010, hydroelectric was the primary contributor at 45 percent, but by 2020 solar surpassed it dramatically.";
    const task2Sample = "In the contemporary digital era, the question of whether artificial intelligence will completely replace traditional classroom educators has sparked intense global debate. In my view, while technology undoubtedly augments educational access and provides bespoke learning pathways, human instructors remain completely irreplaceable due to essential emotional intelligence, mentorship, and ethical guidance. Teachers do not merely deliver factual information; they cultivate critical thinking, inspire curiosity, and support social-emotional development. Consequently, a blended pedagogical approach that harnesses AI for administrative efficiency while retaining human teachers represents the optimal future of education.";

    const autosaveRes = await axios.put(`${API_URL}/ielts/writing/attempts/${attemptId}/autosave`, {
      task1Answer: task1Sample,
      task2Answer: task2Sample,
      task1WordCount: task1Sample.trim().split(/\s+/).length,
      task2WordCount: task2Sample.trim().split(/\s+/).length
    }, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log(`   ✅ Autosaved successfully: T1 Words: ${autosaveRes.data.task1WordCount}, T2 Words: ${autosaveRes.data.task2WordCount}`);

    // 5. Submit Writing Test
    console.log('\n5️⃣ Submitting Writing Test...');
    const submitRes = await axios.post(`${API_URL}/ielts/writing/attempts/${attemptId}/submit`, {
      task1Answer: task1Sample,
      task2Answer: task2Sample
    }, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log(`   ✅ Test submitted! Status: ${submitRes.data.attempt.status}`);
    if (submitRes.data.attempt.status !== 'PENDING_EVALUATION') {
      throw new Error(`Expected status PENDING_EVALUATION, got ${submitRes.data.attempt.status}`);
    }

    // 6. Security Check: Student accessing teacher evaluation endpoint
    console.log('\n6️⃣ Security Check: Verifying student CANNOT access teacher evaluation queue...');
    try {
      await axios.get(`${API_URL}/ielts/evaluations/writing`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      throw new Error('SECURITY VIOLATION: Student was able to access teacher evaluation queue!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('   ✅ 403 Forbidden correctly returned for student access attempt.');
      } else {
        throw err;
      }
    }

    // 7. Teacher Login
    console.log('\n7️⃣ Logging in as Teacher...');
    const teacherLoginRes = await axios.post(`${API_URL}/login`, {
      username: 'teacher',
      password: 'teacher123'
    });
    const teacherToken = teacherLoginRes.data.token;
    console.log('   ✅ Teacher logged in successfully.');

    // 8. Teacher fetches pending evaluations queue
    console.log('\n8️⃣ Teacher fetching pending evaluation queue...');
    const queueRes = await axios.get(`${API_URL}/ielts/evaluations/writing`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const pendingList = queueRes.data.evaluations || [];
    console.log(`   ✅ Pending evaluations in queue: ${queueRes.data.pendingCount || pendingList.length}`);
    const targetPending = pendingList.find(e => e._id === attemptId);
    if (!targetPending) {
      throw new Error(`Submitted attempt ${attemptId} not found in teacher queue!`);
    }
    console.log(`   ✅ Target attempt ${attemptId} confirmed present in teacher queue.`);

    // 9. Teacher fetches detailed attempt
    console.log('\n9️⃣ Teacher fetching detailed attempt for evaluation...');
    const detailRes = await axios.get(`${API_URL}/ielts/evaluations/writing/${attemptId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log(`   ✅ Attempt details retrieved: Student: ${detailRes.data.student?.name || detailRes.data.student?.username}, Test: ${detailRes.data.test?.title}`);

    // 10. Teacher evaluates submission using official Cambridge Criteria
    console.log('\n🔟 Teacher submitting Cambridge 4-criteria evaluation...');
    // TA: 7.0, CC: 6.5, LR: 7.5, GRA: 6.5 -> Mean = 27.5 / 4 = 6.875 -> Rounded Cambridge Band = 7.0
    const evalPayload = {
      criteriaScores: {
        taskAchievement: 7.0,
        coherenceCohesion: 6.5,
        lexicalResource: 7.5,
        grammaticalRange: 6.5
      },
      qualitativeFeedback: "Strong overall performance. Task 1 provides an accurate summary with clear overview and effective trend comparisons. Task 2 presents a well-structured argument with relevant examples and sophisticated lexical flexibility. Work on complex sentence punctuation to reach band 8.0."
    };

    const evalRes = await axios.post(`${API_URL}/ielts/evaluations/writing/${attemptId}`, evalPayload, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    console.log(`   ✅ Evaluation published! Overall Band: ${evalRes.data.evaluation.overallBand}`);
    if (evalRes.data.evaluation.overallBand !== 7) {
      throw new Error(`Expected overallBand 7.0, got ${evalRes.data.evaluation.overallBand}`);
    }

    // 11. Verify Attempt is now marked EVALUATED
    console.log('\n1️⃣1️⃣ Verifying attempt status updated to EVALUATED...');
    const verifyAttemptRes = await axios.get(`${API_URL}/ielts/evaluations/writing/${attemptId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log(`   ✅ Attempt status: ${verifyAttemptRes.data.attempt.status}, Overall Band in Attempt: ${verifyAttemptRes.data.attempt.overallBand}`);
    if (verifyAttemptRes.data.attempt.status !== 'EVALUATED') {
      throw new Error(`Expected attempt status EVALUATED, got ${verifyAttemptRes.data.attempt.status}`);
    }

    console.log('\n🎉 ALL PHASE 6 WRITING ENGINE & EVALUATION TESTS PASSED PERFECTLY! 🚀\n');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
