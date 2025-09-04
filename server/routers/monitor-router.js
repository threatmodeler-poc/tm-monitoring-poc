const express = require("express");
const router = express.Router();
const { R } = require("redbean-node");
const jwt = require("jsonwebtoken");
const { shake256, SHAKE256_LENGTH } = require("../util-server");
const { UptimeKumaServer } = require("../uptime-kuma-server");
const { getUserFromAPIKey } = require("../auth");
const server = UptimeKumaServer.getInstance();
const { updateMonitorNotification } = require("../utils/monitor-utils");
const { startMonitor } = require("../utils/monitor-actions");
const { storeWithAutoFallback } = require("../utils/database-utils");

// POST /api/monitor - Add a new monitor
router.post("/monitor", async (req, res) => {
    try {
        console.log("Adding new monitor...\n");

        const authHeader = req.headers["authorization"];
        const apiKeyHeader = req.headers["x-api-key"];

        if (!authHeader && !apiKeyHeader) {
            return res.status(401).json({ ok: false,
                msg: "Missing authentication. Provide either Authorization header with Bearer token or X-API-Key header" });
        }

        let user = null;
        let userID = null;

        // Try JWT authentication first (if Authorization header is present)
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            try {
                const decoded = jwt.verify(token, server.jwtSecret);
                user = await R.findOne("user", " username = ? AND active = 1 ", [ decoded.username ]);
                if (user && decoded.h === shake256(user.password, SHAKE256_LENGTH)) {
                    userID = user.id;
                }
            } catch (err) {
                // JWT validation failed, will try API key next if available
            }
        }

        // If JWT authentication failed or not provided, try API key authentication
        if (!user && apiKeyHeader) {
            user = await getUserFromAPIKey(apiKeyHeader);
            if (user) {
                userID = user.id;
            }
        }

        // If both authentication methods failed
        if (!user || !userID) {
            return res.status(401).json({ ok: false,
                msg: "Invalid or expired authentication credentials" });
        }

        const monitor = req.body;
        let bean = R.dispense("monitor");

        let notificationIDList = monitor.notificationIDList;
        delete monitor.notificationIDList;

        // Use same logic as websocket 'add' event
        monitor.accepted_statuscodes = Array.isArray(monitor.accepted_statuscodes) ? monitor.accepted_statuscodes : [ "200-299" ];
        monitor.kafkaProducerBrokers = Array.isArray(monitor.kafkaProducerBrokers) ? monitor.kafkaProducerBrokers : [];
        monitor.kafkaProducerSaslOptions = typeof monitor.kafkaProducerSaslOptions === "object" ? monitor.kafkaProducerSaslOptions : { mechanism: "None" };
        monitor.conditions = Array.isArray(monitor.conditions) ? monitor.conditions : [];
        monitor.rabbitmqNodes = Array.isArray(monitor.rabbitmqNodes) ? monitor.rabbitmqNodes : [];

        // Defensive: ensure notificationIDList is an object
        notificationIDList = typeof notificationIDList === "object" && notificationIDList !== null ? notificationIDList : {};

        if (!monitor.accepted_statuscodes.every((code) => typeof code === "string")) {
            throw new Error("Accepted status codes are not all strings");
        }
        monitor.accepted_statuscodes_json = JSON.stringify(monitor.accepted_statuscodes);
        delete monitor.accepted_statuscodes;

        monitor.kafkaProducerBrokers = JSON.stringify(monitor.kafkaProducerBrokers);
        monitor.kafkaProducerSaslOptions = JSON.stringify(monitor.kafkaProducerSaslOptions);

        monitor.conditions = JSON.stringify(monitor.conditions);
        monitor.rabbitmqNodes = JSON.stringify(monitor.rabbitmqNodes);

        bean.import(monitor);
        bean.user_id = userID;

        bean.validate();

        // Use the database utility to store with guaranteed ID
        bean = await storeWithAutoFallback(bean, "monitor", [ "user_id" ]);

        console.log(`Stored monitor with ID: ${bean.id}`);

        await updateMonitorNotification(bean.id, notificationIDList);
        // Create a socket-like object with userID for the server method
        await server.sendUpdateMonitorIntoList({ userID: userID }, bean.id);
        if (monitor.active !== false) {
            await startMonitor(userID, bean.id);
        }
        res.json({ ok: true,
            msg: "successAdded",
            monitorID: bean.id });
    } catch (e) {
        console.error("Error adding monitor:", e.message);
        res.status(500).json({ ok: false,
            msg: e.message });
    }
});

module.exports = router;
