const fs = require('fs');
const lines = fs.readFileSync('src/LeadsTable.jsx', 'utf8').split(/\r?\n/);
let startIndex = -1;
let endIndex = -1;

for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('const renderExpansionContent = (accordionLead')) {
    startIndex = i;
  }
  if (startIndex !== -1 && i > startIndex && lines[i].includes('<section className="mb-8 w-full max-w-full min-w-0"')) {
    endIndex = i;
    break;
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  const returnIdx = lines.findIndex((l, idx) => idx > startIndex && l.trim() === 'return (');
  if (returnIdx !== -1) {
     const newLines = fs.readFileSync('new_content.txt', 'utf8').split(/\r?\n/);
     lines.splice(startIndex, returnIdx - startIndex, ...newLines, "");
     fs.writeFileSync('src/LeadsTable.jsx', lines.join('\n'));
     console.log("SUCCESS!");
  } else {
     console.log("Could not find return(");
  }
} else {
  console.log("Could not find bounds", startIndex, endIndex);
}
