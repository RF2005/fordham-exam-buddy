// Script to extract course data from the parsed markdown and convert to INSERT SQL
// Run this locally to generate the full course data

const fs = require('fs');

// Read the parsed document
const content = `
[PASTE FULL PARSED MARKDOWN CONTENT HERE]
`;

const lines = content.split('\n');
const courses = [];

for (const line of lines) {
  // Match lines that start with pipe and contain course data
  const match = line.match(/^\|([A-Z]{4}\s+\d{4}[A-Z]?)\|(.+?)\|?$/);
  if (match) {
    const courseNumber = match[1].trim();
    let courseName = match[2].trim();
    // Remove trailing period
    if (courseName.endsWith('.')) {
      courseName = courseName.slice(0, -1);
    }
    courses.push({ course_number: courseNumber, course_name: courseName });
  }
}

console.log(`Found ${courses.length} courses`);
console.log('Sample:', JSON.stringify(courses.slice(0, 5), null, 2));

// Generate SQL INSERT
const sqlValues = courses.map(c => 
  `('${c.course_number.replace("'", "''")}', '${c.course_name.replace("'", "''")}')`
).join(',\n  ');

const sql = `INSERT INTO public.courses (course_number, course_name) VALUES\n  ${sqlValues}\nON CONFLICT (course_number) DO NOTHING;`;

fs.writeFileSync('courses-insert.sql', sql);
console.log('SQL written to courses-insert.sql');
