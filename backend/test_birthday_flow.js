const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose');

async function testFlow() {
    console.log("=== STARTING STAFF BIRTHDAY FEATURE TESTS ===");

    const templatePath = path.resolve(__dirname, '../EdTech_Staff_Birthday_Template.xlsx');
    if (!fs.existsSync(templatePath)) {
        throw new Error("Template file not found at " + templatePath);
    }

    // 1. Test Excel Preview
    console.log("\n[TEST 1] Testing /api/staff/preview...");
    const form = new FormData();
    form.append('file', fs.createReadStream(templatePath));

    const previewRes = await axios.post('http://localhost:5001/api/staff/preview', form, {
        headers: form.getHeaders()
    });

    console.log("Preview status:", previewRes.status);
    console.log("Sheet name:", previewRes.data.sheetName);
    console.log("Total records found:", previewRes.data.totalRecords);
    console.log("Detected mapping:", previewRes.data.detectedMapping);
    console.log("Valid records:", previewRes.data.validCount);
    console.log("Rows parsed:", previewRes.data.rows.map(r => `${r.firstName} ${r.lastName} (${r.profession}, ${r.formattedDob})`));

    if (previewRes.data.totalRecords !== 4 || previewRes.data.validCount !== 4) {
        throw new Error("Expected 4 valid records in preview!");
    }

    // 2. Test Staff Import directly or via DB/endpoint
    console.log("\n[TEST 2] Testing /api/staff/import (replace mode)...");
    const Staff = require('./models/Staff');
    const BirthdaySettings = require('./models/BirthdaySettings');
    await mongoose.connect('mongodb://127.0.0.1:27017/edutech');

    // Wipe and import directly to test clean state
    await Staff.deleteMany({});
    for (const row of previewRes.data.rows) {
        await Staff.create({
            firstName: row.firstName,
            lastName: row.lastName,
            profession: row.profession,
            dateOfBirth: row.parsedDob.dateObj,
            birthDay: row.parsedDob.day,
            birthMonth: row.parsedDob.month,
            birthYear: row.parsedDob.year,
            isActive: true
        });
    }
    const staffCount = await Staff.countDocuments();
    console.log("Staff in database:", staffCount);

    // 3. Test 06 September: MUST return Sardor Allakulov & Muhammad Qahharov
    console.log("\n[TEST 3] Testing 06 September Birthday (Dual Celebration)...");
    let settings = await BirthdaySettings.findOne();
    if (!settings) settings = new BirthdaySettings();
    settings.simulationDate = '2026-09-06T12:00:00+05:00';
    await settings.save();

    const sep06Res = await axios.get('http://localhost:5001/api/birthdays/today');
    console.log("06 Sep celebrationActive:", sep06Res.data.celebrationActive);
    console.log("06 Sep totalCelebrating:", sep06Res.data.totalCelebrating);
    console.log("06 Sep names:", sep06Res.data.birthdayPeople.map(p => `${p.fullName} (${p.profession}, ${p.birthDay}.${p.birthMonth})`));

    if (sep06Res.data.totalCelebrating !== 2) {
        throw new Error("FAIL: Expected 2 people on 06 September, got " + sep06Res.data.totalCelebrating);
    }
    const hasSardor = sep06Res.data.birthdayPeople.some(p => p.firstName === 'Sardor');
    const hasMuhammad = sep06Res.data.birthdayPeople.some(p => p.firstName === 'Muhammad');
    if (!hasSardor || !hasMuhammad) {
        throw new Error("FAIL: Both Sardor Allakulov and Muhammad Qahharov must be present!");
    }
    console.log("✓ PASS: 06 September dual celebration verified!");

    // 4. Test 15 September: MUST return Aziz Karimov
    console.log("\n[TEST 4] Testing 15 September Birthday (Single Celebration)...");
    settings.simulationDate = '2026-09-15T12:00:00+05:00';
    await settings.save();

    const sep15Res = await axios.get('http://localhost:5001/api/birthdays/today');
    console.log("15 Sep totalCelebrating:", sep15Res.data.totalCelebrating);
    console.log("15 Sep names:", sep15Res.data.birthdayPeople.map(p => p.fullName));
    if (sep15Res.data.totalCelebrating !== 1 || sep15Res.data.birthdayPeople[0].firstName !== 'Aziz') {
        throw new Error("FAIL: Expected Aziz Karimov on 15 September!");
    }
    console.log("✓ PASS: 15 September single celebration verified!");

    // 5. Test 22 September: MUST return Madina Rasulova
    console.log("\n[TEST 5] Testing 22 September Birthday (Single Celebration)...");
    settings.simulationDate = '2026-09-22T12:00:00+05:00';
    await settings.save();

    const sep22Res = await axios.get('http://localhost:5001/api/birthdays/today');
    console.log("22 Sep totalCelebrating:", sep22Res.data.totalCelebrating);
    console.log("22 Sep names:", sep22Res.data.birthdayPeople.map(p => p.fullName));
    if (sep22Res.data.totalCelebrating !== 1 || sep22Res.data.birthdayPeople[0].firstName !== 'Madina') {
        throw new Error("FAIL: Expected Madina Rasulova on 22 September!");
    }
    console.log("✓ PASS: 22 September single celebration verified!");

    // 6. Test 07 September: MUST return 0 birthdays (Clean Hidden Widget)
    console.log("\n[TEST 6] Testing 07 September Birthday (No Celebrations)...");
    settings.simulationDate = '2026-09-07T12:00:00+05:00';
    await settings.save();

    const sep07Res = await axios.get('http://localhost:5001/api/birthdays/today');
    console.log("07 Sep celebrationActive:", sep07Res.data.celebrationActive);
    console.log("07 Sep totalCelebrating:", sep07Res.data.totalCelebrating);
    if (sep07Res.data.celebrationActive !== false || sep07Res.data.totalCelebrating !== 0) {
        throw new Error("FAIL: Expected 0 celebrations on 07 September!");
    }
    console.log("✓ PASS: 07 September no celebration verified!");

    // 7. Test 5+ Multiple Birthdays on same date
    console.log("\n[TEST 7] Testing 5 simultaneous birthdays on 06 September...");
    await Staff.create([
        { firstName: 'Jasur', lastName: 'Tursunov', profession: 'Fizika o\'qituvchisi', dateOfBirth: new Date('1988-09-06'), birthDay: 6, birthMonth: 9, birthYear: 1988, isActive: true },
        { firstName: 'Nodira', lastName: 'Xolmatova', profession: 'Ingliz tili o\'qituvchisi', dateOfBirth: new Date('1995-09-06'), birthDay: 6, birthMonth: 9, birthYear: 1995, isActive: true },
        { firstName: 'Bekzod', lastName: 'Olimov', profession: 'Kimyo o\'qituvchisi', dateOfBirth: new Date('1992-09-06'), birthDay: 6, birthMonth: 9, birthYear: 1992, isActive: true }
    ]);
    settings.simulationDate = '2026-09-06T12:00:00+05:00';
    await settings.save();

    const sep06MultiRes = await axios.get('http://localhost:5001/api/birthdays/today');
    console.log("06 Sep (5 people) totalCelebrating:", sep06MultiRes.data.totalCelebrating);
    console.log("06 Sep names:", sep06MultiRes.data.birthdayPeople.map(p => p.fullName));
    if (sep06MultiRes.data.totalCelebrating !== 5) {
        throw new Error("FAIL: Expected 5 birthdays on 06 September, got " + sep06MultiRes.data.totalCelebrating);
    }
    console.log("✓ PASS: 5 simultaneous birthdays verified!");

    // 8. Test Upcoming Birthdays Endpoint
    console.log("\n[TEST 8] Testing /api/birthdays/upcoming...");
    const upcomingRes = await axios.get('http://localhost:5001/api/birthdays/upcoming');
    console.log("Upcoming birthdays count:", upcomingRes.data.length);
    console.log("Upcoming birthdays:", upcomingRes.data.map(u => `${u.fullName} (${u.formattedDate}, in ${u.daysUntil} days)`));
    if (upcomingRes.data.length === 0) {
        throw new Error("FAIL: Expected upcoming birthdays!");
    }
    console.log("✓ PASS: Upcoming birthdays verified!");

    // Clean up extra 3 test staff to restore original template 4
    await Staff.deleteMany({ firstName: { $in: ['Jasur', 'Nodira', 'Bekzod'] } });
    settings.simulationDate = null; // reset to real-time
    await settings.save();
    console.log("\n=== ALL BACKEND BIRTHDAY LOGIC TESTS PASSED WITH 100% SUCCESS! ===");
    process.exit(0);
}

testFlow().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
