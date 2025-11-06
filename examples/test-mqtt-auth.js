/**
 * Test MQTT Authentication Flow
 * This script demonstrates how to:
 * 1. Connect to MQTT broker
 * 2. Authenticate and receive token
 * 3. Send messages with token in payload
 */

const mqtt = require('mqtt');

const VEHICLE_ID = process.argv[2] || '123456';
const PASSWORD = '12345'; // Must match the password used during vehicle registration

let token = null;

// Connect to MQTT broker
const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: `test-vehicle-${VEHICLE_ID}`,
  username: 'admin',
  password: 'public',
  clean: true,
});

client.on('connect', () => {
  console.log(`✅ Connected to MQTT broker`);
  
  // Subscribe to receive the auth token
  client.subscribe(`vehicle/${VEHICLE_ID}/auth/token`, (err) => {
    if (err) {
      console.error('❌ Failed to subscribe:', err);
    } else {
      console.log(`📡 Subscribed to vehicle/${VEHICLE_ID}/auth/token`);
      
      // Now send authentication request
      console.log(`🔑 Sending authentication request...`);
      const authPayload = {
        vehicleId: VEHICLE_ID,
        password: PASSWORD,
      };
      
      client.publish(
        `vehicle/${VEHICLE_ID}/auth`,
        JSON.stringify(authPayload),
        { qos: 1 }
      );
    }
  });
});

client.on('message', (topic, message) => {
  console.log(`📩 Received message on ${topic}`);
  const payload = JSON.parse(message.toString());
  console.log('Payload:', payload);
  
  if (topic.includes('/auth/token')) {
    token = payload.token;
    console.log('✅ Token received!');
    console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
    
    // Now send a test telemetry message WITH the token
    sendTelemetryWithToken();
    
    // Send another one after 2 seconds
    setTimeout(() => {
      sendTelemetryWithToken();
      
      // Then disconnect
      setTimeout(() => {
        console.log('\n✅ Test completed successfully!');
        client.end();
        process.exit(0);
      }, 1000);
    }, 2000);
  }
});

function sendTelemetryWithToken() {
  if (!token) {
    console.log('❌ No token available yet');
    return;
  }
  
  console.log('\n📍 Sending telemetry WITH token in payload...');
  
  // THIS IS THE KEY: Include 'token' field in the payload
  const telemetryPayload = {
    token: token,  // <--- TOKEN GOES HERE IN THE JSON PAYLOAD
    timestamp: new Date().toISOString(),
    latitude: 40.7128,
    longitude: -74.0060,
    altitude: 10,
    speed: 25.5,
    heading: 180,
    batteryLevel: 87.3,
    sensors: {
      lidar: 'active',
      camera: 'recording',
      gps: 'locked',
    },
  };
  
  client.publish(
    `vehicle/${VEHICLE_ID}/telemetry`,
    JSON.stringify(telemetryPayload),
    { qos: 1 },
    (err) => {
      if (err) {
        console.error('❌ Failed to publish telemetry:', err);
      } else {
        console.log('✅ Telemetry sent successfully with token!');
      }
    }
  );
}

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error);
});

console.log(`\n🚀 Testing MQTT Authentication for vehicle: ${VEHICLE_ID}`);
console.log(`   Make sure the vehicle is registered first with:`);
console.log(`   ./examples/register-vehicle.sh ${VEHICLE_ID}\n`);
