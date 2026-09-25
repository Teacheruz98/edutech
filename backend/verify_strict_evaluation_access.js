const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function runVerification() {
    console.log('--- STARTING STRICT EVALUATION ACCESS VERIFICATION ---');
    try {
        // 1. Login as Admin
        const adminRes = await axios.post(`${BASE_URL}/api/login`, {
            username: 'Safarmurod',
            password: 'admin123'
        });
        const adminToken = adminRes.data.token;
        console.log('✅ Admin login successful');

        // 2. Login as Teacher
        const teacherRes = await axios.post(`${BASE_URL}/api/login`, {
            username: 'teacher',
            password: 'teacher123'
        });
        const teacherToken = teacherRes.data.token;
        const teacherId = teacherRes.data.user._id;
        console.log(`✅ Teacher login successful (id: ${teacherId})`);

        // 3. Ensure teacher is NOT an English teacher first
        await axios.put(`${BASE_URL}/api/admin/toggle-english-teacher/${teacherId}`, 
            { isEnglishTeacher: false },
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log('✅ Ensured teacher has isEnglishTeacher = false');

        // 4. Test non-English teacher accessing writing evaluations -> expect 403
        try {
            await axios.get(`${BASE_URL}/api/ielts/evaluations/writing/pending`, {
                headers: { Authorization: `Bearer ${teacherToken}` }
            });
            console.error('❌ FAIL: Non-English teacher was allowed access to writing evaluations!');
            process.exit(1);
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('✅ PASS: Non-English teacher blocked with 403 from writing evaluations:', err.response.data.message);
            } else {
                console.error('❌ FAIL: Unexpected error status:', err.response ? err.response.status : err.message);
                process.exit(1);
            }
        }

        // 5. Test non-English teacher accessing speaking evaluations -> expect 403
        try {
            await axios.get(`${BASE_URL}/api/ielts/evaluations/speaking/pending`, {
                headers: { Authorization: `Bearer ${teacherToken}` }
            });
            console.error('❌ FAIL: Non-English teacher was allowed access to speaking evaluations!');
            process.exit(1);
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('✅ PASS: Non-English teacher blocked with 403 from speaking evaluations:', err.response.data.message);
            } else {
                console.error('❌ FAIL: Unexpected error status:', err.response ? err.response.status : err.message);
                process.exit(1);
            }
        }

        // 6. Admin toggles teacher to isEnglishTeacher: true
        const toggleRes = await axios.put(`${BASE_URL}/api/admin/toggle-english-teacher/${teacherId}`, 
            { isEnglishTeacher: true },
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log('✅ Admin toggled teacher to English Teacher:', toggleRes.data.message);

        // 7. Test designated English teacher accessing writing evaluations -> expect 200
        const writingEvalRes = await axios.get(`${BASE_URL}/api/ielts/evaluations/writing/pending`, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        if (writingEvalRes.status === 200) {
            console.log('✅ PASS: Designated English teacher successfully accessed writing evaluations (Status: 200)');
        }

        // 8. Test designated English teacher accessing speaking evaluations -> expect 200
        const speakingEvalRes = await axios.get(`${BASE_URL}/api/ielts/evaluations/speaking/pending`, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        if (speakingEvalRes.status === 200) {
            console.log('✅ PASS: Designated English teacher successfully accessed speaking evaluations (Status: 200)');
        }

        // 9. Admin full evaluation access -> expect 200
        const adminWritingRes = await axios.get(`${BASE_URL}/api/ielts/evaluations/writing/pending`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (adminWritingRes.status === 200) {
            console.log('✅ PASS: Admin successfully accessed evaluations (Status: 200)');
        }

        console.log('==================================================');
        console.log('🎉 ALL BACKEND STRICT ACCESS VERIFICATIONS PASSED!');
        console.log('==================================================');
    } catch (error) {
        console.error('❌ Test failed with error:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

runVerification();
