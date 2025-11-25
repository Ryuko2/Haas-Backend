const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const HaasMachine = require('./haasMachine');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Haas machine simulator
const haasMachine = new HaasMachine('VF-2');

// Start simulation loop (updates every second)
setInterval(() => {
  haasMachine.simulate();
  
  // Broadcast updates to all connected WebSocket clients
  const machineData = haasMachine.getMachineData();
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'UPDATE',
        data: machineData
      }));
    }
  });
}, 1000);

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  
  // Send initial machine data
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    data: haasMachine.getMachineData()
  }));
  
  ws.on('message', (message) => {
    try {
      const command = JSON.parse(message);
      handleCommand(command, ws);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid command format'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Handle commands from clients
function handleCommand(command, ws) {
  let response;
  
  switch (command.type) {
    case 'START_PROGRAM':
      response = haasMachine.startProgram(command.programName || 'O1234');
      break;
    case 'STOP_PROGRAM':
      response = haasMachine.stopProgram();
      break;
    case 'CLEAR_ALARMS':
      response = haasMachine.clearAlarms();
      break;
    case 'EMERGENCY_STOP':
      response = haasMachine.emergencyStop();
      break;
    case 'RESET':
      response = haasMachine.reset();
      break;
    case 'GET_DATA':
      response = { success: true, data: haasMachine.getMachineData() };
      break;
    default:
      response = { success: false, message: 'Unknown command' };
  }
  
  ws.send(JSON.stringify({
    type: 'COMMAND_RESPONSE',
    command: command.type,
    response: response
  }));
}

// REST API Endpoints

// Get current machine status
app.get('/api/status', (req, res) => {
  res.json(haasMachine.getMachineData());
});

// Get machine info
app.get('/api/info', (req, res) => {
  res.json({
    model: haasMachine.model,
    serialNumber: haasMachine.serialNumber,
    specs: haasMachine.specs
  });
});

// Get alarms
app.get('/api/alarms', (req, res) => {
  res.json({
    alarms: haasMachine.data.alarms,
    maintenanceAlerts: haasMachine.data.maintenanceAlerts
  });
});

// Get spindle data
app.get('/api/spindle', (req, res) => {
  res.json(haasMachine.data.spindle);
});

// Get axes data
app.get('/api/axes', (req, res) => {
  res.json(haasMachine.data.axes);
});

// Get tool data
app.get('/api/tools', (req, res) => {
  res.json({
    currentTool: haasMachine.data.currentTool,
    tools: haasMachine.data.toolLife
  });
});

// Get maintenance info
app.get('/api/maintenance', (req, res) => {
  res.json({
    maintenance: haasMachine.maintenance,
    alerts: haasMachine.data.maintenanceAlerts
  });
});

// Control endpoints
app.post('/api/control/start', (req, res) => {
  const { programName } = req.body;
  const result = haasMachine.startProgram(programName);
  res.json(result);
});

app.post('/api/control/stop', (req, res) => {
  const result = haasMachine.stopProgram();
  res.json(result);
});

app.post('/api/control/clear-alarms', (req, res) => {
  const result = haasMachine.clearAlarms();
  res.json(result);
});

app.post('/api/control/emergency-stop', (req, res) => {
  const result = haasMachine.emergencyStop();
  res.json(result);
});

app.post('/api/control/reset', (req, res) => {
  const result = haasMachine.reset();
  res.json(result);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', simulator: 'Haas VF-2 Mock Machine' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Haas Machine Simulator API',
    version: '1.0.0',
    endpoints: {
      status: '/api/status',
      info: '/api/info',
      alarms: '/api/alarms',
      spindle: '/api/spindle',
      axes: '/api/axes',
      tools: '/api/tools',
      maintenance: '/api/maintenance',
      control: {
        start: 'POST /api/control/start',
        stop: 'POST /api/control/stop',
        clearAlarms: 'POST /api/control/clear-alarms',
        emergencyStop: 'POST /api/control/emergency-stop',
        reset: 'POST /api/control/reset'
      }
    },
    websocket: 'ws://localhost:3000'
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🏭 Haas Machine Simulator running on port ${PORT}`);
  console.log(`📊 REST API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`\nMachine Details:`);
  console.log(`Model: ${haasMachine.model}`);
  console.log(`Serial: ${haasMachine.serialNumber}`);
  console.log(`Status: ${haasMachine.status}`);
});
