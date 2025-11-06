# MQTT Message Payload Format

## How to Send Token in MQTT Messages

The token is sent **inside the JSON payload**, not in MQTT headers or connection options.

### ❌ WRONG - Missing Token
```json
{
  "timestamp": "2025-11-06T14:26:43.000Z",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "speed": 25.5
}
```
**Result**: `Message from 123456 missing authentication token`

### ✅ CORRECT - Token in Payload
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZWhpY2xlSWQiOiIxMjM0NTYi...",
  "timestamp": "2025-11-06T14:26:43.000Z",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "speed": 25.5
}
```
**Result**: Message accepted ✅

---

## Complete Authentication Flow

### Step 1: Authenticate
**Topic**: `vehicle/123456/auth`  
**Payload**:
```json
{
  "vehicleId": "123456",
  "password": "secure-password-123"
}
```

### Step 2: Receive Token
**Topic**: `vehicle/123456/auth/token` (subscribe to this)  
**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "timestamp": 1699281203000
}
```

### Step 3: Send Data WITH Token
**Topic**: `vehicle/123456/telemetry`  
**Payload**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "timestamp": "2025-11-06T14:26:43.000Z",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "altitude": 10,
  "speed": 25.5,
  "heading": 180,
  "batteryLevel": 87.3,
  "sensors": {
    "lidar": "active",
    "camera": "recording",
    "gps": "locked"
  }
}
```

**Topic**: `vehicle/123456/health`  
**Payload**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "timestamp": "2025-11-06T14:26:43.000Z",
  "overallStatus": "healthy",
  "cpuUsage": 45.2,
  "memoryUsage": 67.8,
  "diskUsage": 34.1,
  "temperature": 42.5,
  "batteryHealth": 95.0,
  "systemErrors": [],
  "warnings": []
}
```

---

## Test It

### Option 1: Use the test script
```bash
# Make sure vehicle is registered first
curl -X POST http://localhost:3000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"123456","name":"Test Vehicle","password":"secure-password-123"}'

# Run the test
node examples/test-mqtt-auth.js 123456
```

### Option 2: Manual test with mosquitto_pub
```bash
# 1. Subscribe to auth token (in terminal 1)
mosquitto_sub -h localhost -p 1883 -t "vehicle/123456/auth/token" -v

# 2. Request authentication (in terminal 2)
mosquitto_pub -h localhost -p 1883 \
  -t "vehicle/123456/auth" \
  -m '{"vehicleId":"123456","password":"secure-password-123"}'

# 3. Copy the token from terminal 1, then send telemetry with it
mosquitto_pub -h localhost -p 1883 \
  -t "vehicle/123456/telemetry" \
  -m '{"token":"PASTE_TOKEN_HERE","latitude":40.7128,"longitude":-74.0060,"speed":25.5}'
```

---

## Key Points

1. **Token location**: Inside the JSON payload as a field named `token`
2. **Token format**: JWT string (looks like `eyJhbG...`)
3. **Which messages need token**: All messages EXCEPT `/auth` and `/register`
4. **Token lifetime**: 30 days (configurable in backend)
5. **Token validation**: Backend checks token on EVERY message before processing

---

## Code Examples

### JavaScript/Node.js
```javascript
const telemetry = {
  token: myAuthToken,  // Add token here
  latitude: 40.7128,
  longitude: -74.0060,
  speed: 25.5
};

client.publish('vehicle/123456/telemetry', JSON.stringify(telemetry));
```

### Python
```python
import json

telemetry = {
    "token": my_auth_token,  # Add token here
    "latitude": 40.7128,
    "longitude": -74.0060,
    "speed": 25.5
}

client.publish('vehicle/123456/telemetry', json.dumps(telemetry))
```

### cURL (HTTP to MQTT bridge)
```bash
curl -X POST http://localhost:3000/mqtt/publish \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "vehicle/123456/telemetry",
    "message": {
      "token": "eyJhbG...",
      "latitude": 40.7128,
      "speed": 25.5
    }
  }'
```
