const { R } = require("redbean-node");
const { log } = require("../../src/util");

/**
 * Generate LIMIT clause compatible with both SQLite and MSSQL
 * @param {number} limit - Number of rows to limit
 * @param {number} offset - Number of rows to skip (default: 0)
 * @returns {string} Database-specific LIMIT clause
 */
function getLimitClause(limit, offset = 0) {
    // Import Database here to avoid circular dependency
    const Database = require("../database");

    if (Database.dbConfig?.type === "mssql") {
        return `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    } else {
        // SQLite and other databases
        if (offset > 0) {
            return `LIMIT ${limit} OFFSET ${offset}`;
        } else {
            return `LIMIT ${limit}`;
        }
    }
}

/**
 * Generate TOP clause for MSSQL or empty string for other databases
 * Used for simple cases where you just need the first N rows
 * @param {number} count - Number of rows to get
 * @returns {string} Database-specific TOP clause or empty string
 */
function getTopClause(count) {
    // Import Database here to avoid circular dependency
    const Database = require("../database");

    if (Database.dbConfig?.type === "mssql") {
        return `TOP ${count}`;
    } else {
        return "";
    }
}

/**
 * Execute a query with LIMIT clause for cross-database compatibility
 * @param {string} query - The base SQL query
 * @param {Array} params - Query parameters
 * @param {number} limit - The limit number
 * @returns {Promise<Array>} Query results
 */
async function queryWithLimit(query, params = [], limit = 100) {
    const limitClause = getLimitClause(limit);
    const fullQuery = query.trim() + " " + limitClause;

    log.debug("database-utils", `fullQuery: ${fullQuery}`, params);

    const result = await R.getAll(fullQuery, params);
    return result;
}

/**
 * Store a bean and ensure it has an ID, working around MSSQL issues
 * where R.store() doesn't populate the bean.id property
 * @param {object} bean - The RedBean bean to store
 * @param {string} tableName - The table name for fallback queries
 * @param {object} fallbackCriteria - Criteria to find the bean if ID is missing
 * @returns {Promise<object>} The stored bean with guaranteed ID
 */
async function storeWithId(bean, tableName, fallbackCriteria = null) {
    try {
        // Store the bean
        let id = await R.store(bean);

        // If bean has ID after storage, we're good
        if (bean.id) {
            log.debug("database-utils", `Bean stored successfully with ID: ${bean.id}`);
            return bean;
        }

        // If R.store returned an ID, use it
        if (id) {
            bean.id = id;
            log.debug("database-utils", `Bean ID set from R.store return value: ${id}`);
            return bean;
        }

        // Fallback: query the database to find the stored bean
        log.debug("database-utils", `Bean ID not available after storage, querying database for table: ${tableName}`);

        let savedBean;
        if (fallbackCriteria && Object.keys(fallbackCriteria).length > 0) {
            // Import Database here to avoid circular dependency
            const Database = require("../database");

            // Use specific criteria if provided
            const whereConditions = Object.keys(fallbackCriteria).map(key => `${Database.escapeIdentifier(key)} = ?`).join(" AND ");
            const values = Object.values(fallbackCriteria);

            savedBean = await R.findOne(tableName,
                `${whereConditions} ORDER BY id DESC`,
                values);
        } else {
            // Fallback to finding the most recent record (risky but better than nothing)
            savedBean = await R.findOne(tableName, "ORDER BY id DESC");
        }

        if (savedBean) {
            log.debug("database-utils", `Found saved bean with ID: ${savedBean.id}`);
            return savedBean;
        } else {
            throw new Error(`Failed to store ${tableName} - could not retrieve ID from database`);
        }

    } catch (error) {
        log.error("database-utils", `Error storing bean in ${tableName}: ${error.message}`);
        throw error;
    }
}

/**
 * Store a bean with automatic fallback criteria generation
 * This version tries to automatically determine fallback criteria from the bean properties
 * @param {object} bean - The RedBean bean to store
 * @param {string} tableName - The table name for fallback queries
 * @param {Array<string>} uniqueFields - Fields that can be used to uniquely identify the bean
 * @returns {Promise<object>} The stored bean with guaranteed ID
 */
async function storeWithAutoFallback(bean, tableName, uniqueFields = []) {
    const fallbackCriteria = {};

    // Build fallback criteria from specified unique fields
    for (const field of uniqueFields) {
        if (bean[field] !== undefined && bean[field] !== null) {
            fallbackCriteria[field] = bean[field];
        }
    }

    return await storeWithId(bean, tableName, fallbackCriteria);
}

/**
 * Convert camelCase to snake_case for database column names
 * @param {string} camelStr - The camelCase string
 * @returns {string} The snake_case string
 */
function camelToSnake(camelStr) {
    return camelStr.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Upsert a bean - insert if it doesn't exist, update if it does
 * @param {string} tableName - The table name
 * @param {object} data - The data to upsert (camelCase properties)
 * @param {Array<string>} keyColumns - The columns that form the unique key (camelCase)
 * @returns {Promise<import("redbean-node").Bean>} The upserted bean
 */
async function upsert(tableName, data, keyColumns) {
    // Import Database here to avoid circular dependency
    const Database = require("../database");
    const dbType = Database.dbConfig?.type;

    if (dbType === "mssql") {
        // Convert camelCase properties to snake_case database column names
        const dbData = {};
        const dbKeyColumns = [];

        for (const [ key, value ] of Object.entries(data)) {
            const dbKey = camelToSnake(key);
            dbData[dbKey] = value;
        }

        for (const key of keyColumns) {
            dbKeyColumns.push(camelToSnake(key));
        }

        // Use MERGE statement for MSSQL with database column names
        const keyConditions = dbKeyColumns.map(col => `target.${col} = source.${col}`).join(" AND ");
        const allColumns = Object.keys(dbData);
        const nonKeyColumns = allColumns.filter(col => !dbKeyColumns.includes(col));

        const sourceColumns = allColumns.map(col => `? AS ${col}`).join(", ");
        const insertColumns = allColumns.join(", ");
        const insertValues = allColumns.map(col => `source.${col}`).join(", ");
        const updateSet = nonKeyColumns.map(col => `${col} = source.${col}`).join(", ");

        let sql = `
            MERGE ${tableName} AS target
            USING (SELECT ${sourceColumns}) AS source
            ON ${keyConditions}
        `;

        if (nonKeyColumns.length > 0) {
            sql += `
                WHEN MATCHED THEN 
                    UPDATE SET ${updateSet}
            `;
        }

        sql += `
            WHEN NOT MATCHED THEN 
                INSERT (${insertColumns}) VALUES (${insertValues});
        `;

        const values = allColumns.map(col => dbData[col]);
        await R.exec(sql, values);

        // Return the bean by finding it (using camelCase property names for RedBean)
        const whereClause = keyColumns.map(col => `${camelToSnake(col)} = ?`).join(" AND ");
        const keyValues = keyColumns.map(col => data[col]);
        return await R.findOne(tableName, whereClause, keyValues);
    } else {
        // For SQLite and other databases, use INSERT OR REPLACE or similar
        // RedBean handles camelCase to snake_case conversion automatically
        const whereClause = keyColumns.map(col => `${camelToSnake(col)} = ?`).join(" AND ");
        const keyValues = keyColumns.map(col => data[col]);
        let bean = await R.findOne(tableName, whereClause, keyValues);

        if (!bean) {
            bean = R.dispense(tableName);
        }

        // Set all data (RedBean will handle the conversion)
        for (const [ key, value ] of Object.entries(data)) {
            bean[key] = value;
        }

        return await R.store(bean);
    }
}

/**
 * Check if an error is a constraint violation
 * @param {Error} error - The error to check
 * @returns {boolean} True if it's a constraint violation
 */
function isConstraintViolation(error) {
    if (!error) {
        return false;
    }

    const message = error.message?.toLowerCase() || "";
    const code = error.code || error.number;

    // MSSQL constraint violation patterns
    if (code === 2601 || code === 2627) {
        return true;
    }
    if (message.includes("duplicate key") || message.includes("unique constraint")) {
        return true;
    }

    // SQLite constraint violation patterns
    if (message.includes("unique constraint failed")) {
        return true;
    }
    if (message.includes("constraint failed")) {
        return true;
    }

    return false;
}

module.exports = {
    getLimitClause,
    getTopClause,
    queryWithLimit,
    storeWithId,
    storeWithAutoFallback,
    upsert,
    isConstraintViolation
};
