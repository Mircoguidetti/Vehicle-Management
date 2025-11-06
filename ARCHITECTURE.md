## System Architecture

This document provides a detailed overview of the Vehicle Management System architecture.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        External Systems                           │
│  ┌────────────────┐        ┌──────────────┐                      │
│  │   Frontend     │        │   Mobile     │                      │
│  │   Dashboard    │        │   Apps       │                      │
│  └────────┬───────┘        └──────┬───────┘                      │
└───────────┼────────────────────────┼──────────────────────────────┘
            │                        │
            │ REST API               │ REST API
            │                        │
┌───────────▼────────────────────────▼──────────────────────────────┐
│                      NestJS Backend Server                         │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    API Layer (Controllers)                    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │ │
│  │  │   Vehicle    │  │   Mission    │  │   Report     │       │ │
│  │  │  Controller  │  │  Controller  │  │  Controller  │       │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │ │
│  └─────────┼──────────────────┼──────────────────┼───────────────┘ │
│            │                  │                  │                  │
│  ┌─────────▼──────────────────▼──────────────────▼───────────────┐ │
│  │                  Business Logic Layer (Services)              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │ │
│  │  │   Vehicle    │  │   Mission    │  │   Report     │       │ │
│  │  │   Service    │  │   Service    │  │   Service    │       │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │ │
│  └─────────┼──────────────────┼──────────────────┼───────────────┘ │
│            │                  │                  │                  │
│  ┌─────────▼──────────────────▼──────────────────▼───────────────┐ │
│  │                      MQTT Service Layer                       │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  Message Handlers:                                      │ │ │
│  │  │  • Telemetry Handler                                    │ │ │
│  │  │  • Health Status Handler                                │ │ │
│  │  │  • Mission Status Handler                               │ │ │
│  │  │  • Authentication Handler                               │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────┬───────────────────────────────────────┘ │
│                        │                                          │
│  ┌─────────────────────▼───────────────────────────────────────┐ │
│  │                   Data Access Layer (TypeORM)               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │  Relational  │  │ Time-Series  │  │   Caching    │      │ │
│  │  │ Repositories │  │ Repositories │  │   (Future)   │      │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │ │
│  └─────────┼──────────────────┼─────────────────────────────────┘ │
└────────────┼──────────────────┼───────────────────────────────────┘
             │                  │
             │                  │
    ┌────────▼────────┐  ┌──────▼───────────┐
    │   PostgreSQL    │  │   TimescaleDB    │
    │   (Relational)  │  │  (Time-Series)   │
    └─────────────────┘  └──────────────────┘
             ▲
             │
    ┌────────┴────────┐
    │   EMQX Broker   │
    │  (MQTT Server)  │
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │    Vehicles     │
    │  (IoT Devices)  │
    └─────────────────┘
