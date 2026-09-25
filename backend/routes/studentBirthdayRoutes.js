const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const StudentBirthday = require('../models/StudentBirthday');
const StudentBirthdaySettings = require('../models/StudentBirthdaySettings');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// Multer memory storage for safe Excel imports
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedExts = ['.xlsx', '.xls'];
        const isAllowed = allowedExts.some(ext => file.originalname.toLowerCase().endsWith(ext));
        if (!isAllowed) {
            return cb(new Error("Faqat .xlsx yoki .xls formatidagi Excel fayllar qabul qilinadi!"));
        }
        cb(null, true);
    }
});

// Cache for zero-lag responses
let todayStudentCache = null;
let todayStudentCachedAt = 0;

function invalidateStudentCache() {
    todayStudentCache = null;
    todayStudentCachedAt = 0;
}

// Helper: Get or initialize Student Birthday Settings
async function getSettings() {
    let settings = await StudentBirthdaySettings.findOne();
    if (!settings) {
        settings = await StudentBirthdaySettings.create({
            enabled: true,
            showWidget: true,
            showProfilePhotos: true,
            showAge: true,
            confettiEnabled: true,
            automaticMessage: true,
            leapYearPolicy: 'feb28',
            simulationDate: null
        });
    }
    return settings;
}

// Helper: Get current date parts in Asia/Tashkent timezone
function getTashkentDate(simulatedDateStr = null) {
    let date;
    if (simulatedDateStr) {
        date = new Date(simulatedDateStr);
    } else {
        const now = new Date();
        const tashkentTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Tashkent" });
        date = new Date(tashkentTimeStr);
    }
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1, // 1-12
        day: date.getDate(),
        fullDate: date
    };
}

// Helper: Check leap year
function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// Helper: Robust birthday date parser
function parseBirthday(val) {
    if (!val) return null;

    if (val instanceof Date && !isNaN(val)) {
        const y = val.getUTCFullYear();
        const m = val.getUTCMonth() + 1;
        const d = val.getUTCDate();
        if (y >= 2000 && y <= 2030) {
            return {
                day: d,
                month: m,
                year: y,
                dateObj: val,
                formatted: `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
            };
        }
    }

    if (typeof val === 'number') {
        const parsedExcel = XLSX.SSF.parse_date_code(val);
        if (parsedExcel && parsedExcel.y && parsedExcel.m && parsedExcel.d) {
            const dateObj = new Date(Date.UTC(parsedExcel.y, parsedExcel.m - 1, parsedExcel.d));
            return {
                day: parsedExcel.d,
                month: parsedExcel.m,
                year: parsedExcel.y,
                dateObj,
                formatted: `${String(parsedExcel.d).padStart(2, '0')}.${String(parsedExcel.m).padStart(2, '0')}.${parsedExcel.y}`
            };
        }
    }

    const str = String(val).trim();

    const dmyMatch = str.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
    if (dmyMatch) {
        const d = parseInt(dmyMatch[1], 10);
        const m = parseInt(dmyMatch[2], 10);
        const y = parseInt(dmyMatch[3], 10);

        if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2030) {
            const dateObj = new Date(Date.UTC(y, m - 1, d));
            return {
                day: d,
                month: m,
                year: y,
                dateObj,
                formatted: `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
            };
        }
    }

    const ymdMatch = str.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})$/);
    if (ymdMatch) {
        const y = parseInt(ymdMatch[1], 10);
        const m = parseInt(ymdMatch[2], 10);
        const d = parseInt(ymdMatch[3], 10);

        if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2030) {
            const dateObj = new Date(Date.UTC(y, m - 1, d));
            return {
                day: d,
                month: m,
                year: y,
                dateObj,
                formatted: `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
            };
        }
    }

    const ts = Date.parse(str);
    if (!isNaN(ts)) {
        const dt = new Date(ts);
        const y = dt.getUTCFullYear();
        const m = dt.getUTCMonth() + 1;
        const d = dt.getUTCDate();
        if (y >= 2000 && y <= 2030) {
            return {
                day: d,
                month: m,
                year: y,
                dateObj: new Date(Date.UTC(y, m - 1, d)),
                formatted: `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
            };
        }
    }

    return null;
}

