/**
 * Digital SAT Platform - Seed Data Script
 * Seeds: 8 RW questions + 10 Math questions + 3 published tests
 * Run: node seed_sat_data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { SATQuestion, SATTest } = require('./models/SAT');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/edutech';

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected');

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
        console.error('❌ No admin user found.');
        process.exit(1);
    }
    const adminId = admin._id;

    const rwM1Questions = [
        {
            section: 'READING_WRITING',
            domain: 'Craft and Structure',
            skill: 'Words in Context',
            questionType: 'multiple_choice',
            prompt: 'As used in the passage, "ephemeral" most nearly means',
            stimulusText: 'The beauty of a cherry blossom is ephemeral — lasting only days before the petals fall and scatter in the wind.',
            options: ['A) eternal', 'B) transient', 'C) vibrant', 'D) fragile'],
            correctAnswer: 'B',
            explanation: '"Ephemeral" means lasting for a very short time, making "transient" the closest synonym.',
            difficulty: 'MEDIUM', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'READING_WRITING',
            domain: 'Craft and Structure',
            skill: 'Text Structure and Purpose',
            questionType: 'multiple_choice',
            prompt: 'Which choice best describes the overall structure of the text?',
            stimulusText: 'Scientists have long debated the origins of language. Recent fossil evidence suggests vocal tract evolution around 300,000 years ago. However, critics note anatomy alone cannot explain grammar complexity.',
            options: [
                'A) A claim is made, supporting evidence is presented, then a counterpoint is raised.',
                'B) A question is posed, then definitively answered.',
                'C) Two opposing theories are described, then a resolution is offered.',
                'D) An experiment is described, then its results are interpreted.'
            ],
            correctAnswer: 'A',
            explanation: 'The text presents a claim, fossil evidence, then a counterargument.',
            difficulty: 'MEDIUM', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'READING_WRITING',
            domain: 'Information and Ideas',
            skill: 'Central Ideas and Details',
            questionType: 'multiple_choice',
            prompt: 'According to the text, what primarily causes urban heat islands?',
            stimulusText: 'Urban heat islands (UHIs) occur when cities are significantly warmer than surrounding areas. This is primarily caused by dark, heat-absorbing surfaces like asphalt and rooftops, reduced vegetation, and waste heat from human activity.',
            options: [
                'A) Increased pollution from vehicles',
                'B) Heat-absorbing surfaces and reduced vegetation',
                'C) Higher population density',
                'D) Industrial factories near city centers'
            ],
            correctAnswer: 'B',
            explanation: 'The text explicitly states the primary cause is heat-absorbing surfaces and reduced vegetation.',
            difficulty: 'BEGINNER', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'READING_WRITING',
            domain: 'Standard English Conventions',
            skill: 'Boundaries',
            questionType: 'multiple_choice',
            prompt: 'Which choice completes the text with the most logical transition?',
            stimulusText: 'The committee reviewed all proposals; ______, it selected only three finalists.',
            options: ['A) however', 'B) consequently', 'C) furthermore', 'D) in contrast'],
            correctAnswer: 'B',
            explanation: '"Consequently" correctly shows that selecting finalists was the result of the review.',
            difficulty: 'MEDIUM', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'READING_WRITING',
            domain: 'Standard English Conventions',
            skill: 'Form, Structure, and Sense',
            questionType: 'multiple_choice',
            prompt: 'Which version correctly completes the sentence?',
            stimulusText: 'Each of the students ___ submitted their assignment on time.',
            options: ['A) have', 'B) has', 'C) having', 'D) are having'],
            correctAnswer: 'B',
            explanation: '"Each" is singular and takes "has".',
            difficulty: 'BEGINNER', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'READING_WRITING',
            domain: 'Expression of Ideas',
            skill: 'Rhetorical Synthesis',
            questionType: 'multiple_choice',
            prompt: 'The student wants to emphasize urgency of climate action. Which sentence best does this?',
            stimulusText: '[Notes: Temperatures +1.1°C. Arctic ice melting. Tipping points by 2030.]',
            options: [
                'A) Climate change is discussed by many scientists.',
                'B) Some studies suggest temperatures may be increasing.',
                'C) With irreversible tipping points as close as 2030, immediate action is existential.',
                'D) The environment has experienced changes recently.'
            ],
            correctAnswer: 'C',
            explanation: 'Option C uses specific data from notes and frames it with urgent language.',
            difficulty: 'ADVANCED', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'READING_WRITING',
            domain: 'Information and Ideas',
            skill: 'Command of Evidence (Textual)',
            questionType: 'multiple_choice',
            prompt: 'Which quotation best supports that ocean acidification threatens marine life?',
            stimulusText: '"Shell-forming organisms such as oysters struggle to build structures as seawater becomes more acidic," noted Dr. Chen. Some fish also show behavioral disruptions at lower pH.',
            options: [
                'A) "Ocean acidification has accelerated since industrialization."',
                'B) "Shell-forming organisms such as oysters struggle to build structures."',
                'C) "Dr. Chen published findings in 2022."',
                'D) "Some fish species show behavioral disruptions."'
            ],
            correctAnswer: 'B',
            explanation: 'This quote directly demonstrates the threat to marine life from acidification.',
            difficulty: 'MEDIUM', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'READING_WRITING',
            domain: 'Craft and Structure',
            skill: 'Cross-Text Connections',
            questionType: 'multiple_choice',
            prompt: 'Based on both texts, how does Text 2 relate to Text 1?',
            stimulusText: 'Text 1: "AI will inevitably replace most knowledge workers within a decade."\n\nText 2: A 2024 study found AI displaced 14M jobs (2015-2024) but created 22M new jobs globally.',
            options: [
                'A) Text 2 confirms the prediction in Text 1.',
                'B) Text 2 complicates the claim in Text 1.',
                'C) Text 2 is unrelated to Text 1.',
                'D) Text 2 proves Text 1 is completely wrong.'
            ],
            correctAnswer: 'B',
            explanation: 'Text 2 complicates (but does not disprove) Text 1 — jobs were displaced AND created.',
            difficulty: 'ADVANCED', difficultyTier: 'STANDARD', createdBy: adminId
        }
    ];

    const mathM1Questions = [
        {
            section: 'MATH',
            domain: 'Algebra',
            skill: 'Linear Equations in One Variable',
            questionType: 'multiple_choice',
            prompt: 'If 3x - 7 = 14, what is the value of x?',
            options: ['A) 3', 'B) 5', 'C) 7', 'D) 9'],
            correctAnswer: 'C',
            explanation: '3x = 21, so x = 7',
            difficulty: 'BEGINNER', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'MATH',
            domain: 'Algebra',
            skill: 'Linear Functions',
            questionType: 'multiple_choice',
            prompt: 'A line passes through (2, 5) and (4, 11). What is the slope?',
            options: ['A) 2', 'B) 3', 'C) 4', 'D) 6'],
            correctAnswer: 'B',
            explanation: 'slope = (11-5)/(4-2) = 3',
            difficulty: 'MEDIUM', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'MATH',
            domain: 'Algebra',
            skill: 'Systems of Two Linear Equations',
            questionType: 'multiple_choice',
            prompt: 'Which (x, y) satisfies both y = 2x + 1 and y = -x + 7?',
            options: ['A) (1, 3)', 'B) (2, 5)', 'C) (3, 7)', 'D) (2, 6)'],
            correctAnswer: 'B',
            explanation: '3x=6 → x=2, y=5',
            difficulty: 'MEDIUM', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'MATH',
            domain: 'Advanced Math',
            skill: 'Equivalent Expressions',
            questionType: 'multiple_choice',
            prompt: 'Which expression is equivalent to (x + 3)(x - 3)?',
            options: ['A) x² - 9', 'B) x² + 9', 'C) x² - 6x + 9', 'D) x² + 6x - 9'],
            correctAnswer: 'A',
            explanation: 'Difference of squares: (x+3)(x-3) = x² - 9',
            difficulty: 'MEDIUM', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'MATH',
            domain: 'Advanced Math',
            skill: 'Nonlinear Functions',
            questionType: 'student_produced_response',
            prompt: 'If f(x) = x² - 4x + 3, what is f(5)?',
            correctAnswer: '8',
            acceptableAnswers: ['8'],
            explanation: 'f(5) = 25 - 20 + 3 = 8',
            difficulty: 'MEDIUM', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'MATH',
            domain: 'Problem-Solving and Data Analysis',
            skill: 'Ratios, Rates, and Proportions',
            questionType: 'multiple_choice',
            prompt: 'A car travels 240 miles in 4 hours. How far in 7 hours at the same speed?',
            options: ['A) 380 miles', 'B) 400 miles', 'C) 420 miles', 'D) 480 miles'],
            correctAnswer: 'C',
            explanation: '60 mph × 7 hours = 420 miles',
            difficulty: 'BEGINNER', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'MATH',
            domain: 'Problem-Solving and Data Analysis',
            skill: 'Percentages',
            questionType: 'student_produced_response',
            prompt: 'A jacket costs $80. After a 25% discount, what is the final price ($)?',
            correctAnswer: '60',
            acceptableAnswers: ['60', '60.00'],
            explanation: '25% of 80 = 20. 80 - 20 = $60.',
            difficulty: 'BEGINNER', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'MATH',
            domain: 'Geometry and Trigonometry',
            skill: 'Area and Volume',
            questionType: 'multiple_choice',
            prompt: 'A circle has radius 6. What is its area? (π ≈ 3.14)',
            options: ['A) 37.68', 'B) 75.36', 'C) 113.04', 'D) 226.08'],
            correctAnswer: 'C',
            explanation: 'Area = πr² = 3.14 × 36 = 113.04',
            difficulty: 'MEDIUM', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'MATH',
            domain: 'Geometry and Trigonometry',
            skill: 'Right Triangles and Trigonometry',
            questionType: 'multiple_choice',
            prompt: 'Right triangle with legs 3 and 4. What is the hypotenuse?',
            options: ['A) 4', 'B) 5', 'C) 6', 'D) 7'],
            correctAnswer: 'B',
            explanation: 'c² = 9 + 16 = 25, c = 5',
            difficulty: 'BEGINNER', difficultyTier: 'STANDARD', createdBy: adminId
        },
        {
            section: 'MATH',
            domain: 'Algebra',
            skill: 'Linear Inequalities',
            questionType: 'multiple_choice',
            prompt: 'Which value is a solution to 2x + 3 > 11?',
            options: ['A) x = 3', 'B) x = 4', 'C) x = 5', 'D) x = 2'],
            correctAnswer: 'C',
            explanation: '2x > 8, x > 4. Only x=5 satisfies this.',
            difficulty: 'MEDIUM', difficultyTier: 'STANDARD', createdBy: adminId
        }
    ];

    console.log('\n📝 Inserting RW Questions...');
    const rwInserted = await SATQuestion.insertMany(rwM1Questions);
    console.log('✅ Inserted', rwInserted.length, 'RW questions');

    console.log('\n📐 Inserting Math Questions...');
    const mathInserted = await SATQuestion.insertMany(mathM1Questions);
    console.log('✅ Inserted', mathInserted.length, 'Math questions');

    const rwIds = rwInserted.map(q => q._id);
    const mathIds = mathInserted.map(q => q._id);

    // Full Mock Test
    const existing = await SATTest.findOne({ code: 'SAT-DEMO-FULL-1' });
    if (!existing) {
        const fullMock = new SATTest({
            title: 'Digital SAT Full Mock Test #1',
            code: 'SAT-DEMO-FULL-1',
            testType: 'FULL_MOCK',
            section: 'ALL',
            difficulty: 'EXAM_LEVEL',
            durationMinutes: 134,
            isPublished: true,
            modules: [
                { moduleNumber: 1, section: 'READING_WRITING', difficultyTier: 'STANDARD', durationMinutes: 32, questionIds: rwIds.slice(0, 4) },
                { moduleNumber: 2, section: 'READING_WRITING', difficultyTier: 'HARD', durationMinutes: 32, questionIds: rwIds.slice(4, 8) },
                { moduleNumber: 2, section: 'READING_WRITING', difficultyTier: 'EASY', durationMinutes: 32, questionIds: rwIds.slice(0, 4) },
                { moduleNumber: 1, section: 'MATH', difficultyTier: 'STANDARD', durationMinutes: 35, questionIds: mathIds.slice(0, 5) },
                { moduleNumber: 2, section: 'MATH', difficultyTier: 'HARD', durationMinutes: 35, questionIds: mathIds.slice(5, 10) },
                { moduleNumber: 2, section: 'MATH', difficultyTier: 'EASY', durationMinutes: 35, questionIds: mathIds.slice(0, 5) }
            ],
            adaptiveThresholds: { rwHardThreshold: 3, mathHardThreshold: 4 },
            createdBy: adminId
        });
        await fullMock.save();
        console.log('✅ Full Mock Test created:', fullMock._id);
    }

    // RW Practice Test
    if (!await SATTest.findOne({ code: 'SAT-RW-PRACTICE-1' })) {
        const rwTest = new SATTest({
            title: 'Reading & Writing Practice #1',
            code: 'SAT-RW-PRACTICE-1',
            testType: 'SECTION_PRACTICE',
            section: 'READING_WRITING',
            difficulty: 'MEDIUM',
            durationMinutes: 32,
            isPublished: true,
            modules: [{ moduleNumber: 1, section: 'READING_WRITING', difficultyTier: 'STANDARD', durationMinutes: 32, questionIds: rwIds }],
            createdBy: adminId
        });
        await rwTest.save();
        console.log('✅ RW Practice Test created:', rwTest._id);
    }

    // Math Practice Test
    if (!await SATTest.findOne({ code: 'SAT-MATH-PRACTICE-1' })) {
        const mathTest = new SATTest({
            title: 'Math Practice #1',
            code: 'SAT-MATH-PRACTICE-1',
            testType: 'SECTION_PRACTICE',
            section: 'MATH',
            difficulty: 'MEDIUM',
            durationMinutes: 35,
            isPublished: true,
            modules: [{ moduleNumber: 1, section: 'MATH', difficultyTier: 'STANDARD', durationMinutes: 35, questionIds: mathIds }],
            createdBy: adminId
        });
        await mathTest.save();
        console.log('✅ Math Practice Test created:', mathTest._id);
    }

    console.log('\n🎉 SAT Seed Complete! Platform is demo-ready.');
    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => { console.error('❌ Seed error:', err.message); process.exit(1); });
