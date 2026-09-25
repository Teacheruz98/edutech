const mongoose = require('mongoose');
const Material = require('./models/Material');

async function seedPdf() {
    await mongoose.connect('mongodb://127.0.0.1:27017/edutech');
    const topic = await Material.findOne({ type: 'topic' });
    if (topic) {
        const pdf = new Material({
            name: "Test PDF Document",
            type: "pdf",
            url: "http://localhost:5000/uploads/test.pdf",
            courseId: topic.courseId,
            moduleId: topic.moduleId,
            subTopicId: topic._id
        });
        await pdf.save();
        console.log("PDF Material seeded successfully!");
    }
    process.exit();
}
seedPdf();