// Column header matching for Student Excel
function detectStudentColumns(headers) {
    const mapping = {
        firstName: null,
        lastName: null,
        classGroup: null,
        dateOfBirth: null,
        phone: null,
        email: null
    };

    const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    headers.forEach(h => {
        const n = normalize(h);
        if (!mapping.firstName && (n.includes('ism') || n.includes('first') || n === 'name')) {
            mapping.firstName = h;
        } else if (!mapping.lastName && (n.includes('fam') || n.includes('last') || n.includes('surname'))) {
            mapping.lastName = h;
        } else if (!mapping.classGroup && (n.includes('sinf') || n.includes('guruh') || n.includes('class') || n.includes('group'))) {
            mapping.classGroup = h;
        } else if (!mapping.dateOfBirth && (n.includes('tugilgan') || n.includes('birth') || n.includes('dob') || n.includes('sana') || n.includes('date'))) {
            mapping.dateOfBirth = h;
        } else if (!mapping.phone && (n.includes('tel') || n.includes('phone') || n.includes('nomer'))) {
            mapping.phone = h;
        } else if (!mapping.email && (n.includes('email') || n.includes('pochta') || n.includes('mail'))) {
            mapping.email = h;
        }
    });

    return mapping;
}

// =========================================================================
// 1. TODAY'S CELEBRATING STUDENTS (With Simulation Engine)
// =========================================================================
router.get('/today', async (req, res) => {
    try {
        const now = Date.now();
        if (todayStudentCache && (now - todayStudentCachedAt < 10000)) {
            return res.json(todayStudentCache);
        }

        const settings = await getSettings();

        if (!settings.enabled || !settings.showWidget) {
            const disabledPayload = {
                celebrationActive: false,
                reason: 'disabled_by_admin',
                todayDate: null,
                birthdayPeople: []
            };
            todayStudentCache = disabledPayload;
            todayStudentCachedAt = now;
            return res.json(disabledPayload);
        }

        const tashkent = getTashkentDate(settings.simulationDate);
        const { year: currentYear, month: currentMonth, day: currentDay } = tashkent;

        let dayConditions = [{ birthMonth: currentMonth, birthDay: currentDay }];
        if (currentMonth === 2 && currentDay === 28 && !isLeapYear(currentYear) && settings.leapYearPolicy === 'feb28') {
            dayConditions.push({ birthMonth: 2, birthDay: 29 });
        }

        const birthdayStudents = await StudentBirthday.find({
            isActive: true,
            $or: dayConditions
        }).sort({ classGroup: 1, lastName: 1, firstName: 1 }).lean();

        const monthNamesUz = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
        const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthNamesRu = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];

        const formattedPeople = birthdayStudents.map(s => {
            const initials = `${s.firstName[0] || ''}${s.lastName[0] || ''}`.toUpperCase();
            const calcAge = s.birthYear ? (currentYear - s.birthYear) : null;

            return {
                _id: s._id,
                firstName: s.firstName,
                lastName: s.lastName,
                fullName: `${s.firstName} ${s.lastName}`,
                classGroup: s.classGroup || '5-Blue',
                profession: `${s.classGroup || 'O\'quvchi'} o'quvchisi`,
                profilePhoto: settings.showProfilePhotos ? s.profilePhoto : null,
                initials,
                birthDay: s.birthDay,
                birthMonth: s.birthMonth,
                birthYear: s.birthYear,
                dateOfBirth: s.dateOfBirth,
                age: calcAge,
                formattedBirthDate: `${String(s.birthDay).padStart(2, '0')}.${String(s.birthMonth).padStart(2, '0')}.${s.birthYear || ''}`,
                dateDisplay: {
                    uz: `${String(s.birthDay).padStart(2, '0')} ${monthNamesUz[s.birthMonth - 1]} ${s.birthYear || ''}`,
                    en: `${String(s.birthDay).padStart(2, '0')} ${monthNamesEn[s.birthMonth - 1]} ${s.birthYear || ''}`,
                    ru: `${String(s.birthDay).padStart(2, '0')} ${monthNamesRu[s.birthMonth - 1]} ${s.birthYear || ''}`
                }
            };
        });

        const responsePayload = {
            celebrationActive: formattedPeople.length > 0,
            simulated: !!settings.simulationDate,
            simulationDate: settings.simulationDate,
            currentTashkentDate: `${String(currentDay).padStart(2, '0')}.${String(currentMonth).padStart(2, '0')}.${currentYear}`,
            totalCelebrating: formattedPeople.length,
            confettiEnabled: settings.confettiEnabled,
            automaticMessage: settings.automaticMessage,
            showAge: settings.showAge,
            birthdayPeople: formattedPeople
        };

        todayStudentCache = responsePayload;
        todayStudentCachedAt = now;

        res.json(responsePayload);
    } catch (err) {
        console.error("Today's student birthday error:", err);
        res.status(500).json({ message: "O'quvchilar tug'ilgan kunlarini hisoblashda xatolik: " + err.message });
    }
});

