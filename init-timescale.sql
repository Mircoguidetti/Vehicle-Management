-- Initialize TimescaleDB extension and create hypertables

-- Create the TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- This script will run after the tables are created by TypeORM
-- You may need to run these commands manually or through a migration after initial setup

-- Example commands (uncomment and run after TypeORM creates the tables):
-- SELECT create_hypertable('vehicle_telemetry', 'timestamp', if_not_exists => TRUE);
-- SELECT create_hypertable('vehicle_health', 'timestamp', if_not_exists => TRUE);
-- SELECT create_hypertable('mission_status', 'timestamp', if_not_exists => TRUE);

-- Create indexes for better query performance
-- CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_time ON vehicle_telemetry (vehicle_id, timestamp DESC);
-- CREATE INDEX IF NOT EXISTS idx_health_vehicle_time ON vehicle_health (vehicle_id, timestamp DESC);
-- CREATE INDEX IF NOT EXISTS idx_mission_status_time ON mission_status (mission_id, timestamp DESC);