```

## Component Details

### 1. NestJS Backend Server

The core application server built with NestJS framework, providing:
- Modular architecture
- Dependency injection
- TypeScript support
- Built-in validation and error handling

#### Modules:

**Vehicle Module**
- Manages vehicle registration and authentication
- Handles vehicle status and metadata
- Processes telemetry and health data
- Provides vehicle-related REST APIs

**Mission Module**
- Manages mission lifecycle (create, assign, execute, complete)
- Coordinates between vehicles and missions
- Tracks mission progress
- Provides mission-related REST APIs

**Report Module**
- Generates analytics and reports
- Aggregates data from multiple sources
- Provides filtering and querying capabilities

**MQTT Module**
- Handles MQTT broker connection
- Routes incoming MQTT messages to appropriate handlers
- Publishes commands and tokens to vehicles
- Manages QoS and message persistence

### 2. Database Layer

#### PostgreSQL (Relational Database)
**Purpose:** Store structured, relational data

**Tables:**
- `vehicles`: Vehicle master data, credentials, metadata
- `missions`: Mission definitions and current state

**Key Features:**
- ACID compliance
- Foreign key relationships
- Complex queries with joins
- Transactional integrity

#### TimescaleDB (Time-Series Database)
**Purpose:** Store high-frequency time-series data

**Hypertables:**
- `vehicle_telemetry`: GPS, speed, battery, sensors
- `vehicle_health`: CPU, memory, temperature, errors
- `mission_status`: Mission progress updates

**Key Features:**
- Automatic partitioning by time
- Efficient compression
- Fast time-range queries
- Retention policies

### 3. MQTT Broker (EMQX)

**Purpose:** Real-time communication between vehicles and backend

**Features:**
- High-performance message routing
- QoS 0, 1, 2 support
- WebSocket support
- Authentication and ACL
- Dashboard for monitoring

**Topic Structure:**
```
vehicle/
├── {vehicleId}/
│   ├── register          # Vehicle registration
│   ├── auth              # Authentication requests
│   ├── auth/token        # Token delivery
│   ├── telemetry         # Position, speed, battery
│   ├── health            # System health metrics
│   └── mission/
│       ├── command       # Mission assignments
│       ├── status        # Progress updates
│       └── cancel        # Cancellation notices
```

## Data Flow Diagrams

### Vehicle Registration Flow

```
┌─────────┐                 ┌─────────┐                 ┌──────────┐
│ Vehicle │                 │ Backend │                 │   EMQX   │
└────┬────┘                 └────┬────┘                 └────┬─────┘
     │                           │                           │
     │  POST /vehicles/register  │                           │
     │──────────────────────────>│                           │
     │                           │                           │
     │                      [Validate Data]                  │
     │                      [Hash Password]                  │
     │                      [Generate JWT]                   │
     │                      [Save to DB]                     │
     │                           │                           │
     │                           │  Publish Token            │
     │                           │──────────────────────────>│
     │                           │   (vehicle/ID/auth/token) │
     │  Return {vehicleId, token}│                           │
     │<──────────────────────────│                           │
     │                           │                           │
     │          Subscribe to Topics                          │
     │───────────────────────────────────────────────────────>│
     │                           │                           │
```

### Telemetry Data Flow

```
┌─────────┐                 ┌─────────┐                 ┌──────────┐
│ Vehicle │                 │   EMQX  │                 │ Backend  │
└────┬────┘                 └────┬────┘                 └────┬─────┘
     │                           │                           │
     │  Publish Telemetry        │                           │
     │──────────────────────────>│                           │
     │  (vehicle/ID/telemetry)   │                           │
     │                           │  Forward Message          │
     │                           │──────────────────────────>│
     │                           │                           │
     │                           │                   [Parse Message]
     │                           │                   [Validate]
     │                           │                   [Save to TimescaleDB]
     │                           │                   [Update Vehicle Position]
     │                           │                           │
```

### Mission Assignment Flow

```
┌──────────┐              ┌─────────┐              ┌─────────┐              ┌─────────┐
│ Frontend │              │ Backend │              │  EMQX   │              │ Vehicle │
└────┬─────┘              └────┬────┘              └────┬────┘              └────┬────┘
     │                         │                        │                        │
     │  POST /missions         │                        │                        │
     │────────────────────────>│                        │                        │
     │  {assign to vehicle}    │                        │                        │
     │                    [Create Mission]              │                        │
     │                    [Save to DB]                  │                        │
     │                         │  Publish Command       │                        │
     │                         │───────────────────────>│                        │
     │                         │  (vehicle/ID/mission)  │                        │
     │                         │                        │  Forward               │
     │                         │                        │───────────────────────>│
     │                         │                        │                        │
     │                         │                        │   Mission Accepted     │
     │                         │                        │<───────────────────────│
     │                         │                        │   (mission/status)     │
     │                         │  Forward Status        │                        │
     │                         │<───────────────────────│                        │
     │                    [Update DB]                   │                        │
     │  Return Mission         │                        │                        │
     │<────────────────────────│                        │                        │
