# Uptime Kuma REST API - Monitor Management

## Add Monitor Endpoint

### Example: Create HTTP Monitor

```bash
curl -s -X POST http://localhost:3001/api/monitor \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: uk11_amhDdPhKVB0z3QYv5wQ7TU3dMovlNLHKx4PqZykK' \
  -d '{
    "type": "http",
    "name": "tm-dev-2-restapi",
    "parent": null,
    "url": "https://tmdev2.threatmodeler.us/api/tminfo",
    "method": "GET",
    "interval": 20,
    "retryInterval": 60,
    "resendInterval": 0,
    "maxretries": 0,
    "notificationIDList": {},
    "ignoreTls": false,
    "upsideDown": false,
    "expiryNotification": false,
    "maxredirects": 10,
    "accepted_statuscodes": ["200-299"],
    "dns_resolve_type": "A",
    "dns_resolve_server": "1.1.1.1",
    "docker_container": "",
    "docker_host": null,
    "proxyId": null,
    "mqttUsername": "",
    "mqttPassword": "",
    "mqttTopic": "",
    "mqttSuccessMessage": "",
    "mqttCheckType": "keyword",
    "authMethod": null,
    "oauth_auth_method": "client_secret_basic",
    "httpBodyEncoding": "json",
    "kafkaProducerBrokers": [],
    "kafkaProducerSaslOptions": {
      "mechanism": "None"
    },
    "cacheBust": false,
    "kafkaProducerSsl": false,
    "kafkaProducerAllowAutoTopicCreation": false,
    "gamedigGivenPortOnly": true,
    "remote_browser": null,
    "rabbitmqNodes": [],
    "rabbitmqUsername": "",
    "rabbitmqPassword": "",
    "conditions": [],
    "ping_count": 3,
    "ping_numeric": true,
    "packetSize": 56,
    "ping_per_request_timeout": 2,
    "timeout": 48,
    "snmpVersion": "2c",
    "jsonPath": "$",
    "jsonPathOperator": "=="
  }'
```

### Required Headers

- `Content-Type: application/json` - Specifies JSON payload
- `x-api-key: YOUR_API_KEY` - Replace with your actual API key

### Key Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `type` | Monitor type | `"http"`, `"ping"`, `"port"` |
| `name` | Monitor display name | `"tm-dev-2-restapi"` |
| `url` | Target URL to monitor | `"https://example.com"` |
| `interval` | Check interval in seconds | `20` |
| `accepted_statuscodes` | HTTP status codes to accept | `["200-299"]` |
| `timeout` | Request timeout in seconds | `48` |

### Response

```json
{
  "ok": true,
  "msg": "successAdded",
  "monitorID": 123
}
``` 