const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Staff = require('../models/Staff');
const BirthdaySettings = require('../models/BirthdaySettings');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// Multer memory storage — safe in-memory processing without writing raw files to disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedExts = ['.xlsx', '.xls'];
        const isAllowed = allowedExts.some(ext => file.originalname.toLowerCase().endsWith(ext));
        if (!isAllowed) {
            return cb(new Error("Faqat .xlsx yoki .xls formatidagi Excel fayllar qabul qilinadi!"));
        }
        cb(null, true);
    }
});

// Helper: Get or initialize Birthday Settings
async function getSettings() {
    let settings = await BirthdaySettings.findOne();
    if (!settings) {
        settings = await BirthdaySettings.create({
            enabled: true,
            showWidget: true,
            showProfilePhotos: true,
            showAge: false,
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
        // Compute Tashkent time (UTC+5)
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

// Helper: Parse birthday string or Excel serial number into { day, month, year, dateObj }
function parseBirthday(val) {
    if (val === null || val === undefined || val === '') return null;

    // If Excel serial number (e.g. 31295)
    if (typeof val === 'number') {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed && parsed.y && parsed.m && parsed.d) {
            const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
            return {
                day: parsed.d,
                month: parsed.m,
                year: parsed.y,
                dateObj: d,
                formatted: `${String(parsed.d).padStart(2, '0')}.${String(parsed.m).padStart(2, '0')}.${parsed.y}`
            };
        }
    }

    const str = String(val).trim();

    // Match DD.MM.YYYY, DD/MM/YYYY, or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
    if (dmyMatch) {
        const d = parseInt(dmyMatch[1], 10);
        const m = parseInt(dmyMatch[2], 10);
        const y = parseInt(dmyMatch[3], 10);

        if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1920 && y <= 2030) {
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

    // Match YYYY-MM-DD
    const ymdMatch = str.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})$/);
    if (ymdMatch) {
        const y = parseInt(ymdMatch[1], 10);
        const m = parseInt(ymdMatch[2], 10);
        const d = parseInt(ymdMatch[3], 10);

        if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1920 && y <= 2030) {
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

    // Fallback Date.parse
    const ts = Date.parse(str);
    if (!isNaN(ts)) {
        const dt = new Date(ts);
        const y = dt.getUTCFullYear();
        const m = dt.getUTCMonth() + 1;
        const d = dt.getUTCDate();
        if (y >= 1920 && y <= 2030) {
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

// Intelligent Column Matcher
function detectColumns(headers) {
    const normalize = str => (str || '').toLowerCase().replace(/[^a-z0-9]/gi, '').trim();

    const patterns = {
        firstName: ['ism', 'firstname', 'first', 'name', 'imya'],
        lastName: ['familiya', 'lastname', 'last', 'surname', 'familiya', 'familiasi'],
        profession: ['kasbi', 'lavozimi', 'mutaxassisligi', 'profession', 'position', 'job', 'title', 'role', 'doljnost'],
        dateOfBirth: ['tugilgansana', 'tuglgansana', 'dateofbirth', 'birthdate', 'birthday', 'sana', 'datarojdeniya']
    };

    const mapping = {
        firstName: null,
        lastName: null,
        profession: null,
        dateOfBirth: null
    };

    headers.forEach(h => {
        const norm = normalize(h);
        for (const [field, synonyms] of Object.entries(patterns)) {
            if (!mapping[field] && synonyms.some(s => norm.includes(s) || s.includes(norm))) {
                mapping[field] = h;
            }
        }
    });

    return mapping;
}

// =========================================================================
// 1. PREVIEW EXCEL FILE (Column Detection, Validation & Duplicate Check)
// =========================================================================
router.post('/preview', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Excel fayli tanlanmadi!" });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames.includes('Staff') ? 'Staff' : workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
            return res.status(400).json({ message: "Excel faylida hech qanday varaq topilmadi!" });
        }

        const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
        if (!rawJson || rawJson.length === 0) {
            return res.status(400).json({ message: "Excel varag'i bo'sh!" });
        }

        const headers = Object.keys(rawJson[0]);
        const detectedMapping = detectColumns(headers);

        // Fetch existing staff for duplicate checking
        const existingStaff = await Staff.find({}, 'firstName lastName birthDay birthMonth birthYear');
        const existingSet = new Set(
            existingStaff.map(s => `${s.firstName.toLowerCase()}_${s.lastName.toLowerCase()}_${s.birthDay}_${s.birthMonth}_${s.birthYear}`)
        );

        const rows = [];
        let validCount = 0;
        let warningCount = 0;
        let invalidCount = 0;

        rawJson.forEach((row, idx) => {
            const rawFirstName = String(row[detectedMapping.firstName] || '').trim();
            const rawLastName = String(row[detectedMapping.lastName] || '').trim();
            const rawProfession = String(row[detectedMapping.profession] || 'O\'qituvchi').trim();
            const rawDob = row[detectedMapping.dateOfBirth];

            // Ignore completely empty rows
            if (!rawFirstName && !rawLastName && !rawDob) {
                return;
            }

            const parsedDob = parseBirthday(rawDob);

            const rowData = {
                rowNumber: idx + 2, // Excel row #
                firstName: rawFirstName,
                lastName: rawLastName,
                profession: rawProfession || 'O\'qituvchi',
                rawDob: String(rawDob || ''),
                formattedDob: parsedDob ? parsedDob.formatted : null,
                parsedDob,
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
                rowData.issues.push("Tug'ilgan sana noto'g'ri (DD.MM.YYYY formati kutilmoqda)");
            }

            if (rowData.status === 'valid') {
                const key = `${rawFirstName.toLowerCase()}_${rawLastName.toLowerCase()}_${parsedDob.day}_${parsedDob.month}_${parsedDob.year}`;
                if (existingSet.has(key)) {
                    rowData.status = 'warning';
                    rowData.issues.push("Bu shaxs allaqachon tizimda mavjud (Takroriy)");
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
            fileName: req.file.originalname,
            sheetName,
            availableSheets: workbook.SheetNames,
            headers,
            detectedMapping,
            totalRecords: rows.length,
            validCount,
            warningCount,
            invalidCount,
            rows
        });
    } catch (err) {
        console.error("Excel preview error:", err);
        res.status(500).json({ message: "Excel faylini o'qishda xatolik yuz berdi: " + err.message });
    }
});

// =========================================================================
// 2. IMPORT STAFF INTO DATABASE
// =========================================================================
router.post('/import', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { rows, mode = 'merge', mapping } = req.body;

        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: "Import qilish uchun qatorlar topilmadi!" });
        }

        // Mode: 'replace' | 'merge' | 'update' | 'skip_duplicates'
        if (mode === 'replace') {
            await Staff.deleteMany({});
        }

        let imported = 0;
        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const row of rows) {
            const firstName = (row.firstName || '').trim();
            const lastName = (row.lastName || '').trim();
            const profession = (row.profession || 'O\'qituvchi').trim();
            const parsedDob = row.parsedDob || parseBirthday(row.rawDob);

            if (!firstName || !lastName || !parsedDob) {
                errors++;
                continue;
            }

            const query = {
                firstName: new RegExp(`^${firstName}$`, 'i'),
                lastName: new RegExp(`^${lastName}$`, 'i'),
                birthDay: parsedDob.day,
                birthMonth: parsedDob.month,
                birthYear: parsedDob.year
            };

            const existing = await Staff.findOne(query);

            if (existing) {
                if (mode === 'skip_duplicates') {
                    skipped++;
                    continue;
                }
                // Update existing record
                existing.profession = profession;
                existing.isActive = true;
                await existing.save();
                updated++;
            } else {
                // Insert new staff member
                await Staff.create({
                    firstName,
                    lastName,
                    profession,
                    dateOfBirth: parsedDob.dateObj,
                    birthDay: parsedDob.day,
                    birthMonth: parsedDob.month,
                    birthYear: parsedDob.year,
                    isActive: true
                });
                imported++;
            }
        }

        res.json({
            success: true,
            message: `Import yakunlandi! Yangi qo'shildi: ${imported}, Yangilandi: ${updated}, O'tkazildi: ${skipped}, Xatolar: ${errors}`,
            imported,
            updated,
            skipped,
            errors,
            total: rows.length
        });
    } catch (err) {
        console.error("Staff import error:", err);
        res.status(500).json({ message: "Import jarayonida xatolik: " + err.message });
    }
});

