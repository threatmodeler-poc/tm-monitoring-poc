const axios = require("axios");

/**
 * Test the client configuration API
 * @returns {Promise<void>}
 */
async function testClientConfigurationAPI() {
    const baseURL = "http://localhost:3001";
    const apiKey = "uk1_test_api_key"; // Replace with actual API key

    const clientConfig = {
        "clientBaseUrl": "https://example-client.com",
        "clientName": "Test Client Corporation"
    };

    try {
        console.log("Testing client configuration API...");

        const response = await axios.post(`${baseURL}/api/configure/client`, clientConfig, {
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey
            }
        });

        if (response.data.ok) {
            console.log("✅ Client configuration successful!");
            console.log(`Client Name: ${response.data.clientName}`);
            console.log(`Client URL: ${response.data.clientBaseUrl}`);

            // Display group information
            if (response.data.group) {
                console.log("\n👥 Group Monitor Created:");
                console.log(`  Group Monitor ID: ${response.data.group.groupID}`);
                console.log(`  Group Name: ${response.data.group.groupName}`);
                console.log(`  Group Type: ${response.data.group.groupType || "monitor"}`);
                console.log(`  Child Monitor Associations: ${response.data.group.monitorAssociations?.length || 0}`);

                // Show association details
                if (response.data.group.monitorAssociations) {
                    response.data.group.monitorAssociations.forEach((assoc, idx) => {
                        const status = assoc.success ? "✅" : "❌";
                        console.log(`    ${status} Monitor ${assoc.monitorId} → Parent: ${response.data.group.groupID}`);
                    });
                }
            }

            response.data.monitors.forEach((monitorResult, index) => {
                console.log(`\n📊 Monitor ${index + 1} (${monitorResult.type.toUpperCase()}):`);

                if (monitorResult.monitor) {
                    console.log("  ✅ Created successfully");
                    console.log(`  ID: ${monitorResult.monitor.monitorID}`);
                    console.log(`  Name: ${monitorResult.monitor.name}`);

                    if (monitorResult.monitor.pushURL) {
                        console.log(`  Push URL: ${monitorResult.monitor.pushURL}`);
                    }
                    if (monitorResult.monitor.pushToken) {
                        console.log(`  Push Token: ${monitorResult.monitor.pushToken}`);
                    }
                } else if (monitorResult.error) {
                    console.log(`  ❌ Failed: ${monitorResult.error}`);
                }
            });

        } else {
            console.log("❌ Failed to configure client:");
            console.log(response.data.msg);
        }

    } catch (error) {
        console.error("❌ Error testing client configuration API:");

        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Message: ${error.response.data?.msg || error.response.statusText}`);
        } else {
            console.error(error.message);
        }
    }
}

// Check if script is run directly
if (require.main === module) {
    console.log("🧪 Testing Client Configuration API");
    console.log("===================================");
    console.log("");
    console.log("⚠️  Make sure to:");
    console.log("1. Start the Uptime Kuma server");
    console.log("2. Run database migrations (ServiceType tag must exist)");
    console.log("3. Create an API key in Settings → API Keys");
    console.log("4. Update the apiKey variable in this script");
    console.log("");

    testClientConfigurationAPI().then(() => {
        console.log("");
        console.log("Test completed!");
    });
}

module.exports = { testClientConfigurationAPI };
