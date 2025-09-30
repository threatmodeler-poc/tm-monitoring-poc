const { R } = require("redbean-node");
const axios = require("axios");
const crypto = require("crypto");
const dayjs = require("dayjs");
const { storeWithAutoFallback } = require("./database-utils");
const { log, MAINTENANCE } = require("../../src/util");

// Work flow
// First create local incident - in mssql db
// then create incident in incident-management - lambda

/**
 * Incident Service
 * Handles automatic incident creation for monitor failures
 */
class IncidentService {
    /**
     * Create an incident when a monitor goes down
     * @param {object} monitor Monitor object
     * @param {object} heartbeat Heartbeat object with failure details
     * @returns {Promise<void>}
     */
    static async createIncidentForFailure(monitor, heartbeat) {
        try {
            let monitorIncidentId = await IncidentService.GetMonitorIncident(
                monitor.id
            );

            if (monitorIncidentId) {
                return;
            }

            const title = `Monitor Down: ${monitor.name}`;
            const description = `Monitor ${monitor.name} is down. Error: ${
                heartbeat.msg || "Unknown error"
            }`;

            // Also create incident via external API if configured
            let incidentResponse =
                await IncidentService.callExternalIncidentAPI({
                    siteUrl: monitor.url || monitor.name,
                    title: title,
                    region: "us-east-1", // dummy, will be replaced by the api that is being called
                    description: description,
                    updatedBy: "ThreatModelerMonitoringTool@system.com",
                    incidentStatus:
                        heartbeat.status === MAINTENANCE
                            ? "Maintenance"
                            : "Identified",
                    incidentImpact:
                        heartbeat.status === MAINTENANCE ? "Minor" : "Major",
                    monitorId: monitor.id,
                    serviceType: await IncidentService.GetMonitorServiceType(monitor),
                });

            let incidentId;
            if (
                incidentResponse &&
                incidentResponse.status === 201 &&
                incidentResponse.data
            ) {
                incidentId = incidentResponse.data["incidentId"];
            }

            if (incidentId) {
                monitor.incident_id = incidentId;

                await IncidentService.UpdateMonitorIncident(
                    monitor.id,
                    incidentId,
                    false
                );

                // Create incident in local database
                try {
                    const localIncidentId =
                        await IncidentService.updateLocalIncident(
                            {
                                incidentId: incidentId,
                                monitorId: monitor.id,
                                title: title,
                                content: description,
                                style:
                                    heartbeat.status === MAINTENANCE
                                        ? "info"
                                        : "danger",
                                url: monitor.url || "",
                            },
                            false
                        );

                    log.info(
                        "incident",
                        `Created ${localIncidentId} local incidents for monitor ${monitor.id}`
                    );
                } catch (incidentError) {
                    log.error(
                        "incident",
                        `Failed to create local incident for monitor ${monitor.id}:`,
                        incidentError?.message ??
                            incidentError ??
                            "Unknown error"
                    );
                    // Continue execution even if incident creation fails
                }
            }
        } catch (error) {
            log.error(
                "incident",
                "Failed to create incident:",
                error?.message ?? error ?? "Unknown error"
            );
        }
    }

    /**
     * Update incident when monitor comes back up
     * @param {string} incidentId
     * @param {string} title
     * @param {string} content
     * @returns {Promise<void>}
     */
    static async updateIncident(incidentId, title, content) {
        try {
            if (incidentId) {
                let apiResonse = await IncidentService.callExternalIncidentAPI(
                    {
                        incidentId: incidentId,
                        region: "us-east-1", // dummy, will be replaced by the api that is being called
                        title: title,
                        description: content,
                        updatedBy:
                            process.env.INCIDENT_UPDATED_BY ||
                            "ThreatModelerMontioringTool@system.com",
                        incidentStatus: "Investigating",
                    },
                    true
                );
            }
        } catch (error) {
            log.error(
                "incident",
                "Failed to update incident:",
                error?.message || error || "Unknown error"
            );
        }
    }

    /**
     * Resolve incident when monitor comes back up
     * @param {object} monitor Monitor object
     * @returns {Promise<void>}
     */
    static async resolveIncidentForRecovery(monitor) {
        try {
            if (monitor.incident_id) {
                let apiResonse = await IncidentService.callExternalIncidentAPI(
                    {
                        incidentId: monitor.incident_id,
                        region: "us-east-1",
                        title: `RESOLVED: Monitor Up: ${monitor.name}`,
                        description: `Monitor "${monitor.name}" has recovered. Service is now operational.`,
                        updatedBy: "ThreatModelerMontioringTool@system.com",
                        incidentStatus: "Resolved",
                    },
                    true
                );

                if (apiResonse && apiResonse?.status === 200) {
                    await IncidentService.UpdateMonitorIncident(
                        monitor.id,
                        monitor.incident_id,
                        true
                    );

                    await IncidentService.updateLocalIncident(
                        {
                            incidentId: monitor.incident_id,
                            monitorId: monitor.id,
                        },
                        true
                    );

                    monitor.incident_id = null;
                }
            }
        } catch (error) {
            log.error(
                "incident",
                "Failed to resolve incident:",
                error?.message || error || "Unknown error"
            );
        }
    }

