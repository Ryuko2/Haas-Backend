# Haas Machine Simulator - Backend

A realistic mock CNC machine simulator based on Haas VF-2 specifications. This simulator provides real-time machine data, diagnostics, and control capabilities for testing your diagnostic mobile app.

## Features

### Machine Simulation
- **Real-time data generation** for all machine components
- **Spindle monitoring**: Speed, load, temperature, operating hours
- **Axes tracking**: X, Y, Z positions, loads, and temperatures
- **Tool management**: 24-tool magazine with wear tracking
- **Coolant & hydraulic systems**: Levels, pressures, temperatures
- **Maintenance alerts**: Automatic scheduling and notifications
- **Alarm simulation**: Random faults and error conditions

### Communication Protocols
- **REST API**: Get machine data and send control commands
- **WebSocket**: Real-time streaming data updates every second
- **CORS enabled**: Ready for mobile app development

### Realistic Machine Behavior
Based on Haas VF-2 specifications:
- Max spindle speed: 8,100 RPM
- Max spindle load: 100%
- Axis travel: X=30", Y=16", Z=20"
- 24 tool positions
- Operating temperatures and pressures
- Wear and maintenance tracking

## Installation

```bash
cd backend
npm install
npm start
```

The simulator will start on `http://localhost:3000`

## API Endpoints

### Machine Status
```bash
GET /api/status
# Returns complete machine state including all sensors and alerts
```

### Machine Information
```bash
GET /api/info
# Returns model, serial number, and specifications
```

### Component Data
```bash
GET /api/spindle       # Spindle speed, load, temperature
GET /api/axes          # X, Y, Z axis positions and loads
GET /api/tools         # Tool magazine status and wear data
GET /api/alarms        # Current alarms and maintenance alerts
GET /api/maintenance   # Maintenance schedule and history
```

### Control Commands
```bash
POST /api/control/start
Body: { "programName": "O1234" }

POST /api/control/stop
POST /api/control/clear-alarms
POST /api/control/emergency-stop
POST /api/control/reset
```

## WebSocket Connection

Connect to `ws://localhost:3000` for real-time updates.

### Message Types

**Server sends:**
```json
{
  "type": "UPDATE",
  "data": {
    "model": "VF-2",
    "status": "RUNNING",
    "data": { /* complete machine data */ }
  }
}
```

**Client sends commands:**
```json
{
  "type": "START_PROGRAM",
  "programName": "O1234"
}
```

**Available commands:**
- `START_PROGRAM`
- `STOP_PROGRAM`
- `CLEAR_ALARMS`
- `EMERGENCY_STOP`
- `RESET`
- `GET_DATA`

## Machine States

- `RUNNING`: Machine is actively running a program
- `IDLE`: Machine is powered on but not running
- `ALARM`: Machine has encountered an error
- `EMERGENCY_STOP`: E-stop has been activated
- `MAINTENANCE`: Machine is in maintenance mode

## Simulated Alarms & Alerts

### Critical Alarms (Machine stops)
- Code 401: Spindle Overload
- Code 501: Servo Error - X Axis
- Code 502: Servo Error - Y Axis
- Code 201: Limit Switch Triggered

### Warning Alerts
- Code 301: Tool Change Fault
- Code A001: Low Coolant Level
- Code A002: High Spindle Temperature
- Code A003: Critical Tool Wear

### Maintenance Alerts
- M001: Lubrication Required (every 7 days)
- M002: Coolant Change Required (every 90 days)
- M003: Inspection Due (every 30 days)

## Example Usage

### Using curl

```bash
# Get current status
curl http://localhost:3000/api/status

# Start a program
curl -X POST http://localhost:3000/api/control/start \
  -H "Content-Type: application/json" \
  -d '{"programName": "O2025"}'

# Get alarms
curl http://localhost:3000/api/alarms
```

### Using JavaScript (React Native)

```javascript
// REST API
const response = await fetch('http://localhost:3000/api/status');
const machineData = await response.json();

// WebSocket
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'UPDATE') {
    console.log('Machine data:', message.data);
  }
};

// Send command
ws.send(JSON.stringify({
  type: 'START_PROGRAM',
  programName: 'O1234'
}));
```

## Testing the Simulator

1. Start the server: `npm start`
2. Open browser: `http://localhost:3000`
3. View API documentation and available endpoints
4. Test with tools like Postman or curl
5. Connect your React Native app

## Data Structure

The simulator provides realistic data for:

**Spindle:**
- Current RPM (0-8100)
- Load percentage (0-100%)
- Temperature (70-180°F)
- Operating hours
- Commanded speed

**Axes (X, Y, Z):**
- Current position (inches)
- Load percentage
- Temperature (°F)

**Tools:**
- 24 tool positions
- Tool number and description
- Current life percentage
- Max life threshold
- Diameter
- In-use status

**Coolant System:**
- Level percentage
- Pressure (PSI)
- Temperature (°F)

**Hydraulic System:**
- Pressure (PSI)
- Temperature (°F)

**Production:**
- Current program name
- Cycle time
- Parts count
- Power-on time

## Next Steps

1. ✅ Backend simulator is ready
2. 🔄 Build React Native mobile app
3. 🔄 Connect app to simulator
4. 🔄 Test diagnostic features
5. 🔄 Deploy to real Haas machines when ready

## Notes

- The simulator updates machine data every second
- Random alarms occur with 0.1% probability per tick
- Maintenance alerts are based on realistic service intervals
- All data is simulated but follows real Haas VF-2 specifications
- Ready to swap with real machine connection when testing on physical hardware

## Support

For questions about Haas machines:
- Haas Operator Manuals: https://www.haascnc.com/service/manuals.html
- Haas Technical Support: https://www.haascnc.com/support.html

---
Created for diagnostic app development by Kevin @ LJ Services Group
