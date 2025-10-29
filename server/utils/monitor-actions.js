const { R } = require("redbean-node");
const server = require("../uptime-kuma-server").UptimeKumaServer.getInstance();
const { sleep, getRandomInt } = require("../../src/util");

/**
 * Start the specified monitor
 * @param {number} userID ID of user who owns monitor
 * @param {number} monitorID ID of monitor to start
 * @returns {Promise<void>}
 */
async function startMonitor(userID, monitorID) {
    // Ownership check
    let row = await R.getRow("SELECT id FROM monitor WHERE id = ? AND user_id = ? ", [ monitorID, userID ]);
    if (!row) {
        throw new Error("You do not own this monitor.");
    }
    await R.exec("UPDATE monitor SET active = 1 WHERE id = ? AND user_id = ? ", [ monitorID, userID ]);

    // Get monitor as proper Monitor instance
    let monitorData = await R.getRow("SELECT * FROM monitor WHERE id = ? ", [ monitorID ]);
    let monitor = R.convertToBeans("monitor", [ monitorData ])[0];

    if (monitor.id in server.monitorList) {
        await server.monitorList[monitor.id].stop();
    }
    server.monitorList[monitor.id] = monitor;
    await monitor.start(server.io);
}

module.exports = {
    startMonitor,
};
