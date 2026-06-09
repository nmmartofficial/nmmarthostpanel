const fs = require('fs');
const filePath = 'f:/nm mart/nmmarthostpanel/src/App.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const components = content.split('function ').slice(1);
const issues = [];

components.forEach(comp => {
  const nameMatch = comp.match(/^(\w+)/);
  if (!nameMatch) return;
  const name = nameMatch[1];
  
  const bodyEnd = comp.indexOf('\n}');
  const body = comp.substring(0, bodyEnd);
  
  const usesRowsPerPage = body.includes('rowsPerPage');
  const definesRowsPerPage = body.includes('rowsPerPage, setRowsPerPage');
  
  const usesCurrentPage = body.includes('currentPage');
  const definesCurrentPage = body.includes('currentPage, setCurrentPage');
  
  if (usesRowsPerPage && !definesRowsPerPage) {
    issues.push(`${name} uses rowsPerPage but does not define it`);
  }
  if (usesCurrentPage && !definesCurrentPage) {
    issues.push(`${name} uses currentPage but does not define it`);
  }
});

console.log(issues.join('\n'));
