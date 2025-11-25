// Haas Machine Data Models
// Based on Haas VF-2 specifications and common CNC machine parameters

class HaasMachine {
  constructor(model = 'VF-2') {
    this.model = model;
    this.serialNumber = this.generateSerialNumber();
    this.status = 'RUNNING'; // RUNNING, IDLE, ALARM, EMERGENCY_STOP, MAINTENANCE
    
    // Machine specifications
    this.specs = {
      maxSpindleSpeed: 8100, // RPM
      maxSpindleLoad: 100, // Percentage
      maxFeedRate: 1000, // inches per minute
      toolCapacity: 24, // Number of tools
      maxAxisTravel: {
        x: 30, // inches
        y: 16, // inches
        z: 20  // inches
      }
    };
    
    // Real-time machine data
    this.data = {
      spindle: {
        speed: 0, // Current RPM
        load: 0, // Percentage
        temperature: 72, // Fahrenheit
        hours: 1247, // Operating hours
        commanded: 0 // Commanded speed
      },
      axes: {
        x: { position: 0, load: 0, temperature: 70 },
        y: { position: 0, load: 0, temperature: 70 },
        z: { position: 0, load: 0, temperature: 70 }
      },
      feedRate: {
        current: 0,
        override: 100 // Percentage
      },
      coolant: {
        level: 95, // Percentage
        pressure: 850, // PSI
        temperature: 68 // Fahrenheit
      },
      hydraulic: {
        pressure: 580, // PSI
        temperature: 110 // Fahrenheit
      },
      currentTool: 1,
      toolLife: [], // Array of tool wear data
      programRunning: null,
      cycleTime: 0,
      partsCount: 0,
      powerOnTime: 0,
      alarms: [],
      maintenanceAlerts: []
    };
    
    // Initialize tool life data
    this.initializeTools();
    
    // Maintenance tracking
    this.maintenance = {
      lastLubrication: Date.now() - (1000 * 60 * 60 * 24 * 5), // 5 days ago
      lastInspection: Date.now() - (1000 * 60 * 60 * 24 * 30), // 30 days ago
      coolantLastChanged: Date.now() - (1000 * 60 * 60 * 24 * 60), // 60 days ago
      spindleBearingsLastChanged: Date.now() - (1000 * 60 * 60 * 24 * 180) // 180 days ago
    };
  }
  
