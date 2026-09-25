const mongoose = require('mongoose');

const staffData = [
    {
        firstName: 'Sardor',
        lastName: 'Allakulov',
        profession: "Informatika va IT fani o'qituvchisi",
        department: 'Aniq fanlar',
        dateOfBirth: new Date(Date.UTC(1994, 8, 6)), // 06.09.1994
        birthDay: 6,
        birthMonth: 9,
        birthYear: 1994,
        email: 'sardor@pm.uz',
        phone: '+998901234510',
        isActive: true
    },
    {
        firstName: 'Muhammad',
        lastName: 'Qahharov',
        profession: 'Grafik dizayner va IT muhandis',
        department: 'Axborot texnologiyalari',
        dateOfBirth: new Date(Date.UTC(1997, 8, 6)), // 06.09.1997
        birthDay: 6,
        birthMonth: 9,
        birthYear: 1997,
        email: 'muhammad@pm.uz',
        phone: '+998901234511',
        isActive: true
    },
    {
        firstName: 'Dilshod',
        lastName: 'Rahimov',
        profession: "Matematika fani katta o'qituvchisi",
        department: 'Aniq fanlar',
        dateOfBirth: new Date(Date.UTC(1990, 8, 15)), // 15.09.1990
        birthDay: 15,
        birthMonth: 9,
        birthYear: 1990,
        email: 'dilshod@pm.uz',
        phone: '+998901234512',
        isActive: true
    },
    {
        firstName: 'Nigora',
        lastName: 'Yusupova',
        profession: "Ingliz tili (IELTS) o'qituvchisi",
        department: 'Xorijiy tillar',
        dateOfBirth: new Date(Date.UTC(1988, 8, 24)), // 24.09.1988
        birthDay: 24,
        birthMonth: 9,
        birthYear: 1988,
        email: 'nigora@pm.uz',
        phone: '+998901234513',
        isActive: true
    },
    {
        firstName: 'Jasur',
        lastName: 'Alimov',
        profession: "Fizika fani o'qituvchisi",
        department: 'Tabiiy fanlar',
        dateOfBirth: new Date(Date.UTC(1985, 9, 10)), // 10.10.1985
        birthDay: 10,
        birthMonth: 10,
        birthYear: 1985,
        email: 'jasur@pm.uz',
        phone: '+998901234514',
        isActive: true
    },
    {
        firstName: 'Oygul',
        lastName: 'Nazarova',
        profession: 'Maktab amaliyotchi psixologi',
        department: "Ma'naviyat va tarbiya",
        dateOfBirth: new Date(Date.UTC(1992, 0, 12)), // 12.01.1992
        birthDay: 12,
        birthMonth: 1,
        birthYear: 1992,
        email: 'oygul@pm.uz',
        phone: '+998901234515',
        isActive: true
    },
    {
        firstName: 'Botir',
        lastName: 'Shodiyev',
        profession: 'Axborot resurs markazi mudiri (Kutubxonachi)',
        department: 'Resurs markazi',
        dateOfBirth: new Date(Date.UTC(1980, 2, 29)), // 29.03.1980
        birthDay: 29,
        birthMonth: 3,
        birthYear: 1980,
        email: 'botir@pm.uz',
        phone: '+998901234516',
        isActive: true
    }
];

async function seed() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edutech');
    const Staff = require('./models/Staff');
    await Staff.deleteMany({});
    await Staff.insertMany(staffData);
    console.log(`✅ ${staffData.length} nafar maktab o'qituvchi va xodimlari bazaga muvaffaqiyatli yuklandi!`);
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
