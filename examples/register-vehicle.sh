#!/bin/bash

# Script to register a new vehicle via REST API
# Usage: ./register-vehicle.sh VEHICLE-ID

VEHICLE_ID=${1:-"123456"}
API_URL="http://localhost:3000/api/vehicles"

echo "Registering vehicle: $VEHICLE_ID"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"vehicleId\": \"$VEHICLE_ID\",
    \"name\": \"Test Vehicle $VEHICLE_ID\",
    \"model\": \"Autonomous Drone v2.0\",
    \"manufacturer\": \"TechCorp\",
    \"password\": \"secure-password-123\",
    \"capabilities\": [\"autonomous_navigation\", \"object_detection\", \"real_time_telemetry\"],
    \"metadata\": {
      \"serialNumber\": \"SN-$VEHICLE_ID\",
      \"firmwareVersion\": \"1.2.3\"
    }
  }" | jq .

echo ""
echo "✅ Vehicle $VEHICLE_ID registered successfully!"
echo "You can now run: node examples/vehicle-simulator.js $VEHICLE_ID"