  generateSerialNumber() {
    const year = '2022';
    const model = '3098';
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}${model}${sequence}`;
  }
  
  initializeTools() {
    for (let i = 1; i <= this.specs.toolCapacity; i++) {
      this.data.toolLife.push({
        toolNumber: i,
        description: i <= 10 ? `Tool ${i}` : 'Empty',
        currentLife: i <= 10 ? Math.floor(Math.random() * 100) : 0,
        maxLife: 100,
        diameter: i <= 10 ? (0.25 + Math.random() * 0.75).toFixed(3) : 0,
        inUse: i <= 10
      });
    }
  }
  
  // Simulate machine operation
  simulate() {
    if (this.status === 'RUNNING') {
      this.simulateRunning();
    } else if (this.status === 'IDLE') {
      this.simulateIdle();
    }
    
    // Check for maintenance needs
    this.checkMaintenance();
    
    // Random chance of issues
    this.simulateRandomIssues();
  }
  
  simulateRunning() {
    // Spindle simulation
    this.data.spindle.speed = this.data.spindle.commanded || 
      3000 + Math.random() * 2000;
    this.data.spindle.load = 30 + Math.random() * 40;
    this.data.spindle.temperature = 120 + Math.random() * 30;
    
    // Axes simulation
    ['x', 'y', 'z'].forEach(axis => {
      this.data.axes[axis].load = 20 + Math.random() * 30;
      this.data.axes[axis].temperature = 85 + Math.random() * 15;
      // Simulate movement
      const maxTravel = this.specs.maxAxisTravel[axis];
      this.data.axes[axis].position = Math.random() * maxTravel;
    });
    
    // Feed rate
    this.data.feedRate.current = 100 + Math.random() * 300;
    
    // Coolant consumption
    this.data.coolant.level = Math.max(0, this.data.coolant.level - 0.001);
    
    // Tool wear
    if (this.data.currentTool > 0 && this.data.currentTool <= 10) {
      const tool = this.data.toolLife[this.data.currentTool - 1];
      tool.currentLife = Math.max(0, tool.currentLife - 0.01);
    }
    
    // Increment times
    this.data.cycleTime += 1;
    this.data.powerOnTime += 1;
  }
  
  simulateIdle() {
    this.data.spindle.speed = 0;
    this.data.spindle.load = 0;
    this.data.spindle.temperature = Math.max(72, this.data.spindle.temperature - 0.5);
    
    ['x', 'y', 'z'].forEach(axis => {
      this.data.axes[axis].load = 0;
      this.data.axes[axis].temperature = Math.max(70, this.data.axes[axis].temperature - 0.3);
    });
    
    this.data.feedRate.current = 0;
    this.data.powerOnTime += 1;
  }
  
  checkMaintenance() {
    const now = Date.now();
    const alerts = [];
    
    // Lubrication check (every 7 days)
    const daysSinceLube = (now - this.maintenance.lastLubrication) / (1000 * 60 * 60 * 24);
    if (daysSinceLube > 7) {
      alerts.push({
        type: 'MAINTENANCE',
        severity: 'WARNING',
        code: 'M001',
        message: 'Lubrication required - overdue by ' + Math.floor(daysSinceLube - 7) + ' days',
        component: 'Lubrication System'
      });
    }
    
    // Coolant change (every 90 days)
    const daysSinceCoolant = (now - this.maintenance.coolantLastChanged) / (1000 * 60 * 60 * 24);
    if (daysSinceCoolant > 90) {
      alerts.push({
        type: 'MAINTENANCE',
        severity: 'WARNING',
        code: 'M002',
        message: 'Coolant change required',
        component: 'Coolant System'
      });
    }
    
    // Low coolant
    if (this.data.coolant.level < 20) {
      alerts.push({
        type: 'ALERT',
        severity: 'WARNING',
        code: 'A001',
        message: 'Low coolant level: ' + this.data.coolant.level.toFixed(1) + '%',
        component: 'Coolant System'
      });
    }
    
    // High spindle temperature
    if (this.data.spindle.temperature > 160) {
      alerts.push({
        type: 'ALERT',
        severity: 'CRITICAL',
        code: 'A002',
        message: 'Spindle temperature critical: ' + this.data.spindle.temperature.toFixed(1) + '°F',
        component: 'Spindle'
      });
    }
    
    // Tool wear
    this.data.toolLife.forEach(tool => {
      if (tool.inUse && tool.currentLife < 10) {
        alerts.push({
          type: 'ALERT',
          severity: 'WARNING',
          code: 'A003',
          message: `Tool ${tool.toolNumber} critically worn: ${tool.currentLife.toFixed(1)}% life remaining`,
          component: 'Tool Magazine'
        });
      }
    });
    
    this.data.maintenanceAlerts = alerts;
  }
  
  simulateRandomIssues() {
    // 0.1% chance of generating an alarm per simulation tick
    if (Math.random() < 0.001 && this.data.alarms.length === 0) {
      const alarms = [
        { code: 401, message: 'SPINDLE OVERLOAD', severity: 'CRITICAL' },
        { code: 501, message: 'SERVO ERROR - X AXIS', severity: 'CRITICAL' },
        { code: 502, message: 'SERVO ERROR - Y AXIS', severity: 'CRITICAL' },
        { code: 301, message: 'TOOL CHANGE FAULT', severity: 'WARNING' },
        { code: 201, message: 'LIMIT SWITCH TRIGGERED', severity: 'CRITICAL' }
      ];
      
      const alarm = alarms[Math.floor(Math.random() * alarms.length)];
      this.data.alarms.push({
        ...alarm,
        timestamp: Date.now()
      });
      
      if (alarm.severity === 'CRITICAL') {
        this.status = 'ALARM';
      }
    }
  }
  
  // Control methods
  startProgram(programName) {
    if (this.status === 'IDLE' || this.status === 'RUNNING') {
      this.status = 'RUNNING';
      this.data.programRunning = programName;
      this.data.cycleTime = 0;
      return { success: true, message: 'Program started' };
    }
    return { success: false, message: 'Cannot start program - machine in ' + this.status };
  }
  
  stopProgram() {
    this.status = 'IDLE';
    this.data.programRunning = null;
    this.data.partsCount++;
    return { success: true, message: 'Program stopped' };
  }
  
  clearAlarms() {
    this.data.alarms = [];
    if (this.status === 'ALARM') {
      this.status = 'IDLE';
    }
    return { success: true, message: 'Alarms cleared' };
  }
  
  emergencyStop() {
    this.status = 'EMERGENCY_STOP';
    this.data.spindle.speed = 0;
    this.data.spindle.commanded = 0;
    return { success: true, message: 'Emergency stop activated' };
  }
  
  reset() {
    if (this.status === 'EMERGENCY_STOP') {
      this.status = 'IDLE';
      return { success: true, message: 'Machine reset' };
    }
    return { success: false, message: 'Can only reset from emergency stop' };
  }
  
  getMachineData() {
    return {
      model: this.model,
      serialNumber: this.serialNumber,
      status: this.status,
      timestamp: Date.now(),
      data: this.data,
      specs: this.specs,
      maintenance: this.maintenance
    };
  }
}

module.exports = HaasMachine;
