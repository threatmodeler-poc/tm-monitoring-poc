const { R } = require("redbean-node");
const { storeWithId } = require("./database-utils");
const Database = require("../database");

/**
 * Update notifications for a given monitor
 * @param {number} monitorID ID of monitor to update
 * @param {object} notificationIDList List of new notification providers to add
 * @returns {Promise<void>}
 */
async function updateMonitorNotification(monitorID, notificationIDList) {
    await R.exec(`DELETE FROM ${Database.escapeIdentifier("monitor_notification")} WHERE ${Database.escapeIdentifier("monitor_id")} = ? `, [
        monitorID,
    ]);

    for (let notificationID in notificationIDList) {
        if (notificationIDList[notificationID]) {
            let relation = R.dispense("monitor_notification");
            relation.monitor_id = monitorID;
            relation.notification_id = notificationID;

            // Use storeWithId to handle MSSQL compatibility where bean.id might not be populated
            const fallbackCriteria = {
                monitor_id: monitorID,
                notification_id: notificationID
            };
            await storeWithId(relation, "monitor_notification", fallbackCriteria);
        }
    }
}

module.exports = {
    updateMonitorNotification,
};
