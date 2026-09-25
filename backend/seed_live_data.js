const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Module = require('./models/Module');
const { Assignment, Submission } = require('./models/LMS');
const Message = require('./models/Message');

const MONGODB_URI = 'mongodb://localhost:27017/edutech';

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log("Seeding live data...");

    const teacher = await User.findOne({ username: 'teacher_test' });
    const student = await User.findOne({ username: 'student_test' });
    const course = await Course.findOne({ title: { $exists: true } });

    if (!teacher || !student || !course) {
        console.log("Missing core data. Run setup_test_data.js first.");
        process.exit(1);
    }

    // Add some messages
    await Message.deleteMany({ courseId: course._id });
    await Message.create([
        { sender: teacher._id, receiver: student._id, courseId: course._id, text: "Assalomu alaykum! Kursga xush kelibsiz." },
        { sender: student._id, receiver: teacher._id, courseId: course._id, text: "Vaalaykum assalom ustoz. Savollarim bor edi." },
        { sender: teacher._id, receiver: student._id, courseId: course._id, text: "Bemalol, qanday savolingiz bor?" }
    ]);

    // Add an assignment with a due date in the future for the Calendar
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    await Assignment.create({
        title: "Mustaqil ish #2",
        courseId: course._id,
        points: 100,
        dueDate: futureDate,
        description: "Ushbu vazifani 5 kun ichida yakunlang."
    });

    console.log("Live data seeded successfully!");
    process.exit(0);
}

seed();
