const axios = require('axios');
const FormData = require('form-data');

const API_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('🧪 Starting Phase 7 Speaking Verification Test Suite...\n');

  try {
    // 1. Student Login
    console.log('1️⃣ Logging in as Student...');
    const studentLoginRes = await axios.post(`${API_URL}/login`, {
      username: 'student',
      password: 'student123'
    });
    const studentToken = studentLoginRes.data.token;
    console.log('   ✅ Student logged in successfully.');

    // 2. Fetch Published Speaking Tests
    console.log('\n2️⃣ Fetching published Speaking tests...');
    const testsRes = await axios.get(`${API_URL}/ielts/student/tests?skill=speaking`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const speakingTests = testsRes.data.tests || [];
    if (speakingTests.length === 0) {
      throw new Error('No published speaking tests found!');
    }
    const testId = speakingTests[0]._id;
    console.log(`   ✅ Found test: "${speakingTests[0].title}" (ID: ${testId})`);

    // 3. Start Speaking Attempt
    console.log('\n3️⃣ Starting Speaking Attempt...');
    const startRes = await axios.post(`${API_URL}/ielts/attempts/start`, {
      testId: testId,
      mode: 'PRACTICE'
    }, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const attemptId = startRes.data.attemptId || startRes.data.attempt?._id;
    console.log(`   ✅ Attempt started with ID: ${attemptId}`);

    // 4. Upload Audio Responses for Part 1, Part 2, and Part 3
    console.log('\n4️⃣ Testing Audio Upload for Part 1, Part 2, and Part 3...');
    const partsData = [
      { part: 1, duration: 45, text: 'Part 1 Interview response on hometown and daily routine' },
      { part: 2, duration: 110, text: 'Part 2 Cue card monologue on memorable public transport journey' },
      { part: 3, duration: 95, text: 'Part 3 In-depth discussion on urban mobility and future transit' }
    ];

    for (const p of partsData) {
      const form = new FormData();
      // Create a mock audio buffer (simulating a lightweight webm/wav audio recording)
      const mockAudioBuffer = Buffer.from(`RIFF....WAVEfmt ....data...MOCK_AUDIO_DATA_FOR_PART_${p.part}`);
      form.append('audio', mockAudioBuffer, {
        filename: `mock_speech_part${p.part}.webm`,
        contentType: 'audio/webm'
      });
      form.append('partNumber', p.part);
      form.append('durationSeconds', p.duration);
      form.append('promptText', p.text);

      const uploadRes = await axios.post(`${API_URL}/ielts/speaking/attempts/${attemptId}/upload-audio`, form, {
        headers: {
          Authorization: `Bearer ${studentToken}`,
          ...form.getHeaders()
        }
      });

      console.log(`   ✅ Part ${p.part} uploaded: URL=${uploadRes.data.audioUrl}, Duration=${uploadRes.data.durationSeconds}s`);
      if (!uploadRes.data.audioUrl.startsWith('/uploads/ielts-speaking/')) {
        throw new Error(`Unexpected audioUrl format: ${uploadRes.data.audioUrl}`);
      }
    }

    // 5. Submit Speaking Test
    console.log('\n5️⃣ Submitting Speaking Test for Teacher Evaluation...');
    const submitRes = await axios.post(`${API_URL}/ielts/speaking/attempts/${attemptId}/submit`, {}, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log(`   ✅ Test submitted! Status: ${submitRes.data.attempt.status}`);
    if (submitRes.data.attempt.status !== 'PENDING_EVALUATION') {
      throw new Error(`Expected status PENDING_EVALUATION, got ${submitRes.data.attempt.status}`);
    }

    // 6. Security Check: Student accessing teacher speaking evaluation endpoint
    console.log('\n6️⃣ Security Check: Verifying student CANNOT access teacher speaking evaluation queue...');
    try {
      await axios.get(`${API_URL}/ielts/evaluations/speaking`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      throw new Error('SECURITY VIOLATION: Student was able to access teacher speaking evaluation queue!');
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

    // 8. Teacher fetches pending speaking evaluations queue
    console.log('\n8️⃣ Teacher fetching pending speaking evaluation queue...');
    const queueRes = await axios.get(`${API_URL}/ielts/evaluations/speaking`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const pendingList = queueRes.data.evaluations || [];
    console.log(`   ✅ Pending speaking evaluations in queue: ${queueRes.data.pendingCount || pendingList.length}`);
    const targetPending = pendingList.find(e => e._id === attemptId);
    if (!targetPending) {
      throw new Error(`Submitted attempt ${attemptId} not found in teacher queue!`);
    }
    console.log(`   ✅ Target attempt ${attemptId} confirmed present in teacher queue.`);

    // 9. Teacher fetches detailed attempt
    console.log('\n9️⃣ Teacher fetching detailed attempt for speaking evaluation...');
    const detailRes = await axios.get(`${API_URL}/ielts/evaluations/speaking/${attemptId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log(`   ✅ Attempt details retrieved: Student: ${detailRes.data.student?.username || detailRes.data.student?.name}, Test: ${detailRes.data.test?.title}`);
    console.log(`   ✅ Audio Submissions count: ${detailRes.data.speakingSubmissions?.length}`);
    if (!detailRes.data.speakingSubmissions || detailRes.data.speakingSubmissions.length !== 3) {
      throw new Error(`Expected 3 audio submissions, got ${detailRes.data.speakingSubmissions?.length}`);
    }

    // 10. Teacher evaluates submission using official Cambridge Criteria
    console.log('\n🔟 Teacher submitting Cambridge 4-criteria evaluation...');
    // FC: 7.0, LR: 6.5, GRA: 7.0, PR: 7.5 -> Mean = 28.0 / 4 = 7.0 -> Rounded Cambridge Band = 7.0
    const evalPayload = {
      criteriaScores: {
        fluencyCoherence: 7.0,
        lexicalResource: 6.5,
        grammaticalRange: 7.0,
        pronunciation: 7.5
      },
      qualitativeFeedback: "Strong overall communicative competence. Candidate speaks fluently with rare hesitations and demonstrates a wide range of connective discourse markers. Good lexical flexibility in Part 2. In Part 3, grammatical accuracy remained solid across complex conditionals. Pronunciation is clear and easy to understand with natural rhythm."
    };

    const evalRes = await axios.post(`${API_URL}/ielts/evaluations/speaking/${attemptId}`, evalPayload, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    console.log(`   ✅ Evaluation published! Overall Band: ${evalRes.data.evaluation.overallBand}`);
    if (evalRes.data.evaluation.overallBand !== 7) {
      throw new Error(`Expected overallBand 7.0, got ${evalRes.data.evaluation.overallBand}`);
    }

    // 11. Verify Attempt is now marked EVALUATED
    console.log('\n1️⃣1️⃣ Verifying attempt status updated to EVALUATED...');
    const verifyAttemptRes = await axios.get(`${API_URL}/ielts/evaluations/speaking/${attemptId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log(`   ✅ Attempt status: ${verifyAttemptRes.data.attempt.status}, Overall Band in Attempt: ${verifyAttemptRes.data.attempt.overallBand}`);
    if (verifyAttemptRes.data.attempt.status !== 'EVALUATED') {
      throw new Error(`Expected attempt status EVALUATED, got ${verifyAttemptRes.data.attempt.status}`);
    }

    console.log('\n🎉 ALL PHASE 7 SPEAKING ENGINE & EVALUATION TESTS PASSED PERFECTLY! 🚀\n');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