```

## Security Architecture

### Authentication Layers

1. **Vehicle Authentication**
   - Password-based initial registration
   - JWT tokens for ongoing communication
   - Token stored in vehicle and validated on backend
   - Token expiration: 30 days (configurable)

2. **MQTT Broker Authentication**
   - Username/password for broker connection
   - Topic-level ACL (Access Control List)
   - Future: Per-vehicle credentials

3. **REST API Authentication** (Future)
   - JWT tokens for frontend/admin access
   - Role-based access control (RBAC)

### Data Security

```
┌─────────────────────────────────────────────────────────┐
│                  Security Layers                         │
├─────────────────────────────────────────────────────────┤
│  1. Transport Layer                                     │
│     • TLS/SSL for MQTT (port 8883)                      │
│     • HTTPS for REST APIs                               │
├─────────────────────────────────────────────────────────┤
│  2. Authentication Layer                                │
│     • JWT token validation                              │
│     • Password hashing (bcrypt)                         │
│     • Token expiration                                  │
├─────────────────────────────────────────────────────────┤
│  3. Authorization Layer                                 │
│     • Topic-level ACL on MQTT                           │
│     • Vehicle-specific topics                           │
│     • Role-based access (future)                        │
├─────────────────────────────────────────────────────────┤
│  4. Data Validation Layer                               │
│     • Input validation (class-validator)                │
│     • Schema validation                                 │
│     • SQL injection protection (TypeORM)                │
└─────────────────────────────────────────────────────────┘
```

## Scalability Considerations

### Horizontal Scaling

```
                    ┌─────────────┐
                    │Load Balancer│
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐        ┌────▼────┐       ┌────▼────┐
   │Backend 1│        │Backend 2│       │Backend 3│
   └────┬────┘        └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │  EMQX Cluster│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  DB Cluster  │
                    └──────────────┘
```

### Performance Optimizations

1. **Database Indexing**
   - Indexed on vehicleId, timestamp
   - Composite indexes for common queries
   - Hypertable partitioning by time

2. **Connection Pooling**
   - PostgreSQL connection pool
   - MQTT connection management

3. **Caching Strategy** (Future)
   - Redis for session data
   - Cache frequently accessed vehicle data
   - Cache report results

4. **Message Queue** (Future)
   - RabbitMQ/Kafka for async processing
   - Decouple MQTT ingestion from processing

## Monitoring & Observability

### Metrics to Track

1. **System Metrics**
   - Request latency
   - Throughput (requests/sec)
   - Error rates
   - Database query performance

2. **Business Metrics**
   - Active vehicles
   - Active missions
   - Message processing rate
   - Vehicle uptime

3. **MQTT Metrics**
   - Messages published/received
   - Connection count
   - Subscription count
   - Message queue depth

### Logging Strategy

```
Application Logs → Winston/Pino → Log Aggregation → Analysis
     │
     ├─ Info: Normal operations
     ├─ Warn: Recoverable issues
     ├─ Error: Failures requiring attention
     └─ Debug: Detailed troubleshooting
```

## Deployment Architecture

### Development Environment
```
Local Machine
├── Node.js Application (port 3000)
├── Docker Containers
│   ├── PostgreSQL (5432)
│   ├── TimescaleDB (5433)
│   └── EMQX (1883, 18083)
```

### Production Environment (Recommended)
```
Cloud Infrastructure
├── Kubernetes Cluster
│   ├── Backend Pods (auto-scaled)
│   ├── EMQX Cluster
│   └── Load Balancer
├── Managed PostgreSQL (AWS RDS / Azure Database)
├── Managed TimescaleDB (Timescale Cloud)
├── Monitoring (Prometheus + Grafana)
└── Logging (ELK Stack / CloudWatch)
```

## Future Enhancements

1. **Event Sourcing**
   - Store all state changes as events
   - Enable replay and audit trails

2. **CQRS Pattern**
   - Separate read and write models
   - Optimize for different access patterns

3. **GraphQL API**
   - Alternative to REST
   - More flexible querying

4. **Real-time Dashboard**
   - WebSocket connections
   - Live vehicle tracking
   - Real-time mission monitoring

5. **Machine Learning Integration**
   - Predictive maintenance
   - Route optimization
   - Anomaly detection
