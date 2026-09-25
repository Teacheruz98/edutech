const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://127.0.0.1:27017/edutech';

// Models (duplicated here for simplicity)
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, default: 'student' },
    isApproved: { type: Boolean, default: false }
});
const CourseSchema = new mongoose.Schema({
    title: String,
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});
const AssignmentSchema = new mongoose.Schema({
    title: String,
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }
});

const User = mongoose.model('User', UserSchema);
const Course = mongoose.model('Course', CourseSchema);
const Assignment = mongoose.model('Assignment', AssignmentSchema);

async function setupTestData() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const hashedPassword = await bcrypt.hash('pass123', 10);

        // 1. Create Teacher
        let teacher = await User.findOne({ username: 'teacher_test' });
        if (!teacher) {
            teacher = new User({ username: 'teacher_test', email: 'teacher@test.uz', password: hashedPassword, role: 'teacher', isApproved: true });
            await teacher.save();
        }

        // 2. Create Student
        let student = await User.findOne({ username: 'student_test' });
        if (!student) {
            student = new User({ username: 'student_test', email: 'student@test.uz', password: hashedPassword, role: 'student', isApproved: true });
            await student.save();
        }

        // 3. Create Course
        let course = await Course.findOne({ title: 'Visual Arts Pro' });
        if (!course) {
            course = new Course({ title: 'Visual Arts Pro', instructor: teacher._id, students: [student._id] });
            await course.save();
        } else {
            if (!course.students.includes(student._id)) {
                course.students.push(student._id);
                await course.save();
            }
        }

        // 4. Create Assignment
        let assignment = await Assignment.findOne({ title: 'Nature Drawing', courseId: course._id });
        if (!assignment) {
            assignment = new Assignment({ title: 'Nature Drawing', courseId: course._id });
            await assignment.save();
        }

        console.log('Test data set up:');
        console.log(`Teacher: teacher_test / pass123`);
        console.log(`Student: student_test / pass123`);
        console.log(`Course: Visual Arts Pro`);
        console.log(`Assignment: Nature Drawing`);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

setupTestData();
