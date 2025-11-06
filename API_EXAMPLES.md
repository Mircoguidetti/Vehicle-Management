## API Examples

This document provides example API requests for testing the Vehicle Management System.

### Base URL
```
http://localhost:3000
```

### Vehicle Registration

**Request:**
```bash
curl -X POST http://localhost:3000/vehicles/register \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "VEHICLE-001",
    "password": "secure_password_123",
    "name": "Autonomous Vehicle 1",
    "model": "Model X Pro",
    "manufacturer": "ACME Robotics",
    "capabilities": ["navigation", "obstacle_avoidance", "package_delivery"],
    "metadata": {
      "serialNumber": "SN-12345",
      "productionYear": 2024
    }
  }'
```

**Response:**
```json
{
  "vehicleId": "VEHICLE-001",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "status": "registered"
}
```

### Vehicle Authentication

**Request:**
```bash
curl -X POST http://localhost:3000/vehicles/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "VEHICLE-001",
    "password": "secure_password_123"
  }'
```

**Response:**
```json
{
  "vehicleId": "VEHICLE-001",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "status": "active"
}
```

### Get All Vehicles

**Request:**
```bash
curl http://localhost:3000/vehicles
```

**Response:**
```json
[
  {
    "id": "uuid",
    "vehicleId": "VEHICLE-001",
    "name": "Autonomous Vehicle 1",
    "model": "Model X Pro",
    "manufacturer": "ACME Robotics",
    "status": "active",
    "capabilities": ["navigation", "obstacle_avoidance"],
    "lastSeenAt": "2025-11-06T10:30:00Z",
    "lastKnownLatitude": 40.7128,
    "lastKnownLongitude": -74.0060,
    "createdAt": "2025-11-06T09:00:00Z"
  }
]
```

### Get Vehicle Telemetry

**Request:**
```bash
curl "http://localhost:3000/vehicles/VEHICLE-001/telemetry?startDate=2025-11-06T00:00:00Z&endDate=2025-11-06T23:59:59Z"
```

### Create Mission

**Request:**
```bash
curl -X POST http://localhost:3000/missions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Delivery",
    "description": "Deliver package to downtown location",
    "type": "delivery",
    "priority": "high",
    "assignedVehicleId": "VEHICLE-001",
    "waypoints": [
      {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "action": "pickup"
      },
      {
        "latitude": 40.7589,
        "longitude": -73.9851,
        "action": "dropoff"
      }
    ],
    "parameters": {
      "maxSpeed": 25,
      "avoidHighways": false,
      "packageId": "PKG-12345"
    }
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "missionId": "MISSION-abc123",
  "name": "Downtown Delivery",
  "type": "delivery",
  "priority": "high",
  "state": "assigned",
  "assignedVehicleId": "VEHICLE-001",
  "waypoints": [...],
  "createdAt": "2025-11-06T10:00:00Z"
}
```

### Get All Missions

**Request:**
```bash
curl http://localhost:3000/missions
```

**With filters:**
```bash
curl "http://localhost:3000/missions?state=in_progress"
```

### Assign Mission to Vehicle

**Request:**
```bash
curl -X POST http://localhost:3000/missions/MISSION-abc123/assign/VEHICLE-002
```

### Get Mission Status History

**Request:**
```bash
curl http://localhost:3000/missions/MISSION-abc123/status
```

**Response:**
```json
[
  {
    "id": "uuid",
    "missionId": "MISSION-abc123",
    "vehicleId": "VEHICLE-001",
    "timestamp": "2025-11-06T10:05:00Z",
    "currentState": "in_progress",
    "progressPercentage": 45,
    "currentWaypointIndex": 0,
    "currentLatitude": 40.7328,
    "currentLongitude": -74.0160,
    "distanceRemaining": 2500.5,
    "estimatedTimeRemaining": 300
  }
]
```

### Cancel Mission

**Request:**
```bash
curl -X DELETE http://localhost:3000/missions/MISSION-abc123
```

### Generate Mission Report

**Request:**
```bash
curl "http://localhost:3000/reports/missions?startDate=2025-11-01&endDate=2025-11-30&missionStates=completed&missionStates=in_progress"
```

