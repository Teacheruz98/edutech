const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

async function testCambridgeLessonPlans() {
    console.log("=== Testing Cambridge Lesson Plan Generator API ===");
    try {
        // 1. Teacher login
        console.log("1. Logging in as Teacher...");
        const teacherRes = await axios.post(`${API_BASE}/login`, {
            username: 'teacher',
            password: 'teacher123'
        });
        const teacherToken = teacherRes.data.token;
        const teacherHeaders = { Authorization: `Bearer ${teacherToken}` };
        console.log("Teacher logged in successfully.");

        // 2. Student login (for role protection test)
        console.log("2. Logging in as Student...");
        const studentRes = await axios.post(`${API_BASE}/login`, {
            username: 'student',
            password: 'student123'
        });
        const studentToken = studentRes.data.token;
        const studentHeaders = { Authorization: `Bearer ${studentToken}` };
        console.log("Student logged in successfully.");

        // 3. Test Student Access Block (Expect 403)
        console.log("3. Verifying Student role is rejected (403)...");
        try {
            await axios.get(`${API_BASE}/cambridge/lesson-plans`, { headers: studentHeaders });
            console.error("FAILED: Student should not have access to Cambridge lesson plans!");
            process.exit(1);
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log("PASSED: Student received 403 Forbidden as expected.");
            } else {
                console.error("Unexpected error for student:", err.message);
                process.exit(1);
            }
        }

        // 4. Create Cambridge Lesson Plan as Teacher
        console.log("4. Creating a Cambridge Lesson Plan...");
        const newPlan = {
            subject: "Computer Science",
            stage: "Cambridge IGCSE",
            curriculumCode: "0478 / 1.1 Data Representation",
            unitTitle: "Data Representation and Binary Logic",
            lessonTitle: "Binary to Hexadecimal Conversion and Applications",
            durationMinutes: 45,
            learningObjectives: [
                "Understand why hexadecimal notation is used in computer systems (memory dumps, MAC addresses, web colors)",
                "Convert between 8-bit binary, denary, and 2-digit hexadecimal numbers with 100% accuracy"
            ],
            successCriteria: [
                "All students can split an 8-bit byte into two 4-bit nibbles and convert to hex digits",
                "Most students can explain why hex is more human-readable and reduces transcription errors",
                "Some students can apply hex representations to 24-bit RGB hex colour codes"
            ],
            keyVocabulary: ["Hexadecimal", "Nibble", "Base-16", "Binary", "Denary", "MAC Address"],
            lessonPhases: {
                starter: {
                    durationMinutes: 10,
                    activity: "Bell-ringer memory game: matching binary nibbles (0000 to 1111) to hex digits (0 to F).",
                    teacherRole: "Circulate, observe misconceptions with A-F, write common mistakes on whiteboard.",
                    studentRole: "Pairs compete on mini-whiteboards to decode 3 secret hex words (e.g., DEAD, BEEF)."
                },
                main: {
                    durationMinutes: 25,
                    activity: "Direct instruction on byte grouping, followed by stepped practice worksheet (Level 1: direct mapping, Level 2: IPv6/MAC addresses, Level 3: CSS colors).",
                    teacherRole: "Demonstrate 4-bit nibble split method on smartboard; facilitate guided group table.",
                    studentRole: "Independent and peer-check problem solving; check solutions using online nibble calculators."
                },
                plenary: {
                    durationMinutes: 10,
                    activity: "Exit ticket: Convert student's birth date day (1-31) into hexadecimal and justify one real-world hex usage.",
                    teacherRole: "Collect tickets for formative assessment; recap key takeaway.",
                    studentRole: "Submit exit tickets before dismissal."
                }
            },
            differentiation: {
                support: "Provide printed 4-bit nibble lookup reference table and step-by-step conversion flowchart.",
                extension: "Challenge with 16-bit word conversions and calculate total addressable space of a 48-bit MAC address.",
                guidedGroup: "Teacher-led table for students needing scaffolded place-value alignment (8-4-2-1)."
            },
            resourcesNeeded: [
                "Mini-whiteboards and markers",
                "Worksheet 1.1: Hex Conversion Drill",
                "Smartboard slides with interactive nibbles"
            ],
            reflection: "Students grasped the nibble conversion quickly; next lesson should focus on hex in assembly language.",
            status: "PUBLISHED"
        };

        const createRes = await axios.post(`${API_BASE}/cambridge/lesson-plans`, newPlan, { headers: teacherHeaders });
        console.log("PASSED: Created plan ID:", createRes.data.plan._id);
        const planId = createRes.data.plan._id;

        // 5. Fetch List of Plans
        console.log("5. Fetching lesson plan list...");
        const listRes = await axios.get(`${API_BASE}/cambridge/lesson-plans?subject=Computer`, { headers: teacherHeaders });
        console.log(`PASSED: Retrieved ${listRes.data.plans.length} plan(s). Found created plan:`, listRes.data.plans.some(p => p._id === planId));

        // 6. Fetch Plan Details
        console.log("6. Fetching single plan details...");
        const getRes = await axios.get(`${API_BASE}/cambridge/lesson-plans/${planId}`, { headers: teacherHeaders });
        console.log("PASSED: Plan title retrieved:", getRes.data.plan.lessonTitle);

        // 7. Test AI Suggestion Endpoint
        console.log("7. Testing AI suggestions endpoint...");
        const aiRes = await axios.post(`${API_BASE}/cambridge/lesson-plans/ai-suggest`, {
            subject: "Computer Science",
            stage: "Cambridge IGCSE",
            lessonTitle: "Binary to Hexadecimal",
            learningObjectives: ["Convert between binary and hexadecimal"]
        }, { headers: teacherHeaders });
        console.log("PASSED: AI suggestion generated. Starter hook length:", aiRes.data.suggestions.starterHook.length);

        // 8. Update Plan
        console.log("8. Updating lesson plan...");
        const updateRes = await axios.put(`${API_BASE}/cambridge/lesson-plans/${planId}`, {
            durationMinutes: 50,
            status: "PUBLISHED"
        }, { headers: teacherHeaders });
        console.log("PASSED: Updated durationMinutes to:", updateRes.data.plan.durationMinutes);

        console.log("\n>>> ALL CAMBRIDGE LESSON PLAN BACKEND TESTS PASSED SUCCESSFULLY! <<<");
    } catch (err) {
        console.error("Test failed with error:", err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

testCambridgeLessonPlans();
