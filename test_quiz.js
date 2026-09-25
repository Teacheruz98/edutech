const http = require('http');

function post(path, data, token) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({ hostname: 'localhost', port: 5000, path, method: 'POST', headers }, res => {
      let b = ''; res.on('data', d => b += d); res.on('end', () => resolve(JSON.parse(b)));
    });
    req.write(body); req.end();
  });
}

function get(path, token) {
  return new Promise((resolve) => {
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    http.get({ hostname: 'localhost', port: 5000, path, headers }, res => {
      let b = ''; res.on('data', d => b += d); res.on('end', () => resolve(JSON.parse(b)));
    });
  });
}

(async () => {
  const login = await post('/api/login', { username: 'teacher_test', password: 'teacher123' });
  if (!login.token) { console.log('LOGIN FAIL:', JSON.stringify(login)); return; }
  const token = login.token;
  console.log('✅ Logged in as teacher_test');

  const courses = await get('/api/courses', token);
  const course = courses[0];
  console.log('📚 Course:', course._id, '-', course.title);

  const modules = await get('/api/courses/' + course._id + '/modules', token);
  const mod = modules[0];
  const sub = mod?.subTopics?.[0];
  console.log('📦 Module:', mod?._id, '| SubTopic:', sub?._id, '-', sub?.name);

  const quiz = await post('/api/courses/' + course._id + '/quizzes', {
    title: 'Quizizz External Test',
    url: 'https://quizizz.com',
    moduleId: mod?._id,
    subTopicId: sub?._id,
    tab: 'QUIZZES'
  }, token);

  console.log('\n🎯 Quiz yaratildi:', JSON.stringify(quiz, null, 2));

  if (quiz.url) {
    console.log('\n✅ MUVAFFAQIYAT! URL to\'g\'ri saqlandi:', quiz.url);
    console.log('✅ Foydalanuvchi kartani bosganida ochiladi:', quiz.url);
  } else {
    console.log('\n❌ URL saqlanmadi!');
  }
})();
