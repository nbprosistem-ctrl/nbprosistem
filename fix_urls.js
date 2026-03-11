const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Encontra "http://localhost:3001/qualquercoisa" ou 'http://localhost...' ou `http://localhost...`
      // e substitui por `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/qualquercoisa`
      let newContent = content.replace(/['"`]http:\/\/localhost:3001(\/api\/[^'"`]+)['"`]/g, '`${import.meta.env.VITE_API_URL || "http://localhost:3001"}$1`');
      
      if(newContent !== content) {
          fs.writeFileSync(fullPath, newContent, 'utf8');
      }
    }
  }
}

walk(srcDir);
console.log('URLs Consertadas com sucesso.');
