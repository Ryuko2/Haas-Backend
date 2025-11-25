import threading
import time
import random
from datetime import datetime
from typing import Dict, Any

from flask import Flask, jsonify, Response, request

app = Flask(__name__)

class MachineState:
    def __init__(self, machine_id: str, name: str, mtype: str):
        self.id = machine_id
        self.name = name
        self.type = mtype  # CNC, LATHE, PRESS_BRAKE, LASER

        # Estado principal
        self.power = True
        self.execution = "IDLE"  # IDLE, RUNNING, STOPPED, ALARM
        self.spindle_speed = 0
        self.spindle_load = 0.0
        self.feed_rate = 0
        self.part_count = 0
        self.axis_positions = {"X": 0.0, "Y": 0.0, "Z": 0.0}
        self.alarm = None

        # Métricas acumuladas
        self.machine_on_hours = 0.0
        self.spindle_hours = 0.0
        self.total_cycles = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "power": self.power,
            "execution": self.execution,
            "spindle_speed": self.spindle_speed,
            "spindle_load": self.spindle_load,
            "feed_rate": self.feed_rate,
            "part_count": self.part_count,
            "axis_positions": self.axis_positions,
            "alarm": self.alarm,
            "machine_on_hours": round(self.machine_on_hours, 3),
            "spindle_hours": round(self.spindle_hours, 3),
            "total_cycles": self.total_cycles,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    def update(self, dt_sec: float):
        """Actualiza el comportamiento simulado de la máquina en dt_sec segundos."""
        if not self.power:
            self.execution = "STOPPED"
            self.spindle_speed = 0
            self.spindle_load = 0.0
            self.feed_rate = 0
            self.alarm = None
            return

        # Horas encendida
        self.machine_on_hours += dt_sec / 3600.0

        # Si está en alarma, se queda parada hasta que alguien la libere
        if self.alarm:
            self.execution = "ALARM"
            self.spindle_speed = 0
            self.spindle_load = 0.0
            self.feed_rate = 0
            # Pequeña probabilidad de que el operador limpie la alarma
            if random.random() < 0.01:
                self.alarm = None
                self.execution = "IDLE"
            return

        # Probabilidad de estar en ciclo según tipo
        run_probability = 0.6
        if self.type == "LASER":
            run_probability = 0.7
        elif self.type == "PRESS_BRAKE":
            run_probability = 0.5

        if random.random() < run_probability:
            # Máquina en ciclo
            self.execution = "RUNNING"

            if self.type in ("CNC", "LATHE"):
                self.spindle_speed = random.randint(1500, 12000)
                self.spindle_load = round(random.uniform(10, 90), 1)
                self.feed_rate = random.randint(200, 3000)
                # Movimiento de ejes
                self.axis_positions["X"] += random.uniform(-0.5, 0.5)
                self.axis_positions["Y"] += random.uniform(-0.5, 0.5)
                self.axis_positions["Z"] += random.uniform(-0.2, 0.2)
            elif self.type == "PRESS_BRAKE":
                self.spindle_speed = 0
                self.spindle_load = round(random.uniform(20, 95), 1)  # tonelaje %
                self.feed_rate = random.randint(20, 80)  # dobleces/min
            elif self.type == "LASER":
                self.spindle_speed = 0
                self.spindle_load = round(random.uniform(30, 100), 1)  # potencia %
                self.feed_rate = random.randint(500, 6000)  # mm/min

            # Horas de husillo sólo para CNC / torno
            if self.type in ("CNC", "LATHE"):
                self.spindle_hours += dt_sec / 3600.0

            # Probabilidad de pieza nueva
            if random.random() < 0.1:
                self.part_count += 1
                self.total_cycles += 1

            # Alarmas según tipo
            if self.type in ("CNC", "LATHE"):
                if self.spindle_load > 85 and random.random() < 0.1:
                    self.alarm = "SPINDLE_OVERLOAD"
                elif random.random() < 0.02:
                    self.alarm = "AXIS_FOLLOWING_ERROR"
            elif self.type == "PRESS_BRAKE":
                if self.spindle_load > 90 and random.random() < 0.1:
                    self.alarm = "OVER_TONNAGE"
            elif self.type == "LASER":
                if self.spindle_load > 95 and random.random() < 0.1:
                    self.alarm = "LASER_POWER_FAULT"

        else:
            # Máquina en idle
            self.execution = "IDLE"
            self.spindle_speed = 0
            self.spindle_load = 0.0
            self.feed_rate = 0
            # Ligero drift de ejes
            self.axis_positions["X"] += random.uniform(-0.01, 0.01)
            self.axis_positions["Y"] += random.uniform(-0.01, 0.01)
            self.axis_positions["Z"] += random.uniform(-0.005, 0.005)