// =========================================================================
// 2. UPCOMING STUDENT BIRTHDAYS (Next 30 Days)
// =========================================================================
router.get('/upcoming', async (req, res) => {
    try {
        const settings = await getSettings();
        const tashkent = getTashkentDate(settings.simulationDate);
        const { year: currentYear, month: currentMonth, day: currentDay } = tashkent;

        const allActive = await StudentBirthday.find({ isActive: true }).lean();

        const monthNamesUz = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

        const upcomingList = allActive.map(s => {
            let bYear = currentYear;
            if (s.birthMonth < currentMonth || (s.birthMonth === currentMonth && s.birthDay < currentDay)) {
                bYear = currentYear + 1;
            }

            let bDay = s.birthDay;
            if (s.birthMonth === 2 && s.birthDay === 29 && !isLeapYear(bYear)) {
                bDay = 28;
            }

            const thisBday = new Date(Date.UTC(bYear, s.birthMonth - 1, bDay));
            const todayDate = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay));
            const diffDays = Math.round((thisBday - todayDate) / (1000 * 60 * 60 * 24));

            return {
                ...s,
                daysRemaining: diffDays,
                turningAge: bYear - s.birthYear,
                formattedDate: `${String(s.birthDay).padStart(2, '0')} ${monthNamesUz[s.birthMonth - 1]}`
            };
        })
        .filter(item => item.daysRemaining > 0 && item.daysRemaining <= 30)
        .sort((a, b) => a.daysRemaining - b.daysRemaining)
        .slice(0, 10);

        res.json(upcomingList);
    } catch (err) {
        console.error("Upcoming student birthday error:", err);
        res.status(500).json({ message: "Kelgusi o'quvchilar tug'ilgan kunlarini yuklashda xatolik" });
    }
});

