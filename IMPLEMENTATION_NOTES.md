# Implementation Notes

This document provides technical details about the implementation choices and considerations.

## Design Decisions

### 1. Database Architecture

#### Why Dual Database Approach?

**PostgreSQL for Relational Data:**
- Vehicle and mission data has clear relationships
- ACID compliance needed for vehicle registration
- Complex queries with JOIN operations
- Data integrity through foreign keys

**TimescaleDB for Time-Series Data:**
- Telemetry data arrives at high frequency
- Health metrics are time-stamped measurements
- Efficient storage through automatic partitioning
- Fast time-range queries with hypertables
- Built-in compression for historical data

#### Entity Design

```typescript
// Relational entities (PostgreSQL)
Vehicle {
  - Master data (rarely changes)
  - Credentials and tokens
  - Current status
  - Metadata
}

Mission {
  - Mission definition
  - Current state
  - Assignment to vehicle
  - Waypoints and parameters
}

// Time-series entities (TimescaleDB)
VehicleTelemetry {
  - High-frequency data (every second)
  - GPS coordinates
  - Speed, heading, battery
  - Sensors data
}

VehicleHealth {
  - Periodic health checks (every 10-30s)
  - System metrics
  - Error logs
}

MissionStatus {
  - Progress updates during mission
  - Current position
  - ETA and distance
}
```

### 2. MQTT Topic Structure

#### Topic Hierarchy

```
vehicle/
├── {vehicleId}/
│   ├── register          # One-time registration
│   ├── auth              # Authentication requests
│   ├── auth/token        # Token delivery (backend → vehicle)
│   ├── telemetry         # Vehicle → Backend
│   ├── health            # Vehicle → Backend
│   └── mission/
│       ├── command       # Backend → Vehicle
│       ├── status        # Vehicle → Backend
│       └── cancel        # Backend → Vehicle
```

#### Why This Structure?

1. **Vehicle-scoped topics:** Each vehicle has isolated topics
2. **Clear direction:** Obvious which direction messages flow
3. **Future ACL:** Easy to implement per-vehicle access control
4. **Scalability:** Topic-based routing efficient in EMQX

#### QoS Levels

- **QoS 0:** Not used (too unreliable)
- **QoS 1:** Used for all messages (at least once delivery)
- **QoS 2:** Not used (unnecessary overhead for our use case)

### 3. Authentication Flow

#### Vehicle Registration Process

```
1. Vehicle sends registration request
   ├─ Via REST API (POST /vehicles/register)
   └─ Or via MQTT (vehicle/{id}/register)

2. Backend processes request
   ├─ Validates input data
   ├─ Checks for duplicate vehicleId
   ├─ Hashes password (bcrypt, 10 rounds)
   ├─ Generates JWT token
   └─ Saves to database

3. Backend responds
   ├─ Returns token in HTTP response
   └─ Publishes token to MQTT topic

4. Vehicle stores token
   └─ Uses in all subsequent MQTT messages
```

#### Why JWT for Vehicles?

- **Stateless:** Backend doesn't need to maintain session state
- **Self-contained:** Token includes all necessary info (vehicleId, type, jti)
- **Expirable:** 30-day expiration with refresh capability
- **Standard:** Well-understood security mechanism

#### Token Payload

```json
{
  "vehicleId": "VEHICLE-001",
  "type": "vehicle",
  "jti": "unique-token-id",
  "iat": 1699270800,
  "exp": 1701862800
}
```

### 4. Message Processing Pipeline

#### Telemetry Processing

```
MQTT Message Arrives
    ↓
Parse JSON payload
    ↓
Validate vehicle authentication (future)
    ↓
Create telemetry entity
    ↓
Save to TimescaleDB
    ↓
Update vehicle's last position (PostgreSQL)
    ↓
Emit event (future: for real-time dashboard)
```

#### Health Status Processing

```
MQTT Message Arrives
    ↓
Parse JSON payload
    ↓
Create health entity
    ↓
Save to TimescaleDB
    ↓
Check for critical status
    ↓
If critical → Update vehicle status to 'maintenance'
    ↓
Emit alert (future: notification service)
```

#### Mission Status Processing

```
MQTT Message Arrives
    ↓
Parse JSON payload
    ↓
Save to TimescaleDB (history)
    ↓
Update mission progress (PostgreSQL)
    ↓
If state changed → Update mission state
    ↓
If completed → Set completion time
```

### 5. Error Handling Strategy

#### HTTP Errors

```typescript
// Validation errors → 400 Bad Request
@Post()
async create(@Body() dto: CreateDto) {
  // class-validator automatically throws ValidationError
}

// Not found → 404 Not Found
async findOne(id: string) {
  const entity = await this.repo.findOne(id);
  if (!entity) {
    throw new NotFoundException('Entity not found');
  }
  return entity;
}

// Business logic errors → 409 Conflict
async register(dto: RegisterDto) {
  const existing = await this.repo.findOne({ vehicleId: dto.vehicleId });
  if (existing) {
    throw new ConflictException('Vehicle already registered');
  }
}

// Authentication errors → 401 Unauthorized
async authenticate(dto: AuthDto) {
  if (!validPassword) {
    throw new UnauthorizedException('Invalid credentials');
  }
}
```

