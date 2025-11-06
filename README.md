# MQTT-Based Vehicle Management and Mission Control System

A comprehensive backend system for managing autonomous vehicles via MQTT, processing telemetry data, handling secure vehicle registration and authentication, and providing REST APIs for mission control and reporting.

## 🚀 Features

### 1. Vehicle Authentication & Registration
- ✅ MQTT-based vehicle registration and authentication
- ✅ Secure JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Vehicle metadata and capabilities management
- ✅ Topic-level access control ready

### 2. MQTT Integration
- ✅ Real-time vehicle telemetry processing
- ✅ Vehicle health monitoring
- ✅ Mission status updates
- ✅ Bi-directional communication (vehicle ↔ backend)
- ✅ EMQX broker integration

### 3. Database Architecture
- ✅ **PostgreSQL**: Relational data (vehicles, missions)
- ✅ **TimescaleDB**: Time-series data (telemetry, health, mission status)
- ✅ TypeORM for database abstraction
- ✅ Automatic schema synchronization

### 4. REST API Endpoints

#### Vehicle APIs
- `POST /vehicles/register` - Register a new vehicle
- `POST /vehicles/authenticate` - Authenticate a vehicle
- `GET /vehicles` - Get all vehicles
- `GET /vehicles/:vehicleId` - Get vehicle details
- `GET /vehicles/:vehicleId/telemetry` - Get vehicle telemetry
- `GET /vehicles/:vehicleId/health` - Get vehicle health data
- `PATCH /vehicles/:vehicleId/status` - Update vehicle status
- `DELETE /vehicles/:vehicleId` - Decommission vehicle

#### Mission APIs
- `POST /missions` - Create a new mission
- `GET /missions` - Get all missions (filterable by state)
- `GET /missions/:missionId` - Get mission details
- `GET /missions/:missionId/status` - Get mission status history
- `GET /missions/vehicle/:vehicleId` - Get missions by vehicle
- `POST /missions/:missionId/assign/:vehicleId` - Assign mission to vehicle
- `PATCH /missions/:missionId` - Update mission
- `DELETE /missions/:missionId` - Cancel mission

#### Report APIs
- `GET /reports/missions` - Generate mission report with filters
- `GET /reports/vehicles` - Generate vehicle report
- `GET /reports/fleet-summary` - Get fleet summary

### 5. MQTT Topics Structure

```
vehicle/{vehicleId}/register        - Vehicle registration requests
vehicle/{vehicleId}/auth            - Authentication messages
vehicle/{vehicleId}/auth/token      - Token delivery to vehicle
vehicle/{vehicleId}/telemetry       - Vehicle telemetry data
vehicle/{vehicleId}/health          - Vehicle health status
vehicle/{vehicleId}/mission/command - Mission commands from backend
vehicle/{vehicleId}/mission/status  - Mission status updates from vehicle
vehicle/{vehicleId}/mission/cancel  - Mission cancellation
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend / Client                       │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────────────────────┐
│                   NestJS Backend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Vehicle    │  │   Mission    │  │   Report     │      │
│  │   Module     │  │   Module     │  │   Module     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │              MQTT Service                           │    │
│  └──────┬──────────────────────────────────────────────┘    │
└─────────┼───────────────────┬──────────────────────────────┘
          │                   │
    ┌─────▼──────┐    ┌──────▼────────────────────┐
    │    EMQX    │    │     Databases             │
    │   Broker   │    │  ┌──────────────────────┐ │
    └─────┬──────┘    │  │   PostgreSQL         │ │
          │           │  │  (Relational Data)   │ │
    ┌─────▼──────┐    │  └──────────────────────┘ │
    │  Vehicles  │    │  ┌──────────────────────┐ │
    │  (MQTT)    │    │  │   TimescaleDB        │ │
    └────────────┘    │  │  (Time-Series Data)  │ │
                      │  └──────────────────────┘ │
                      └───────────────────────────┘
```

## 📋 Prerequisites

