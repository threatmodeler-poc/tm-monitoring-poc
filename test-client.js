/**
 * Test client to simulate the frontend needSetup check
 */

const io = require("socket.io-client");

/**
 *
 */
async function testNeedSetup() {
    console.log("🔍 Testing needSetup socket call...\n");

    try {
        console.log("1. Connecting to server...");
        const socket = io("http://localhost:3001", {
            transports: [ "websocket" ]
        });

        socket.on("connect", () => {
            console.log("   ✅ Socket connected\n");

            console.log("2. Checking needSetup...");
            socket.emit("needSetup", (needSetup) => {
                console.log(`   Result: needSetup = ${needSetup}`);

                if (needSetup) {
                    console.log("   📝 Would show setup page");
                } else {
                    console.log("   ✅ Would redirect to dashboard");
                }

                socket.disconnect();
                process.exit(0);
            });
        });

        socket.on("setup", () => {
            console.log("   📝 Server sent 'setup' event - redirecting to setup page");
            socket.disconnect();
            process.exit(0);
        });

        socket.on("connect_error", (error) => {
            console.error("   ❌ Connection error:", error.message);
            process.exit(1);
        });

        socket.on("disconnect", () => {
            console.log("   Socket disconnected");
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            console.log("   ⏰ Timeout - server not responding");
            socket.disconnect();
            process.exit(1);
        }, 30000);

    } catch (error) {
        console.error("❌ Test failed:", error.message);
        process.exit(1);
    }
}

console.log("Starting test client...");
console.log("Make sure the server is running first!\n");

testNeedSetup();