# Definición de “planta”
machines: Dict[str, MachineState] = {
    "haas_vf2":    MachineState("haas_vf2",   "Haas VF-2",        "CNC"),
    "toyoda_hmc":  MachineState("toyoda_hmc", "Toyoda HMC",       "CNC"),
    "durma_press": MachineState("durma_press","Durma Press Brake","PRESS_BRAKE"),
    "cnc_lathe":   MachineState("cnc_lathe",  "CNC Lathe",        "LATHE"),
    "fiber_laser": MachineState("fiber_laser","Fiber Laser",      "LASER"),
}

SIM_UPDATE_PERIOD_SEC = 0.5  # resolución de simulación (0.5 s)

def simulation_loop():
    """Hilo en background que actualiza todas las máquinas periódicamente."""
    while True:
        start = time.time()
        for m in machines.values():
            m.update(SIM_UPDATE_PERIOD_SEC)
        elapsed = time.time() - start
        sleep_time = max(0.0, SIM_UPDATE_PERIOD_SEC - elapsed)
        time.sleep(sleep_time)

# Lanzar el simulador en segundo plano
threading.Thread(target=simulation_loop, daemon=True).start()

# ------------------ Rutas API JSON ------------------

@app.route("/api/machines")
def list_machines():
    """Lista todas las máquinas con su estado actual."""
    return jsonify([m.to_dict() for m in machines.values()])

@app.route("/api/machines/<machine_id>")
def machine_detail(machine_id: str):
    """Detalle de una máquina."""
    m = machines.get(machine_id)
    if not m:
        return jsonify({"error": "machine not found"}), 404
    return jsonify(m.to_dict())

@app.route("/api/alarms")
def active_alarms():
    """Devuelve las alarmas activas en toda la planta."""
    data = []
    for m in machines.values():
        if m.alarm:
            data.append({
                "id": m.id,
                "name": m.name,
                "alarm": m.alarm,
                "execution": m.execution,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            })
    return jsonify(data)

@app.route("/api/machines/<machine_id>/inject_alarm", methods=["POST"])
def inject_alarm(machine_id: str):
    """
    Fuerza una alarma en una máquina para pruebas.
    Ejemplo:
    curl -X POST http://localhost:8000/api/machines/haas_vf2/inject_alarm \
         -H "Content-Type: application/json" \
         -d '{"alarm": "TEST_ALARM"}'
    """
    m = machines.get(machine_id)
    if not m:
        return jsonify({"error": "machine not found"}), 404
    data = request.get_json(silent=True) or {}
    alarm = data.get("alarm", "TEST_ALARM")
    m.alarm = alarm
    m.execution = "ALARM"
    return jsonify({"status": "ok", "id": machine_id, "alarm": m.alarm})


# --------------- Endpoint tipo MTConnect (XML) ---------------

def generate_mtconnect_xml(m: MachineState) -> str:
    ts = datetime.utcnow().isoformat() + "Z"
    xml = f"""<?xml version="1.0"?>
<MTConnectStreams>
  <Header creationTime="{ts}" sender="PythonSimulator" instanceId="1" version="1.8"/>
  <Streams>
    <DeviceStream name="{m.name}" uuid="{m.id}">
      <ComponentStream component="Controller">
        <Samples>
          <Sample name="execution">{m.execution}</Sample>
        </Samples>
      </ComponentStream>

      <ComponentStream component="Spindle">
        <Samples>
          <Sample name="spindle_speed">{m.spindle_speed}</Sample>
          <Sample name="spindle_load">{m.spindle_load}</Sample>
        </Samples>
      </ComponentStream>

      <ComponentStream component="Axes">
        <Samples>
          <Sample name="X">{m.axis_positions['X']:.3f}</Sample>
          <Sample name="Y">{m.axis_positions['Y']:.3f}</Sample>
          <Sample name="Z">{m.axis_positions['Z']:.3f}</Sample>
        </Samples>
      </ComponentStream>

      <ComponentStream component="Production">
        <Samples>
          <Sample name="part_count">{m.part_count}</Sample>
          <Sample name="total_cycles">{m.total_cycles}</Sample>
          <Sample name="machine_on_hours">{m.machine_on_hours:.3f}</Sample>
          <Sample name="spindle_hours">{m.spindle_hours:.3f}</Sample>
        </Samples>
      </ComponentStream>

      <ComponentStream component="Alarms">
        <Samples>
          <Sample name="alarm">{m.alarm or "NONE"}</Sample>
        </Samples>
      </ComponentStream>

    </DeviceStream>
  </Streams>
</MTConnectStreams>
"""
    return xml

@app.route("/mtconnect/<machine_id>/current")
def mtconnect_current(machine_id: str):
    """Devuelve un XML tipo MTConnect para una máquina."""
    m = machines.get(machine_id)
    if not m:
        return Response("Machine not found", status=404, mimetype="text/plain")
    xml = generate_mtconnect_xml(m)
    return Response(xml, mimetype="application/xml")


if __name__ == "__main__":
    print("Simulador de planta corriendo en http://localhost:8000")
    app.run(host="0.0.0.0", port=8000, debug=False)