# API Key Authentication Examples

## 1. Using API Key with cURL

### Add a Website Monitor
```bash
curl -X POST http://localhost:3001/api/monitor \
  -H "Content-Type: application/json" \
  -H "X-API-Key: uk1_your_api_key_here" \
  -d '{
    "name": "Example Website",
    "type": "http",
    "url": "https://example.com",
    "interval": 60,
    "maxretries": 3,
    "timeout": 10,
    "active": true,
    "ignoreTls": false,
    "upsideDown": false,
    "accepted_statuscodes": ["200-299"],
    "description": "Monitor for example.com website"
  }'
```

### Add an HTTP Monitor with Custom Headers
```bash
curl -X POST http://localhost:3001/api/monitor \
  -H "Content-Type: application/json" \
  -H "X-API-Key: uk1_your_api_key_here" \
  -d '{
    "name": "API Endpoint Monitor",
    "type": "http",
    "url": "https://api.example.com/health",
    "method": "GET",
    "headers": "{\"Authorization\": \"Bearer token123\", \"User-Agent\": \"UptimeKuma\"}",
    "interval": 30,
    "maxretries": 2,
    "timeout": 15,
    "active": true,
    "accepted_statuscodes": ["200", "201"],
    "description": "Monitor for API health endpoint"
  }'
```

## 2. Using API Key with Python

```python
import requests
import json

# Configuration
UPTIME_KUMA_URL = "http://localhost:3001"
API_KEY = "uk1_your_api_key_here"  # Replace with your actual API key

# Headers
headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY
}

# Monitor configuration
monitor_config = {
    "name": "My Website",
    "type": "http",
    "url": "https://mywebsite.com",
    "interval": 60,
    "maxretries": 3,
    "timeout": 10,
    "active": True,
    "ignoreTls": False,
    "upsideDown": False,
    "accepted_statuscodes": ["200-299"],
    "description": "Monitor for my website"
}

# Make the request
response = requests.post(
    f"{UPTIME_KUMA_URL}/api/monitor",
    headers=headers,
    json=monitor_config
)

# Check response
if response.status_code == 200:
    result = response.json()
    print(f"Success: {result['msg']}")
    print(f"Monitor ID: {result['monitorID']}")
else:
    print(f"Error: {response.status_code}")
    print(response.json())
```

## 3. Using API Key with JavaScript/Node.js

```javascript
const axios = require('axios');

// Configuration
const UPTIME_KUMA_URL = 'http://localhost:3001';
const API_KEY = 'uk1_your_api_key_here'; // Replace with your actual API key

// Monitor configuration
const monitorConfig = {
    name: 'Node.js API Monitor',
    type: 'http',
    url: 'https://api.nodejs.org/health',
    interval: 120,
    maxretries: 3,
    timeout: 10,
    active: true,
    ignoreTls: false,
    upsideDown: false,
    accepted_statuscodes: ['200-299'],
    description: 'Monitor for Node.js API'
};

// Function to add monitor
async function addMonitor() {
    try {
        const response = await axios.post(`${UPTIME_KUMA_URL}/api/monitor`, monitorConfig, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            }
        });

        console.log('Success:', response.data.msg);
        console.log('Monitor ID:', response.data.monitorID);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Execute
addMonitor();
```

## 4. Authentication Methods Supported

### Option 1: API Key Authentication (Recommended for REST APIs)
```bash
curl -H "X-API-Key: uk1_your_api_key_here" ...
```

### Option 2: JWT Token Authentication
```bash
curl -H "Authorization: Bearer your_jwt_token_here" ...
```

## 5. Error Responses

### Missing Authentication
```json
{
    "ok": false,
    "msg": "Missing authentication. Provide either Authorization header with Bearer token or X-API-Key header"
}
```

### Invalid API Key
```json
{
    "ok": false,
    "msg": "Invalid or expired authentication credentials"
}
```

### Success Response
```json
{
    "ok": true,
    "msg": "successAdded",
    "monitorID": 123
}
```

## 6. Monitor Configuration Options

### Required Fields
- `name`: Monitor name (string)
- `type`: Monitor type (e.g., "http", "ping", "tcp", etc.)
- `url`: URL to monitor (for HTTP monitors)

