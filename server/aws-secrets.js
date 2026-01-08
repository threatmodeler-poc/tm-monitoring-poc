const fs = require("fs");
const path = require("path");

/**
 * Loads app configuration and DB credentials from AWS Secrets Manager.
 *
 * Expected JSON formats (any of these):
 *
 * 1) Flat:
 *    {
 *      "INCIDENT_API_URL": "...",
 *      "VUE_APP_SERVICE_TYPES_API_URL": "...",
 *      "type": "mariadb",
 *      "hostname": "...",
 *      "port": "3306",
 *      "database": "...",
 *      "username": "...",
 *      "password": "..."
 *    }
 *
 * 2) Nested:
 *    { "appConfig": { ... }, "dbConfig": { ... } }
 */

/**
 * Get AWS region from environment variables
 * @returns {string|undefined} AWS region
 */
function getAwsRegion() {
    return (
        process.env.AWS_REGION ||
        process.env.AWS_DEFAULT_REGION ||
        process.env.AWS_SECRETS_MANAGER_REGION
    );
}

/**
 * Fetch and parse JSON from AWS Secrets Manager
 * @param {string} secretId - The secret ID or ARN
 * @returns {Promise<object>} Parsed secret JSON
 */
async function fetchSecretJson(secretId) {
    const region = getAwsRegion();
    if (!region) {
        throw new Error(
            "AWS region not set. Set AWS_REGION (or AWS_DEFAULT_REGION)"
        );
    }

    // Lazy require so local dev/test without AWS SDK still works unless enabled
    const {
        SecretsManagerClient,
        GetSecretValueCommand,
    } = require("@aws-sdk/client-secrets-manager");

    let client;
    let result;

    try {
        // Create client - this may fail if credentials are not available
        client = new SecretsManagerClient({ region });
    } catch (error) {
        throw new Error(
            "Failed to create AWS Secrets Manager client: " + error.message + ". " +
            "Ensure AWS credentials are available via IAM role, instance profile, " +
            "environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY), " +
            "or AWS CLI configuration (~/.aws/credentials)."
        );
    }

    try {
        // Fetch the secret
        result = await client.send(
            new GetSecretValueCommand({ SecretId: secretId })
        );
    } catch (error) {
        throw new Error(
            "Failed to fetch secret '" + secretId + "' from region '" + region + "': " + error.message + ". " +
            "Verify the secret exists, the name/ARN is correct, and IAM permissions include secretsmanager:GetSecretValue."
        );
    }

    let secretString;
    if (result.SecretString) {
        secretString = result.SecretString;
    } else if (result.SecretBinary) {
        secretString = Buffer.from(result.SecretBinary, "base64").toString(
            "utf-8"
        );
    } else {
        throw new Error(
            `Secret ${secretId} has no SecretString/SecretBinary`
        );
    }

    try {
        return JSON.parse(secretString);
    } catch (err) {
        throw new Error(
            `Secret ${secretId} is not valid JSON: ${err.message}`
        );
    }
}

/**
 * Apply environment variables from secret object
 * @param {object} obj - Secret data object
 * @returns {void}
 */
function applyEnvFromObject(obj) {
    if (!obj || typeof obj !== "object") {
        return;
    }

    if (
        typeof obj.INCIDENT_API_URL === "string" &&
        obj.INCIDENT_API_URL.trim()
    ) {
        process.env.INCIDENT_API_URL = obj.INCIDENT_API_URL.trim();
    }

    if (
        typeof obj.VUE_APP_SERVICE_TYPES_API_URL === "string" &&
        obj.VUE_APP_SERVICE_TYPES_API_URL.trim()
    ) {
        process.env.VUE_APP_SERVICE_TYPES_API_URL =
            obj.VUE_APP_SERVICE_TYPES_API_URL.trim();
    }
}

/**
 * Normalize database configuration from secret object
 * @param {object} obj - Secret data object
 * @returns {object|null} Normalized database config or null
 */
