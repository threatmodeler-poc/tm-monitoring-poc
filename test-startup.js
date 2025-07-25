/**
 * Test the specific startup sequence that's causing issues
 */

const { R } = require("redbean-node");
const Database = require("./server/database");
const { SetupDatabase } = require("./server/setup-database");
const { UptimeKumaServer } = require("./server/uptime-kuma-server");

async function testStartupSequence() {
    console.log("🔍 Testing startup sequence...\n");
    
    try {
        // Step 1: Initialize data directory
        console.log("1. Initializing data directory...");
        Database.initDataDir({});
        console.log("   ✅ Done\n");
        
        // Step 2: Check SetupDatabase
        console.log("2. Checking SetupDatabase requirement...");
        const server = UptimeKumaServer.getInstance();
        const setupDatabase = new SetupDatabase({}, server);
        const needsDatabaseSetup = setupDatabase.isNeedSetup();
        console.log(`   Database setup needed: ${needsDatabaseSetup}`);
        
        if (needsDatabaseSetup) {
            console.log("   ❌ This would show database configuration page");
            return;
        } else {
            console.log("   ✅ Database configuration is valid\n");
        }
        
        // Step 3: Connect to database (this is the slow part)
        console.log("3. Connecting to database...");
        const startTime = Date.now();
        await Database.connect(false, true, false);
        const connectionTime = Date.now() - startTime;
        console.log(`   ✅ Connected in ${connectionTime}ms\n`);
        
        // Step 4: Check user count
        console.log("4. Checking user count...");
        const userCount = await R.knex("user").count("id as count").first();
        console.log("   Raw count result:", userCount);
        console.log("   Count type:", typeof userCount.count);
        console.log("   Count value:", userCount.count);
        
        const parsedCount = parseInt(userCount.count) || 0;
        console.log("   Parsed count:", parsedCount);
        
        if (parsedCount === 0) {
            console.log("   📝 This would trigger user setup page");
        } else {
            console.log("   ✅ Users exist, should go to dashboard");
        }
        
    } catch (error) {
        console.error("\n❌ Startup test failed:", error.message);
        if (error.message.includes("ENOTFOUND")) {
            console.log("\n💡 DNS resolution issue - check if 'tm-mssql' hostname is accessible");
        } else if (error.message.includes("ECONNREFUSED")) {
            console.log("\n💡 Connection refused - check if MSSQL server is running on port 1433");
        } else if (error.message.includes("timeout")) {
            console.log("\n💡 Connection timeout - check network connectivity or increase timeout");
        }
    }
    
    console.log("\n🏁 Startup test complete");
    process.exit(0);
}

// Run test
testStartupSequence();
