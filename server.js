const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const MachineState = require('./MachineState');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Definición de planta (múltiples máquinas)
const machines = {
  haas_vf2: new MachineState('haas_vf2', 'Haas VF-2', 'CNC'),
  toyoda_hmc: new MachineState('toyoda_hmc', 'Toyoda HMC', 'CNC'),
  durma_press: new MachineState('durma_press', 'Durma Press Brake', 'PRESS_BRAKE'),
  cnc_lathe: new MachineState('cnc_lathe', 'CNC Lathe', 'LATHE'),
  fiber_laser: new MachineState('fiber_laser', 'Fiber Laser', 'LASER'),
};

// Set some initial states for variety
machines.haas_vf2.material = 'Aluminum 6061';
machines.haas_vf2.programRunning = 'O1234';
machines.toyoda_hmc.material = 'Steel 4140';
machines.cnc_lathe.material = 'Brass C360';

const SIM_UPDATE_PERIOD_MS = 1000; // 1 segundo

// Simulación continua
setInterval(() => {
  const dtSec = SIM_UPDATE_PERIOD_MS / 1000.0;
  
  Object.values(machines).forEach(machine => {
    machine.update(dtSec);
  });

  // Broadcast updates a WebSocket clients
  const plantData = {
    type: 'PLANT_UPDATE',
    timestamp: new Date().toISOString(),
    machines: Object.values(machines).map(m => m.toJSON())
  };

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(plantData));
    }
  });
}, SIM_UPDATE_PERIOD_MS);

// ==================== API Routes ====================

// Root - API Info
app.get('/', (req, res) => {
  res.json({
    name: 'Multi-Machine CNC Simulator API',
    version: '2.0.0',
    endpoints: {
      machines: {
        'GET /api/machines': 'List all machines',
        'GET /api/machines/:id': 'Get specific machine data',
        'POST /api/machines/:id/power': 'Toggle machine power',
        'POST /api/machines/:id/alarm': 'Inject alarm',
        'DELETE /api/machines/:id/alarm': 'Clear alarm'
      },
      plant: {
        'GET /api/plant/status': 'Overall plant status',
        'GET /api/plant/alarms': 'Active alarms across all machines',
        'GET /api/plant/production': 'Production summary'
      },
      legacy: {
        'GET /api/status': 'Legacy endpoint (Haas VF-2 only)',
        'GET /api/tools': 'Legacy tools endpoint (Haas VF-2 only)'
      }
    },
    websocket: 'ws://[host]/ws for real-time updates'
  });
});

// List all machines
app.get('/api/machines', (req, res) => {
  const machineList = Object.values(machines).map(m => m.toJSON());
  res.json(machineList);
});

// Get specific machine
app.get('/api/machines/:id', (req, res) => {
  const machine = machines[req.params.id];
  if (!machine) {
    return res.status(404).json({ error: 'Machine not found' });
  }
  res.json(machine.toJSON());
});

// Toggle machine power
app.post('/api/machines/:id/power', (req, res) => {
  const machine = machines[req.params.id];
  if (!machine) {
    return res.status(404).json({ error: 'Machine not found' });
  }
  
  const { power } = req.body;
  if (typeof power === 'boolean') {
    machine.power = power;
  } else {
    machine.power = !machine.power;
  }
  
  res.json({
    id: machine.id,
    name: machine.name,
    power: machine.power
  });
});

// Inject alarm
app.post('/api/machines/:id/alarm', (req, res) => {
  const machine = machines[req.params.id];
  if (!machine) {
    return res.status(404).json({ error: 'Machine not found' });
  }
  
  const { alarm } = req.body;
  machine.injectAlarm(alarm || 'TEST_ALARM');
  
  res.json({
    id: machine.id,
    name: machine.name,
    alarm: machine.alarm,
    execution: machine.execution
  });
});

// Clear alarm
app.delete('/api/machines/:id/alarm', (req, res) => {
  const machine = machines[req.params.id];
  if (!machine) {
    return res.status(404).json({ error: 'Machine not found' });
  }
  
  machine.clearAlarm();
  
  res.json({
    id: machine.id,
    name: machine.name,
    alarm: machine.alarm,
    execution: machine.execution
  });
});

// Plant status overview
app.get('/api/plant/status', (req, res) => {
  const machineList = Object.values(machines);
  
  const status = {
    totalMachines: machineList.length,
    running: machineList.filter(m => m.execution === 'RUNNING').length,
    idle: machineList.filter(m => m.execution === 'IDLE').length,
    alarm: machineList.filter(m => m.execution === 'ALARM').length,
    stopped: machineList.filter(m => m.execution === 'STOPPED').length,
    totalPartCount: machineList.reduce((sum, m) => sum + m.partCount, 0),
    totalMachineHours: machineList.reduce((sum, m) => sum + m.machineOnHours, 0),
    totalCycles: machineList.reduce((sum, m) => sum + m.totalCycles, 0),
    timestamp: new Date().toISOString()
  };
  
  res.json(status);
});

