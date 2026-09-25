const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/edutech').then(async () => {
    // Username si yo'q eski foydalanuvchilarni o'chirish
    const deleted = await User.deleteMany({ username: { $exists: false } });
    console.log(`🗑️ Eski (username yo'q) foydalanuvchilar o'chirildi: ${deleted.deletedCount} ta`);

    // Test o'quvchilar qo'shish
    const testStudents = [
        { username: 'ali_valiyev', email: 'ali@maktab.uz', password: '1234', role: 'student', isApproved: true },
        { username: 'malika_r', email: 'malika@maktab.uz', password: '1234', role: 'student', isApproved: true },
        { username: 'temur_i', email: 'temur@maktab.uz', password: '1234', role: 'student', isApproved: true },
        { username: 'nodira_k', email: 'nodira@maktab.uz', password: '1234', role: 'student', isApproved: true },
        { username: 'jasur_teacher', email: 'jasur@maktab.uz', password: '1234', role: 'teacher', isApproved: true },
    ];

    for (const s of testStudents) {
        const exists = await User.findOne({ username: s.username });
        if (!exists) {
            await User.create(s);
            console.log(`✅ Qo'shildi: ${s.username} (${s.role})`);
        } else {
            console.log(`⚠️ Allaqachon bor: ${s.username}`);
        }
    }

    // Natijani ko'rsatish
    const all = await User.find({}, 'username role isApproved');
    console.log('\n📋 Hozirgi bazа:');
    all.forEach(u => console.log(`  - ${u.username} | ${u.role} | tasdiqlangan: ${u.isApproved}`));

    mongoose.disconnect();
    console.log('\n✅ Tayyor!');
});