// =========================================================================
// 3. PREVIEW EXCEL FILE (Student)
// =========================================================================
router.post('/preview', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Excel fayli tanlanmadi!" });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
            return res.status(400).json({ message: "Excel faylida varaq topilmadi!" });
        }

        const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
        if (!rawJson || rawJson.length === 0) {
            return res.status(400).json({ message: "Excel varag'i bo'sh!" });
        }

        const headers = Object.keys(rawJson[0]);
        const detectedMapping = detectStudentColumns(headers);

        const existingStudents = await StudentBirthday.find({}, 'firstName lastName classGroup birthDay birthMonth birthYear');
        const existingSet = new Set(
            existingStudents.map(s => `${s.firstName.toLowerCase()}_${s.lastName.toLowerCase()}_${s.classGroup.toLowerCase()}_${s.birthDay}_${s.birthMonth}_${s.birthYear}`)
        );

        const rows = [];
        let validCount = 0;
        let warningCount = 0;
        let invalidCount = 0;

        rawJson.forEach((row, idx) => {
            const rawFirstName = String(row[detectedMapping.firstName] || '').trim();
            const rawLastName = String(row[detectedMapping.lastName] || '').trim();
            const rawClass = String(row[detectedMapping.classGroup] || '5-Blue').trim();
            const rawDob = row[detectedMapping.dateOfBirth];

            if (!rawFirstName && !rawLastName && !rawDob) return;

            const parsedDob = parseBirthday(rawDob);

            const rowData = {
                rowNumber: idx + 2,
                firstName: rawFirstName,
                lastName: rawLastName,
                classGroup: rawClass || '5-Blue',
                rawDob: String(rawDob || ''),
                formattedDob: parsedDob ? parsedDob.formatted : null,
                parsedDob,
                phone: String(row[detectedMapping.phone] || '').trim(),
                email: String(row[detectedMapping.email] || '').trim(),
                status: 'valid',
                issues: []
            };

            if (!rawFirstName) {
                rowData.status = 'invalid';
                rowData.issues.push("Ism kiritilmagan");
            }
            if (!rawLastName) {
                rowData.status = 'invalid';
                rowData.issues.push("Familiya kiritilmagan");
            }
            if (!parsedDob) {
                rowData.status = 'invalid';
                rowData.issues.push("Tug'ilgan sana noto'g'ri (DD.MM.YYYY)");
            }

            if (rowData.status === 'valid') {
                const key = `${rawFirstName.toLowerCase()}_${rawLastName.toLowerCase()}_${rawClass.toLowerCase()}_${parsedDob.day}_${parsedDob.month}_${parsedDob.year}`;
                if (existingSet.has(key)) {
                    rowData.status = 'duplicate';
                    rowData.issues.push("Tizimda ushbu o'quvchi allaqachon mavjud");
                    warningCount++;
                } else {
                    validCount++;
                }
            } else {
                invalidCount++;
            }

            rows.push(rowData);
        });

        res.json({
            headers,
            detectedMapping,
            totalRows: rows.length,
            validCount,
            warningCount,
            invalidCount,
            rows: rows.slice(0, 500)
        });
    } catch (err) {
        console.error("Student preview error:", err);
        res.status(500).json({ message: "Excel faylni tahlil qilishda xatolik: " + err.message });
    }
});

// =========================================================================
// 4. IMPORT STUDENTS (Admin or Management)
// =========================================================================
router.post('/import', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { rows, mode = 'merge' } = req.body;

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: "Import uchun qatorlar topilmadi!" });
        }

        if (mode === 'replace') {
            await StudentBirthday.deleteMany({});
        }

        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let errors = [];

        for (const item of rows) {
            try {
                const parsed = item.parsedDob || parseBirthday(item.rawDob);
                if (!parsed || !item.firstName || !item.lastName) {
                    skippedCount++;
                    continue;
                }

                const query = {
                    firstName: new RegExp(`^${item.firstName.trim()}$`, 'i'),
                    lastName: new RegExp(`^${item.lastName.trim()}$`, 'i'),
                    classGroup: (item.classGroup || '5-Blue').trim(),
                    birthDay: parsed.day,
                    birthMonth: parsed.month,
                    birthYear: parsed.year
                };

                const existing = await StudentBirthday.findOne(query);

                if (existing) {
                    if (mode === 'skip_duplicates') {
                        skippedCount++;
                        continue;
                    } else if (mode === 'update' || mode === 'merge') {
                        if (item.phone) existing.phone = item.phone.trim();
                        if (item.email) existing.email = item.email.trim();
                        await existing.save();
                        updatedCount++;
                    }
                } else {
                    await StudentBirthday.create({
                        firstName: item.firstName.trim(),
                        lastName: item.lastName.trim(),
                        classGroup: (item.classGroup || '5-Blue').trim(),
                        dateOfBirth: parsed.dateObj,
                        birthDay: parsed.day,
                        birthMonth: parsed.month,
                        birthYear: parsed.year,
                        phone: item.phone ? item.phone.trim() : '',
                        email: item.email ? item.email.trim() : '',
                        isActive: true
                    });
                    addedCount++;
                }
            } catch (rowErr) {
                errors.push(`Qator ${item.rowNumber || '?'}: ${rowErr.message}`);
                skippedCount++;
            }
        }

        invalidateStudentCache();

        res.json({
            success: true,
            summary: {
                totalProcessed: rows.length,
                addedCount,
                updatedCount,
                skippedCount,
                errorsCount: errors.length,
                errors: errors.slice(0, 10)
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Import xatoligi: " + err.message });
    }
});

