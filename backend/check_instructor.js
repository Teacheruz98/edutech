const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://127.0.0.1:27017/edutech';

const UserSchema = new mongoose.Schema({ username: String });
const User = mongoose.model('User', UserSchema);

const CourseSchema = new mongoose.Schema({
    title: String,
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Course = mongoose.model('Course', CourseSchema);

async function checkInstructor() {
    try {
        await mongoose.connect(MONGO_URI);
        const teacher = await User.findOne({ username: 'teacher_test' });
        const course = await Course.findOne({ title: 'Visual Arts Pro' }).populate('instructor');
        
        console.log(`Teacher ID: ${teacher._id}`);
        console.log(`Course Instructor ID: ${course.instructor._id}`);
        console.log(`Match: ${teacher._id.equals(course.instructor._id)}`);
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkInstructor();
