// HaasMachine.js
// Full machine simulation class and direct CommonJS export.

// =========================================================
// ===============   H A A S   M A C H I N E   =============
// =========================================================

class HaasMachine {
  constructor(id, name, type) {
    this.id = id;
    this.name = name;
    this.type = type; // CNC, LATHE, PRESS_BRAKE, LASER

    // Main State
    this.power = true;
    this.execution = 'IDLE';
    this.spindleSpeed = 0;
    this.spindleLoad = 0.0;
    this.feedRate = 0;
    this.partCount = 0;
    this.axisPositions = { X: 0.0, Y: 0.0, Z: 0.0 };
    this.alarm = null;

    // Accumulated metrics
    this.machineOnHours = 0.0;
    this.spindleHours = 0.0;
    this.totalCycles = 0;

    // Temperature
    this.temperature = 72;

    // Tools (only for CNC / LATHE)
    if (type === 'CNC' || type === 'LATHE') {
      this.currentTool = 1;
      this.tools = this._initializeTools();
    }

    // Coolant (only CNC / LATHE)
    if (type === 'CNC' || type === 'LATHE') {
      this.coolant = {
        level: 100,
        pressure: 50,
        temperature: 72
      };
    }

    // Materials
    this.material = null;
    this.programRunning = null;
  }

  // ---- Tool initialization ----
  _initializeTools() {
    const tools = [];
    const toolCount = this.type === 'CNC' ? 24 : 12;
    const toolTypes = ['DRILL', 'END_MILL', 'FACE_MILL', 'REAMER', 'TAP', 'BORING_BAR'];

    for (let i = 1; i <= toolCount; i++) {
      tools.push({
        number: i,
        type: toolTypes[Math.floor(Math.random() * toolTypes.length)],
        diameter: (Math.random() * 20 + 2).toFixed(2),
        length: (Math.random() * 100 + 50).toFixed(2),
        currentLife: 100 - Math.random() * 80,
        maxLife: 100,
        description: `Tool ${i}`,
        inUse: false
      });
    }
    return tools;
  }

  // ---- JSON output ----
  toJSON() {
    const data = {
      id: this.id,
      name: this.name,
      type: this.type,
      power: this.power,
      execution: this.execution,
      spindleSpeed: this.spindleSpeed,
      spindleLoad: this.spindleLoad,
      feedRate: this.feedRate,
      partCount: this.partCount,
      axisPositions: this.axisPositions,
      alarm: this.alarm,
      machineOnHours: parseFloat(this.machineOnHours.toFixed(3)),
      spindleHours: parseFloat(this.spindleHours.toFixed(3)),
      totalCycles: this.totalCycles,
      temperature: Math.round(this.temperature),
      timestamp: new Date().toISOString()
    };

    if (this.type === 'CNC' || this.type === 'LATHE') {
      data.currentTool = this.currentTool;
      data.tools = this.tools;
      data.coolant = this.coolant;
    }

    if (this.material) data.material = this.material;
    if (this.programRunning) data.programRunning = this.programRunning;

    return data;
  }

  // ---- Machine update loop ----
  update(dtSec) {
    if (!this.power) {
      this.execution = 'STOPPED';
      this.spindleSpeed = 0;
      this.spindleLoad = 0.0;
      this.feedRate = 0;
      this.alarm = null;
      return;
    }

    this.machineOnHours += dtSec / 3600.0;

    if (this.alarm) {
      this.execution = 'ALARM';
      this.spindleSpeed = 0;
      this.spindleLoad = 0;
      this.feedRate = 0;

      if (Math.random() < 0.01) {
        this.alarm = null;
        this.execution = 'IDLE';
      }
      return;
    }

    let runProbability = 0.6;
    if (this.type === 'LASER') runProbability = 0.7;
    else if (this.type === 'PRESS_BRAKE') runProbability = 0.5;

    // Running cycle
    if (Math.random() < runProbability) {
      this.execution = 'RUNNING';

      if (this.type === 'CNC' || this.type === 'LATHE') {
        this._updateCNCCycle(dtSec);
      }
      else if (this.type === 'PRESS_BRAKE') {
        this._updatePressBrakeCycle();
      }
      else if (this.type === 'LASER') {
        this._updateLaserCycle();
      }

      this.temperature = Math.min(120, this.temperature + Math.random() * 0.5);

      if (Math.random() < 0.1) {
        this.partCount++;
        this.totalCycles++;
      }

      this._checkAlarms();
    }

    // Idle
    else {
      this.execution = 'IDLE';
      this.spindleSpeed = 0;
      this.spindleLoad = 0;
      this.feedRate = 0;
      this.temperature = Math.max(72, this.temperature - Math.random() * 0.3);

      this.axisPositions.X += Math.random() * 0.02 - 0.01;
      this.axisPositions.Y += Math.random() * 0.02 - 0.01;
      this.axisPositions.Z += Math.random() * 0.02 - 0.01;

      if (this.coolant) {
        this.coolant.level = Math.min(100, this.coolant.level + 0.1);
      }
    }
  }