// =========================================================================
// 5. DOWNLOAD EXCEL TEMPLATE FOR STUDENTS
// =========================================================================
router.get('/template', (req, res) => {
    try {
        const sampleData = [
            {
                "Ism": "Malika",
                "Familiya": "Karimova",
                "Sinf": "5-Blue",
                "Tug'ilgan sana": "11.09.2014",
                "Telefon": "+998901234501",
                "Email": "malika@pm.uz"
            },
            {
                "Ism": "Otabek",
                "Familiya": "Jumayev",
                "Sinf": "7-Green",
                "Tug'ilgan sana": "15.09.2012",
                "Telefon": "+998901234502",
                "Email": "otabek@pm.uz"
            },
            {
                "Ism": "Dilnoza",
                "Familiya": "Rahimova",
                "Sinf": "9-Blue",
                "Tug'ilgan sana": "22.09.2010",
                "Telefon": "+998901234503",
                "Email": "dilnoza@pm.uz"
            }
        ];

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(sampleData);

        worksheet['!cols'] = [
            { wch: 18 },
            { wch: 20 },
            { wch: 14 },
            { wch: 18 },
            { wch: 18 },
            { wch: 24 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, "O'quvchilar");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="EdTech_Student_Birthday_Template.xlsx"');
        res.send(excelBuffer);
    } catch (err) {
        res.status(500).json({ message: "Shablon yaratishda xatolik: " + err.message });
    }
});

// =========================================================================
// 6. SETTINGS & SIMULATION DATE (Admin or Management)
// =========================================================================
router.get('/settings', async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/settings', authMiddleware, adminOnly, async (req, res) => {
    try {
        let settings = await StudentBirthdaySettings.findOne();
        if (!settings) settings = new StudentBirthdaySettings();

        const {
            enabled,
            showWidget,
            showProfilePhotos,
            showAge,
            confettiEnabled,
            automaticMessage,
            leapYearPolicy,
            simulationDate
        } = req.body;

        if (enabled !== undefined) settings.enabled = enabled;
        if (showWidget !== undefined) settings.showWidget = showWidget;
        if (showProfilePhotos !== undefined) settings.showProfilePhotos = showProfilePhotos;
        if (showAge !== undefined) settings.showAge = showAge;
        if (confettiEnabled !== undefined) settings.confettiEnabled = confettiEnabled;
        if (automaticMessage !== undefined) settings.automaticMessage = automaticMessage;
        if (leapYearPolicy !== undefined) settings.leapYearPolicy = leapYearPolicy;
        if (simulationDate !== undefined) settings.simulationDate = simulationDate;

        await settings.save();
        invalidateStudentCache();
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// =========================================================================
// 7. STUDENT BIRTHDAY LIST (With search & classGroup filter)
// =========================================================================
router.get('/', async (req, res) => {
    try {
        const { search, classGroup, status = 'all', page = 1, limit = 100 } = req.query;

        const filter = {};
        if (status === 'active') filter.isActive = true;
        if (status === 'inactive') filter.isActive = false;
        if (classGroup && classGroup !== 'all') filter.classGroup = classGroup;

        if (search) {
            const sRegex = new RegExp(search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
            filter.$or = [
                { firstName: sRegex },
                { lastName: sRegex },
                { classGroup: sRegex },
                { email: sRegex }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [students, total] = await Promise.all([
            StudentBirthday.find(filter).sort({ classGroup: 1, lastName: 1, firstName: 1 }).skip(skip).limit(parseInt(limit)).lean(),
            StudentBirthday.countDocuments(filter)
        ]);

        res.json({
            students,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// =========================================================================
// 8. CREATE STUDENT RECORD (Admin or Management)
// =========================================================================
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { firstName, lastName, classGroup, dateOfBirth, profilePhoto, phone, email } = req.body;

        if (!firstName || !lastName || !dateOfBirth) {
            return res.status(400).json({ message: "Ism, Familiya va Tug'ilgan sana majburiy!" });
        }

        const parsedDob = parseBirthday(dateOfBirth);
        if (!parsedDob) {
            return res.status(400).json({ message: "Tug'ilgan sana noto'g'ri (DD.MM.YYYY)" });
        }

        const student = await StudentBirthday.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            classGroup: (classGroup || '5-Blue').trim(),
            dateOfBirth: parsedDob.dateObj,
            birthDay: parsedDob.day,
            birthMonth: parsedDob.month,
            birthYear: parsedDob.year,
            profilePhoto: profilePhoto || null,
            phone: phone || '',
            email: email || '',
            isActive: true
        });

        invalidateStudentCache();
        res.status(201).json({ success: true, student });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// =========================================================================
// 9. UPDATE STUDENT RECORD (Admin or Management)
// =========================================================================
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { firstName, lastName, classGroup, dateOfBirth, profilePhoto, phone, email, isActive } = req.body;

        const updateData = {};
        if (firstName) updateData.firstName = firstName.trim();
        if (lastName) updateData.lastName = lastName.trim();
        if (classGroup !== undefined) updateData.classGroup = classGroup.trim();
        if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;
        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        if (isActive !== undefined) updateData.isActive = isActive;

        if (dateOfBirth) {
            const parsedDob = parseBirthday(dateOfBirth);
            if (parsedDob) {
                updateData.dateOfBirth = parsedDob.dateObj;
                updateData.birthDay = parsedDob.day;
                updateData.birthMonth = parsedDob.month;
                updateData.birthYear = parsedDob.year;
            }
        }

        const updated = await StudentBirthday.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updated) return res.status(404).json({ message: "O'quvchi topilmadi" });

        invalidateStudentCache();
        res.json({ success: true, student: updated });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// =========================================================================
// 10. DELETE STUDENT RECORD (Admin or Management)
// =========================================================================
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const deleted = await StudentBirthday.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "O'quvchi topilmadi" });

        invalidateStudentCache();
        res.json({ success: true, message: "O'quvchi muvaffaqiyatli o'chirildi" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// =========================================================================
// 11. SEND BIRTHDAY WISH TO STUDENT
// =========================================================================
router.post('/wish', authMiddleware, async (req, res) => {
    try {
        const { studentId, message } = req.body;
        if (!studentId || !message) {
            return res.status(400).json({ message: "O'quvchi va tabrik matni kiritilishi shart" });
        }

        let settings = await getSettings();
        if (!settings.wishes) settings.wishes = [];

        const newWish = {
            senderName: req.user.username || 'Anonim',
            senderRole: req.user.role || 'student',
            studentId,
            message: message.trim(),
            createdAt: new Date()
        };

        settings.wishes.unshift(newWish);
        if (settings.wishes.length > 200) settings.wishes = settings.wishes.slice(0, 200);

        await settings.save();
        res.status(201).json({ success: true, wish: newWish });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