    /**
     * Create incident in local database
     * @param {object} incidentData Incident data
     * @param isResolved
     * @returns {Promise<number>} Incident ID
     */
    static async updateLocalIncident(incidentData, isResolved = false) {
        try {
            let statusPageIds = await IncidentService.getMonitorStatusPages(
                incidentData.monitorId
            );

            if (statusPageIds ?? statusPageIds.length > 0) {
                for (let i = 0; i < statusPageIds.length; i++) {
                    if (isResolved) {
                        await R.exec(
                            "UPDATE incident SET pin = ?, last_updated_date = ? WHERE status_page_id = ? AND incident_id = ?",
                            [
                                0,
                                R.knex.fn.now(),
                                Number(statusPageIds[i]),
                                String(incidentData.incidentId),
                            ]
                        );
                    } else {
                        let incident = R.dispense("incident");
                        incident.incident_id = incidentData.incidentId;
                        incident.title = incidentData.title;
                        incident.content = incidentData.content;
                        incident.style = incidentData?.style || "danger";
                        incident.created_date = R.knex.fn.now();
                        incident.pin = true;
                        incident.active = true;
                        incident.status_page_id = statusPageIds[i];

                        await R.store(incident);
                    }
                }
            }

            return statusPageIds.length;
        } catch (error) {
            log.error(
                "incident",
                "Error creating local incident:",
                error?.message || error || "Unknown error"
            );
            throw error; // Re-throw to let the calling function handle it
        }
    }

    /**
     * Call external incident API
     * @param {object} incidentData Incident data for external API
     * @param isUpdate
     * @returns {Promise<void>}
     */
    static async callExternalIncidentAPI(incidentData, isUpdate = false) {
        const apiUrl = process.env.INCIDENT_API_URL;

        if (!apiUrl) {
            log.debug(
                "incident",
                "INCIDENT_API_URL not configured, skipping external API call"
            );
            return;
        }

        try {
            let response;
            if (isUpdate) {
                response = await axios.put(
                    apiUrl,
                    {
                        incidentId: incidentData.incidentId,
                        siteUrl: incidentData.siteUrl,
                        region: incidentData.region,
                        title: incidentData.title,
                        description: incidentData.description,
                        updatedBy: incidentData.updatedBy,
                        incidentStatus: incidentData.incidentStatus,
                        incidentImpact: incidentData.incidentImpact,
                        monitorId: incidentData.monitorId,
                        serviceType: incidentData.serviceType,
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        timeout: 30000, // 30 second timeout
                    }
                );
            } else {
                response = await axios.post(
                    apiUrl,
                    {
                        monitorId: incidentData.monitorId,
                        incidentId: incidentData.incidentId,
                        siteUrl: incidentData.siteUrl,
                        region: incidentData.region,
                        title: incidentData.title,
                        description: incidentData.description,
                        updatedBy: incidentData.updatedBy,
                        incidentStatus: incidentData.incidentStatus,
                        incidentImpact: incidentData.incidentImpact,
                        serviceType: incidentData.serviceType
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        timeout: 30000, // 30 second timeout
                    }
                );
            }

            let temp = {
                data: response.data,
                status: response.status,
            };

            return temp;
        } catch (error) {
            log.error(
                "incident",
                `Failed to call external incident API: ${JSON.stringify(
                    error.response.data
                )}`
            );
            // Don't throw error - we don't want to break monitor functionality if external API fails
            return null;
        }
    }

    /**
     * Internal api for status_page
     * @param {number} monitorId  Incident data for external API
     * @returns {Promise<Array<number>>}
     */
    static async getMonitorStatusPages(monitorId) {
        let monitorGroup = await R.getAll(
            "SELECT * FROM monitor_group WHERE monitor_id = ?",
            [ monitorId ]
        );

        let statusPageIds = [];

        if (monitorGroup && monitorGroup.length > 0) {
            for (let i = 0; i < monitorGroup.length; i++) {
                let mg = monitorGroup[i];

                let group = await R.findOne("group", "id = ?", [ mg.group_id ]);

                if (group?.status_page_id > 0) {
                    statusPageIds.push(group.status_page_id);
                }
            }
        }

        return statusPageIds;
    }

    /**
     * Update incident id in monitor
     * @param monitorId
     * @param {string} incidentId IncidentId from ddb
     * @param isResolved
     * @returns {Promise<boolean>}
     */
    static async UpdateMonitorIncident(
        monitorId,
        incidentId,
        isResolved = false
    ) {
        let monitorIncidentId = await IncidentService.GetMonitorIncident(
            monitorId
        );

        if (!isResolved) {
            await R.exec("UPDATE monitor SET incident_id = ? WHERE id = ?", [
                incidentId,
                monitorId,
            ]);
            return true;
        }

        if (monitorIncidentId === incidentId) {
            await R.exec("UPDATE monitor SET incident_id = NULL WHERE id = ?", [
                monitorId,
            ]);
            return true;
        }

        return false;
    }

    /**
     * Check wether monitor has incident or not
     * @param monitorId
     * @param {string} incidentId IncidentId from ddb
     * @param isResolved
     * @returns {Promise<string>}
     */
    static async GetMonitorIncident(monitorId) {
        let monitor = await R.findOne("monitor", "id = ?", [ monitorId ]);
        return monitor.incident_id;
    }

    /**
     * Get Service Type of monitor
     * @param monitor
     * @returns {Promise<string>}
     */
    static async GetMonitorServiceType(monitor) {
        let tag = await R.findOne("tag", " name = ? ", [ "ServiceType" ]);
        if (tag?.id <= 0) {
            return "THREATMODELER";
        }

        let monitorTag = await R.findOne("monitor_tag", "monitor_id = ? AND tag_id = ?", [ monitor.id, tag.id ]);

        if (monitorTag?.id < 0) {
            return "THREATMODELER";
        }

        return monitorTag.value;
    }
}

module.exports = IncidentService;
