const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const { IELTSTest, IELTSAttempt } = require('./models/IELTS');
const User = require('./models/User');

const API_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('🧪 Starting Phase 8 IELTS Scoring & Results Verification Test Suite...\n');

  try {
    // 1. Verification of Cambridge IELTS Rounding Formula & Edge Cases
    console.log('1️⃣ Testing Cambridge IELTS Rounding Logic & Edge Cases...');
    function calculateOverall(scores) {
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      return Math.min(9.0, Math.max(0, Math.round(mean * 2) / 2));
    }

    const testCases = [
      { scores: [6.5, 6.5, 6.0, 6.5], expected: 6.5, note: '6.375 rounds up to 6.5' },
      { scores: [6.5, 6.0, 6.0, 6.0], expected: 6.0, note: '6.125 rounds down to 6.0' },
      { scores: [7.0, 6.5, 6.5, 7.0], expected: 7.0, note: '6.75 rounds up to 7.0' },
      { scores: [7.5, 7.0, 6.5, 7.0], expected: 7.0, note: '7.0 exactly is 7.0' },
      { scores: [8.0, 8.5, 8.5, 8.0], expected: 8.5, note: '8.25 rounds up to 8.5' }
    ];

    testCases.forEach((tc, idx) => {
      const res = calculateOverall(tc.scores);
      if (res !== tc.expected) {
        throw new Error(`Test case ${idx + 1} failed: expected ${tc.expected}, got ${res} (${tc.note})`);
      }
      console.log(`   ✅ Case ${idx + 1}: [${tc.scores.join(', ')}] -> Band ${res} (${tc.note})`);
    });

    // 2. Connect to DB to seed a realistic completed Full Mock Exam attempt
    console.log('\n2️⃣ Seeding Full Mock Exam with 4 skill band scores...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/edutech');

    const studentUser = await User.findOne({ username: 'student' });
    if (!studentUser) throw new Error('Student user not found in DB');

    let fullMockTest = await IELTSTest.findOne({ skillType: 'FULL_MOCK' }) || await IELTSTest.findOne({});
    if (!fullMockTest) throw new Error('No test found in DB to link mock attempt');

    const fullMockAttempt = new IELTSAttempt({
      studentId: studentUser._id,
      testId: fullMockTest._id,
      skillType: 'FULL_MOCK',
      skill: 'full',
      isFullMock: true,
      listeningBand: 7.5,
      readingBand: 7.0,
      writingBand: 6.5,
      speakingBand: 7.0,
      rawScore: 66,
      maxRawScore: 80,
      status: 'EVALUATED',
      durationSpent: 9600,
      timeSpentSeconds: 9600,
      teacherFeedback: 'Outstanding performance across Listening and Reading. Speaking demonstrated high fluency. Writing Task 2 needs slightly tighter paragraph coherence.',
      startedAt: new Date(Date.now() - 3 * 3600 * 1000),
      completedAt: new Date()
    });

    await fullMockAttempt.save();
    console.log(`   ✅ Seeded Full Mock Attempt ID: ${fullMockAttempt._id}`);
    console.log(`   ✅ Aggregated Overall Band: ${fullMockAttempt.overallBand}, CEFR: ${fullMockAttempt.overallCefrLevel}`);

    if (fullMockAttempt.overallBand !== 7.0) {
      throw new Error(`Expected overallBand 7.0, got ${fullMockAttempt.overallBand}`);
    }
    if (fullMockAttempt.overallCefrLevel !== 'C1') {
      throw new Error(`Expected overallCefrLevel C1, got ${fullMockAttempt.overallCefrLevel}`);
    }

    // 3. Student Login & Fetch Student Results
    console.log('\n3️⃣ Logging in as Student and fetching /api/ielts/results/student...');
    const studentLogin = await axios.post(`${API_URL}/login`, { username: 'student', password: 'student123' });
    const studentToken = studentLogin.data.token;

    const studentResultsRes = await axios.get(`${API_URL}/ielts/results/student`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    const stats = studentResultsRes.data.stats;
    console.log(`   ✅ Student Stats Retrieved: Overall Estimated Band: ${stats.estimatedOverallBand} (${stats.cefrLevel})`);
    console.log(`   ✅ Skill Averages: L=${stats.skillAverages.listening}, R=${stats.skillAverages.reading}, W=${stats.skillAverages.writing}, S=${stats.skillAverages.speaking}`);
    console.log(`   ✅ Total Attempts: ${stats.totalAttempts}, Completed: ${stats.completedAttempts}`);

    if (!stats.estimatedOverallBand || stats.estimatedOverallBand <= 0) {
      throw new Error(`Expected valid estimated overall band > 0, got ${stats.estimatedOverallBand}`);
    }

    // 4. Fetch Specific Attempt Scorecard
    console.log('\n4️⃣ Student fetching detailed scorecard via GET /api/ielts/results/:attemptId...');
    const scorecardRes = await axios.get(`${API_URL}/ielts/results/${fullMockAttempt._id}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    const sc = scorecardRes.data.scorecard;
    console.log(`   ✅ Scorecard Retrieved: Overall Band: ${sc.overallBand}, CEFR: ${sc.cefrLevel}`);
    console.log(`   ✅ Section Bands: L=${sc.sectionBands.listening}, R=${sc.sectionBands.reading}, W=${sc.sectionBands.writing}, S=${sc.sectionBands.speaking}`);
    console.log(`   ✅ Teacher Feedback: "${sc.teacherFeedback.substring(0, 50)}..."`);

    if (sc.overallBand !== 7.0 || sc.sectionBands.listening !== 7.5) {
      throw new Error(`Scorecard band mismatch: overall=${sc.overallBand}, listening=${sc.sectionBands.listening}`);
    }

    // 5. Security Checks: Unauthorized data isolation
    console.log('\n5️⃣ Security Check: Verifying student CANNOT access cohort results (403 Forbidden)...');
    try {
      await axios.get(`${API_URL}/ielts/results/cohort`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      throw new Error('SECURITY VIOLATION: Student was able to access cohort results!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('   ✅ 403 Forbidden correctly returned for student cohort access.');
      } else {
        throw err;
      }
    }

    // 6. Teacher Login & Cohort Results Access
    console.log('\n6️⃣ Logging in as Teacher and fetching /api/ielts/results/cohort...');
    const teacherLogin = await axios.post(`${API_URL}/login`, { username: 'teacher', password: 'teacher123' });
    const teacherToken = teacherLogin.data.token;

    const cohortRes = await axios.get(`${API_URL}/ielts/results/cohort`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    const cStats = cohortRes.data.cohortStats;
    console.log(`   ✅ Cohort Stats: Average Band=${cStats.cohortAverageBand}, Highest=${cStats.highestBand}, Pass Rate=${cStats.passRate}%`);
    console.log(`   ✅ Distribution: Expert=${cohortRes.data.bandDistribution.expert}, Very Good=${cohortRes.data.bandDistribution.veryGood}, Competent=${cohortRes.data.bandDistribution.competent}`);
    console.log(`   ✅ Total Attempts in Cohort: ${cStats.totalAttempts}`);

    if (cStats.cohortAverageBand <= 0) {
      throw new Error('Expected positive cohort average band');
    }

    // 7. Teacher Accesses Student Scorecard
    console.log('\n7️⃣ Teacher accessing student scorecard...');
    const teacherScorecardRes = await axios.get(`${API_URL}/ielts/results/${fullMockAttempt._id}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log(`   ✅ Teacher successfully retrieved candidate scorecard for: ${teacherScorecardRes.data.student.username}`);

    console.log('\n🎉 ALL PHASE 8 SCORING & RESULTS AGGREGATION TESTS PASSED PERFECTLY! 🚀\n');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit(1);
  }
}

runTests();
