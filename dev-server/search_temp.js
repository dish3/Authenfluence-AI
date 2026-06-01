const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'analyze.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

const query = process.argv[2] || 'ecosystem';
console.log(`Searching for "${query}" in ${filePath}:`);

lines.forEach((line, index) => {
  if (line.toLowerCase().includes(query.toLowerCase())) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
