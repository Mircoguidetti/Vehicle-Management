# 🚀 Getting Started - Quick Guide

## Welcome to the Vehicle Management System!

This guide will help you get the system up and running in minutes.

---

## ⚡ Quick Start (Recommended)

If you have Docker installed, use this one-command setup:

```bash
./quick-start.sh
```

This script will:
1. ✓ Install all Node.js dependencies
2. ✓ Set up environment configuration
3. ✓ Start all infrastructure services (PostgreSQL, TimescaleDB, EMQX)
4. ✓ Wait for services to be ready
5. ✓ Start the NestJS application

---

## 🔧 Manual Setup

If you prefer manual setup or don't have Docker:

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
# Edit .env if needed (default values work with Docker setup)
```

### Step 3: Start Infrastructure

**Option A: With Docker (Recommended)**
```bash
docker-compose up -d
```

**Option B: Without Docker**
- Install PostgreSQL 15
- Install TimescaleDB extension
- Install EMQX MQTT broker
- Update `.env` with your database and MQTT connection details

### Step 4: Initialize Databases

After TypeORM creates the tables, initialize TimescaleDB hypertables:

```bash
# Connect to TimescaleDB
docker exec -it vehicle-timescaledb psql -U postgres -d vehicle_telemetry

# Create hypertables
SELECT create_hypertable('vehicle_telemetry', 'timestamp', if_not_exists => TRUE);
SELECT create_hypertable('vehicle_health', 'timestamp', if_not_exists => TRUE);
SELECT create_hypertable('mission_status', 'timestamp', if_not_exists => TRUE);
```

### Step 5: Start the Application

**Development mode:**
```bash
npm run start:dev
```

**Production mode:**
```bash
npm run build
npm run start:prod
```

---

## ✅ Verify Installation

Check if everything is working:

```bash
./verify-installation.sh
```

This will check:
- ✓ Prerequisites (Node.js, Docker)
- ✓ Project files
- ✓ Dependencies
- ✓ Docker containers
- ✓ Environment configuration
- ✓ Documentation

---

## 🎯 Access Points

Once running, access the system at:

| Service | URL | Credentials |
|---------|-----|-------------|
| **API Server** | http://localhost:3000 | - |
| **Swagger Docs** | http://localhost:3000/api | - |
| **EMQX Dashboard** | http://localhost:18083 | admin / public |
| **PostgreSQL** | localhost:5432 | postgres / postgres |
| **TimescaleDB** | localhost:5433 | postgres / postgres |

---

## 🧪 Test the System

### 1. Check if API is running

```bash
curl http://localhost:3000/api
# Should show Swagger UI
```

### 2. Register a test vehicle

```bash
curl -X POST http://localhost:3000/vehicles/register \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "TEST-001",
    "password": "test123456",
    "name": "Test Vehicle",
    "model": "TestBot v1"
  }'
```

You should receive a response with `vehicleId` and `token`.

### 3. Run the vehicle simulator

```bash
npm run simulator VEHICLE-001
```

Or:

```bash
node examples/vehicle-simulator.js VEHICLE-001
```

This will simulate a vehicle sending telemetry and health data.

### 4. View the data

```bash
# Get all vehicles
curl http://localhost:3000/vehicles

# Get vehicle telemetry
curl http://localhost:3000/vehicles/VEHICLE-001/telemetry

# Get fleet summary
curl http://localhost:3000/reports/fleet-summary
```

---

## 📚 Next Steps

1. **Explore the API**
   - Open http://localhost:3000/api in your browser
   - Try the interactive Swagger documentation
   - All endpoints are documented with examples

2. **Read the Documentation**
   - `README.md` - Full documentation
   - `API_EXAMPLES.md` - API usage examples
   - `ARCHITECTURE.md` - System architecture
   - `PROJECT_SUMMARY.md` - Requirements checklist

3. **Run Tests**
   ```bash
   npm test                # Unit tests
   npm run test:cov       # Coverage report
   npm run test:e2e       # E2E tests
   ```

4. **Create a Mission**
   - Use Swagger UI or cURL to create a mission
   - Assign it to a vehicle
   - Watch the vehicle simulator respond

---

## 🛠️ Useful Commands

```bash
# Development
npm run start:dev          # Start in watch mode
npm run start:debug        # Start with debugger

# Docker
npm run docker:up          # Start containers
npm run docker:down        # Stop containers  
npm run docker:logs        # View logs

# Database
npm run migration:generate # Generate migration
npm run migration:run      # Run migrations

# Code Quality
npm run lint               # Lint code
npm run format             # Format code
npm run test              # Run tests
```

---

## 🐛 Troubleshooting

### Port already in use

If you get "port already in use" errors:

```bash
# Check what's using the port
lsof -i :3000  # For API
lsof -i :5432  # For PostgreSQL
lsof -i :1883  # For MQTT

# Stop the process or use different ports in .env
```

### Docker containers not starting

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs postgres
docker-compose logs timescaledb
docker-compose logs emqx

# Restart containers
docker-compose restart
```

### Database connection failed

```bash
# Check if databases are ready
docker exec vehicle-postgres pg_isready -U postgres
docker exec vehicle-timescaledb pg_isready -U postgres

# Verify credentials in .env match docker-compose.yml
```

### MQTT connection issues

```bash
# Test MQTT broker
npm install -g mqtt
mqtt pub -h localhost -p 1883 -u admin -P public -t test -m "hello"
mqtt sub -h localhost -p 1883 -u admin -P public -t test

# Check EMQX dashboard at http://localhost:18083
```

---

## 📞 Need Help?

1. Check the **Troubleshooting** section above
2. Review the logs: `docker-compose logs -f`
3. Verify installation: `./verify-installation.sh`
4. Read the full documentation in `README.md`
5. Check the implementation notes in `IMPLEMENTATION_NOTES.md`

---

## 🎉 You're Ready!

The system is now running and ready to manage your autonomous vehicle fleet!

**What you can do:**
- ✅ Register vehicles
- ✅ Authenticate vehicles
- ✅ Receive telemetry data
- ✅ Monitor vehicle health
- ✅ Create and assign missions
- ✅ Track mission progress
- ✅ Generate reports and analytics

**Happy coding! 🚀**
