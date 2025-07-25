const express = require("express");
const jwt = require("jsonwebtoken");
const dayjs = require("dayjs");
const { R } = require("redbean-node");
const passwordHash = require("../password-hash");
const { shake256, SHAKE256_LENGTH } = require("../util-server");
const { UptimeKumaServer } = require("../uptime-kuma-server");
const Monitor = require("../model/monitor");

const router = express.Router();
router.use(express.json());

function allowJson(req, res, next) {
    res.header("Content-Type", "application/json");
    next();
}
router.use(allowJson);

async function verifyAPIKey(key) {
    if (typeof key !== "string") {
        return null;
    }
    const index = key.substring(2, key.indexOf("_"));
    const clear = key.substring(key.indexOf("_") + 1);
    const hash = await R.findOne("api_key", " id=? ", [ index ]);
    if (!hash) {
        return null;
    }
    const current = dayjs();
    const expiry = dayjs(hash.expires);
    if (expiry.diff(current) < 0 || !hash.active) {
        return null;
    }
    if (!passwordHash.verify(clear, hash.key)) {
        return null;
    }
    const user = await R.findOne("user", " id = ? AND active = 1 ", [ hash.user_id ]);
    return user;
}

async function auth(req, res, next) {
    const server = UptimeKumaServer.getInstance();
    const authHeader = req.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, server.jwtSecret);
            const user = await R.findOne("user", " username = ? AND active = 1 ", [ decoded.username ]);
            if (user && decoded.h === shake256(user.password, SHAKE256_LENGTH)) {
                req.userID = user.id;
                return next();
            }
        } catch (_e) {
            // ignore and try api key
        }
    }
    const apiKey = req.get("x-api-key");
    if (apiKey) {
        const user = await verifyAPIKey(apiKey);
        if (user) {
            req.userID = user.id;
            return next();
        }
    }
    res.status(401).json({ ok: false, msg: "Unauthorized" });
}

async function updateMonitorNotification(monitorID, notificationIDList) {
    await R.exec("DELETE FROM monitor_notification WHERE monitor_id = ? ", [ monitorID ]);
    for (const notificationID in notificationIDList) {
        if (notificationIDList[notificationID]) {
            const relation = R.dispense("monitor_notification");
            relation.monitor_id = monitorID;
            relation.notification_id = notificationID;
            await R.store(relation);
        }
    }
}

router.post("/api/monitor", auth, async (req, res) => {
    const server = UptimeKumaServer.getInstance();
    try {
        const monitor = req.body || {};
        monitor.rabbitmqNodes = JSON.stringify(monitor.rabbitmqNodes);
        const bean = R.dispense("monitor");
        bean.import(monitor);
        bean.user_id = req.userID;
        bean.validate();
        await R.store(bean);
        await updateMonitorNotification(bean.id, monitor.notificationIDList || {});
        server.monitorList[bean.id] = bean;
        if (monitor.active !== false) {
            await bean.start(server.io);
        }
        res.json({ ok: true, monitorID: bean.id });
    } catch (e) {
        res.status(400).json({ ok: false, msg: e.message });
    }
});

module.exports = router;
