const mongoose = require('mongoose');
require('dotenv').config();
const { IELTSTest, IELTSQuestion } = require('./models/IELTS');
const User = require('./models/User');

async function seedSpeakingTest() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/edutech');
    console.log('Connected to MongoDB');

    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.findOne({ isOwner: true }) || await User.findOne({});
    }

    const existing = await IELTSTest.findOne({
      $or: [
        { code: 'SPEAKING-MOCK-101' },
        { title: 'Cambridge Academic Speaking Practice Test 1' }
      ]
    });

    if (existing) {
      console.log('Speaking test already exists with ID:', existing._id);
      await mongoose.disconnect();
      return;
    }

    const speakingTest = new IELTSTest({
      title: 'Cambridge Academic Speaking Practice Test 1',
      description: 'Official format CD IELTS Speaking Test covering Part 1 (Introduction & Interview), Part 2 (Long Turn with Cue Card & 1-minute prep), and Part 3 (Two-way Thematic Discussion).',
      code: 'SPEAKING-MOCK-101',
      testType: 'SKILL_PRACTICE',
      type: 'practice',
      skillType: 'SPEAKING',
      skill: 'speaking',
      difficulty: 'EXAM_LEVEL',
      durationMinutes: 15,
      totalQuestions: 3,
      isPublished: true,
      isActive: true,
      createdBy: admin ? admin._id : new mongoose.Types.ObjectId(),
      sections: [
        {
          sectionNumber: 1,
          title: 'Part 1: Introduction & Interview (4-5 minutes)',
          instructions: 'The examiner will introduce themselves and ask you general questions on familiar topics such as your home, family, studies, work, and interests. Answer in full sentences with spontaneous, natural communication.',
          passageTitle: 'Interview Questions',
          passageReference: '',
          passageText: 'Topics:\n1. Hometown & Neighborhood: Where are you from? What do you like most about your hometown? How has it changed over the recent years?\n2. Daily Routines: Do you prefer mornings or evenings? What is your typical routine during weekdays?\n3. Technology: What digital devices do you use on a daily basis? How has technology influenced the way people study and interact?',
          audioUrl: '',
          questionIds: []
        },
        {
          sectionNumber: 2,
          title: 'Part 2: Long Turn — Candidate Task Card (3-4 minutes)',
          instructions: 'You will have exactly 1 minute to prepare your monologue and make notes if you wish. You must then speak continuously for 1 to 2 minutes on the provided cue card topic.',
          passageTitle: 'Candidate Cue Card',
          passageReference: '',
          passageText: 'Describe a memorable journey you made by public transport.\n\nYou should say:\n• Where you went and when this journey occurred\n• What mode of transport you used (train, coach, ferry, metro)\n• Who you were travelling with\n\nAnd explain why this journey was so memorable to you and how you felt during the experience.',
          audioUrl: '',
          questionIds: []
        },
        {
          sectionNumber: 3,
          title: 'Part 3: Two-way Thematic Discussion (4-5 minutes)',
          instructions: 'The examiner will ask further abstract and analytical questions linked to the topic in Part 2. Discuss trends, causes, social impacts, and future perspectives.',
          passageTitle: 'Discussion Topics',
          passageReference: '',
          passageText: 'Thematic Discussion Points:\n1. Urban Transportation: How can cities encourage more commuters to use public transit instead of private cars?\n2. Environmental Impact: To what extent does modern transportation contribute to global carbon emissions?\n3. Future Mobility: What innovations (such as high-speed hyperloops, automated electric fleets) do you envision reshaping travel over the next twenty years?',
          audioUrl: '',
          questionIds: []
        }
      ]
    });

    await speakingTest.save();
    console.log('✅ Cambridge Speaking Practice Test seeded successfully! ID:', speakingTest._id);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error seeding speaking test:', err);
    process.exit(1);
  }
}

seedSpeakingTest();
