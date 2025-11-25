// HaasMachine.js - Enhanced Version
// Adds realistic G-code cycle simulation inspired by Python version
// 100% compatible with existing API - just replace the file!

// =========================================================
// ===============   H A A S   M A C H I N E   =============
// =========================================================

class HaasMachine {
  constructor(id, name, type, axisLimits = null) {
    this.id = id;
    this.name = name;
    this.type = type; // CNC, LATHE, PRESS_BRAKE, LASER

    // Main State
    this.power = true;
    this.execution = 'IDLE';
    
    // NEW: Detailed cycle phase (realistic G-code simulation)
    this.cyclePhase = 'IDLE'; // IDLE, SPINDLE_RAMP, RAPID, CUTTING, RETRACT, DWELL, FINISH
    this.timeInPhase = 0.0;
    this.cycleTimeTarget = 20 + Math.random() * 25; // 20-45 seconds
    
    this.spindleSpeed = 0;
    this.targetSpindleSpeed = 0;
    this.spindleLoad = 0.0;
    this.feedRate = 0;
    this.targetFeed = 0;
    this.partCount = 0;
    
    // Axis limits and positions
    this.axisLimits = axisLimits || this._getDefaultAxisLimits(type);
    
    this.axisPositions = {
      X: (this.axisLimits.X[0] + this.axisLimits.X[1]) / 2,
      Y: (this.axisLimits.Y[0] + this.axisLimits.Y[1]) / 2,
      Z: this.axisLimits.Z[1] // Z high (safe position)
    };
    
    this.alarm = null;

    // Accumulated metrics
    this.machineOnHours = 0.0;
    this.spindleHours = 0.0;
    this.totalCycles = 0;

    // Temperature
    this.temperature = 72;

    // NEW: Health sensors (realistic wear simulation)
    this.toolWear = 0.0; // 0-1 scale
    this.vibration = 0.0;
    this.currentAmps = 7.0;

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

  // ---- Default axis limits by machine type ----
  _getDefaultAxisLimits(type) {
    const limits = {
      'CNC': { X: [0, 762], Y: [0, 406], Z: [0, 508] },
      'LATHE': { X: [0, 300], Y: [0, 200], Z: [0, 500] },
      'PRESS_BRAKE': { X: [0, 100], Y: [0, 2000], Z: [0, 300] },
      'LASER': { X: [0, 1500], Y: [0, 3000], Z: [0, 100] }
    };
    return limits[type] || limits['CNC'];
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

  // ---- JSON output (compatible with existing API) ----
  toJSON() {
    const data = {
      id: this.id,
      name: this.name,
      type: this.type,
      power: this.power,
      execution: this.execution,
      cyclePhase: this.cyclePhase, // NEW
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
      vibration: parseFloat(this.vibration.toFixed(2)), // NEW
      currentAmps: parseFloat(this.currentAmps.toFixed(2)), // NEW
      timestamp: new Date().toISOString()
    };

    if (this.type === 'CNC' || this.type === 'LATHE') {
      data.currentTool = this.currentTool;
      data.tools = this.tools;
      data.coolant = this.coolant;
      data.toolWear = parseFloat(this.toolWear.toFixed(3)); // NEW
    }

    if (this.material) data.material = this.material;
    if (this.programRunning) data.programRunning = this.programRunning;

    return data;
  }

  // ---- Main update loop ----
  update(dtSec) {
    if (!this.power) {
      this.execution = 'STOPPED';
      this.cyclePhase = 'IDLE';
      this.spindleSpeed = 0;
      this.spindleLoad = 0.0;
      this.feedRate = 0;
      this.alarm = null;
      return;
    }

    this.machineOnHours += dtSec / 3600.0;
    this.timeInPhase += dtSec;

    if (this.alarm) {
      this.execution = 'ALARM';
      this.cyclePhase = 'IDLE';
      this.spindleSpeed = 0;
      this.spindleLoad = 0;
      this.feedRate = 0;

      // Random recovery from alarm (2% chance per update)
      if (Math.random() < 0.02) {
        this.alarm = null;
        this.execution = 'IDLE';
      }
      return;
    }

    // Route to appropriate cycle handler
    if (this.type === 'CNC' || this.type === 'LATHE') {
      this._updateCNCRealisticCycle(dtSec);
    } else if (this.type === 'PRESS_BRAKE') {
      this._updatePressBrakeCycle(dtSec);
    } else if (this.type === 'LASER') {
      this._updateLaserCycle(dtSec);
    }

    // Update health sensors
    this._updateHealthSensors(dtSec);
    
    // Check for alarms
    this._checkAlarms();
  }

  // =========================================================
  // ============   CNC REALISTIC CYCLE   ===================
  // =========================================================

  _updateCNCRealisticCycle(dtSec) {
    switch (this.cyclePhase) {
      case 'IDLE':
        this._phaseIdle();
        break;
      case 'SPINDLE_RAMP':
        this._phaseSpindleRamp(dtSec);
        break;
      case 'RAPID':
        this._phaseRapid();
        break;
      case 'CUTTING':
        this._phaseCutting(dtSec);
        break;
      case 'RETRACT':
        this._phaseRetract(dtSec);
        break;
      case 'DWELL':
        this._phaseDwell();
        break;
      case 'FINISH':
        this._phaseFinish();
        break;
    }
  }

  _phaseIdle() {
    this.execution = 'IDLE';
    // Natural spindle deceleration
    this.spindleSpeed = Math.max(0, this.spindleSpeed - 500 * 0.2);
    this.feedRate = Math.max(0, this.feedRate - 500 * 0.2);
    this.spindleLoad = Math.max(0, this.spindleLoad - 5);
    
    // Small axis drift
    this.axisPositions.X += Math.random() * 0.02 - 0.01;
    this.axisPositions.Y += Math.random() * 0.02 - 0.01;
    this.axisPositions.Z += Math.random() * 0.02 - 0.01;
    
    // Coolant recovery
    if (this.coolant) {
      this.coolant.level = Math.min(100, this.coolant.level + 0.1);
    }
    
    // Start new cycle (5% chance)
    if (Math.random() < 0.05) {
      this._startNewCycle();
    }
  }

  _startNewCycle() {
    this.cyclePhase = 'SPINDLE_RAMP';
    this.execution = 'RUNNING';
    this.timeInPhase = 0.0;
    this.cycleTimeTarget = 20 + Math.random() * 25;
    this.targetSpindleSpeed = 4000 + Math.random() * 5000; // 4000-9000 RPM
    this.targetFeed = 300 + Math.random() * 1500; // 300-1800 mm/min
    
    if (!this.programRunning && Math.random() < 0.8) {
      this.programRunning = `O${Math.floor(Math.random() * 9000 + 1000)}`;
    }
  }

  _phaseSpindleRamp(dtSec) {
    this.execution = 'RUNNING';
    const ramp = 350 * dtSec;
    
    if (this.spindleSpeed < this.targetSpindleSpeed) {
      this.spindleSpeed += ramp;
      if (this.spindleSpeed >= this.targetSpindleSpeed) {
        this.spindleSpeed = this.targetSpindleSpeed;
        this.cyclePhase = 'RAPID';
        this.timeInPhase = 0.0;
      }
    } else {
      this.cyclePhase = 'RAPID';
      this.timeInPhase = 0.0;
    }
    
    // Light spindle load during ramp-up
    this.spindleLoad = Math.min(20, (this.spindleSpeed / this.targetSpindleSpeed) * 15);
  }

  _phaseRapid() {
    this.execution = 'RUNNING';
    // G0: Rapid positioning to target XY, Z at clearance
    const targetX = this.axisLimits.X[0] + Math.random() * (this.axisLimits.X[1] - this.axisLimits.X[0]);
    const targetY = this.axisLimits.Y[0] + Math.random() * (this.axisLimits.Y[1] - this.axisLimits.Y[0]);
    
    this.axisPositions.X = targetX;
    this.axisPositions.Y = targetY;
    this.axisPositions.Z = this.axisLimits.Z[1]; // Z high (clearance)
    
    this.feedRate = 0;
    this.spindleLoad = 5 + Math.random() * 5;
    
    // After ~3 seconds, move to cutting
    if (this.timeInPhase >= 3.0) {
      this.cyclePhase = 'CUTTING';
      this.timeInPhase = 0.0;
    }
  }

  _phaseCutting(dtSec) {
    this.execution = 'RUNNING';
    
    // Ramp up feed rate
    const ramp = 200 * dtSec;
    if (this.feedRate < this.targetFeed) {
      this.feedRate += ramp;
      if (this.feedRate > this.targetFeed) {
        this.feedRate = this.targetFeed;
      }
    }
    
    // Z descends (cutting)
    this.axisPositions.Z -= 1.0 * dtSec * (this.feedRate / Math.max(this.targetFeed, 1));
    const minZ = this.axisLimits.Z[0];
    if (this.axisPositions.Z < minZ + 5) {
      this.axisPositions.Z = minZ + 5;
    }
    
    // Realistic spindle load calculation
    const baseLo ad = (this.feedRate / 1800.0) * 35.0;
    const wearLoad = this.toolWear * 50.0;
    const vibLoad = this.vibration * 8.0;
    const noise = Math.random() * 4.5 - 2.0;
    
    this.spindleLoad = Math.max(0, Math.min(100, baseLoad + wearLoad + vibLoad + noise));
    
    // Tool wear and vibration increase
    this.toolWear += this.spindleLoad / 250000.0;
    if (this.toolWear > 1.0) this.toolWear = 1.0;
    
    this.vibration = this.toolWear * 3.0 + Math.random() * 0.4;
    
    // Update tool life
    if (this.tools && this.currentTool) {
      const tool = this.tools[this.currentTool - 1];
      if (tool && this.spindleSpeed > 0) {
        tool.currentLife = Math.max(0, tool.currentLife - Math.random() * 0.02);
        tool.inUse = true;
      }
    }
    
    // Coolant consumption
    if (this.coolant) {
      this.coolant.level = Math.max(0, this.coolant.level - Math.random() * 0.08);
      this.coolant.pressure = 50 + Math.random() * 20 - 10;
      this.coolant.temperature = 72 + Math.random() * 15;
    }
    
    // Spindle hours accumulation
    if (this.spindleSpeed > 300) {
      this.spindleHours += dtSec / 3600.0;
    }
    
    // After 60% of cycle time, move to retract
    if (this.timeInPhase >= this.cycleTimeTarget * 0.6) {
      this.cyclePhase = 'RETRACT';
      this.timeInPhase = 0.0;
    }
  }

  _phaseRetract(dtSec) {
    this.execution = 'RUNNING';
    // Z moves up (tool retraction)
    this.axisPositions.Z += 4.0 * dtSec;
    const maxZ = this.axisLimits.Z[1];
    
    if (this.axisPositions.Z >= maxZ - 10) {
      this.axisPositions.Z = maxZ - 10;
      this.cyclePhase = 'DWELL';
      this.timeInPhase = 0.0;
    }
    
    // Spindle load decreases
    this.spindleLoad = Math.max(5, this.spindleLoad - 10 * dtSec);
  }

  _phaseDwell() {
    this.execution = 'RUNNING';
    // Short pause
    this.feedRate = 0;
    this.spindleLoad = Math.max(0, this.spindleLoad - 5 * 0.2);
    
    if (this.timeInPhase >= 2.0) {
      this.cyclePhase = 'FINISH';
      this.timeInPhase = 0.0;
    }
  }

  _phaseFinish() {
    this.execution = 'RUNNING';
    this.partCount++;
    this.totalCycles++;
    
    // Cooling
    this.spindleLoad *= 0.7;
    this.feedRate = 0;
    
    // Reset tool in-use flag
    if (this.tools && this.currentTool) {
      const tool = this.tools[this.currentTool - 1];
      if (tool) tool.inUse = false;
    }
    
    // Ready for next cycle
    this.cyclePhase = 'IDLE';
    this.timeInPhase = 0.0;
  }

  // =========================================================
  // ==========   PRESS BRAKE CYCLE   =======================
  // =========================================================

  _updatePressBrakeCycle(dtSec) {
    if (this.cyclePhase === 'IDLE' && Math.random() < 0.05) {
      this.cyclePhase = 'RUNNING';
      this.execution = 'RUNNING';
      this.timeInPhase = 0.0;
    }
    
    if (this.cyclePhase === 'RUNNING') {
      this.execution = 'RUNNING';
      this.spindleSpeed = 0;
      this.spindleLoad = 20 + Math.random() * 75;
      this.feedRate = 20 + Math.random() * 60;
      
      // Y axis (ram) movement
      this.axisPositions.Y += Math.random() * 2 - 1;
      
      // Complete cycle after 5 seconds
      if (this.timeInPhase >= 5.0) {
        this.partCount++;
        this.totalCycles++;
        this.cyclePhase = 'IDLE';
        this.execution = 'IDLE';
        this.timeInPhase = 0.0;
      }
    } else {
      this.execution = 'IDLE';
      this.spindleLoad = 0;
      this.feedRate = 0;
    }
  }

  // =========================================================
  // ===========   LASER CYCLE   ============================
  // =========================================================

  _updateLaserCycle(dtSec) {
    if (this.cyclePhase === 'IDLE' && Math.random() < 0.07) {
      this.cyclePhase = 'RUNNING';
      this.execution = 'RUNNING';
      this.timeInPhase = 0.0;
      this.targetFeed = 800 + Math.random() * 2200; // 800-3000 mm/min
    }
    
    if (this.cyclePhase === 'RUNNING') {
      this.execution = 'RUNNING';
      this.spindleSpeed = 0;
      this.spindleLoad = 30 + Math.random() * 70; // Power %
      
      // Feed ramp up
      if (this.feedRate < this.targetFeed) {
        this.feedRate += 300 * dtSec;
        if (this.feedRate > this.targetFeed) this.feedRate = this.targetFeed;
      }
      
      // XY movement (cutting path)
      this.axisPositions.X += Math.random() * 10 - 5;
      this.axisPositions.Y += Math.random() * 10 - 5;
      
      // Complete cycle after 8 seconds
      if (this.timeInPhase >= 8.0) {
        this.partCount++;
        this.totalCycles++;
        this.cyclePhase = 'IDLE';
        this.execution = 'IDLE';
        this.timeInPhase = 0.0;
        this.feedRate = 0;
      }
    } else {
      this.execution = 'IDLE';
      this.spindleLoad = 0;
      this.feedRate = 0;
    }
  }

  // =========================================================
  // ===========   HEALTH SENSORS   =========================
  // =========================================================

  _updateHealthSensors(dtSec) {
    // Temperature simulation
    if (this.execution === 'RUNNING') {
      this.temperature = Math.min(120, this.temperature + (this.spindleLoad / 100.0) * 0.3);
      this.currentAmps = 7 + (this.spindleLoad / 100.0) * 8;
    } else {
      this.temperature = Math.max(72, this.temperature - 0.2);
      this.currentAmps = Math.max(7, this.currentAmps - 0.5);
    }
  }

  // =========================================================
  // ============   ALARM LOGIC   ===========================
  // =========================================================

  _checkAlarms() {
    if (this.type === 'CNC' || this.type === 'LATHE') {
      // Spindle overload
      if (this.spindleLoad > 95 && Math.random() < 0.05) {
        this.alarm = 'SPINDLE_OVERLOAD';
      }
      // Axis following error
      else if (Math.random() < 0.01) {
        this.alarm = 'AXIS_FOLLOWING_ERROR';
      }
      // Low coolant
      else if (this.coolant && this.coolant.level < 10 && Math.random() < 0.1) {
        this.alarm = 'LOW_COOLANT';
      }
      // High temperature
      else if (this.temperature > 110 && Math.random() < 0.1) {
        this.alarm = 'HIGH_TEMPERATURE';
      }
      // Tool life expired
      else if (this.tools && this.currentTool) {
        const tool = this.tools[this.currentTool - 1];
        if (tool && tool.currentLife < 5 && Math.random() < 0.15) {
          this.alarm = 'TOOL_LIFE_EXPIRED';
        }
      }
      // High vibration
      else if (this.vibration > 5.0 && Math.random() < 0.08) {
        this.alarm = 'HIGH_VIBRATION';
      }
    }

    if (this.type === 'PRESS_BRAKE' && this.spindleLoad > 90 && Math.random() < 0.1) {
      this.alarm = 'OVER_TONNAGE';
    }

    if (this.type === 'LASER' && this.spindleLoad > 95 && Math.random() < 0.1) {
      this.alarm = 'LASER_POWER_FAULT';
    }
  }

  // =========================================================
  // ==========   MANUAL CONTROLS   =========================
  // =========================================================

  injectAlarm(code) {
    this.alarm = code;
    this.execution = 'ALARM';
    this.cyclePhase = 'IDLE';
  }

  clearAlarm() {
    this.alarm = null;
    this.execution = 'IDLE';
    this.cyclePhase = 'IDLE';
  }
}

// ---- Export the class directly ----
module.exports = HaasMachine;
