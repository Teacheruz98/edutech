const fs = require('fs');

const htmlPath = '/Users/safarmurodallakulov/Desktop/edutech-platform/LMS_Platform_Documentation_User_Guide.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const regex = /<img[^>]+src="file:\/\/(.*?)"/g;
let match;
let newHtml = html;

while ((match = regex.exec(html)) !== null) {
    const originalSrc = match[0];
    const filePath = match[1];
    if (fs.existsSync(filePath)) {
        const ext = filePath.split('.').pop();
        const base64 = fs.readFileSync(filePath).toString('base64');
        const mimeType = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp');
        const newSrc = originalSrc.replace(`file://${filePath}`, `data:${mimeType};base64,${base64}`);
        newHtml = newHtml.replace(originalSrc, newSrc);
    } else {
        console.log("File not found:", filePath);
    }
}

fs.writeFileSync(htmlPath, newHtml);
console.log("Images embedded successfully.");
