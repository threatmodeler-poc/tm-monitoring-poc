const { R } = require("redbean-node");
const axios = require("axios");
const crypto = require("crypto");
const dayjs = require("dayjs");
const { storeWithId } = require("../utils/database-utils");
const { storeWithAutoFallback } = require("./database-utils");
const { log } = require("../../src/util");

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
            let statusPageId = await IncidentService.getMonitorStatusPage(monitor.id);

            let existingIncident = await R.findOne("incident",
                "status_page_id = ? AND active = 1 AND pin = 1 ORDER BY 1 DESC",
                [ statusPageId ]
            );

            if (existingIncident) {
                return;
            }

            const title = `Monitor Down: ${monitor.name}`;
            const description = `Monitor "${monitor.name}" is down. Error: ${heartbeat.msg || "Unknown error"}`;

            // Also create incident via external API if configured
            let incidentResponse = await IncidentService.callExternalIncidentAPI({
                siteUrl: monitor.url || monitor.name,
                region: process.env.AWS_DEFAULT_REGION || "us-east-1",
                title: title,
                description: description,
                updatedBy: process.env.INCIDENT_UPDATED_BY || "uptime-kuma@system.com",
                incidentStatus: "Identified",
                incidentImpact: "Major",
                monitorId: monitor.id,
            });

            let incidentId;
            if (incidentResponse && incidentResponse.status === 201 && incidentResponse.data) {
                incidentId = incidentResponse.data["incidentId"];
            }

            if (incidentId) {
                const existingIncident = await R.findOne("incident",
                    "incident_id = ? AND active = 1 ORDER BY created_date DESC",
                    [ incidentId ]
                );

                // If there's already an open incident, don't create another one
                if (existingIncident) {
                    log.debug("incident", `Monitor ${monitor.id} already has an open incident: ${existingIncident.id}`);
                    return;
                }

                // Create incident in local database
                try {
                    const localIncidentId = await IncidentService.createLocalIncident({
                        incidentId: incidentId,
                        monitorId: monitor.id,
                        title: title,
                        content: description,
                        style: "danger",
                        url: monitor.url || "",
                        status_page_id: 1,
                    });

                    log.info("incident", `Created local incident ${localIncidentId} for monitor ${monitor.id}`);
                } catch (incidentError) {
                    log.error("incident", `Failed to create local incident for monitor ${monitor.id}:`, incidentError?.message ?? incidentError ?? "Unknown error");
                    // Continue execution even if incident creation fails
                }
            }
        } catch (error) {
            log.error("incident", "Failed to create incident:", error?.message ?? error ?? "Unknown error");
        }
    }

    /**
     * Resolve incident when monitor comes back up
     * @param {object} monitor Monitor object
     * @returns {Promise<void>}
     */
    static async resolveIncidentForRecovery(monitor) {
        try {
            let statusPageId = await IncidentService.getMonitorStatusPage(monitor.id);

            // Find the most recent open incident for this monitor
            let openIncident = await R.findOne("incident",
                "status_page_id = ? AND active = 1 ORDER BY 1 DESC",
                [ statusPageId ]
            );

            if (openIncident) {
                log.info("incident", `Resolved incident ${openIncident.id} for monitor ${monitor.id}`);

                // Optionally call external API to update incident status
                if (openIncident.incident_id) {
                    let apiResonse = await IncidentService.callExternalIncidentAPI({
                        incidentId: openIncident.incident_id,
                        title: `RESOLVED: Monitor Up: ${monitor.name}`,
                        description: `Monitor "${monitor.name}" has recovered. Service is now operational.`,
                        updatedBy: process.env.INCIDENT_UPDATED_BY || "uptime-kuma@system.com",
                        incidentStatus: "Resolved",
                    }, true);

                    if (apiResonse && apiResonse?.status === 200) {
                        await R.exec("UPDATE incident SET pin = 0, active = 0 WHERE id = ?", [ openIncident.id ]);
                    }
                }
            }
        } catch (error) {
            log.error("incident", "Failed to resolve incident:", error?.message || error || "Unknown error");
        }
    }

    /**
     * Create incident in local database
     * @param {object} incidentData Incident data
     * @returns {Promise<number>} Incident ID
     */
    static async createLocalIncident(incidentData) {
        try {
            let statusPageId = await IncidentService.getMonitorStatusPage(incidentData.monitorId);

            let incident = R.dispense("incident");
            incident.incident_id = incidentData.incidentId;
            incident.title = incidentData.title;
            incident.content = incidentData.content;
            incident.style = incidentData?.style || "danger";
            incident.created_date = R.knex.fn.now();
            incident.pin = true;
            incident.active = true;
            incident.status_page_id = statusPageId;

            incident = await storeWithAutoFallback(incident, "incident", [ "incident_id", "status_page_id" ]);
            return incident.id;
        } catch (error) {
            log.error("incident", "Error creating local incident:", error?.message || error || "Unknown error");
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
            log.debug("incident", "INCIDENT_API_URL not configured, skipping external API call");
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
                        incidentId: incidentData.incidentId,
                        siteUrl: incidentData.siteUrl,
                        region: incidentData.region,
                        title: incidentData.title,
                        description: incidentData.description,
                        updatedBy: incidentData.updatedBy,
                        incidentStatus: incidentData.incidentStatus,
                        incidentImpact: incidentData.incidentImpact,
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
            log.error("incident", "Failed to call external incident API:", error.message);
            // Don't throw error - we don't want to break monitor functionality if external API fails
            return null;
        }
    }

    /**
     * Internal api for status_page
     * @param {number} monitorId  Incident data for external API
     * @returns {Promise<void>}
     */
    static async getMonitorStatusPage(monitorId) {
        let monitorGroup = await R.findOne("monitor_group",
            "monitor_id = ? ORDER BY id DESC",
            [ monitorId ]
        );

        if (!(monitorGroup?.group_id > 0)) {
            return 0;
        }

        let group = await R.findOne("group",
            "id = ?",
            [ monitorGroup.group_id ]
        );

        if (!(group?.status_page_id > 0)) {
            return 0;
        }

        return group.status_page_id;
    }
}

module.exports = IncidentService;
