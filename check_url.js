const https = require('https');
https.get('https://nextfy-kanban.onrender.com/assets/index--eyXuNYe.js', res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const matches = body.match(/https?:\/\/[^\/\"\'\`]+/g) || [];
    console.log([...new Set(matches)].join('\n'));
  });
});
