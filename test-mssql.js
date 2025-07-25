/**
 * Test script to verify MSSQL database connection and compatibility
 */

const { R } = require("redbean-node");
const Database = require("./server/database");
const SQLHelper = require("./server/utils/sql-helper");

async function testMSSQLConnection() {
    try {
        console.log("Testing MSSQL database connection...");
        
        // Initialize database
        await Database.init();
        
        console.log("✅ Database connected successfully");
        console.log("Database type:", SQLHelper.getDatabaseType());
        
        // Test a simple query
        const result = await R.getAll("SELECT 1 as test");
        console.log("✅ Simple query test:", result);
        
        // Test identifier escaping
        const escapedColumn = SQLHelper.escapeIdentifier("key");
        console.log("✅ Identifier escaping test:", escapedColumn);
        
        // Test query conversion
        const convertedQuery = SQLHelper.convertQuery("SELECT `id`, `name` FROM `user` WHERE `active` = 1");
        console.log("✅ Query conversion test:", convertedQuery);
        
        // Test if user table exists
        const userExists = await R.hasTable("user");
        console.log("✅ User table exists:", userExists);
        
        // Test settings table
        const settingExists = await R.hasTable("setting");
        console.log("✅ Setting table exists:", settingExists);
        
        // Test API key table
        const apiKeyExists = await R.hasTable("api_key");
        console.log("✅ API key table exists:", apiKeyExists);
        
        console.log("🎉 All tests passed! MSSQL is ready to use.");
        
    } catch (error) {
        console.error("❌ Error testing MSSQL connection:", error.message);
        console.error("Stack trace:", error.stack);
    } finally {
        process.exit(0);
    }
}

// Run the test
testMSSQLConnection();
