const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Substitui fallbacks existentes: import.meta.env.VITE_API_URL || "http://localhost:3001"
      let newContent = content.replace(
        /import\.meta\.env\.VITE_API_URL\s*\|\|\s*['"`]http:\/\/localhost:3001['"`]/g,
        'import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"'
      );
      
      // E também qualquer ocorrência de "http://localhost:3001" que não faça parte de um fallback do VITE_API_URL
      newContent = newContent.replace(
        /(?<!import\.meta\.env\.VITE_API_URL\s*\|\|\s*)['"`]http:\/\/localhost:3001['"`]/g,
        '(import.meta.env.VITE_API_URL || "https://nextfy.onrender.com")'
      );

      if(newContent !== content) {
          fs.writeFileSync(fullPath, newContent, 'utf8');
          console.log(`Atualizado: ${path.relative(__dirname, fullPath)}`);
      }
    }
  }
}

walk(srcDir);
console.log('URLs Consertadas com sucesso.');