function normalizeDbConfig(obj) {
    if (!obj || typeof obj !== "object") {
        return null;
    }

    const raw =
        obj.dbConfig && typeof obj.dbConfig === "object"
            ? obj.dbConfig
            : obj.db && typeof obj.db === "object"
                ? obj.db
                : obj;

    if (!raw || typeof raw !== "object") {
        return null;
    }

    const type = raw.type;
    if (typeof type !== "string" || !type.trim()) {
        return null;
    }

    const dbConfig = {
        type: type.trim(),
    };

    const hostname = raw.hostname ?? raw.host;
    const port = raw.port;
    const dbName = raw.database ?? raw.dbName ?? raw.dbname;
    const username = raw.username ?? raw.user;
    const password = raw.password;

    if (hostname != null) {
        dbConfig.hostname = String(hostname);
    }
    if (port != null) {
        dbConfig.port = Number(port);
    }
    if (dbName != null) {
        dbConfig.dbName = String(dbName);
    }
    if (username != null) {
        dbConfig.username = String(username);
    }
    if (password != null) {
        dbConfig.password = String(password);
    }

    return dbConfig;
}

/**
 * Write database configuration to file if needed
 * @param {string} dataDir - Data directory path
 * @param {object} dbConfig - Database configuration object
 * @returns {void}
 */
function writeDbConfigIfNeeded(dataDir, dbConfig) {
    if (!dataDir || !dbConfig) {
        return;
    }

    const overwrite =
        process.env.AWS_SECRETS_MANAGER_OVERWRITE_DB_CONFIG === "1";
    const dbConfigPath = path.join(dataDir, "db-config.json");

    if (!overwrite && fs.existsSync(dbConfigPath)) {
        return;
    }

    fs.writeFileSync(dbConfigPath, JSON.stringify(dbConfig, null, 4));
}

/**
 * Load and apply secrets if configured.
 *
 * Env vars:
 * - AWS_SECRETS_MANAGER_SECRET_ID: single secret that may contain both app + db config
 * - AWS_SECRETS_MANAGER_APP_SECRET_ID: optional (urls)
 * - AWS_SECRETS_MANAGER_DB_SECRET_ID: optional (db)
 * - AWS_SECRETS_MANAGER_REQUIRED=1: fail startup if secrets cannot be loaded
 * - AWS_SECRETS_MANAGER_OVERWRITE_DB_CONFIG=1: overwrite existing data/db-config.json
 * @param {object} options - Configuration options
 * @param {string} options.dataDir - Data directory path
 * @param {object} options.log - Logger instance
 * @returns {Promise<void>}
 */
async function loadAwsSecretsIfConfigured({ dataDir, log } = {}) {
    const required = process.env.AWS_SECRETS_MANAGER_REQUIRED === "1";

    const secretIds = [
        process.env.AWS_SECRETS_MANAGER_SECRET_ID,
        process.env.AWS_SECRETS_MANAGER_APP_SECRET_ID,
        process.env.AWS_SECRETS_MANAGER_DB_SECRET_ID,
    ].filter(Boolean);

    if (secretIds.length === 0) {
        return;
    }

    try {
        for (const secretId of secretIds) {
            const secretJson = await fetchSecretJson(secretId);

            const appConfig =
                secretJson.appConfig && typeof secretJson.appConfig === "object"
                    ? secretJson.appConfig
                    : secretJson;
            applyEnvFromObject(appConfig);

            const dbConfig = normalizeDbConfig(secretJson);
            if (dbConfig) {
                writeDbConfigIfNeeded(dataDir, dbConfig);
            }
        }

        log?.info?.("server", "Loaded configuration from AWS Secrets Manager");
    } catch (err) {
        log?.error?.(
            "server",
            `Failed to load AWS Secrets Manager config: ${err.message}`
        );
        if (required) {
            throw err;
        }
    }
}

module.exports = {
    loadAwsSecretsIfConfigured,
};
