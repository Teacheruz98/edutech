const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://127.0.0.1:27017/edutech';

const UserSchema = new mongoose.Schema({ username: String });
const User = mongoose.model('User', UserSchema);

const CourseSchema = new mongoose.Schema({
    title: String,
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const Course = mongoose.model('Course', CourseSchema);

async function checkCourse() {
    try {
        await mongoose.connect(MONGO_URI);
        const course = await Course.findOne({ title: 'Visual Arts Pro' }).populate('students');
        if (course) {
            console.log(`Course: ${course.title}`);
            console.log(`Students count: ${course.students.length}`);
            course.students.forEach(s => console.log(`- ${s.username} (${s._id})`));
        } else {
            console.log('Course not found');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkCourse();
