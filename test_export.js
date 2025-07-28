// Test the exports from knex_init_db.js
const fs = require('fs');

// Read the file content
const content = fs.readFileSync('./db/knex_init_db.js', 'utf8');

// Check if createTablesMssql function exists in the content
if (content.includes('async function createTablesMssql()')) {
    console.log('✓ createTablesMssql function definition found');
} else {
    console.log('✗ createTablesMssql function definition NOT found');
}

// Check if the export exists
if (content.includes('createTablesMssql,')) {
    console.log('✓ createTablesMssql export found');
} else {
    console.log('✗ createTablesMssql export NOT found');
}

// Try to require the module
try {
    const knexInit = require('./db/knex_init_db');
    console.log('Available exports:', Object.keys(knexInit));
    console.log('createTables type:', typeof knexInit.createTables);
    console.log('createTablesMssql type:', typeof knexInit.createTablesMssql);
} catch (error) {
    console.error('Error requiring module:', error.message);
}
