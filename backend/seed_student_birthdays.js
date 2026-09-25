require('dotenv').config();
const mongoose = require('mongoose');
const StudentBirthday = require('./models/StudentBirthday');
const StudentBirthdaySettings = require('./models/StudentBirthdaySettings');

async function seed() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edutech_db');
    console.log("Connected to MongoDB for student birthday seeding...");

    const count = await StudentBirthday.countDocuments();
    if (count === 0) {
        const students = [
            {
                firstName: 'Malika',
                lastName: 'Karimova',
                classGroup: '5-Blue',
                dateOfBirth: new Date('2014-09-11'),
                birthDay: 11,
                birthMonth: 9,
                birthYear: 2014,
                phone: '+998901234501',
                email: 'malika@pm.uz',
                isActive: true
            },
            {
                firstName: 'Otabek',
                lastName: 'Jumayev',
                classGroup: '7-Green',
                dateOfBirth: new Date('2012-09-15'),
                birthDay: 15,
                birthMonth: 9,
                birthYear: 2012,
                phone: '+998901234502',
                email: 'otabek@pm.uz',
                isActive: true
            },
            {
                firstName: 'Dilnoza',
                lastName: 'Rahimova',
                classGroup: '9-Blue',
                dateOfBirth: new Date('2010-09-22'),
                birthDay: 22,
                birthMonth: 9,
                birthYear: 2010,
                phone: '+998901234503',
                email: 'dilnoza@pm.uz',
                isActive: true
            },
            {
                firstName: 'Javohir',
                lastName: 'Toirov',
                classGroup: '11-Green',
                dateOfBirth: new Date('2008-10-05'),
                birthDay: 5,
                birthMonth: 10,
                birthYear: 2008,
                phone: '+998901234504',
                email: 'javohir@pm.uz',
                isActive: true
            }
        ];

        await StudentBirthday.insertMany(students);
        console.log("✅ Inserted 4 sample student birthdays!");
    } else {
        console.log(`Student birthdays already present: ${count}`);
    }

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
        console.log("✅ Initialized student birthday settings!");
    }

    await mongoose.disconnect();
    console.log("Done!");
}

seed().catch(err => {
    console.error("Seed error:", err);
    process.exit(1);
});