### Optional Fields
- `interval`: Check interval in seconds (default: 60)
- `maxretries`: Maximum retries before marking as down (default: 3)
- `timeout`: Request timeout in seconds (default: 10)
- `active`: Whether monitor is active (default: true)
- `method`: HTTP method for HTTP monitors (default: "GET")
- `headers`: JSON string of HTTP headers
- `basic_auth_user`: Basic auth username
- `basic_auth_pass`: Basic auth password
- `accepted_statuscodes`: Array of accepted HTTP status codes
- `ignoreTls`: Ignore TLS/SSL errors (default: false)
- `upsideDown`: Invert the status (default: false)
- `description`: Monitor description
- `notificationIDList`: Object of notification IDs to enable
- `tags`: Array of tag objects to associate with the monitor

## Tag Examples

### Add Monitor with ServiceType Tag
```bash
curl -X POST http://localhost:3001/api/monitor \
  -H "Content-Type: application/json" \
  -H "X-API-Key: uk1_your_api_key_here" \
  -d '{
    "name": "Production API",
    "type": "http",
    "url": "https://api.example.com",
    "interval": 60,
    "active": true,
    "tags": [
      {
        "value": "API"
      }
    ]
  }'
```

### Add Monitor with Different ServiceType Value
```bash
curl -X POST http://localhost:3001/api/monitor \
  -H "Content-Type: application/json" \
  -H "X-API-Key: uk1_your_api_key_here" \
  -d '{
    "name": "Database Monitor",
    "type": "port",
    "hostname": "db.example.com",
    "port": 5432,
    "interval": 120,
    "active": true,
    "tags": [
      {
        "value": "Database"
      }
    ]
  }'
```

### Add Monitor with Multiple ServiceType Tags
```bash
curl -X POST http://localhost:3001/api/monitor \
  -H "Content-Type: application/json" \
  -H "X-API-Key: uk1_your_api_key_here" \
  -d '{
    "name": "Web Application",
    "type": "http",
    "url": "https://app.example.com",
    "interval": 60,
    "active": true,
    "tags": [
      {
        "value": "Web"
      },
      {
        "value": "Frontend"
      }
    ]
  }'
```

### Tag Data Format
Each tag object should contain:
- `value`: The ServiceType value to assign to the monitor

**Note**: The ServiceType tag must already exist in the database (created via migration). Only the value needs to be provided in the API request.

## Client Configuration API

### Configure Client with HTTP and Push Monitors
```bash
curl -X POST http://localhost:3001/api/configure/client \
  -H "Content-Type: application/json" \
  -H "X-API-Key: uk1_your_api_key_here" \
  -d '{
    "clientBaseUrl": "https://client.example.com",
    "clientName": "Example Client"
  }'
```

**Response:**
```json
{
  "ok": true,
  "msg": "Client configuration completed",
  "clientName": "Example Client",
  "clientBaseUrl": "https://client.example.com",
  "monitors": [
    {
      "type": "http",
      "monitor": {
        "ok": true,
        "msg": "successAdded",
        "monitorID": 123,
        "name": "Example Client WEB"
      }
    },
    {
      "type": "http", 
      "monitor": {
        "ok": true,
        "msg": "successAdded",
        "monitorID": 124,
        "name": "Example Client IDSVR"
      }
    },
    {
      "type": "push",
      "monitor": {
        "ok": true,
        "msg": "successAdded", 
        "monitorID": 125,
        "name": "Example Client RulesEngine",
        "pushURL": "http://localhost:3001/api/push/abc123token?status=up&msg=OK&ping="
      }
    }
  ],
  "group": {
    "ok": true,
    "groupID": 10,
    "groupName": "Example Client",
    "groupType": "monitor",
    "monitorAssociations": [
      {
        "monitorId": 123,
        "success": true
      },
      {
        "monitorId": 124, 
        "success": true
      },
      {
        "monitorId": 125,
        "success": true
      }
    ]
  }
}
```

**What this API does:**
- Creates multiple monitors for different ThreatModeler components:
  - THREATMODELER (main web application)
  - THREATMODELER_IDSVR (identity server)  
  - THREATMODELER_REPORTING (reporting service)
  - THREATMODELER_OBA (OBA component)
  - THREATMODELER_GCPACCELERATOR (GCP accelerator)
  - THREATMODELER_RULESENGINE (rules engine - push monitor)
  - THREATMODELER_EMBEDDEDDIAGRAM (embedded diagram)
- Creates a group monitor with the client name and sets all monitors as children
- Group monitors show aggregated status of all child monitors
- Uses the same authentication and validation as the `/monitor` API
- Returns all monitor details and group information in a single response

```
