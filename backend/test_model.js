const mongoose = require('mongoose');
const Material = require('./models/Material');

async function test() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/edutech');
        console.log("Connected");
        const data = await Material.find({});
        console.log("Found:", data.length);
        process.exit(0);
    } catch (e) {
        console.error("TEST FAILED:", e);
        process.exit(1);
    }
}
test();
