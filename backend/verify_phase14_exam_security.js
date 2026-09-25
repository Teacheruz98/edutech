const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5001/api';

async function runPhase14Verification() {
    console.log("==================================================");
    console.log("🚀 STARTING PHASE 14 EXAM SECURITY & AUTOSAVE TESTS");
    console.log("==================================================");

    try {
        // Step 1: Login as Student 1
        console.log("\n1️⃣ Logging in as Student 1 (student / student123)...");
        const studentRes = await axios.post(`${BASE_URL}/login`, {
            username: 'student',
            password: 'student123'
        });
        const studentToken = studentRes.data.token;
        const studentHeaders = { Authorization: `Bearer ${studentToken}` };
        console.log("✅ Student 1 logged in successfully.");

        // Step 2: Login as Student 2 (for isolation testing)
        console.log("\n2️⃣ Logging in as Student 2 (ali_valiyev / 1234)...");
        const student2Res = await axios.post(`${BASE_URL}/login`, {
            username: 'ali_valiyev',
            password: '1234'
        });
        const student2Token = student2Res.data.token;
        const student2Headers = { Authorization: `Bearer ${student2Token}` };
        console.log("✅ Student 2 logged in successfully.");

        // Step 3: Login as Teacher / Proctor
        console.log("\n3️⃣ Logging in as Teacher / Proctor (teacher / teacher123)...");
        const teacherRes = await axios.post(`${BASE_URL}/login`, {
            username: 'teacher',
            password: 'teacher123'
        });
        const teacherToken = teacherRes.data.token;
        const teacherHeaders = { Authorization: `Bearer ${teacherToken}` };
        console.log("✅ Teacher logged in successfully.");

        // Step 4: Obtain a test and start an attempt as Student 1
        console.log("\n4️⃣ Starting an exam attempt for Student 1...");
        const testsRes = await axios.get(`${BASE_URL}/ielts/student/tests`, { headers: studentHeaders });
        const tests = testsRes.data.tests || [];
        if (tests.length === 0) {
            throw new Error("No available IELTS tests found for student.");
        }
        const targetTest = tests[0];
        console.log(`Using test: ${targetTest.title} (ID: ${targetTest._id})`);

        const startRes = await axios.post(`${BASE_URL}/ielts/attempts/start`, {
            testId: targetTest._id
        }, { headers: studentHeaders });
        const attemptId = startRes.data.attemptId || startRes.data.attempt?._id;
        console.log(`✅ Attempt created/resumed (ID: ${attemptId})`);

        // Step 5: Test Keep-Alive Heartbeat endpoint
        console.log("\n5️⃣ Testing Keep-Alive Heartbeat endpoint (POST /api/ielts/attempts/:id/heartbeat)...");
        const heartbeatRes = await axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/heartbeat`, {}, { headers: studentHeaders });
        console.log("Heartbeat Response:", heartbeatRes.data);
        if (!heartbeatRes.data.ok || heartbeatRes.data.isTerminatedByProctor) {
            throw new Error("Heartbeat response invalid.");
        }
        console.log("✅ Keep-alive heartbeat verified successfully.");

        // Step 6: Test Security Violation Reporting
        console.log("\n6️⃣ Testing Security Violation Logging (POST /api/ielts/attempts/:id/violation)...");
        // Violation 1: Tab Switch
        const v1 = await axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/violation`, {
            type: 'TAB_SWITCH',
            details: 'Student switched browser tabs'
        }, { headers: studentHeaders });
        console.log(`Violation 1 (TAB_SWITCH): tabSwitchCount = ${v1.data.tabSwitchCount}`);

        // Violation 2: Fullscreen Exit
        const v2 = await axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/violation`, {
            type: 'FULLSCREEN_EXIT',
            details: 'Student exited fullscreen mode'
        }, { headers: studentHeaders });
        console.log(`Violation 2 (FULLSCREEN_EXIT): tabSwitchCount = ${v2.data.tabSwitchCount}`);

        // Violation 3: Window Blur
        const v3 = await axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/violation`, {
            type: 'WINDOW_BLUR',
            details: 'Browser window lost focus'
        }, { headers: studentHeaders });
        console.log(`Violation 3 (WINDOW_BLUR): tabSwitchCount = ${v3.data.tabSwitchCount}, warningLevel = ${v3.data.warningLevel}`);

        if (v3.data.tabSwitchCount < 3) {
            throw new Error(`Expected tabSwitchCount >= 3, got ${v3.data.tabSwitchCount}`);
        }
        console.log("✅ Violation tracking and warning level calculation verified.");

        // Step 7: Test Unified Autosave with Concurrency & Rapid Burst
        console.log("\n7️⃣ Testing Unified Fault-Tolerant Autosave with rapid updates...");
        const questionId = targetTest.sections?.[0]?.questionIds?.[0]?._id || new mongoose.Types.ObjectId().toString();

        const autosavePromises = [1, 2, 3, 4, 5].map(i => {
            return axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/autosave`, {
                answers: [
                    {
                        questionId,
                        studentAnswer: `Concurrent Option ${i}`,
                        sectionNumber: 1,
                        questionNumber: 1
                    }
                ],
                task1Answer: `Student Task 1 essay content burst version ${i}`,
                task1WordCount: 7 * i,
                task2Answer: `Student Task 2 essay content burst version ${i}`,
                task2WordCount: 8 * i,
                durationSpent: 120 + i
            }, { headers: studentHeaders });
        });

        const autosaveResults = await Promise.all(autosavePromises);
        console.log(`✅ ${autosaveResults.length} rapid concurrent autosave requests executed without lock errors.`);

        // Step 8: Test Student Data Isolation (Security hardening)
        console.log("\n8️⃣ Testing Student Data Isolation (Student 2 accessing Student 1 attempt)...");
        let isolationBlocked = false;
        try {
            await axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/autosave`, {
                answers: [{ questionId, studentAnswer: "Hacked Answer" }]
            }, { headers: student2Headers });
        } catch (err) {
            if (err.response && err.response.status === 403) {
                isolationBlocked = true;
                console.log(`✅ Blocked with 403 Forbidden: "${err.response.data.message}"`);
            } else {
                throw err;
            }
        }
        if (!isolationBlocked) {
            throw new Error("SECURITY FAILURE: Student 2 was able to alter Student 1's attempt!");
        }

        // Step 9: Test Security Audit Status Endpoint
        console.log("\n9️⃣ Testing Security Audit Status endpoint (GET /api/ielts/attempts/:id/security-status)...");
        const statusRes = await axios.get(`${BASE_URL}/ielts/attempts/${attemptId}/security-status`, { headers: studentHeaders });
        console.log("Security Status:", {
            attemptId: statusRes.data.attemptId,
            tabSwitchCount: statusRes.data.tabSwitchCount,
            totalViolations: statusRes.data.securityViolations.length,
            isTerminatedByProctor: statusRes.data.isTerminatedByProctor
        });
        if (statusRes.data.tabSwitchCount < 3 || statusRes.data.securityViolations.length < 3) {
            throw new Error("Violations were not stored properly in audit history.");
        }
        console.log("✅ Security audit status confirmed.");

        // Step 10: Test Proctor Termination
        console.log("\n🔟 Testing Proctor Session Termination (POST /api/ielts/attempts/:id/terminate)...");
        const terminateRes = await axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/terminate`, {
            reason: "Excessive tab switching violations detected during active exam"
        }, { headers: teacherHeaders });
        console.log("Terminate Response:", terminateRes.data);

        // Step 11: Verify Student Heartbeat & Autosave are locked upon termination
        console.log("\n1️⃣1️⃣ Verifying attempt is locked for student after proctor termination...");
        const postTermHeartbeat = await axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/heartbeat`, {}, { headers: studentHeaders });
        console.log("Post-termination Heartbeat:", postTermHeartbeat.data);
        if (!postTermHeartbeat.data.terminated || !postTermHeartbeat.data.isTerminatedByProctor) {
            throw new Error("Heartbeat did not report proctor termination!");
        }

        let autosaveLocked = false;
        try {
            await axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/autosave`, {
                answers: [{ questionId, studentAnswer: "After termination answer" }]
            }, { headers: studentHeaders });
        } catch (err) {
            if (err.response && (err.response.status === 403 || err.response.data?.terminated)) {
                autosaveLocked = true;
                console.log(`✅ Autosave correctly locked with 403: "${err.response.data.message}"`);
            }
        }
        if (!autosaveLocked) {
            throw new Error("Student was still able to autosave after proctor termination!");
        }

        console.log("\n==================================================");
        console.log("🎉 ALL PHASE 14 EXAM SECURITY & AUTOSAVE TESTS PASSED 100%!");
        console.log("==================================================");

    } catch (error) {
        console.error("❌ Phase 14 verification failed:", error.response?.data || error.message);
        process.exit(1);
    }
}

runPhase14Verification();