#### MQTT Error Handling

```typescript
// Non-blocking: Log error, don't crash
private async handleMessage(topic: string, payload: Buffer) {
  try {
    const message = JSON.parse(payload.toString());
    await this.processMessage(topic, message);
  } catch (error) {
    this.logger.error(`Error handling message on ${topic}:`, error);
    // Message is lost, but system continues
  }
}
```

### 6. Performance Optimizations

#### Database Indexing

```sql
-- Primary lookups
CREATE INDEX idx_vehicle_vehicleId ON vehicles(vehicleId);
CREATE INDEX idx_mission_missionId ON missions(missionId);

-- Time-series queries
CREATE INDEX idx_telemetry_vehicle_time 
  ON vehicle_telemetry(vehicle_id, timestamp DESC);

-- Mission filtering
CREATE INDEX idx_mission_state ON missions(state);
CREATE INDEX idx_mission_vehicle ON missions(assigned_vehicle_id);
```

#### Query Optimization

```typescript
// Bad: N+1 query problem
const missions = await this.missionRepo.find();
for (const mission of missions) {
  mission.vehicle = await this.vehicleRepo.findOne(mission.vehicleId);
}

// Good: Single query with JOIN
const missions = await this.missionRepo.find({
  relations: ['assignedVehicle']
});
```

#### Pagination (Future Implementation)

```typescript
@Get()
async getAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10,
) {
  const [results, total] = await this.repo.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
  });
  
  return {
    data: results,
    meta: {
      total,
      page,
      lastPage: Math.ceil(total / limit),
    },
  };
}
```

### 7. Testing Strategy

#### Unit Tests

```typescript
// Service layer tests
describe('VehicleService', () => {
  beforeEach(() => {
    // Mock all dependencies
    const mockRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
  });

  it('should register vehicle', async () => {
    // Test business logic in isolation
  });
});
```

#### Integration Tests (Future)

```typescript
// Test with real database
describe('VehicleModule (e2e)', () => {
  beforeEach(async () => {
    // Start test database
    // Load test fixtures
  });

  it('/POST vehicles/register', () => {
    return request(app.getHttpServer())
      .post('/vehicles/register')
      .send(registerDto)
      .expect(201);
  });
});
```

#### MQTT Tests (Future)

```typescript
describe('MQTT Integration', () => {
  it('should process telemetry message', (done) => {
    mqttClient.publish('vehicle/TEST-001/telemetry', payload);
    
    setTimeout(async () => {
      const telemetry = await telemetryRepo.findOne({
        vehicleId: 'TEST-001'
      });
      expect(telemetry).toBeDefined();
      done();
    }, 1000);
  });
});
```

### 8. Security Considerations

#### Implemented

1. **Password Hashing**
   ```typescript
   const passwordHash = await bcrypt.hash(password, 10);
   ```

2. **JWT Tokens**
   ```typescript
   const token = this.jwtService.sign({
     vehicleId,
     type: 'vehicle',
     jti: uuidv4(),
   });
   ```

3. **Input Validation**
   ```typescript
   class RegisterVehicleDto {
     @IsString()
     @IsNotEmpty()
     vehicleId: string;
     
     @IsString()
     @MinLength(8)
     password: string;
   }
   ```

4. **SQL Injection Protection**
   - TypeORM uses parameterized queries
   - No string concatenation in queries

#### Future Enhancements

1. **Rate Limiting**
   ```typescript
   @UseGuards(ThrottlerGuard)
   @Throttle(10, 60) // 10 requests per minute
   async sensitiveEndpoint() {}
   ```

2. **MQTT Authentication**
   ```typescript
   // Validate JWT in MQTT messages
   const payload = JSON.parse(message.toString());
   const decoded = await this.jwtService.verify(payload.token);
   ```

3. **Topic-level ACL**
   - Configure EMQX to restrict vehicle access
   - Vehicle can only publish to its own topics

### 9. Scalability Patterns

#### Horizontal Scaling

```
┌─────────────┐
│Load Balancer│
└──────┬──────┘
       │
   ┌───┴───┬────────┐
   │       │        │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│App 1│ │App 2│ │App 3│
└──┬──┘ └──┬──┘ └──┬──┘
   └───┬───┴────────┘
       │
 ┌─────▼──────┐
 │EMQX Cluster│
 └────────────┘
```

#### Message Queue Pattern (Future)

```
MQTT → Backend → RabbitMQ → Workers
                     ↓
                 Database
```

Benefits:
- Decouple message reception from processing
- Handle burst traffic
- Retry failed messages
- Scale workers independently

#### Caching Strategy (Future)

```typescript
// Cache frequently accessed data
@Injectable()
export class VehicleService {
  async getVehicleById(id: string) {
    const cached = await this.cacheManager.get(`vehicle:${id}`);
    if (cached) return cached;
    
    const vehicle = await this.vehicleRepo.findOne(id);
    await this.cacheManager.set(`vehicle:${id}`, vehicle, 300);
    return vehicle;
  }
}
```

