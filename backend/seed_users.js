const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edutech';

async function seedUsers() {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDBga ulandi');

    const defaultUsers = [
        {
            username: 'admin',
            email: 'admin@edutech.uz',
            password: await bcrypt.hash('admin123', 10),
            role: 'admin',
            isApproved: true
        },
        {
            username: 'Safarmurod',
            email: 'safarmurodallakulov@gmail.com',
            password: await bcrypt.hash('admin123', 10),
            role: 'admin',
            isOwner: true,
            isApproved: true
        },
        {
            username: 'teacher',
            email: 'teacher@edutech.uz',
            password: await bcrypt.hash('teacher123', 10),
            role: 'teacher',
            isApproved: true
        },
        {
            username: 'student',
            email: 'student@edutech.uz',
            password: await bcrypt.hash('student123', 10),
            role: 'student',
            isApproved: true
        },
        {
            username: 'ali_valiyev',
            email: 'ali@maktab.uz',
            password: await bcrypt.hash('123456', 10),
            role: 'student',
            isApproved: true
        },
        {
            username: 'management_director',
            email: 'director@edutech.uz',
            password: await bcrypt.hash('director123', 10),
            role: 'management',
            isApproved: true
        }
    ];

    for (const u of defaultUsers) {
        const existing = await User.findOne({ username: u.username });
        if (existing) {
            existing.password = u.password;
            existing.isApproved = true;
            if (!existing.email) existing.email = u.email;
            await existing.save();
            console.log(`Yangilandi: ${u.username} (${u.role})`);
        } else {
            await User.create(u);
            console.log(`Yaratildi: ${u.username} (${u.role})`);
        }
    }

    console.log('Barcha hisoblar muvaffaqiyatli sozlandi!');
    await mongoose.disconnect();
}

seedUsers().catch(err => {
    console.error('Xatolik:', err);
    process.exit(1);
});
