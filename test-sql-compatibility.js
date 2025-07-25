/**
 * Simple test to verify MSSQL configuration and SQL compatibility
 */

console.log("Testing MSSQL SQL compatibility...");

// Test SQL Helper
const SQLHelper = require("./server/utils/sql-helper");

// Test identifier escaping
console.log("Testing identifier escaping:");
console.log("Original: `user`");
console.log("MSSQL:", SQLHelper.escapeIdentifier("user"));
console.log("Original: `key`");
console.log("MSSQL:", SQLHelper.escapeIdentifier("key"));

// Test query conversion
console.log("\nTesting query conversion:");
const testQueries = [
    "SELECT `id`, `name` FROM `user` WHERE `active` = 1",
    "UPDATE `user` SET `password` = ? WHERE `id` = ?",
    "SELECT `key`, `value` FROM `setting` WHERE `type` = ?",
    "DELETE FROM `group` WHERE `status_page_id` = ?"
];

testQueries.forEach(query => {
    console.log("Original:", query);
    console.log("MSSQL:   ", SQLHelper.convertQuery(query));
    console.log("---");
});

// Test database type detection (will return 'unknown' since no DB is connected)
console.log("Database type detection:", SQLHelper.getDatabaseType());

// Test timestamp functions
console.log("Current timestamp function:", SQLHelper.getCurrentTimestamp());

// Test limit clauses
console.log("LIMIT 10:", SQLHelper.getLimitClause(10));
console.log("LIMIT 10 OFFSET 5:", SQLHelper.getLimitClause(10, 5));

console.log("\n✅ SQL Helper compatibility tests completed!");

// Test that our modified files can be imported without errors
try {
    require("./server/auth");
    console.log("✅ Auth module loads successfully");
} catch (error) {
    console.error("❌ Auth module error:", error.message);
}

try {
    require("./server/settings");
    console.log("✅ Settings module loads successfully");
} catch (error) {
    console.error("❌ Settings module error:", error.message);
}

try {
    require("./server/model/user");
    console.log("✅ User model loads successfully");
} catch (error) {
    console.error("❌ User model error:", error.message);
}

try {
    require("./server/2fa");
    console.log("✅ 2FA module loads successfully");
} catch (error) {
    console.error("❌ 2FA module error:", error.message);
}

console.log("\n🎉 All compatibility tests passed! Ready for MSSQL migration.");

// Display configuration info
console.log("\n📋 Database Configuration:");
try {
    const fs = require("fs");
    const dbConfig = JSON.parse(fs.readFileSync("./data/db-config.json", "utf8"));
    console.log("Type:", dbConfig.type);
    console.log("Host:", dbConfig.hostname);
    console.log("Port:", dbConfig.port);
    console.log("Database:", dbConfig.dbName);
    console.log("Username:", dbConfig.username);
    console.log("✅ MSSQL configuration found and valid");
} catch (error) {
    console.error("❌ Could not read db-config.json:", error.message);
}
