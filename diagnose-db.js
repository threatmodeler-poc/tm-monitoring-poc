/**
 * Diagnostic script to test MSSQL database connection and table creation
 */

const { R } = require("redbean-node");
const Database = require("./server/database");

/**
 *
 */
async function diagnoseDatabase() {
    console.log("🔍 Diagnosing MSSQL database connection...\n");

    try {
        // Initialize data directory first
        console.log("1. Initializing data directory...");
        Database.initDataDir({});
        console.log("   ✅ Data directory initialized\n");

        // Read database configuration
        console.log("2. Reading database configuration...");
        const dbConfig = Database.readDBConfig();
        console.log("   Database type:", dbConfig.type);
        console.log("   Hostname:", dbConfig.hostname);
        console.log("   Port:", dbConfig.port);
        console.log("   Database:", dbConfig.dbName);
        console.log("   Username:", dbConfig.username);
        console.log("   ✅ Configuration loaded\n");

        // Initialize database
        console.log("3. Initializing database connection...");
        await Database.connect(false, true, false); // testMode=false, autoloadModels=true, noLog=false
        console.log("   ✅ Database connected\n");

        // Check if essential tables exist
        console.log("4. Checking essential tables...");
        const userTableExists = await R.hasTable("user");
        const settingTableExists = await R.hasTable("setting");
        const apiKeyTableExists = await R.hasTable("api_key");
        const monitorTableExists = await R.hasTable("monitor");

        console.log("   user table:", userTableExists ? "✅ EXISTS" : "❌ MISSING");
        console.log("   setting table:", settingTableExists ? "✅ EXISTS" : "❌ MISSING");
        console.log("   api_key table:", apiKeyTableExists ? "✅ EXISTS" : "❌ MISSING");
        console.log("   monitor table:", monitorTableExists ? "✅ EXISTS" : "❌ MISSING");

        if (!userTableExists || !settingTableExists) {
            console.log("\n❌ Essential tables are missing. This explains the setup page issue.");
            console.log("   The application cannot find users because the user table doesn't exist.");
        } else {
            console.log("\n✅ Essential tables exist");
        }

        // Test user count query
        if (userTableExists) {
            console.log("\n5. Testing user count query...");
            try {
                const userCount = await R.knex("user").count("id as count").first();
                console.log("   User count:", userCount.count);

                if (userCount.count === 0) {
                    console.log("   📝 This is why setup page is shown - no users exist");
                    console.log("   💡 You need to create the first user through the setup process");
                } else {
                    console.log("   ✅ Users exist, setup page should not appear");
                }
            } catch (error) {
                console.log("   ❌ Error executing user count query:", error.message);
            }
        }

        // Test a simple query
        console.log("\n6. Testing simple query...");
        try {
            const result = await R.getAll("SELECT 1 as testValue");
            console.log("   Test query result:", result);
            console.log("   ✅ Basic queries work");
        } catch (error) {
            console.log("   ❌ Error with basic query:", error.message);
        }

    } catch (error) {
        console.error("\n❌ Database diagnosis failed:", error.message);
        console.error("Stack trace:", error.stack);

        if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
            console.log("\n💡 Connection issues detected:");
            console.log("   - Check if MSSQL server is running");
            console.log("   - Verify hostname and port are correct");
            console.log("   - Check network connectivity");
            console.log("   - Verify credentials");
        }
    }

    console.log("\n🏁 Diagnosis complete");
    process.exit(0);
}

// Run diagnosis
diagnoseDatabase();
