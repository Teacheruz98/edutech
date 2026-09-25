const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:5001/api';

async function runVerification() {
    console.log("=== STARTING PHASE 13: BULK IMPORT & MEDIA MANAGEMENT VERIFICATION ===");

    // 1. Authenticate Admin, Teacher, Student, Management
    console.log("1. Authenticating roles...");
    const adminLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'Safarmurod',
        password: 'admin123'
    });
    const adminToken = adminLogin.data.token;
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

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

    const managementLogin = await axios.post(`${BASE_URL}/login`, {
        username: 'management_director',
        password: 'director123'
    });
    const managementToken = managementLogin.data.token;
    const managementHeaders = { headers: { Authorization: `Bearer ${managementToken}` } };

    console.log("Authentication successful for all roles.");

    // 2. Test Bulk Question Import (JSON batch)
    console.log("2. Testing POST /api/ielts/import/questions with valid and invalid batches...");
    const sampleQuestions = [
        {
            skillType: "READING",
            questionType: "multiple_choice",
            prompt: "What factor contributed to the expansion of trade routes in 15th-century Europe?",
            options: [
                { text: "Maritime navigation innovations", isCorrect: true },
                { text: "Decline of urban markets", isCorrect: false },
                { text: "Prohibition of credit systems", isCorrect: false }
            ],
            correctAnswer: "Maritime navigation innovations",
            points: 1,
            sectionNumber: 1,
            passageReference: "Economic History Review, Section A"
        },
        {
            skillType: "LISTENING",
            questionType: "sentence_completion",
            prompt: "The library loan period for academic journals is [BLANK] days.",
            correctAnswer: "14",
            points: 1,
            sectionNumber: 1
        },
        {
            skillType: "WRITING",
            questionType: "writing_task2",
            prompt: "Governments should invest heavily in public transport. To what extent do you agree?",
            correctAnswer: "Writing Task 2 Essay",
            points: 9,
            sectionNumber: 2
        }
    ];

    const importQuestionsRes = await axios.post(`${BASE_URL}/ielts/import/questions`, {
        questions: sampleQuestions
    }, adminHeaders);

    if (importQuestionsRes.status !== 200 || importQuestionsRes.data.importedCount !== 3) {
        throw new Error(`Bulk question import expected 3 items, got: ${importQuestionsRes.data.importedCount}`);
    }
    console.log(`Questions imported successfully: ${importQuestionsRes.data.importedCount} questions.`);

    // Test validation errors handling
    const invalidBatch = [
        { prompt: "", correctAnswer: "A" }, // missing prompt
        { prompt: "Valid prompt but missing answer", correctAnswer: "", questionType: "multiple_choice" } // missing answer
    ];
    const invalidImportRes = await axios.post(`${BASE_URL}/ielts/import/questions`, {
        questions: invalidBatch
    }, adminHeaders);

    if (invalidImportRes.data.failedCount !== 2 || invalidImportRes.data.errors.length !== 2) {
        throw new Error("Bulk import failed to report validation errors correctly.");
    }
    console.log(`Validation error handling passed: ${invalidImportRes.data.failedCount} errors properly caught.`);

    // 3. Test Bulk Test Import
    console.log("3. Testing POST /api/ielts/import/tests with complete test structure...");
    const sampleTest = {
        title: "Cambridge International Practice Mock Test " + Date.now(),
        skillType: "FULL_MOCK",
        difficulty: "medium",
        durationMinutes: 165,
        sections: [
            {
                sectionNumber: 1,
                title: "Listening Comprehension",
                durationMinutes: 30,
                instructions: "Listen to 4 sections.",
                questions: [
                    {
                        prompt: "What is the student's primary subject?",
                        questionType: "fill_in_the_blank",
                        correctAnswer: "Archaeology",
                        points: 1
                    }
                ]
            },
            {
                sectionNumber: 2,
                title: "Reading Module",
                durationMinutes: 60,
                instructions: "Read 3 academic passages.",
                passageText: "Advances in renewable energy have reduced solar cell production costs...",
                questions: [
                    {
                        prompt: "Solar cell manufacturing costs have declined over the past decade.",
                        questionType: "true_false_not_given",
                        correctAnswer: "True",
                        points: 1
                    }
                ]
            }
        ]
    };

    const importTestRes = await axios.post(`${BASE_URL}/ielts/import/tests`, {
        tests: [sampleTest]
    }, adminHeaders);

    if (importTestRes.status !== 200 || importTestRes.data.importedCount !== 1) {
        throw new Error("Bulk test import failed.");
    }
    const createdTest = importTestRes.data.tests[0];
    console.log(`Test configuration imported: "${createdTest.title}" with ${createdTest.sections.length} sections.`);

    // 4. Test Media Upload (POST /api/ielts/media/upload)
    console.log("4. Testing POST /api/ielts/media/upload...");
    const tempAudioPath = path.join(__dirname, 'temp_test_audio.mp3');
    fs.writeFileSync(tempAudioPath, Buffer.from('FAKE_AUDIO_SAMPLE_DATA_FOR_VERIFICATION_TEST'));

    const form = new FormData();
    form.append('file', fs.createReadStream(tempAudioPath));
    form.append('category', 'listening');
    form.append('description', 'Cambridge 19 Section 1 Test Track');

    const uploadMediaRes = await axios.post(`${BASE_URL}/ielts/media/upload`, form, {
        headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${adminToken}`
        }
    });

    if (uploadMediaRes.status !== 201 || !uploadMediaRes.data.media) {
        throw new Error("Media upload failed.");
    }
    const uploadedAsset = uploadMediaRes.data.media;
    console.log("Media uploaded successfully:", {
        id: uploadedAsset._id,
        filename: uploadedAsset.filename,
        url: uploadedAsset.url,
        mediaType: uploadedAsset.mediaType,
        category: uploadedAsset.category
    });

    // Clean up local temp file
    if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

    // 5. Test Media Listing (GET /api/ielts/media)
    console.log("5. Testing GET /api/ielts/media...");
    const mediaListRes = await axios.get(`${BASE_URL}/ielts/media?category=listening`, adminHeaders);
    if (mediaListRes.status !== 200 || !Array.isArray(mediaListRes.data.media)) {
        throw new Error("Failed to fetch media list.");
    }
    console.log(`Media list retrieved: ${mediaListRes.data.media.length} listening items found. Stats:`, mediaListRes.data.stats);

    // 6. Test Media Deletion (DELETE /api/ielts/media/:id)
    console.log("6. Testing DELETE /api/ielts/media/:id...");
    const deleteMediaRes = await axios.delete(`${BASE_URL}/ielts/media/${uploadedAsset._id}`, adminHeaders);
    if (deleteMediaRes.status !== 200 || deleteMediaRes.data.deletedId !== uploadedAsset._id) {
        throw new Error("Media deletion failed.");
    }
    console.log("Media asset successfully deleted from database and disk.");

    // 7. Security Checks: Role Isolation
    console.log("7. Security Checks: Verifying Student, Teacher, and Management cannot access import or media APIs...");

    // Student trying to import questions
    try {
        await axios.post(`${BASE_URL}/ielts/import/questions`, { questions: [] }, studentHeaders);
        throw new Error("Security breach! Student was able to call import questions.");
    } catch (err) {
        if (err.response && err.response.status === 403) {
            console.log("Security passed: Student received 403 Forbidden for import questions.");
        } else {
            throw err;
        }
    }

    // Teacher trying to upload media
    try {
        await axios.post(`${BASE_URL}/ielts/media/upload`, {}, teacherHeaders);
        throw new Error("Security breach! Teacher was able to call media upload.");
    } catch (err) {
        if (err.response && err.response.status === 403) {
            console.log("Security passed: Teacher received 403 Forbidden for media upload.");
        } else {
            throw err;
        }
    }

    // Management trying to delete media
    try {
        await axios.delete(`${BASE_URL}/ielts/media/${uploadedAsset._id}`, managementHeaders);
        throw new Error("Security breach! Management was able to call delete media.");
    } catch (err) {
        if (err.response && err.response.status === 403) {
            console.log("Security passed: Management received 403 Forbidden for media deletion.");
        } else {
            throw err;
        }
    }

    // 8. Test Export Questions Library
    console.log("8. Testing GET /api/ielts/import/export-questions...");
    const exportRes = await axios.get(`${BASE_URL}/ielts/import/export-questions?skillType=READING`, adminHeaders);
    if (exportRes.status !== 200 || !Array.isArray(exportRes.data.questions)) {
        throw new Error("Export questions failed.");
    }
    console.log(`Questions export verified: ${exportRes.data.totalQuestions} questions exported.`);

    console.log("=== PHASE 13 VERIFICATION COMPLETED AND PASSED 100% ===");
    process.exit(0);
}

runVerification().catch(err => {
    console.error("Verification failed:", err.message, err.response?.data || '');
    process.exit(1);
});
