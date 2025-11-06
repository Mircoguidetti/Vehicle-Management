/**
 * Example MQTT Vehicle Client Simulator
 * 
 * This script simulates a vehicle connecting to the MQTT broker,
 * authenticating, and sending telemetry/health data.
 * 
 * Usage: node examples/vehicle-simulator.js VEHICLE-001
 */

const mqtt = require('mqtt');

class VehicleSimulator {
  constructor(vehicleId) {
    this.vehicleId = vehicleId;
    this.token = null;
    this.position = {
      latitude: 40.7128,
      longitude: -74.0060,
      altitude: 10,
    };
    this.speed = 0;
    this.heading = 0;
    this.batteryLevel = 100;
  }

  connect() {
    // Connect to MQTT broker
    this.client = mqtt.connect('mqtt://localhost:1883', {
      clientId: `vehicle-${this.vehicleId}`,
      username: 'admin',
      password: 'public',
      clean: true,
    });

    this.client.on('connect', () => {
      console.log(`✅ Vehicle ${this.vehicleId} connected to MQTT broker`);
      this.subscribeToTopics();
      // Authenticate first, then start simulation after receiving token
      this.authenticate();
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });

    this.client.on('error', (error) => {
      console.error('❌ MQTT Error:', error);
    });
  }

  subscribeToTopics() {
    const topics = [
      `vehicle/${this.vehicleId}/auth/token`,
      `vehicle/${this.vehicleId}/mission/command`,
      `vehicle/${this.vehicleId}/mission/cancel`,
    ];

    topics.forEach((topic) => {
      this.client.subscribe(topic, (err) => {
        if (!err) {
          console.log(`📡 Subscribed to ${topic}`);
        }
      });
    });
  }

  handleMessage(topic, message) {
    const payload = JSON.parse(message.toString());
    console.log(`📩 Received on ${topic}:`, payload);

    if (topic.includes('/auth/token')) {
      this.token = payload.token;
      console.log('🔐 Token received and stored');
      console.log('🚀 Starting telemetry transmission...');
      // NOW start sending data with the token
      this.startSimulation();
    } else if (topic.includes('/mission/command')) {
      console.log('🎯 Mission received:', payload.missionId);
      this.startMission(payload);
    } else if (topic.includes('/mission/cancel')) {
      console.log('🛑 Mission cancelled:', payload.missionId);
    }
  }

  authenticate() {
    console.log('🔑 Sending authentication request...');
    const authMessage = {
      vehicleId: this.vehicleId,
      password: '12345', // Must match registration password
    };
    
    const topic = `vehicle/${this.vehicleId}/auth`;
    this.client.publish(topic, JSON.stringify(authMessage), { qos: 1 });
  }

  startSimulation() {
    // Send telemetry every 5 seconds
    setInterval(() => {
      this.sendTelemetry();
    }, 5000);

    // Send health data every 10 seconds
    setInterval(() => {
      this.sendHealth();
    }, 10000);

    // Simulate movement
    setInterval(() => {
      this.updatePosition();
    }, 1000);
  }

  updatePosition() {
    // Simulate random movement
    this.position.latitude += (Math.random() - 0.5) * 0.001;
    this.position.longitude += (Math.random() - 0.5) * 0.001;
    this.speed = Math.random() * 30;
    this.heading = (this.heading + Math.random() * 10) % 360;
    this.batteryLevel = Math.max(0, this.batteryLevel - 0.01);
  }

  sendTelemetry() {
    // Don't send if we don't have a token yet
    if (!this.token) {
      console.log('⏳ Waiting for authentication token...');
      return;
    }

    const telemetry = {
      token: this.token, // Include authentication token
      timestamp: new Date().toISOString(),
      latitude: this.position.latitude,
      longitude: this.position.longitude,
      altitude: this.position.altitude,
      speed: this.speed,
      heading: this.heading,
      batteryLevel: this.batteryLevel,
      sensors: {
        lidar: 'active',
        camera: 'recording',
        gps: 'locked',
      },
    };

    const topic = `vehicle/${this.vehicleId}/telemetry`;
    this.client.publish(topic, JSON.stringify(telemetry), { qos: 1 });
    console.log('📍 Telemetry sent');
  }

  sendHealth() {
    // Don't send if we don't have a token yet
    if (!this.token) {
      console.log('⏳ Waiting for authentication token...');
      return;
    }

    const health = {
      token: this.token, // Include authentication token
      timestamp: new Date().toISOString(),
      overallStatus: this.batteryLevel > 20 ? 'healthy' : 'warning',
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      temperature: 20 + Math.random() * 30,
      batteryHealth: this.batteryLevel,
      systemErrors: [],
      warnings: this.batteryLevel < 20 ? ['Low battery'] : [],
    };

    const topic = `vehicle/${this.vehicleId}/health`;
    this.client.publish(topic, JSON.stringify(health), { qos: 1 });
    console.log('❤️  Health data sent');
  }

  startMission(mission) {
    console.log(`🚀 Starting mission: ${mission.name}`);
    
    // Simulate mission progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      
      if (progress > 100) {
        clearInterval(interval);
        this.sendMissionStatus(mission.missionId, 'completed', 100);
        return;
      }

      this.sendMissionStatus(mission.missionId, 'in_progress', progress);
    }, 3000);
  }

  sendMissionStatus(missionId, state, progress) {
    const status = {
      token: this.token, // Include authentication token
      missionId,
      timestamp: new Date().toISOString(),
      currentState: state,
      progressPercentage: progress,
      currentWaypointIndex: Math.floor(progress / 50),
      currentLatitude: this.position.latitude,
      currentLongitude: this.position.longitude,
      distanceRemaining: (100 - progress) * 10,
      estimatedTimeRemaining: (100 - progress) * 30,
      statusMessage: `Mission ${progress}% complete`,
    };

    const topic = `vehicle/${this.vehicleId}/mission/status`;
    this.client.publish(topic, JSON.stringify(status), { qos: 1 });
    console.log(`📊 Mission status: ${progress}%`);
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      console.log('👋 Disconnected from MQTT broker');
    }
  }
}

// Main execution
const vehicleId = process.argv[2] || 'VEHICLE-001';
const simulator = new VehicleSimulator(vehicleId);

console.log(`🚗 Starting vehicle simulator for ${vehicleId}`);
simulator.connect();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  simulator.disconnect();
  process.exit(0);
});
