/**
 * SQL Helper utilities for cross-database compatibility
 */
const { R } = require("redbean-node");

class SQLHelper {
    /**
     * Get the current database type
     * @returns {string} Database type (sqlite, mariadb, mssql, etc.)
     */
    static getDatabaseType() {
        try {
            const knex = R.knex;
            if (!knex || !knex.client) {
                return 'unknown';
            }
            
            const clientName = knex.client.constructor.name.toLowerCase();
            
            // Map client names to database types
            if (clientName.includes('mssql')) return 'mssql';
            if (clientName.includes('mysql')) return 'mysql';
            if (clientName.includes('sqlite')) return 'sqlite';
            if (clientName.includes('postgres')) return 'postgresql';
            
            return clientName;
        } catch (error) {
            console.warn('SQLHelper: Could not determine database type, defaulting to sqlite');
            return 'sqlite';
        }
    }

    /**
     * Escape column/table names based on database type
     * @param {string} identifier Column or table name
     * @returns {string} Properly escaped identifier
     */
    static escapeIdentifier(identifier) {
        const dbType = this.getDatabaseType();
        
        switch (dbType) {
            case 'mssql':
                return `[${identifier}]`;
            case 'mysql2client':
            case 'mysql':
                return `\`${identifier}\``;
            case 'sqlite3':
                return `\`${identifier}\``;
            case 'postgresql':
                return `"${identifier}"`;
            default:
                return `\`${identifier}\``;
        }
    }

    /**
     * Convert a query with backticks to the appropriate escaping for current database
     * @param {string} query SQL query with backticks
     * @returns {string} Query with proper escaping
     */
    static convertQuery(query) {
        const dbType = this.getDatabaseType();
        
        if (dbType === 'mssql') {
            // Replace backticks with square brackets for MSSQL
            return query.replace(/`([^`]+)`/g, '[$1]');
        }
        
        // For other databases, keep backticks as is
        return query;
    }

    /**
     * Execute a query with automatic conversion for current database
     * @param {string} query SQL query
     * @param {Array} params Query parameters
     * @returns {Promise} Query result
     */
    static async exec(query, params = []) {
        const convertedQuery = this.convertQuery(query);
        return await R.exec(convertedQuery, params);
    }

    /**
     * Find one record with automatic query conversion
     * @param {string} table Table name
     * @param {string} where Where clause
     * @param {Array} params Parameters
     * @returns {Promise} Query result
     */
    static async findOne(table, where, params = []) {
        const convertedWhere = this.convertQuery(where);
        return await R.findOne(table, convertedWhere, params);
    }

    /**
     * Find records with automatic query conversion
     * @param {string} table Table name
     * @param {string} where Where clause
     * @param {Array} params Parameters
     * @returns {Promise} Query result
     */
    static async find(table, where, params = []) {
        const convertedWhere = this.convertQuery(where);
        return await R.find(table, convertedWhere, params);
    }

    /**
     * Get current timestamp function for the database
     * @returns {string} Current timestamp function
     */
    static getCurrentTimestamp() {
        const dbType = this.getDatabaseType();
        
        switch (dbType) {
            case 'mssql':
                return 'GETDATE()';
            case 'mysql2client':
            case 'mysql':
                return 'NOW()';
            case 'sqlite3':
                return "DATETIME('now')";
            case 'postgresql':
                return 'NOW()';
            default:
                return 'NOW()';
        }
    }

    /**
     * Get database-specific LIMIT clause
     * @param {number} limit Number of records to limit
     * @param {number} offset Offset for pagination
     * @returns {string} LIMIT clause
     */
    static getLimitClause(limit, offset = 0) {
        const dbType = this.getDatabaseType();
        
        switch (dbType) {
            case 'mssql':
                return offset > 0 ? `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY` : `TOP ${limit}`;
            default:
                return offset > 0 ? `LIMIT ${limit} OFFSET ${offset}` : `LIMIT ${limit}`;
        }
    }
}

module.exports = SQLHelper;