- Node.js >= 18.x
- Docker & Docker Compose
- npm or yarn

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd steer-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` file with your configuration (default values work with Docker setup).

### 4. Start infrastructure services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- TimescaleDB (port 5433)
- EMQX MQTT Broker (port 1883, Dashboard: 18083)

### 5. Initialize TimescaleDB hypertables

After tables are created by TypeORM, run:

```bash
docker exec -it vehicle-timescaledb psql -U postgres -d vehicle_telemetry
```

Then execute:

```sql
SELECT create_hypertable('vehicle_telemetry', 'timestamp', if_not_exists => TRUE);
SELECT create_hypertable('vehicle_health', 'timestamp', if_not_exists => TRUE);
SELECT create_hypertable('mission_status', 'timestamp', if_not_exists => TRUE);
```

### 6. Start the application

**Development mode:**
```bash
npm run start:dev
```

**Production mode:**
```bash
npm run build
npm run start:prod
```

## 📚 API Documentation

Once the application is running, access the Swagger documentation at:

```
http://localhost:3000/api
```

## 🧪 Testing

### Run unit tests
```bash
npm run test
```

### Run tests with coverage
```bash
npm run test:cov
```

### Run e2e tests
```bash
npm run test:e2e
```

## 🔐 Authentication Flow

### Vehicle Registration

1. **Vehicle sends registration request** via MQTT or REST API:
```json
{
  "vehicleId": "VEHICLE-001",
  "password": "secure_password",
  "name": "Autonomous Vehicle 1",
  "model": "Model X",
  "manufacturer": "ACME Corp",
  "capabilities": ["navigation", "obstacle_avoidance"]
}
```

2. **Backend processes registration**:
   - Validates vehicle data
   - Hashes password
   - Generates JWT token
   - Stores in PostgreSQL

3. **Backend publishes token** to `vehicle/{vehicleId}/auth/token`

4. **Vehicle receives and stores token** for future communications

### Vehicle Authentication

1. **Vehicle sends auth request**:
```json
{
  "vehicleId": "VEHICLE-001",
  "password": "secure_password"
}
```

2. **Backend validates credentials** and issues new JWT token

3. **Token used in MQTT payloads** for subsequent communications

## 📊 Data Flow Examples

### Telemetry Data

Vehicle publishes to `vehicle/VEHICLE-001/telemetry`:

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
    "camera": "recording"
  }
}
```

### Mission Command

Backend publishes to `vehicle/VEHICLE-001/mission/command`:

```json
{
  "missionId": "MISSION-123",
  "name": "Delivery Route A",
  "type": "delivery",
  "priority": "high",
  "waypoints": [
    {"latitude": 40.7128, "longitude": -74.0060, "action": "pickup"},
    {"latitude": 40.7589, "longitude": -73.9851, "action": "dropoff"}
  ],
  "parameters": {
    "maxSpeed": 20,
    "avoidTolls": true
  }
}
```

### Mission Status Update

Vehicle publishes to `vehicle/VEHICLE-001/mission/status`:

```json
{
  "missionId": "MISSION-123",
  "timestamp": "2025-11-06T10:35:00Z",
  "currentState": "in_progress",
  "progressPercentage": 45,
  "currentWaypointIndex": 0,
  "currentLatitude": 40.7328,
  "currentLongitude": -74.0160,
  "distanceRemaining": 2500.5,
  "estimatedTimeRemaining": 300
}
```

## 🐳 Docker Services

### EMQX Dashboard

Access the EMQX dashboard at:
```
http://localhost:18083
Username: admin
Password: public
```

### PostgreSQL

```bash
docker exec -it vehicle-postgres psql -U postgres -d vehicle_management
```

### TimescaleDB

```bash
docker exec -it vehicle-timescaledb psql -U postgres -d vehicle_telemetry
```

## 📁 Project Structure

```
steer-ai/
├── src/
│   ├── config/
│   │   └── database.module.ts      # Database configuration
│   ├── mqtt/
│   │   ├── mqtt.module.ts          # MQTT module
│   │   ├── mqtt.service.ts         # MQTT service & handlers
│   │   └── mqtt.controller.ts      # MQTT controller
│   ├── vehicle/
│   │   ├── entities/
│   │   │   ├── vehicle.entity.ts
│   │   │   ├── vehicle-telemetry.entity.ts
│   │   │   └── vehicle-health.entity.ts
│   │   ├── dto/                    # Data Transfer Objects
│   │   ├── vehicle.module.ts
│   │   ├── vehicle.service.ts
│   │   ├── vehicle.controller.ts
│   │   └── vehicle.service.spec.ts # Tests
│   ├── mission/
│   │   ├── entities/
│   │   │   ├── mission.entity.ts
│   │   │   └── mission-status.entity.ts
│   │   ├── dto/
│   │   ├── mission.module.ts
│   │   ├── mission.service.ts
│   │   ├── mission.controller.ts
│   │   └── mission.service.spec.ts
│   ├── report/
│   │   ├── report.module.ts
│   │   ├── report.service.ts
│   │   └── report.controller.ts
│   ├── app.module.ts               # Main application module
│   └── main.ts                     # Application entry point
├── test/                           # E2E tests
├── docker-compose.yml              # Infrastructure services
├── init-timescale.sql              # TimescaleDB initialization
├── .env                            # Environment variables
├── .env.example                    # Environment template
├── package.json
├── tsconfig.json
└── README.md
```