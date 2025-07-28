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
