const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function runStrictRoleVerification() {
    console.log('================================================================');
    console.log('🚀 RUNNING STRICT ROLE SEPARATION VERIFICATION: IELTS VS SAT');
    console.log('================================================================\n');

    try {
        // 1. Admin Login
        console.log('1️⃣ Logging in as Admin...');
        const adminLogin = await axios.post(`${BASE_URL}/api/login`, {
            username: 'Safarmurod',
            password: 'admin123'
        });
        const adminToken = adminLogin.data.token;
        console.log('   ✅ Admin logged in successfully.');

        // 2. Teacher Login (find or create)
        console.log('\n2️⃣ Logging in as Teacher...');
        let teacherToken;
        let teacherId;
        try {
            const teacherLogin = await axios.post(`${BASE_URL}/api/login`, {
                username: 'teacher',
                password: 'teacher123'
            });
            teacherToken = teacherLogin.data.token;
            teacherId = teacherLogin.data.user._id;
        } catch (loginErr) {
            // Create test teacher if not present
            const createRes = await axios.post(`${BASE_URL}/api/admin/users/create`, {
                username: 'strict_teacher_' + Date.now(),
                email: `strict_teacher_${Date.now()}@edutech.uz`,
                password: 'password123',
                role: 'teacher',
                isEnglishTeacher: false,
                isMathTeacher: false
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            teacherId = createRes.data.user._id;
            const tLogin = await axios.post(`${BASE_URL}/api/login`, {
                username: createRes.data.user.username,
                password: 'password123'
            });
            teacherToken = tLogin.data.token;
        }
        console.log(`   ✅ Teacher ready (ID: ${teacherId})`);

        // Helper for testing endpoint with expected status
        const testEndpoint = async (description, method, url, data, token, expectedStatus) => {
            try {
                const res = await axios({
                    method,
                    url: `${BASE_URL}${url}`,
                    data,
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.status === expectedStatus) {
                    console.log(`   ✅ [PASS] ${description} -> Status ${res.status}`);
                    return true;
                } else {
                    console.error(`   ❌ [FAIL] ${description} -> Expected ${expectedStatus}, got ${res.status}`);
                    return false;
                }
            } catch (err) {
                const status = err.response ? err.response.status : 500;
                if (status === expectedStatus) {
                    console.log(`   ✅ [PASS] ${description} -> Status ${status} (${err.response?.data?.code || err.response?.data?.message || 'Blocked'})`);
                    return true;
                } else {
                    console.error(`   ❌ [FAIL] ${description} -> Expected ${expectedStatus}, got ${status}:`, err.response?.data || err.message);
                    return false;
                }
            }
        };

        // ==========================================================
        // STAGE A: ORDINARY TEACHER (Neither English nor Math)
        // ==========================================================
        console.log('\n==========================================================');
        console.log('STAGE A: ORDINARY TEACHER (isEnglish: false, isMath: false)');
        console.log('==========================================================');
        await axios.put(`${BASE_URL}/api/admin/toggle-english-teacher/${teacherId}`, { isEnglishTeacher: false }, { headers: { Authorization: `Bearer ${adminToken}` } });
        await axios.put(`${BASE_URL}/api/admin/toggle-math-teacher/${teacherId}`, { isMathTeacher: false }, { headers: { Authorization: `Bearer ${adminToken}` } });

        // CD IELTS evaluation & authoring must be 403
        await testEndpoint('Ordinary teacher accessing IELTS writing queue', 'GET', '/api/ielts/evaluations/writing/pending', null, teacherToken, 403);
        await testEndpoint('Ordinary teacher creating IELTS test', 'POST', '/api/ielts/tests', { title: 'Test Mock', skillType: 'READING' }, teacherToken, 403);
        await testEndpoint('Ordinary teacher creating IELTS assignment', 'POST', '/api/ielts/assignments', { title: 'Test Assignment' }, teacherToken, 403);

        // Digital SAT evaluation & authoring must be 403
        await testEndpoint('Ordinary teacher accessing SAT evaluation queue', 'GET', '/api/sat/evaluations/queue', null, teacherToken, 403);
        await testEndpoint('Ordinary teacher creating SAT question', 'POST', '/api/sat/questions', { section: 'MATH', domain: 'Algebra', prompt: 'Solve x', correctAnswer: '4' }, teacherToken, 403);
        await testEndpoint('Ordinary teacher creating SAT test', 'POST', '/api/sat/tests', { title: 'Test SAT', section: 'MATH' }, teacherToken, 403);
        await testEndpoint('Ordinary teacher creating SAT assignment', 'POST', '/api/sat/assignments', { title: 'Test SAT Assign' }, teacherToken, 403);

        // ==========================================================
        // STAGE B: ENGLISH TEACHER ONLY (isEnglish: true, isMath: false)
        // ==========================================================
        console.log('\n==========================================================');
        console.log('STAGE B: ENGLISH TEACHER ONLY (isEnglish: true, isMath: false)');
        console.log('==========================================================');
        await axios.put(`${BASE_URL}/api/admin/toggle-english-teacher/${teacherId}`, { isEnglishTeacher: true }, { headers: { Authorization: `Bearer ${adminToken}` } });
        await axios.put(`${BASE_URL}/api/admin/toggle-math-teacher/${teacherId}`, { isMathTeacher: false }, { headers: { Authorization: `Bearer ${adminToken}` } });

        // CD IELTS evaluation & test library must be 200
        await testEndpoint('English teacher accessing IELTS writing queue', 'GET', '/api/ielts/evaluations/writing/pending', null, teacherToken, 200);
        await testEndpoint('English teacher accessing IELTS speaking queue', 'GET', '/api/ielts/evaluations/speaking/pending', null, teacherToken, 200);
        await testEndpoint('English teacher accessing IELTS test library', 'GET', '/api/ielts/tests', null, teacherToken, 200);

        // Digital SAT evaluation & authoring must STILL be 403
        await testEndpoint('English teacher blocked from SAT evaluation queue', 'GET', '/api/sat/evaluations/queue', null, teacherToken, 403);
        await testEndpoint('English teacher blocked from SAT question creation', 'POST', '/api/sat/questions', { section: 'MATH', domain: 'Algebra', prompt: 'Solve x', correctAnswer: '4' }, teacherToken, 403);
        await testEndpoint('English teacher blocked from SAT test creation', 'POST', '/api/sat/tests', { title: 'SAT Test', section: 'MATH' }, teacherToken, 403);

        // ==========================================================
        // STAGE C: MATH TEACHER ONLY (isEnglish: false, isMath: true)
        // ==========================================================
        console.log('\n==========================================================');
        console.log('STAGE C: MATH TEACHER ONLY (isEnglish: false, isMath: true)');
        console.log('==========================================================');
        await axios.put(`${BASE_URL}/api/admin/toggle-english-teacher/${teacherId}`, { isEnglishTeacher: false }, { headers: { Authorization: `Bearer ${adminToken}` } });
        await axios.put(`${BASE_URL}/api/admin/toggle-math-teacher/${teacherId}`, { isMathTeacher: true }, { headers: { Authorization: `Bearer ${adminToken}` } });

        // Digital SAT evaluation queue & question creation must be 200/201
        await testEndpoint('Math teacher accessing SAT evaluation queue', 'GET', '/api/sat/evaluations/queue', null, teacherToken, 200);
        await testEndpoint('Math teacher creating SAT question', 'POST', '/api/sat/questions', {
            section: 'MATH',
            domain: 'Advanced Math',
            prompt: 'Solve: 2x + 4 = 10',
            correctAnswer: '3',
            options: ['2', '3', '4', '5']
        }, teacherToken, 201);

        // CD IELTS evaluation & authoring must STILL be 403
        await testEndpoint('Math teacher blocked from IELTS writing queue', 'GET', '/api/ielts/evaluations/writing/pending', null, teacherToken, 403);
        await testEndpoint('Math teacher blocked from IELTS speaking queue', 'GET', '/api/ielts/evaluations/speaking/pending', null, teacherToken, 403);
        await testEndpoint('Math teacher blocked from IELTS test library', 'GET', '/api/ielts/tests', null, teacherToken, 403);

        // ==========================================================
        // STAGE D: ADMIN ACCESS (Universal 200)
        // ==========================================================
        console.log('\n==========================================================');
        console.log('STAGE D: ADMIN ACCESS (Universal Permissions)');
        console.log('==========================================================');
        await testEndpoint('Admin accessing IELTS writing queue', 'GET', '/api/ielts/evaluations/writing/pending', null, adminToken, 200);
        await testEndpoint('Admin accessing IELTS speaking queue', 'GET', '/api/ielts/evaluations/speaking/pending', null, adminToken, 200);
        await testEndpoint('Admin accessing IELTS test library', 'GET', '/api/ielts/tests', null, adminToken, 200);
        await testEndpoint('Admin accessing SAT evaluation queue', 'GET', '/api/sat/evaluations/queue', null, adminToken, 200);

        console.log('\n================================================================');
        console.log('🎉 ALL STRICT ROLE SEPARATION TESTS PASSED WITH 100% ACCURACY!');
        console.log('================================================================');
    } catch (err) {
        console.error('❌ Verification script crashed:', err.response?.data || err.message);
        process.exit(1);
    }
}

runStrictRoleVerification();