// In-memory cache for high-concurrency zero-lag responses
let todayBirthdayCache = null;
let todayBirthdayCachedAt = 0;

function invalidateBirthdayCache() {
    todayBirthdayCache = null;
    todayBirthdayCachedAt = 0;
}

// =========================================================================
// 3. TODAY'S BIRTHDAYS (Main Dashboard Engine - Timezone Asia/Tashkent)
// =========================================================================
router.get('/today', async (req, res) => {
    try {
        const now = Date.now();
        if (todayBirthdayCache && (now - todayBirthdayCachedAt < 15000)) {
            return res.json(todayBirthdayCache);
        }

        const settings = await getSettings();

        // If widget is disabled by administrator
        if (!settings.enabled || !settings.showWidget) {
            const disabledPayload = {
                celebrationActive: false,
                reason: 'disabled_by_admin',
                todayDate: null,
                birthdayPeople: []
            };
            todayBirthdayCache = disabledPayload;
            todayBirthdayCachedAt = now;
            return res.json(disabledPayload);
        }

        const tashkent = getTashkentDate(settings.simulationDate);
        const { year: currentYear, month: currentMonth, day: currentDay } = tashkent;

        // Leap year handling: if today is Feb 28 on a non-leap year, include Feb 29 if configured
        let dayConditions = [{ birthMonth: currentMonth, birthDay: currentDay }];
        if (currentMonth === 2 && currentDay === 28 && !isLeapYear(currentYear) && settings.leapYearPolicy === 'feb28') {
            dayConditions.push({ birthMonth: 2, birthDay: 29 });
        }

        // Query active staff matching today's birthDay & birthMonth
        // CRITICAL: NEVER return single item using findOne(); ALWAYS return array with find()
        const birthdayStaff = await Staff.find({
            isActive: true,
            $or: dayConditions
        }).sort({ lastName: 1, firstName: 1 }).lean();

        const formattedPeople = birthdayStaff.map(s => {
            const initials = `${s.firstName[0] || ''}${s.lastName[0] || ''}`.toUpperCase();
            const calcAge = s.birthYear ? (currentYear - s.birthYear) : null;

            // Formatted date: "06 September" or "06.09"
            const monthNamesUz = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
            const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthNamesRu = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];

            return {
                _id: s._id,
                firstName: s.firstName,
                lastName: s.lastName,
                fullName: `${s.firstName} ${s.lastName}`,
                profession: s.profession || 'O\'qituvchi',
                department: s.department || '',
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

        todayBirthdayCache = responsePayload;
        todayBirthdayCachedAt = now;

        res.json(responsePayload);
    } catch (err) {
        console.error("Today's birthday error:", err);
        res.status(500).json({ message: "Tug'ilgan kunlarni hisoblashda xatolik: " + err.message });
    }
});

// =========================================================================
// 4. UPCOMING BIRTHDAYS (Next 3–5 birthdays with Dec -> Jan rollover)
// =========================================================================
router.get('/upcoming', async (req, res) => {
    try {
        const settings = await getSettings();
        const tashkent = getTashkentDate(settings.simulationDate);
        const { year: currentYear, month: currentMonth, day: currentDay } = tashkent;

        const allActiveStaff = await Staff.find({ isActive: true }).lean();

        // Calculate days until next birthday for every staff member
        const upcomingList = allActiveStaff.map(s => {
            let nextBirthYear = currentYear;
            let targetMonth = s.birthMonth;
            let targetDay = s.birthDay;

            // Handle Feb 29
            if (targetMonth === 2 && targetDay === 29 && !isLeapYear(nextBirthYear)) {
                targetDay = settings.leapYearPolicy === 'feb28' ? 28 : 1;
                if (settings.leapYearPolicy === 'mar01') targetMonth = 3;
            }

            let nextBirthdayDate = new Date(nextBirthYear, targetMonth - 1, targetDay);
            const todayDate = new Date(currentYear, currentMonth - 1, currentDay);

            // If already passed this calendar year, roll over to next year
            if (nextBirthdayDate < todayDate) {
                nextBirthYear += 1;
                if (s.birthMonth === 2 && s.birthDay === 29 && !isLeapYear(nextBirthYear)) {
                    targetDay = settings.leapYearPolicy === 'feb28' ? 28 : 1;
                    targetMonth = settings.leapYearPolicy === 'mar01' ? 3 : 2;
                }
                nextBirthdayDate = new Date(nextBirthYear, targetMonth - 1, targetDay);
            }

            const diffTime = nextBirthdayDate - todayDate;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            return {
                _id: s._id,
                firstName: s.firstName,
                lastName: s.lastName,
                fullName: `${s.firstName} ${s.lastName}`,
                profession: s.profession || 'O\'qituvchi',
                department: s.department || '',
                birthDay: s.birthDay,
                birthMonth: s.birthMonth,
                birthYear: s.birthYear,
                turningAge: (nextBirthYear && s.birthYear) ? (nextBirthYear - s.birthYear) : null,
                formattedBirthDate: `${String(s.birthDay).padStart(2, '0')}.${String(s.birthMonth).padStart(2, '0')}.${s.birthYear || ''}`,
                initials: `${s.firstName[0] || ''}${s.lastName[0] || ''}`.toUpperCase(),
                daysUntil: diffDays,
                isToday: diffDays === 0
            };
        });

        // Filter out today's birthdays from "upcoming" (they are in the hero card)
        // Sort by next calendar occurrence
        const filteredUpcoming = upcomingList
            .filter(item => item.daysUntil > 0)
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, 8);

        const monthNamesUz = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
        const formatted = filteredUpcoming.map(item => ({
            ...item,
            formattedDate: `${String(item.birthDay).padStart(2, '0')} ${monthNamesUz[item.birthMonth - 1]}`
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Upcoming birthday error:", err);
        res.status(500).json({ message: "Kelgusi tug'ilgan kunlarni yuklashda xatolik: " + err.message });
    }
});

// =========================================================================
// 5. BIRTHDAY SETTINGS (GET & PUT)
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
        let settings = await BirthdaySettings.findOne();
        if (!settings) settings = new BirthdaySettings();

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
        invalidateBirthdayCache();
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// =========================================================================
// 6. SEND BIRTHDAY WISH
// =========================================================================
router.post('/wish', authMiddleware, async (req, res) => {
    try {
        const { staffId, message } = req.body;
        if (!staffId || !message) {
            return res.status(400).json({ message: "Xodim va tabrik matni talab qilinadi!" });
        }

        const settings = await getSettings();
        settings.wishes.push({
            senderName: req.user?.username || 'Hamkasb',
            senderRole: req.user?.role || 'teacher',
            staffId,
            message: message.substring(0, 300)
        });

        await settings.save();
        res.json({ success: true, message: "Tabrikingiz muvaffaqiyatli yuborildi! 🎉" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// =========================================================================
// 7. DOWNLOAD EXCEL TEMPLATE
// =========================================================================
router.get('/template', (req, res) => {
    try {
        // Build Excel template file matching specifications:
        // Sheet name: Staff
        // Column A: Ism
        // Column B: Familiya
        // Column C: Kasbi
        // Column D: Tug‘ilgan sana
        const data = [
            { "Ism": "Sardor", "Familiya": "Allakulov", "Kasbi": "Computer Science Teacher", "Tug‘ilgan sana": "06.09.1985" },
            { "Ism": "Muhammad", "Familiya": "Qahharov", "Kasbi": "Designer", "Tug‘ilgan sana": "06.09.1990" },
            { "Ism": "Aziz", "Familiya": "Karimov", "Kasbi": "Administrator", "Tug‘ilgan sana": "15.09.1988" },
            { "Ism": "Madina", "Familiya": "Rasulova", "Kasbi": "Mathematics Teacher", "Tug‘ilgan sana": "22.09.1992" }
        ];

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Staff");

        // Column widths
        worksheet['!cols'] = [
            { wch: 15 },
            { wch: 18 },
            { wch: 28 },
            { wch: 18 }
        ];

        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Disposition', 'attachment; filename="EdTech_Staff_Birthday_Template.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ message: "Shablonni yuklashda xatolik: " + err.message });
    }
});

// =========================================================================
// 8. STAFF CRUD (Admin Management)
// =========================================================================
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { search = '', profession = '', status = 'all', page = 1, limit = 50 } = req.query;

        const filter = {};

        if (search) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { firstName: regex },
                { lastName: regex },
                { profession: regex }
            ];
        }

        if (profession) {
            filter.profession = new RegExp(profession.trim(), 'i');
        }

        if (status === 'active') filter.isActive = true;
        else if (status === 'inactive') filter.isActive = false;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [staffList, total] = await Promise.all([
            Staff.find(filter)
                .sort({ lastName: 1, firstName: 1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Staff.countDocuments(filter)
        ]);

        const formatted = staffList.map(s => ({
            ...s,
            initials: `${s.firstName[0] || ''}${s.lastName[0] || ''}`.toUpperCase(),
            formattedDob: `${String(s.birthDay).padStart(2, '0')}.${String(s.birthMonth).padStart(2, '0')}.${s.birthYear}`
        }));

        res.json({
            staff: formatted,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create single staff member
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { firstName, lastName, profession, dateOfBirth, department, email, phone } = req.body;

        if (!firstName || !lastName || !dateOfBirth) {
            return res.status(400).json({ message: "Ism, Familiya va Tug'ilgan sana majburiy!" });
        }

        const parsedDob = parseBirthday(dateOfBirth);
        if (!parsedDob) {
            return res.status(400).json({ message: "Tug'ilgan sana noto'g'ri (DD.MM.YYYY)" });
        }

        const staff = await Staff.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            profession: (profession || 'O\'qituvchi').trim(),
            dateOfBirth: parsedDob.dateObj,
            birthDay: parsedDob.day,
            birthMonth: parsedDob.month,
            birthYear: parsedDob.year,
            department: department || 'General',
            email: email || '',
            phone: phone || '',
            isActive: true
        });

        res.status(201).json({ success: true, staff });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update single staff member
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { firstName, lastName, profession, dateOfBirth, department, email, phone, isActive } = req.body;

        const updateData = {};
        if (firstName) updateData.firstName = firstName.trim();
        if (lastName) updateData.lastName = lastName.trim();
        if (profession !== undefined) updateData.profession = profession.trim();
        if (department !== undefined) updateData.department = department;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
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

        const staff = await Staff.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!staff) return res.status(404).json({ message: "Xodim topilmadi!" });

        res.json({ success: true, staff });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Toggle active status
router.patch('/:id/toggle-active', authMiddleware, adminOnly, async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) return res.status(404).json({ message: "Xodim topilmadi!" });

        staff.isActive = !staff.isActive;
        await staff.save();

        res.json({ success: true, isActive: staff.isActive, staff });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete staff member
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const staff = await Staff.findByIdAndDelete(req.params.id);
        if (!staff) return res.status(404).json({ message: "Xodim topilmadi!" });
        res.json({ success: true, message: "Xodim muvaffaqiyatli o'chirildi!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
