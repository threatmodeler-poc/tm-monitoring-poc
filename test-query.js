const { R } = require("redbean-node");
const Database = require("./server/database");
const { queryWithLimit } = require("./server/utils/database-utils");

/**
 *
 */
async function testQuery() {
    try {
        console.log("Initializing database...");
        await Database.initDataDir();
        await Database.connect();
        console.log("Database connected");

        console.log("Testing queryWithLimit function...");
        const result = await queryWithLimit(`
            SELECT * FROM heartbeat
            WHERE monitor_id = ?
            ORDER BY time DESC
        `, [ 1 ], 100, 0);

        console.log("Query successful:", result.length, "rows returned");

        // Test direct R.getAll with LIMIT to see if it fails
        console.log("Testing direct LIMIT query...");
        try {
            const directResult = await R.getAll(`
                SELECT * FROM heartbeat
                WHERE monitor_id = ?
                ORDER BY time DESC
                LIMIT 100
            `, [ 1 ]);
            console.log("Direct LIMIT query successful:", directResult.length, "rows");
        } catch (err) {
            console.log("Direct LIMIT query failed (expected):", err.message);
        }

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await Database.close();
        process.exit(0);
    }
}

testQuery();