### 10. Monitoring & Observability

#### Logging Levels

```typescript
// Info: Normal operations
this.logger.log('Vehicle VEHICLE-001 registered');

// Warning: Recoverable issues
this.logger.warn('High telemetry rate from VEHICLE-001');

// Error: Failures
this.logger.error('Failed to save telemetry', error.stack);

// Debug: Troubleshooting
this.logger.debug('Received telemetry', telemetryData);
```

#### Metrics to Track (Future)

```typescript
// Application metrics
- Requests per second
- Response time percentiles (p50, p95, p99)
- Error rate
- Active connections

// Business metrics
- Active vehicles
- Messages per second
- Mission completion rate
- Average mission duration

// Infrastructure metrics
- Database query time
- MQTT broker connections
- Memory usage
- CPU usage
```

### 11. Future Enhancements

#### 1. Event Sourcing

```typescript
// Store all state changes as events
VehicleRegistered
VehicleAuthenticated
TelemetryReceived
MissionAssigned
MissionStarted
MissionCompleted
```

#### 2. WebSocket for Real-time Dashboard

```typescript
@WebSocketGateway()
export class DashboardGateway {
  @SubscribeMessage('subscribe-vehicle')
  handleSubscribe(client: Socket, vehicleId: string) {
    client.join(`vehicle:${vehicleId}`);
  }
  
  // Emit updates to subscribed clients
  emitTelemetryUpdate(vehicleId: string, data: any) {
    this.server.to(`vehicle:${vehicleId}`).emit('telemetry', data);
  }
}
```

#### 3. Advanced Analytics

```typescript
// Predictive maintenance
async predictMaintenanceNeeds(vehicleId: string) {
  const healthHistory = await this.getHealthHistory(vehicleId);
  // ML model to predict failures
}

// Route optimization
async optimizeRoute(waypoints: Waypoint[]) {
  // Use routing algorithm
}
```

#### 4. Geofencing

```typescript
async checkGeofence(position: Position, missionId: string) {
  const mission = await this.getMission(missionId);
  const allowed = this.geofenceService.isWithinBounds(
    position,
    mission.allowedArea
  );
  
  if (!allowed) {
    await this.alertService.sendAlert('Vehicle outside geofence');
  }
}
```

## Configuration Management

### Development
- Use `.env` file
- DB_SYNCHRONIZE=true for automatic schema updates
- Logging level: debug

### Production
- Use environment variables (no .env file)
- DB_SYNCHRONIZE=false, use migrations
- Logging level: info
- Enable SSL for MQTT and database connections
- Use secrets management (AWS Secrets Manager, etc.)

## Deployment Checklist

- [ ] Set strong JWT secrets
- [ ] Configure MQTT SSL/TLS
- [ ] Enable database SSL
- [ ] Set up backup strategy
- [ ] Configure log aggregation
- [ ] Set up monitoring and alerts
- [ ] Create TimescaleDB hypertables
- [ ] Set up retention policies
- [ ] Configure rate limiting
- [ ] Enable CORS for specific origins only
- [ ] Review and restrict EMQX ACL
- [ ] Set up CI/CD pipeline

## Known Limitations

1. **No message persistence:** If backend is down, MQTT messages are lost
   - Solution: Use EMQX persistence or message queue

2. **No authentication on MQTT messages:** Token validation not implemented
   - Solution: Add token validation in message handlers

3. **No pagination:** Large datasets could cause memory issues
   - Solution: Implement pagination on list endpoints

4. **No real-time updates:** Frontend must poll for updates
   - Solution: Implement WebSocket or Server-Sent Events

5. **Single MQTT client:** All vehicles share one backend connection
   - Solution: This is actually fine, but could use connection pool

## Troubleshooting Guide

### Database connection fails
```bash
# Check if container is running
docker ps | grep postgres

# Check logs
docker logs vehicle-postgres

# Verify credentials
docker exec -it vehicle-postgres psql -U postgres
```

### MQTT messages not received
```bash
# Check EMQX status
docker logs vehicle-emqx

# Test with mosquitto
mosquitto_pub -h localhost -p 1883 -t test -m "hello"
mosquitto_sub -h localhost -p 1883 -t test

# Check EMQX dashboard
# http://localhost:18083
```

### Hypertables not created
```bash
# Connect to TimescaleDB
docker exec -it vehicle-timescaledb psql -U postgres -d vehicle_telemetry

# Check if extension is installed
\dx

# Create hypertables manually
SELECT create_hypertable('vehicle_telemetry', 'timestamp');
```

## Performance Benchmarks

Target performance (single instance):

- REST API: < 100ms response time
- MQTT processing: < 10ms per message
- Database queries: < 50ms
- Throughput: 1000 messages/second
- Concurrent vehicles: 1000+

Actual performance will depend on:
- Hardware specifications
- Network latency
- Database optimization
- MQTT QoS settings

---

This implementation provides a solid foundation that meets all requirements and is ready for production use with minor enhancements.
