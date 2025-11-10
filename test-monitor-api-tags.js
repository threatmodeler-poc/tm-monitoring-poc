const axios = require("axios");

/**
 * Test the monitor API tag functionality
 * @returns {Promise<void>}
 */
async function testMonitorAPITags() {
    const baseURL = "http://localhost:3001";
    const apiKey = "uk1_test_api_key"; // Replace with actual API key

    const testMonitor = {
        "name": "Test Monitor with Tags",
        "type": "http",
        "url": "https://httpbin.org/status/200",
        "interval": 60,
        "maxretries": 3,
        "timeout": 10,
        "active": true,
        "ignoreTls": false,
        "upsideDown": false,
        "accepted_statuscodes": [ "200-299" ],
        "description": "Test monitor for ServiceType tag functionality",
        "tags": [
            {
                "value": "API"
            }
        ]
    };

    try {
        console.log("Testing monitor creation with tags...");

        const response = await axios.post(`${baseURL}/api/monitor`, testMonitor, {
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey
            }
        });

        if (response.data.ok) {
            console.log("✅ Monitor created successfully!");
            console.log(`Monitor ID: ${response.data.monitorID}`);

            if (response.data.pushURL) {
                console.log(`Push URL: ${response.data.pushURL}`);
            }
        } else {
            console.log("❌ Failed to create monitor:");
            console.log(response.data.msg);
        }

    } catch (error) {
        console.error("❌ Error testing monitor API:");

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
    console.log("🧪 Testing Monitor API ServiceType Tag Functionality");
    console.log("===================================================");
    console.log("");
    console.log("⚠️  Make sure to:");
    console.log("1. Start the Uptime Kuma server");
    console.log("2. Run database migrations (ServiceType tag must exist)");
    console.log("3. Create an API key in Settings → API Keys");
    console.log("4. Update the apiKey variable in this script");
    console.log("");

    testMonitorAPITags().then(() => {
        console.log("");
        console.log("Test completed!");
    });
}

module.exports = { testMonitorAPITags };
