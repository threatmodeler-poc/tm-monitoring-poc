const { R } = require("redbean-node");

/**
 * Update notifications for a given monitor
 * @param {number} monitorID ID of monitor to update
 * @param {object} notificationIDList List of new notification providers to add
 * @returns {Promise<void>}
 */
async function updateMonitorNotification(monitorID, notificationIDList) {
    await R.exec("DELETE FROM monitor_notification WHERE monitor_id = ? ", [
        monitorID,
    ]);

    for (let notificationID in notificationIDList) {
        if (notificationIDList[notificationID]) {
            let relation = R.dispense("monitor_notification");
            relation.monitor_id = monitorID;
            relation.notification_id = notificationID;
            await R.store(relation);
        }
    }
}

module.exports = {
    updateMonitorNotification,
};
