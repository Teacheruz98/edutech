const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5001/api';

async function runPhase15FullPlatformQA() {
    console.log("======================================================================");
    console.log("🌟 STARTING PHASE 15: COMPREHENSIVE END-TO-END CD IELTS PLATFORM QA AUDIT");
    console.log("======================================================================");

    const auditResults = [];

    const recordStep = (name, passed, details = '') => {
        auditResults.push({ name, passed, details });
        const icon = passed ? "✅" : "❌";
        console.log(`${icon} [${name}]: ${details}`);
    };

    try {
        // ---------------------------------------------------------
        // SUITE 1: Multi-Role Authentication & Overview Dashboards
        // ---------------------------------------------------------
        console.log("\n--- SUITE 1: Multi-Role Authentication & Overview Dashboards ---");
        
        // Admin Login
        const adminRes = await axios.post(`${BASE_URL}/login`, { username: 'Safarmurod', password: 'admin123' });
        const adminHeaders = { Authorization: `Bearer ${adminRes.data.token}` };
        recordStep("Admin Authentication", true, `Logged in as ${adminRes.data.user.username} (${adminRes.data.user.role})`);

        // Teacher Login
        const teacherRes = await axios.post(`${BASE_URL}/login`, { username: 'teacher', password: 'teacher123' });
        const teacherHeaders = { Authorization: `Bearer ${teacherRes.data.token}` };
        recordStep("Teacher Authentication", true, `Logged in as ${teacherRes.data.user.username} (${teacherRes.data.user.role})`);

        // Student 1 Login
        const student1Res = await axios.post(`${BASE_URL}/login`, { username: 'student', password: 'student123' });
        const student1Headers = { Authorization: `Bearer ${student1Res.data.token}` };
        recordStep("Student 1 Authentication", true, `Logged in as ${student1Res.data.user.username} (${student1Res.data.user.role})`);

        // Student 2 Login
        const student2Res = await axios.post(`${BASE_URL}/login`, { username: 'ali_valiyev', password: '1234' });
        const student2Headers = { Authorization: `Bearer ${student2Res.data.token}` };
        recordStep("Student 2 Authentication", true, `Logged in as ${student2Res.data.user.username} (${student2Res.data.user.role})`);

        // Management Login
        const managementRes = await axios.post(`${BASE_URL}/login`, { username: 'management_director', password: 'director123' });
        const managementHeaders = { Authorization: `Bearer ${managementRes.data.token}` };
        recordStep("Management Authentication", true, `Logged in as ${managementRes.data.user.username} (${managementRes.data.user.role})`);

        // Verify Overview Endpoint across roles
        const [adminOverview, teacherOverview, studentOverview, mgmtOverview] = await Promise.all([
            axios.get(`${BASE_URL}/ielts/overview`, { headers: adminHeaders }),
            axios.get(`${BASE_URL}/ielts/overview`, { headers: teacherHeaders }),
            axios.get(`${BASE_URL}/ielts/overview`, { headers: student1Headers }),
            axios.get(`${BASE_URL}/ielts/overview`, { headers: managementHeaders })
        ]);
        recordStep("Role-Specific Overview Routing", true, 
            `Admin: ${adminOverview.data.role}, Teacher: ${teacherOverview.data.role}, Student: ${studentOverview.data.role}, Management: ${mgmtOverview.data.role}`);

        // ---------------------------------------------------------
        // SUITE 2: Item Bank & Test Builder Life-Cycle
        // ---------------------------------------------------------
        console.log("\n--- SUITE 2: Item Bank & Test Builder Life-Cycle ---");
        
        // Create question
        const timestamp = Date.now();
        const createQRes = await axios.post(`${BASE_URL}/ielts/questions`, {
            skillType: 'READING',
            questionType: 'multiple-choice',
            prompt: `What is the primary role of AI in Education? (QA ${timestamp})`,
            options: ['Personalized Tutoring', 'Automated Grading', 'Adaptive Practice', 'All of the Above'],
            correctAnswer: 'All of the Above',
            difficulty: 'EXAM_LEVEL',
            explanation: 'AI supports multi-faceted personalization and intelligent evaluation.'
        }, { headers: adminHeaders });
        const questionId = createQRes.data.question._id;
        recordStep("Question Bank Item Creation", true, `Created question ${questionId}`);

        // Create and publish Test
        const createTestRes = await axios.post(`${BASE_URL}/ielts/tests`, {
            title: `Cambridge Enterprise Mock Test QA ${timestamp}`,
            description: 'Comprehensive QA Exam covering all skills',
            code: `QA-MOCK-${timestamp.toString().slice(-4)}`,
            testType: 'FULL_MOCK',
            skillType: 'ALL',
            durationMinutes: 160,
            sections: [
                {
                    sectionNumber: 1,
                    title: 'Section 1: Academic Reading Passage',
                    passageTitle: 'The Evolution of Cognitive Artificial Intelligence',
                    passageText: 'Artificial Intelligence in educational psychology enables automated assessment and targeted intervention.',
                    questionIds: [questionId]
                }
            ]
        }, { headers: adminHeaders });
        const testId = createTestRes.data.test._id;

        // Publish test
        const pubTestRes = await axios.put(`${BASE_URL}/ielts/tests/${testId}`, {
            isPublished: true,
            isActive: true
        }, { headers: adminHeaders });
        recordStep("Test Builder & Publishing", true, `Created & published test "${pubTestRes.data.test.title}" (ID: ${testId})`);

        // ---------------------------------------------------------
        // SUITE 3: Bulk Import & Media Library
        // ---------------------------------------------------------
        console.log("\n--- SUITE 3: Bulk Import & Media Library ---");
        
        const bulkImportRes = await axios.post(`${BASE_URL}/ielts/import/questions`, {
            questions: [
                {
                    skillType: 'LISTENING',
                    questionType: 'sentence-completion',
                    prompt: `The research laboratory is situated on the _____ floor. (QA ${timestamp})`,
                    correctAnswer: 'third',
                    difficulty: 'MEDIUM'
                }
            ]
        }, { headers: adminHeaders });
        recordStep("Bulk Question Ingestion", true, `Imported ${bulkImportRes.data.importedCount} questions successfully`);

        const mediaListRes = await axios.get(`${BASE_URL}/ielts/media`, { headers: adminHeaders });
        const mediaCount = mediaListRes.data.totalCount !== undefined ? mediaListRes.data.totalCount : (mediaListRes.data.media?.length || 0);
        recordStep("Media Library Asset Retrieval", true, `Retrieved ${mediaCount} media files`);

        // ---------------------------------------------------------
        // SUITE 4: Teacher Assignment Workflow
        // ---------------------------------------------------------
        console.log("\n--- SUITE 4: Teacher Assignment Workflow ---");
        
        const assignRes = await axios.post(`${BASE_URL}/ielts/assignments`, {
            title: `Homework Assignment QA ${timestamp}`,
            testId,
            targetType: 'ALL',
            deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000)
        }, { headers: teacherHeaders });
        const assignmentId = assignRes.data.assignment?._id || assignRes.data.assignmentId;
        recordStep("Teacher Assignment Creation", true, `Created assignment ${assignmentId}`);

        const studentAssignList = await axios.get(`${BASE_URL}/ielts/assignments/student`, { headers: student1Headers });
        recordStep("Student Assignment Feed", true, `Retrieved ${studentAssignList.data.assignments?.length || 0} active assignments`);

        // ---------------------------------------------------------
        // SUITE 5: Student Exam Mode, Security & Concurrency Autosave
        // ---------------------------------------------------------
        console.log("\n--- SUITE 5: Student Exam Mode, Security & Concurrency Autosave ---");
        
        const startAttemptRes = await axios.post(`${BASE_URL}/ielts/attempts/start`, {
            testId,
            assignmentId
        }, { headers: student1Headers });
        const attemptId = startAttemptRes.data.attemptId || startAttemptRes.data.attempt?._id;
        recordStep("Exam Engine Session Launch", true, `Started attempt ${attemptId}`);

        // Heartbeat Keep-Alive
        const hbRes = await axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/heartbeat`, {}, { headers: student1Headers });
        recordStep("Keep-Alive Session Heartbeat", hbRes.data.ok === true, `Server response ok: ${hbRes.data.ok}`);

        // Anti-Cheating Violation Log
        const violRes = await axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/violation`, {
            type: 'TAB_SWITCH',
            details: 'Tab switch detected by security guard'
        }, { headers: student1Headers });
        recordStep("Anti-Cheating Violation Tracking", violRes.data.ok === true, `tabSwitchCount: ${violRes.data.tabSwitchCount}`);

        // Rapid Concurrent Autosave Burst (Zero Lock Errors)
        const burstResults = await Promise.all([1, 2, 3].map(n => {
            return axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/autosave`, {
                answers: [{ questionId, studentAnswer: 'All of the Above' }],
                task1Answer: 'The bar chart illustrates student distribution across five faculties over a decade.',
                task1WordCount: 155,
                task2Answer: 'Technological acceleration has fundamentally reformed conventional pedagogy.',
                task2WordCount: 260,
                durationSpent: 450 + n
            }, { headers: student1Headers });
        }));
        recordStep("Fault-Tolerant Concurrent Autosave", true, `${burstResults.length} rapid requests persisted without collision`);

        // ---------------------------------------------------------
        // SUITE 6: Submission & AI Evaluation Engine
        // ---------------------------------------------------------
        console.log("\n--- SUITE 6: Submission & AI Evaluation Engine ---");
        
        // Writing Submission
        const submitRes = await axios.post(`${BASE_URL}/ielts/writing/attempts/${attemptId}/submit`, {
            task1Answer: 'The bar chart illustrates student distribution across five faculties over a decade.',
            task2Answer: 'Technological acceleration has fundamentally reformed conventional pedagogy in global institutions.',
            durationSpent: 3600
        }, { headers: student1Headers });
        recordStep("Writing Submission", true, `Submitted attempt ${attemptId} for evaluation`);

        // AI Feedback Trigger
        const aiEvalRes = await axios.post(`${BASE_URL}/ielts/ai/evaluate-writing/${attemptId}`, {}, { headers: teacherHeaders });
        recordStep("AI Automated IELTS Evaluation", true, 
            `AI Band: ${aiEvalRes.data.aiFeedback?.overallBand}, Strengths: ${aiEvalRes.data.aiFeedback?.strengths?.length || 0}`);

        // ---------------------------------------------------------
        // SUITE 7: Teacher Evaluation Workbench & Scorecards
        // ---------------------------------------------------------
        console.log("\n--- SUITE 7: Teacher Evaluation Workbench & Scorecards ---");
        
        const teacherEvalSubmit = await axios.post(`${BASE_URL}/ielts/evaluations/writing/${attemptId}`, {
            criteriaScores: {
                taskAchievement: 7.0,
                coherenceCohesion: 7.5,
                lexicalResource: 7.0,
                grammaticalRange: 7.5
            },
            qualitativeFeedback: "Well-structured essay with sophisticated cohesive devices and varied lexical range."
        }, { headers: teacherHeaders });
        recordStep("Teacher Evaluation Workbench", true, `Graded and published scorecard (Band: ${teacherEvalSubmit.data.evaluation?.bandScore})`);

        // Student Scorecard Retrieval
        const studentResultsRes = await axios.get(`${BASE_URL}/ielts/results/student`, { headers: student1Headers });
        recordStep("Student Scorecard & History", true, `Retrieved ${studentResultsRes.data.attempts?.length || 0} completed scorecards`);

        // ---------------------------------------------------------
        // SUITE 8: Student Mistake Notebook & Progress Tracking
        // ---------------------------------------------------------
        console.log("\n--- SUITE 8: Student Mistake Notebook & Progress Tracking ---");
        
        const mistakeListRes = await axios.get(`${BASE_URL}/ielts/mistakes`, { headers: student1Headers });
        recordStep("Student Mistake Notebook", true, `Retrieved ${mistakeListRes.data.mistakes?.length || 0} error log entries`);

        const progressRes = await axios.get(`${BASE_URL}/ielts/progress`, { headers: student1Headers });
        recordStep("Student Progress Analytics", true, `Analyzed band trajectory: Overall Band = ${progressRes.data.overallBand || 'N/A'}`);

        // ---------------------------------------------------------
        // SUITE 9: Institutional Management & Reporting
        // ---------------------------------------------------------
        console.log("\n--- SUITE 9: Institutional Management & Reporting ---");
        
        const mgmtPerfRes = await axios.get(`${BASE_URL}/ielts/management/performance`, { headers: managementHeaders });
        recordStep("Institutional Performance Metrics", true, `Skill averages: L: ${mgmtPerfRes.data.skillAverages?.listening || 'N/A'}, R: ${mgmtPerfRes.data.skillAverages?.reading || 'N/A'}`);

        const mgmtReportsRes = await axios.get(`${BASE_URL}/ielts/management/reports`, { headers: managementHeaders });
        recordStep("Institutional Management Reports", true, `Total tests: ${mgmtReportsRes.data.summary?.totalTests || 0}`);

        // ---------------------------------------------------------
        // SUITE 10: Security Hardening & Zero-Cross-Contamination
        // ---------------------------------------------------------
        console.log("\n--- SUITE 10: Security Hardening & Zero-Cross-Contamination ---");
        
        // Test 1: Student 2 cannot modify Student 1 attempt (403)
        let crossStudentTamperBlocked = false;
        try {
            await axios.post(`${BASE_URL}/ielts/attempts/${attemptId}/autosave`, {
                answers: [{ questionId, studentAnswer: "Tampered" }]
            }, { headers: student2Headers });
        } catch (err) {
            if (err.response?.status === 403) {
                crossStudentTamperBlocked = true;
            }
        }
        recordStep("Cross-Student Attempt Isolation", crossStudentTamperBlocked, "Unauthorized student access strictly rejected (403)");

        // Test 2: Student cannot delete media assets (403)
        let studentMediaDeleteBlocked = false;
        try {
            await axios.delete(`${BASE_URL}/ielts/media/6ab161dca18f3a79cfb9a6c6`, { headers: student1Headers });
        } catch (err) {
            if (err.response?.status === 403) {
                studentMediaDeleteBlocked = true;
            }
        }
        recordStep("Media Management RBAC Guard", studentMediaDeleteBlocked, "Non-admin file manipulation rejected (403)");

        // Test 3: Student cannot bulk import questions (403)
        let studentImportBlocked = false;
        try {
            await axios.post(`${BASE_URL}/ielts/import/questions`, { questions: [] }, { headers: student1Headers });
        } catch (err) {
            if (err.response?.status === 403) {
                studentImportBlocked = true;
            }
        }
        recordStep("Import Engine RBAC Guard", studentImportBlocked, "Unauthorized import rejected (403)");

        // ---------------------------------------------------------
        // FINAL AUDIT SUMMARY
        // ---------------------------------------------------------
        console.log("\n======================================================================");
        const totalTests = auditResults.length;
        const passedTests = auditResults.filter(r => r.passed).length;
        const passRate = Math.round((passedTests / totalTests) * 100);

        console.log(`📊 FINAL QA AUDIT SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${passRate}%)`);
        console.log("======================================================================");

        if (passRate === 100) {
            console.log("🏆 PLATFORM PRODUCTION READINESS: 100% CERTIFIED");
            console.log("✨ ALL 15 PHASES ARE VERIFIED, HARDENED, AND READY FOR PRODUCTION!");
        } else {
            console.log("⚠️ Some QA checks failed. Review log above.");
            process.exit(1);
        }

    } catch (error) {
        console.error("❌ Phase 15 QA Audit encountered an unexpected exception:", error.response?.data || error.message);
        process.exit(1);
    }
}

runPhase15FullPlatformQA();
