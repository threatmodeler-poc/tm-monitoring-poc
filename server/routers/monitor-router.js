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
const { genSecret } = require("../../src/util");
const { setting } = require("../util-server");

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

        // Use the internal helper function to create the monitor
        let response = await createMonitorInternal(monitor, userID);

        // For direct API calls (not internal), we can construct the full push URL if needed
        if (monitor.type === "push" && response.pushToken && !response.pushURL) {
            try {
                const baseURL = await setting("primaryBaseURL");
                if (baseURL) {
                    response.pushURL = `${baseURL}/api/push/${response.pushToken}?status=up&msg=OK&ping=`;
                } else {
                    // Fallback: construct URL from request
                    const protocol = req.protocol;
                    const host = req.get("host");
                    response.pushURL = `${protocol}://${host}/api/push/${response.pushToken}?status=up&msg=OK&ping=`;
                }
                // Remove the token since we now have the full URL
                delete response.pushToken;
            } catch (error) {
                console.warn("Could not generate push URL:", error.message);
                // Keep the token so users can construct the URL manually
            }
        }

        res.json(response);
    } catch (e) {
        console.error("Error adding monitor:", e.message);
        res.status(500).json({ ok: false,
            msg: e.message });
    }
});

router.post("/monitor/resolve-incident", async (req, res) => {
    try {
        console.log("Resolving monitor's incident...\n");

        const authHeader = req.headers["authorization"];
        const apiKeyHeader = req.headers["x-api-key"];

        if (!authHeader && !apiKeyHeader) {
            return res
                .status(401)
                .json({
                    ok: false,
                    msg: "Missing authentication. Provide either Authorization header with Bearer token or X-API-Key header",
                });
        }

        let user = null;
        let userID = null;

        // Try JWT authentication first (if Authorization header is present)
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            try {
                const decoded = jwt.verify(token, server.jwtSecret);
                user = await R.findOne(
                    "user",
                    " username = ? AND active = 1 ",
                    [ decoded.username ]
                );
                if (
                    user &&
                    decoded.h === shake256(user.password, SHAKE256_LENGTH)
                ) {
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
            return res
                .status(401)
                .json({
                    ok: false,
                    msg: "Invalid or expired authentication credentials",
                });
        }

        const monitorId = parseInt(req.query.monitorId, 0);
        const incidentId = req.query.incidentId ?? "";

        await R.exec("UPDATE monitor SET incident_id = null WHERE id = ? AND incident_id = ?", [ monitorId, incidentId ]);

        res.json({ ok: true,
            msg: "Incident Resolved",
            monitorId: monitorId,
            incidentId: incidentId
        });
    } catch (e) {
        console.error("Error Resolving Monitor Incident:", e.message);
        res.status(500).json({ ok: false,
            msg: e.message });
    }
});

// POST /api/configure/client - Configure client monitors
router.post("/configure/client", async (req, res) => {
    try {
        console.log("Configuring client monitors...\n");

        const authHeader = req.headers["authorization"];
        const apiKeyHeader = req.headers["x-api-key"];

        if (!authHeader && !apiKeyHeader) {
            return res.status(401).json({
                ok: false,
                msg: "Missing authentication. Provide either Authorization header with Bearer token or X-API-Key header",
            });
        }

        let user = null;
        let userID = null;

        // Try JWT authentication first (if Authorization header is present)
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            try {
                const decoded = jwt.verify(token, server.jwtSecret);
                user = await R.findOne(
                    "user",
                    " username = ? AND active = 1 ",
                    [ decoded.username ]
                );
                if (
                    user &&
                    decoded.h === shake256(user.password, SHAKE256_LENGTH)
                ) {
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
            return res.status(401).json({
                ok: false,
                msg: "Invalid or expired authentication credentials",
            });
        }

        const clientData = req.body;

        // Validate required parameters
        if (!clientData.clientBaseUrl || !clientData.clientName) {
            return res.status(400).json({
                ok: false,
                msg: "Missing required parameters: clientBaseUrl and clientName are required",
            });
        }

        // Validate URL format
        try {
            new URL(clientData.clientBaseUrl);
        } catch (urlError) {
            return res.status(400).json({
                ok: false,
                msg: "Invalid clientBaseUrl format. Must be a valid URL.",
            });
        }

        const instanceUrl = `${clientData.clientBaseUrl}/api/tminfo`;

        const results = [];

        //#region - THREATMODELER
        try {
            const httpMonitor = {
                name: `${clientData.clientName} WEB`,
                type: "json-query",
                url: instanceUrl,
                tags: [
                    {
                        value: "THREATMODELER",
                    },
                ],
                jsonPath: "data.tmServerState",
                jsonPathOperator: "==",
                expectedValue: "Healthy",
            };

            const httpMonitorResult = await createMonitorInternal(
                httpMonitor,
                userID
            );
            results.push({
                type: "http",
                monitor: httpMonitorResult,
            });
        } catch (httpError) {
            console.error("Failed to create HTTP monitor:", httpError.message);
            results.push({
                type: "http",
                error: httpError.message,
            });
        }
        //#endregion

        //#region - THREATMODELER_IDSVR
        try {
            const httpMonitor = {
                name: `${clientData.clientName} IDSVR`,
                type: "json-query",
                url: instanceUrl,
                tags: [
                    {
                        value: "THREATMODELER_IDSVR",
                    },
                ],
                jsonPath: "data.identityServerState",
                jsonPathOperator: "==",
                expectedValue: "Healthy",
            };

            const httpMonitorResult = await createMonitorInternal(
                httpMonitor,
                userID
            );
            results.push({
                type: "http",
                monitor: httpMonitorResult,
            });
        } catch (httpError) {
            console.error("Failed to create HTTP monitor:", httpError.message);
            results.push({
                type: "http",
                error: httpError.message,
            });
        }
        //#endregion

        //#region - THREATMODELER_REPORTING
        try {
            const httpMonitor = {
                name: `${clientData.clientName} REPORTING`,
                type: "json-query",
                url: instanceUrl,
                tags: [
                    {
                        value: "THREATMODELER_REPORTING",
                    },
                ],
                jsonPath: "data.reportServerState",
                jsonPathOperator: "==",
                expectedValue: "Healthy",
            };

            const httpMonitorResult = await createMonitorInternal(
                httpMonitor,
                userID
            );
            results.push({
                type: "http",
                monitor: httpMonitorResult,
            });
        } catch (httpError) {
            console.error("Failed to create HTTP monitor:", httpError.message);
            results.push({
                type: "http",
                error: httpError.message,
            });
        }
        //#endregion

        //#region - THREATMODELER_OBA
        try {
            const httpMonitor = {
                name: `${clientData.clientName} OBA`,
                type: "json-query",
                url: `${clientData.clientBaseUrl}/oba/health`,
                tags: [
                    {
                        value: "THREATMODELER_OBA",
                    },
                ],
                jsonPath: "status",
                jsonPathOperator: "==",
                expectedValue: "healthy",
            };

            const httpMonitorResult = await createMonitorInternal(
                httpMonitor,
                userID
            );
            results.push({
                type: "http",
                monitor: httpMonitorResult,
            });
        } catch (httpError) {
            console.error("Failed to create HTTP monitor:", httpError.message);
            results.push({
                type: "http",
                error: httpError.message,
            });
        }
        //#endregion

        //#region - THREATMODELER_GCPACCELERATOR
        try {
            const httpMonitor = {
                name: `${clientData.clientName} GCP`,
                type: "json-query",
                url: `${clientData.clientBaseUrl}/gcp/health`,
                tags: [
                    {
                        value: "THREATMODELER_GCPACCELERATOR",
                    },
                ],
                jsonPath: "status",
                jsonPathOperator: "==",
                expectedValue: "healthy",
            };

            const httpMonitorResult = await createMonitorInternal(
                httpMonitor,
                userID
            );
            results.push({
                type: "http",
                monitor: httpMonitorResult,
            });
        } catch (httpError) {
            console.error("Failed to create HTTP monitor:", httpError.message);
            results.push({
                type: "http",
                error: httpError.message,
            });
        }
        //#endregion

        //#region - THREATMODELER_RULESENGINE
        try {
            const httpMonitor = {
                name: `${clientData.clientName} RulesEngine`,
                type: "push",
                tags: [
                    {
                        value: "THREATMODELER_RULESENGINE",
                    },
                ],
            };

            const httpMonitorResult = await createMonitorInternal(
                httpMonitor,
                userID
            );
            results.push({
                type: "push",
                monitor: httpMonitorResult,
            });
        } catch (httpError) {
            console.error("Failed to create HTTP monitor:", httpError.message);
            results.push({
                type: "http",
                error: httpError.message,
            });
        }
        //#endregion

        //#region - THREATMODELER_EMBEDDEDDIAGRAM
        try {
            const httpMonitor = {
                name: `${clientData.clientName} ED`,
                type: "http",
                url: `${clientData.clientBaseUrl}/embedded-diagram`,
                tags: [
                    {
                        value: "THREATMODELER_EMBEDDEDDIAGRAM",
                    },
                ],
            };

            const httpMonitorResult = await createMonitorInternal(
                httpMonitor,
                userID
            );
            results.push({
                type: "http",
                monitor: httpMonitorResult,
            });
        } catch (httpError) {
            console.error("Failed to create HTTP monitor:", httpError.message);
            results.push({
                type: "http",
                error: httpError.message,
            });
        }
        //#endregion

        // Prepare response
        const response = {
            ok: true,
            msg: "Client configuration completed",
            clientName: clientData.clientName,
            clientBaseUrl: clientData.clientBaseUrl,
            monitors: results,
        };

        res.json(response);
    } catch (e) {
        console.error("Error configuring client:", e.message);
        res.status(500).json({ ok: false,
            msg: e.message });
    }
});

/**
 * Internal function to create a monitor (reuses the same logic as the main monitor endpoint)
 * @param {object} monitor Monitor data
 * @param {number} userID User ID
 * @returns {Promise<object>} Monitor creation result
 */
async function createMonitorInternal(monitor, userID) {
    let bean = R.dispense("monitor");

    let notificationIDList = monitor.notificationIDList || {};
    delete monitor.notificationIDList;

    // Extract tags from monitor object if present
    let tags = monitor.tags || [];
    delete monitor.tags;

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

    // Generate push token for push type monitors if not provided
    if (monitor.type === "push" && !monitor.pushToken) {
        bean.pushToken = genSecret(32); // Use 32 character length like the frontend
    }

    bean.validate();

    // Use the database utility to store with guaranteed ID
    bean = await storeWithAutoFallback(bean, "monitor", [ "user_id" ]);

    console.log(`Stored monitor with ID: ${bean.id}`);

    await updateMonitorNotification(bean.id, notificationIDList);

    // Handle ServiceType tag if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
        // Find the ServiceType tag from the database
        const serviceTypeTag = await R.findOne("tag", "name = ?", [ "ServiceType" ]);

        if (serviceTypeTag) {
            for (const tagData of tags) {
                // Only process if a value is provided
                if (tagData.value) {
                    try {
                        await R.exec("INSERT INTO monitor_tag (tag_id, monitor_id, value) VALUES (?, ?, ?)", [
                            serviceTypeTag.id,
                            bean.id,
                            tagData.value
                        ]);
                    } catch (tagError) {
                        // Log error but don't fail the entire monitor creation
                        console.warn(`Failed to associate ServiceType tag with monitor ${bean.id}:`, tagError.message);
                    }
                }
            }
        } else {
            console.warn("ServiceType tag not found in database. Make sure migrations have been run.");
        }
    }

    // Create a socket-like object with userID for the server method
    await server.sendUpdateMonitorIntoList({ userID: userID }, bean.id);
    if (monitor.active !== false) {
        await startMonitor(userID, bean.id);
    }

    // Prepare response
    let response = {
        ok: true,
        msg: "successAdded",
        monitorID: bean.id,
        name: bean.name
    };

    // If it's a push type monitor, include the push URL
    if (monitor.type === "push" && bean.pushToken) {
        try {
            const baseURL = await setting("primaryBaseURL");
            if (baseURL) {
                response.pushURL = `${baseURL}/api/push/${bean.pushToken}?status=up&msg=OK&ping=`;
            } else {
                // For internal calls, we don't have req object, so we'll just include the token
                response.pushToken = bean.pushToken;
            }
        } catch (error) {
            console.warn("Could not generate push URL:", error.message);
            // Still include the token so users can construct the URL manually
            response.pushToken = bean.pushToken;
        }
    }

    return response;
}

module.exports = router;