// Active alarms
app.get('/api/plant/alarms', (req, res) => {
  const alarms = Object.values(machines)
    .filter(m => m.alarm)
    .map(m => ({
      machineId: m.id,
      machineName: m.name,
      machineType: m.type,
      alarm: m.alarm,
      execution: m.execution,
      timestamp: new Date().toISOString()
    }));
  
  res.json(alarms);
});

// Production summary
app.get('/api/plant/production', (req, res) => {
  const production = Object.values(machines).map(m => ({
    id: m.id,
    name: m.name,
    type: m.type,
    partCount: m.partCount,
    totalCycles: m.totalCycles,
    machineOnHours: parseFloat(m.machineOnHours.toFixed(2)),
    spindleHours: parseFloat((m.spindleHours || 0).toFixed(2)),
    execution: m.execution
  }));
  
  res.json(production);
});

// ==================== Legacy Endpoints (Backward Compatibility) ====================

// Legacy status endpoint (Haas VF-2 only)
app.get('/api/status', (req, res) => {
  const haas = machines.haas_vf2;
  
  const legacyData = {
    status: haas.execution,
    model: haas.name,
    serialNumber: `${new Date().getFullYear()}${Math.floor(Math.random() * 100000000)}`,
    data: {
      spindle: {
        speed: haas.spindleSpeed,
        load: haas.spindleLoad,
        temperature: haas.temperature
      },
      axes: {
        x: {
          position: parseFloat(haas.axisPositions.X.toFixed(4)),
          load: parseFloat((Math.random() * 30 + 10).toFixed(1)),
          temperature: haas.temperature - 5
        },
        y: {
          position: parseFloat(haas.axisPositions.Y.toFixed(4)),
          load: parseFloat((Math.random() * 30 + 10).toFixed(1)),
          temperature: haas.temperature - 5
        },
        z: {
          position: parseFloat(haas.axisPositions.Z.toFixed(4)),
          load: parseFloat((Math.random() * 30 + 10).toFixed(1)),
          temperature: haas.temperature - 5
        }
      },
      feedRate: {
        current: haas.feedRate,
        override: 100
      },
      partsCount: haas.partCount,
      cycleTime: Math.floor(haas.totalCycles * 120),
      powerOnTime: Math.floor(haas.machineOnHours * 3600),
      currentTool: haas.currentTool || 1,
      toolLife: haas.tools || [],
      coolant: haas.coolant || { level: 100, pressure: 50, temperature: 72 },
      alarms: haas.alarm ? [{
        code: haas.alarm,
        message: haas.alarm.replace(/_/g, ' '),
        severity: 'CRITICAL',
        timestamp: new Date().toISOString()
      }] : [],
      programRunning: haas.programRunning,
      hydraulics: {
        pressure: 800 + Math.random() * 200,
        temperature: haas.temperature
      }
    }
  };
  
  res.json(legacyData);
});

// Legacy tools endpoint
app.get('/api/tools', (req, res) => {
  const haas = machines.haas_vf2;
  res.json(haas.tools || []);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ==================== WebSocket ====================

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket client connected');
  
  // Send initial state
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    message: 'Connected to Multi-Machine CNC Simulator',
    machines: Object.keys(machines)
  }));
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
});

// ==================== Start Server ====================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('');
  console.log('🏭 ===============================================');
  console.log('🏭 Multi-Machine CNC Simulator');
  console.log('🏭 ===============================================');
  console.log('');
  console.log(`📊 REST API: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log('');
  console.log('📋 Available Machines:');
  Object.values(machines).forEach(m => {
    console.log(`   - ${m.name} (${m.id}) - ${m.type}`);
  });
  console.log('');
  console.log('🔗 Endpoints:');
  console.log(`   - GET  http://localhost:${PORT}/api/machines`);
  console.log(`   - GET  http://localhost:${PORT}/api/plant/status`);
  console.log(`   - GET  http://localhost:${PORT}/api/plant/alarms`);
  console.log('');
  console.log('🎯 Legacy Endpoints (backward compatible):');
  console.log(`   - GET  http://localhost:${PORT}/api/status`);
  console.log(`   - GET  http://localhost:${PORT}/api/tools`);
  console.log('');
  console.log('✅ Server running!');
  console.log('');
});