  // ---- CNC Cycle ----
  _updateCNCCycle(dtSec) {
    this.spindleSpeed = Math.floor(Math.random() * (12000 - 1500) + 1500);
    this.spindleLoad = parseFloat((Math.random() * 80 + 10).toFixed(1));
    this.feedRate = Math.floor(Math.random() * (3000 - 200) + 200);

    this.axisPositions.X += Math.random() - 0.5;
    this.axisPositions.Y += Math.random() - 0.5;
    this.axisPositions.Z += Math.random() * 0.4 - 0.2;

    this.spindleHours += dtSec / 3600.0;

    const T = this.tools[this.currentTool - 1];
    if (T && this.spindleSpeed > 0) {
      T.currentLife = Math.max(0, T.currentLife - Math.random() * 0.01);
      T.inUse = true;
    }

    if (this.coolant) {
      this.coolant.level = Math.max(0, this.coolant.level - Math.random() * 0.05);
      this.coolant.pressure = 50 + Math.random() * 20 - 10;
      this.coolant.temperature = 72 + Math.random() * 15;
    }

    if (!this.programRunning && Math.random() < 0.1) {
      this.programRunning = `O${Math.floor(Math.random() * 9000 + 1000)}`;
    }
  }

  // ---- Press Brake ----
  _updatePressBrakeCycle() {
    this.spindleSpeed = 0;
    this.spindleLoad = parseFloat((Math.random() * 75 + 20).toFixed(1));
    this.feedRate = Math.floor(Math.random() * 60 + 20);
    this.axisPositions.Y += Math.random() * 2 - 1;
  }

  // ---- Laser ----
  _updateLaserCycle() {
    this.spindleSpeed = 0;
    this.spindleLoad = parseFloat((Math.random() * 70 + 30).toFixed(1));
    this.feedRate = Math.floor(Math.random() * 5500 + 500);
    this.axisPositions.X += Math.random() * 10 - 5;
    this.axisPositions.Y += Math.random() * 10 - 5;
  }

  // ---- Alarm logic ----
  _checkAlarms() {
    if (this.type === 'CNC' || this.type === 'LATHE') {
      if (this.spindleLoad > 85 && Math.random() < 0.05) this.alarm = 'SPINDLE_OVERLOAD';
      else if (Math.random() < 0.02) this.alarm = 'AXIS_FOLLOWING_ERROR';
      else if (this.coolant && this.coolant.level < 10 && Math.random() < 0.1) this.alarm = 'LOW_COOLANT';
      else if (this.temperature > 110 && Math.random() < 0.1) this.alarm = 'HIGH_TEMPERATURE';
      else {
        const T = this.tools[this.currentTool - 1];
        if (T && T.currentLife < 5 && Math.random() < 0.15) {
          this.alarm = 'TOOL_LIFE_EXPIRED';
        }
      }
    }

    if (this.type === 'PRESS_BRAKE' && this.spindleLoad > 90 && Math.random() < 0.1) {
      this.alarm = 'OVER_TONNAGE';
    }

    if (this.type === 'LASER' && this.spindleLoad > 95 && Math.random() < 0.1) {
      this.alarm = 'LASER_POWER_FAULT';
    }
  }

  injectAlarm(code) {
    this.alarm = code;
    this.execution = 'ALARM';
  }

  clearAlarm() {
    this.alarm = null;
    this.execution = 'IDLE';
  }
}

// ---- Export the class directly ----
module.exports = HaasMachine;
