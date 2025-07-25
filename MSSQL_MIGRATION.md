# MSSQL Migration Guide

This guide explains how to migrate Uptime Kuma from SQLite to MSSQL database backend.

## Prerequisites

1. MSSQL Server instance running and accessible
2. Database created (e.g., `tm-monitor`)
3. User account with appropriate permissions
4. Network connectivity between Uptime Kuma and MSSQL server

## Configuration

### 1. Database Configuration

Update `/data/db-config.json` with your MSSQL connection details:

```json
{
    "type": "mssql",
    "port": 1433,
    "hostname": "your-mssql-server",
    "username": "your_username",
    "password": "your_password",
    "dbName": "your_database_name"
}
```

### 2. MSSQL Connection Options

The application uses the following MSSQL connection options by default:

```javascript
{
    server: "hostname",
    port: 1433,
    user: "username", 
    password: "password",
    database: "dbName",
    options: {
        enableArithAbort: true,
        encrypt: false,  // Set to true for Azure SQL
    },
    pool: {
        min: 0,
        max: 10,
        idleTimeoutMillis: 30000,
    }
}
```

## SQL Compatibility Fixes

The following SQL compatibility issues have been addressed:

### 1. Identifier Escaping
- **SQLite/MySQL**: Uses backticks `` `column_name` ``
- **MSSQL**: Uses square brackets `[column_name]`

### 2. Query Conversion
All queries are automatically converted using the SQLHelper utility:

```javascript
// Before (SQLite)
await R.exec("UPDATE `user` SET password = ? WHERE id = ?", [password, id]);

// After (MSSQL compatible)
await SQLHelper.exec("UPDATE [user] SET password = ? WHERE id = ?", [password, id]);
```

### 3. Database Functions
- **DATETIME('now')** (SQLite) → **GETDATE()** (MSSQL)
- **NOW()** (MySQL) → **GETDATE()** (MSSQL)

## Modified Files

The following files have been updated for MSSQL compatibility:

1. **server/utils/sql-helper.js** - New utility for cross-database compatibility
2. **server/auth.js** - Updated authentication queries
3. **server/settings.js** - Updated settings queries
4. **server/util-server.js** - Updated JWT initialization
5. **server/server.js** - Updated user management queries
6. **server/model/user.js** - Updated user model queries
7. **server/2fa.js** - Updated 2FA queries
8. **server/routers/monitor-router.js** - API key authentication support

## Database Tables

The application will automatically create the following tables in MSSQL:

- `user` - User accounts and authentication
- `setting` - Application settings
- `api_key` - API keys for authentication
- `monitor` - Monitor configurations
- `heartbeat` - Monitor status data
- `incident` - Incident records
- `maintenance` - Maintenance schedules
- `status_page` - Status page configurations
- `proxy` - Proxy configurations
- `docker_host` - Docker host configurations
- `group` - Monitor groups
- And more...

## Testing the Connection

Use the provided test script to verify MSSQL connectivity:

```bash
node test-mssql.js
```

This will test:
- ✅ Database connection
- ✅ Table creation
- ✅ Query conversion
- ✅ Identifier escaping

## Migration Process

1. **Backup existing data** (if migrating from SQLite)
2. **Configure MSSQL** connection in `db-config.json`
3. **Start the application** - Tables will be created automatically
4. **Verify functionality** with the test script
5. **Import data** (if migrating from another database)

## Troubleshooting

### Connection Issues
- Verify MSSQL server is running and accessible
- Check firewall settings (port 1433)
- Validate credentials and database permissions
- For Azure SQL, set `encrypt: true` in connection options

### Query Issues
- All backtick queries have been converted to square brackets
- Legacy queries should be automatically converted by SQLHelper
- Check logs for any remaining compatibility issues

### Performance
- MSSQL uses connection pooling (max 10 connections)
- Indexes are automatically created on critical tables
- Monitor performance and adjust pool settings if needed

## Security Considerations

1. **Use strong passwords** for database accounts
2. **Enable encryption** for production environments
3. **Restrict network access** to MSSQL server
4. **Regular security updates** for MSSQL server
5. **Monitor database access** logs

## API Key Storage

API keys are securely stored in the `api_key` table with:
- Hashed key values (not plain text)
- User association via foreign key
- Expiration date support
- Active/inactive status

The API authentication now supports both JWT tokens and API keys:

```bash
# JWT Authentication
curl -H "Authorization: Bearer <jwt_token>" ...

# API Key Authentication
curl -H "X-API-Key: uk1_your_api_key" ...
```

## Support

For issues related to MSSQL migration:
1. Check the application logs for detailed error messages
2. Verify MSSQL server connectivity
3. Ensure all required tables are created
4. Test with the provided test script