**Response:**
```json
{
  "reportMetadata": {
    "generatedAt": "2025-11-06T12:00:00Z",
    "filters": {
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-30T23:59:59Z",
      "missionStates": ["completed", "in_progress"]
    }
  },
  "statistics": {
    "totalMissions": 25,
    "byState": {
      "completed": 20,
      "in_progress": 5
    },
    "byType": {
      "delivery": 15,
      "patrol": 10
    },
    "completionRate": 80,
    "averageDuration": 1800
  },
  "missions": [...]
}
```

### Generate Vehicle Report

**Request:**
```bash
curl "http://localhost:3000/reports/vehicles?vehicleIds=VEHICLE-001&vehicleIds=VEHICLE-002"
```

### Get Fleet Summary

**Request:**
```bash
curl http://localhost:3000/reports/fleet-summary
```

**Response:**
```json
{
  "generatedAt": "2025-11-06T12:00:00Z",
  "fleet": {
    "totalVehicles": 10,
    "activeVehicles": 8,
    "vehiclesByStatus": {
      "active": 8,
      "inactive": 1,
      "maintenance": 1
    }
  },
  "missions": {
    "totalMissions": 50,
    "activeMissions": 5,
    "missionsByState": {
      "pending": 10,
      "in_progress": 5,
      "completed": 30,
      "failed": 3,
      "cancelled": 2
    },
    "missionsByType": {
      "delivery": 30,
      "patrol": 15,
      "inspection": 5
    }
  }
}
```

## MQTT Examples

### Publish Telemetry (Vehicle → Backend)

**Topic:** `vehicle/VEHICLE-001/telemetry`

**Payload:**
```json
{
  "timestamp": "2025-11-06T10:30:00Z",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "altitude": 10.5,
  "speed": 15.2,
  "heading": 90.0,
  "batteryLevel": 85.5,
  "sensors": {
    "lidar": "active",
    "camera": "recording",
    "gps": "locked"
  }
}
```

### Publish Health Data (Vehicle → Backend)

**Topic:** `vehicle/VEHICLE-001/health`

**Payload:**
```json
{
  "timestamp": "2025-11-06T10:30:00Z",
  "overallStatus": "healthy",
  "cpuUsage": 45.2,
  "memoryUsage": 62.8,
  "diskUsage": 35.1,
  "temperature": 42.5,
  "batteryHealth": 95.0,
  "systemErrors": [],
  "warnings": [],
  "diagnostics": {
    "lastReboot": "2025-11-05T08:00:00Z",
    "uptime": 93600
  }
}
```

### Publish Mission Status (Vehicle → Backend)

**Topic:** `vehicle/VEHICLE-001/mission/status`

**Payload:**
```json
{
  "missionId": "MISSION-abc123",
  "timestamp": "2025-11-06T10:35:00Z",
  "currentState": "in_progress",
  "progressPercentage": 45,
  "currentWaypointIndex": 0,
  "currentLatitude": 40.7328,
  "currentLongitude": -74.0160,
  "distanceRemaining": 2500.5,
  "estimatedTimeRemaining": 300,
  "statusMessage": "Approaching first waypoint"
}
```

## Testing with cURL and mosquitto_pub

### Using mosquitto_pub (MQTT)

Install mosquitto clients:
```bash
# Ubuntu/Debian
sudo apt-get install mosquitto-clients

# macOS
brew install mosquitto
```

Publish telemetry:
```bash
mosquitto_pub -h localhost -p 1883 -u admin -P public \
  -t "vehicle/VEHICLE-001/telemetry" \
  -m '{"timestamp":"2025-11-06T10:30:00Z","latitude":40.7128,"longitude":-74.0060,"speed":15.2,"batteryLevel":85.5}'
```

Subscribe to mission commands:
```bash
mosquitto_sub -h localhost -p 1883 -u admin -P public \
  -t "vehicle/VEHICLE-001/mission/command"
```

## Postman Collection

Import the following into Postman for easy testing:

1. Create a new collection "Vehicle Management System"
2. Add the above cURL commands as requests
3. Set up environment variables:
   - `baseUrl`: `http://localhost:3000`
   - `vehicleId`: `VEHICLE-001`
   - `missionId`: (dynamic)
   - `token`: (dynamic)
