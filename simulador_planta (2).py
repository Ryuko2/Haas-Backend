import random
import time
from datetime import datetime
from typing import Dict
from flask import Flask, jsonify

app = Flask(__name__)

# Intervalo de simulación (segundos)
TICK_SECONDS = 0.2

# ======================================================
# CNC
# ======================================================

class CNCRealistic:
    def __init__(self, id, name, spindle_power_hp, axis_limits):
        self.id = id
        self.name = name
        self.type = "CNC"

        # Estado grueso
        self.execution = "IDLE"   # IDLE, RUNNING, ALARM
        # Fase del ciclo (detalle tipo G-code)
        self.cycle_phase = "IDLE" # IDLE, SPINDLE_RAMP, RAPID, CUTTING, RETRACT, DWELL, FINISH

        self.time_in_phase = 0.0
        self.cycle_time_target = random.randint(20, 45)  # duración de corte en segundos

        # Producción
        self.part_count = 0
        self.total_cycles = 0   # usado por client_predictivo

        # Alarmas
        self.alarm = None

        # Husillo y avance
        self.spindle_power_hp = spindle_power_hp
        self.spindle_speed = 0.0
        self.target_spindle_speed = 0.0
        self.spindle_load = 0.0    # 0-100 %

        self.feed_rate = 0.0       # mm/min simulados
        self.target_feed = 0.0

        # Posición de ejes
        self.axis_limits = axis_limits
        # Z alto (seguro)
        self.axis_positions = {
            "X": (axis_limits["X"][0] + axis_limits["X"][1]) / 2,
            "Y": (axis_limits["Y"][0] + axis_limits["Y"][1]) / 2,
            "Z": axis_limits["Z"][1]
        }

        # Salud / sensores
        self.tool_wear = 0.0       # 0-1
        self.vibration = 0.0
        self.temp_spindle = 25.0
        self.current_amps = 7.0
        self.coolant_level = 100.0

        # Uso
        self.machine_on_hours = 0.0
        self.spindle_hours = 0.0

    # --------- CONTROL DE CICLO G-CODE-LIKE --------- #

    def _start_new_cycle(self):
        self.cycle_phase = "SPINDLE_RAMP"
        self.execution = "RUNNING"
        self.time_in_phase = 0.0
        self.cycle_time_target = random.randint(20, 45)  # segundos de corte
        self.target_spindle_speed = random.randint(4000, 9000)
        self.target_feed = random.randint(300, 1800)

    def _phase_idle(self):
        self.execution = "IDLE"
        # frenado natural
        self.spindle_speed = max(0.0, self.spindle_speed - 500 * TICK_SECONDS)
        self.feed_rate = max(0.0, self.feed_rate - 500 * TICK_SECONDS)
        # inicio de ciclo cuando “entra programa”
        if random.random() < 0.05:
            self._start_new_cycle()

    def _phase_spindle_ramp(self):
        self.execution = "RUNNING"
        ramp = 350 * TICK_SECONDS
        if self.spindle_speed < self.target_spindle_speed:
            self.spindle_speed += ramp
            if self.spindle_speed >= self.target_spindle_speed:
                self.spindle_speed = self.target_spindle_speed
                self.cycle_phase = "RAPID"
                self.time_in_phase = 0.0
        else:
            self.cycle_phase = "RAPID"
            self.time_in_phase = 0.0

    def _phase_rapid(self):
        self.execution = "RUNNING"
        # G0: posicionamiento rápido a XY objetivo, Z seguro
        self.axis_positions["X"] = random.uniform(*self.axis_limits["X"])
        self.axis_positions["Y"] = random.uniform(*self.axis_limits["Y"])
        self.axis_positions["Z"] = self.axis_limits["Z"][1]  # clearance
        self.feed_rate = 0.0

        # después de ~3s pasa a corte
        if self.time_in_phase >= 3.0:
            self.cycle_phase = "CUTTING"
            self.time_in_phase = 0.0

    def _phase_cutting(self):
        self.execution = "RUNNING"

        # ramp-up de feed
        ramp = 200 * TICK_SECONDS
        if self.feed_rate < self.target_feed:
            self.feed_rate += ramp
            if self.feed_rate > self.target_feed:
                self.feed_rate = self.target_feed

        # Z baja (corte)
        self.axis_positions["Z"] -= 1.0 * TICK_SECONDS * (self.feed_rate / max(self.target_feed, 1))
        min_z, max_z = self.axis_limits["Z"]
        if self.axis_positions["Z"] < min_z + 5:
            self.axis_positions["Z"] = min_z + 5

        # carga de husillo según feed, desgaste y vibración
        base = (self.feed_rate / 1800.0) * 35.0
        wear = self.tool_wear * 50.0
        vib = self.vibration * 8.0
        noise = random.uniform(-2.0, 2.5)
        self.spindle_load = max(0.0, min(100.0, base + wear + vib + noise))

        # desgaste y vibración
        self.tool_wear += self.spindle_load / 250000.0
        if self.tool_wear > 1.0:
            self.tool_wear = 1.0
        self.vibration = self.tool_wear * 3.0 + random.uniform(0.0, 0.4)

        # cuando ya se cumplió el tiempo de corte -> retract
        if self.time_in_phase >= self.cycle_time_target * 0.6:
            self.cycle_phase = "RETRACT"
            self.time_in_phase = 0.0

    def _phase_retract(self):
        self.execution = "RUNNING"
        # Z arriba (retiro herramienta)
        self.axis_positions["Z"] += 4.0 * TICK_SECONDS
        min_z, max_z = self.axis_limits["Z"]
        if self.axis_positions["Z"] >= max_z - 10:
            self.axis_positions["Z"] = max_z - 10
            self.cycle_phase = "DWELL"
            self.time_in_phase = 0.0

    def _phase_dwell(self):
        self.execution = "RUNNING"
        # pausa corta
        self.feed_rate = 0.0
        self.spindle_load = max(0.0, self.spindle_load - 5.0 * TICK_SECONDS)
        if self.time_in_phase >= 2.0:
            self.cycle_phase = "FINISH"
            self.time_in_phase = 0.0

    def _phase_finish(self):
        self.execution = "RUNNING"
        self.part_count += 1
        self.total_cycles += 1
        # pequeño enfriamiento
        self.spindle_load *= 0.7
        self.feed_rate = 0.0
        # listo para siguiente ciclo
        self.cycle_phase = "IDLE"
        self.time_in_phase = 0.0

    # --------- FALLAS Y RECUPERACIÓN --------- #

    def simulate_failures(self):
        # sobrecarga
        if self.spindle_load > 95 and random.random() < 0.05:
            self.execution = "ALARM"
            self.alarm = "SPINDLE_OVERLOAD"
            self.cycle_phase = "IDLE"
            return

        # sobretemperatura
        if self.temp_spindle > 85 and random.random() < 0.05:
            self.execution = "ALARM"
            self.alarm = "SPINDLE_THERMAL"
            self.cycle_phase = "IDLE"
            return

        # coolant bajo
        if self.coolant_level < 15 and random.random() < 0.05:
            self.execution = "ALARM"
            self.alarm = "LOW_COOLANT"
            self.cycle_phase = "IDLE"
            return

        # si está en alarma, a veces se recupera
        if self.execution == "ALARM" and random.random() < 0.02:
            self.execution = "IDLE"
            self.alarm = None

    # --------- TICK GENERAL --------- #

    def tick(self):
        # conteo de tiempo
        self.time_in_phase += TICK_SECONDS
        self.machine_on_hours += TICK_SECONDS / 3600.0
        if self.spindle_speed > 300:
            self.spindle_hours += TICK_SECONDS / 3600.0

        # dinámica de coolant y temperatura
        self.coolant_level -= 0.02
        if self.coolant_level < 0:
            self.coolant_level = 0

        self.temp_spindle += (self.spindle_load / 100.0) * 0.15
        self.temp_spindle -= 0.03
        if self.temp_spindle < 25:
            self.temp_spindle = 25
        if self.temp_spindle > 95:
            self.temp_spindle = 95

        # si está en alarma solo intenta recuperarse
        if self.execution == "ALARM":
            self.simulate_failures()
            return

        # lógica de fase de ciclo
        if self.cycle_phase == "IDLE":
            self._phase_idle()
        elif self.cycle_phase == "SPINDLE_RAMP":
            self._phase_spindle_ramp()
        elif self.cycle_phase == "RAPID":
            self._phase_rapid()
        elif self.cycle_phase == "CUTTING":
            self._phase_cutting()
        elif self.cycle_phase == "RETRACT":
            self._phase_retract()
        elif self.cycle_phase == "DWELL":
            self._phase_dwell()
        elif self.cycle_phase == "FINISH":
            self._phase_finish()

        # fallas en estado RUNNING
        self.simulate_failures()

        # corriente estimada
        self.current_amps = 7.0 + self.spindle_load * 0.12

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "execution": self.execution,
            "cycle_phase": self.cycle_phase,
            "spindle_speed": round(self.spindle_speed),
            "spindle_load": round(self.spindle_load, 2),
            "feed_rate": round(self.feed_rate),
            "axis_positions": self.axis_positions,
            "temp_spindle": round(self.temp_spindle, 2),
            "vibration": round(self.vibration, 3),
            "current_amps": round(self.current_amps, 2),
            "tool_wear": round(self.tool_wear, 4),
            "coolant_level": round(self.coolant_level, 1),
            "part_count": self.part_count,
            "machine_on_hours": round(self.machine_on_hours, 4),
            "spindle_hours": round(self.spindle_hours, 4),
            "total_cycles": self.total_cycles,
            "alarm": self.alarm,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

# ======================================================
# DURMA PRESS BRAKE
# ======================================================

class PressBrakeRealistic:
    def __init__(self, id, name, max_tonnage=160):
        self.id = id
        self.name = name
        self.type = "PRESS_BRAKE"

        self.execution = "IDLE"         # IDLE, RUNNING, ALARM
        self.cycle_phase = "IDLE"       # IDLE, APPROACH, BEND, HOLD, RETURN, DWELL, FINISH
        self.time_in_phase = 0.0

        self.max_tonnage = max_tonnage
        self.tonnage = 0.0
        self.target_tonnage = 0.0

        self.ram_position = 0.0         # 0 = arriba, 100 = abajo
        self.oil_temp = 32.0

        self.cycle_count = 0
        self.total_cycles = 0
        self.part_count = 0

        self.alarm = None

        # compat con client_predictivo
        self.spindle_speed = 0.0
        self.spindle_load = 0.0   # mapeado de tonnage (%)
        self.feed_rate = 0.0
        self.machine_on_hours = 0.0
        self.spindle_hours = 0.0  # usaremos como "horas de trabajo hidráulico"

    def _start_cycle(self):
        self.cycle_phase = "APPROACH"
        self.execution = "RUNNING"
        self.time_in_phase = 0.0
        self.target_tonnage = random.randint(int(self.max_tonnage * 0.3), int(self.max_tonnage * 0.9))

    def _phase_idle(self):
        self.execution = "IDLE"
        self.tonnage = max(0.0, self.tonnage - 10 * TICK_SECONDS)
        self.ram_position = max(0.0, self.ram_position - 15 * TICK_SECONDS)
        self.feed_rate = 0.0

        if random.random() < 0.08:  # arranque de ciclo de doblado
            self._start_cycle()

    def _phase_approach(self):
        self.execution = "RUNNING"
        # baja el ram rápido sin tonnage
        self.ram_position += 40 * TICK_SECONDS
        self.tonnage = max(0.0, self.tonnage - 5 * TICK_SECONDS)
        if self.ram_position >= 80:
            self.ram_position = 80
            self.cycle_phase = "BEND"
            self.time_in_phase = 0.0

    def _phase_bend(self):
        self.execution = "RUNNING"
        # genera tonelaje
        self.ram_position += 10 * TICK_SECONDS
        if self.ram_position > 100:
            self.ram_position = 100

        self.tonnage += 40 * TICK_SECONDS
        if self.tonnage >= self.target_tonnage:
            self.tonnage = self.target_tonnage
            self.cycle_phase = "HOLD"
            self.time_in_phase = 0.0

    def _phase_hold(self):
        self.execution = "RUNNING"
        # mantiene presión
        if self.time_in_phase >= 1.5:
            self.cycle_phase = "RETURN"
            self.time_in_phase = 0.0

    def _phase_return(self):
        self.execution = "RUNNING"
        self.ram_position -= 50 * TICK_SECONDS
        self.tonnage -= 60 * TICK_SECONDS
        if self.ram_position <= 0:
            self.ram_position = 0
            self.tonnage = max(0.0, self.tonnage)
            self.cycle_phase = "DWELL"
            self.time_in_phase = 0.0

    def _phase_dwell(self):
        self.execution = "RUNNING"
        if self.time_in_phase >= 1.0:
            self.cycle_phase = "FINISH"
            self.time_in_phase = 0.0

    def _phase_finish(self):
        self.execution = "RUNNING"
        self.cycle_count += 1
        self.total_cycles += 1
        self.part_count += 1
        self.cycle_phase = "IDLE"
        self.time_in_phase = 0.0

    def _failures(self):
        # temperatura de aceite sube con tonelaje
        self.oil_temp += (self.tonnage / self.max_tonnage) * 0.4
        self.oil_temp -= 0.03
        if self.oil_temp < 30:
            self.oil_temp = 30

        # sobrecalentamiento
        if self.oil_temp > 75 and random.random() < 0.08:
            self.execution = "ALARM"
            self.alarm = "OIL_OVERHEAT"
            self.cycle_phase = "IDLE"

        # recuperación
        if self.execution == "ALARM" and random.random() < 0.03:
            self.execution = "IDLE"
            self.alarm = None
            self.oil_temp = 45

    def tick(self):
        self.time_in_phase += TICK_SECONDS
        self.machine_on_hours += TICK_SECONDS / 3600.0
        if self.execution == "RUNNING":
            self.spindle_hours += TICK_SECONDS / 3600.0

        if self.execution == "ALARM":
            # solo se enfría y quizá recupera
            self._failures()
            return

        if self.cycle_phase == "IDLE":
            self._phase_idle()
        elif self.cycle_phase == "APPROACH":
            self._phase_approach()
        elif self.cycle_phase == "BEND":
            self._phase_bend()
        elif self.cycle_phase == "HOLD":
            self._phase_hold()
        elif self.cycle_phase == "RETURN":
            self._phase_return()
        elif self.cycle_phase == "DWELL":
            self._phase_dwell()
        elif self.cycle_phase == "FINISH":
            self._phase_finish()

        self._failures()

        # mapear a “spindle_load” y “feed_rate” para compatibilidad
        self.spindle_load = min(100.0, (self.tonnage / self.max_tonnage) * 100.0)
        # strokes/min ficticio
        self.feed_rate = 0 if self.execution != "RUNNING" else 30

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "execution": self.execution,
            "cycle_phase": self.cycle_phase,
            "spindle_speed": 0,
            "spindle_load": round(self.spindle_load, 2),
            "feed_rate": round(self.feed_rate),
            "axis_positions": {"X": 0.0, "Y": 0.0, "Z": self.ram_position},
            "temp_spindle": round(self.oil_temp, 2),  # usamos este nombre para compat
            "vibration": 0.0,
            "current_amps": round(10 + self.spindle_load * 0.1, 2),
            "tool_wear": 0.0,
            "coolant_level": 100.0,
            "part_count": self.part_count,
            "machine_on_hours": round(self.machine_on_hours, 4),
            "spindle_hours": round(self.spindle_hours, 4),
            "total_cycles": self.total_cycles,
            "alarm": self.alarm,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }


# ======================================================
# FIBER LASER
# ======================================================

class LaserRealistic:
    def __init__(self, id, name, max_power_kw=6.0):
        self.id = id
        self.name = name
        self.type = "LASER"

        self.execution = "IDLE"         # IDLE, RUNNING, ALARM
        self.cycle_phase = "IDLE"       # IDLE, PIERCE, CUTTING, TRAVEL, DWELL, FINISH
        self.time_in_phase = 0.0

        self.max_power_kw = max_power_kw
        self.power_kw = 0.0
        self.target_power_kw = 0.0

        self.cut_feed = 0.0      # mm/min equivalente
        self.target_cut_feed = 0.0

        self.temp_resonator = 26.0
        self.gas_pressure = 240.0

        self.part_count = 0
        self.total_cycles = 0
        self.alarm = None

        # compat con client_predictivo
        self.spindle_speed = 0.0
        self.spindle_load = 0.0
        self.feed_rate = 0.0
        self.machine_on_hours = 0.0
        self.spindle_hours = 0.0

    def _start_cycle(self):
        self.cycle_phase = "PIERCE"
        self.execution = "RUNNING"
        self.time_in_phase = 0.0
        self.target_power_kw = random.uniform(2.0, self.max_power_kw)
        self.target_cut_feed = random.randint(800, 3000)

    def _phase_idle(self):
        self.execution = "IDLE"
        self.power_kw = max(0.0, self.power_kw - 0.5)
        self.cut_feed = 0.0
        if random.random() < 0.07:
            self._start_cycle()

    def _phase_pierce(self):
        self.execution = "RUNNING"
        self.power_kw += 0.8
        if self.power_kw >= self.target_power_kw:
            self.power_kw = self.target_power_kw
        # piercing corto
        if self.time_in_phase >= 2.0:
            self.cycle_phase = "CUTTING"
            self.time_in_phase = 0.0

    def _phase_cutting(self):
        self.execution = "RUNNING"
        # feed al valor objetivo
        ramp = 300 * TICK_SECONDS
        if self.cut_feed < self.target_cut_feed:
            self.cut_feed += ramp
            if self.cut_feed > self.target_cut_feed:
                self.cut_feed = self.target_cut_feed

        # temperatura sube con potencia
        self.temp_resonator += (self.power_kw / self.max_power_kw) * 0.4

        if self.time_in_phase >= 8.0:
            self.cycle_phase = "TRAVEL"
            self.time_in_phase = 0.0

    def _phase_travel(self):
        self.execution = "RUNNING"
        # láser apagado, solo se mueve
        self.power_kw = max(0.0, self.power_kw - 1.0)
        self.cut_feed = self.target_cut_feed
        if self.time_in_phase >= 3.0:
            self.cycle_phase = "DWELL"
            self.time_in_phase = 0.0

    def _phase_dwell(self):
        self.execution = "RUNNING"
        self.cut_feed = 0.0
        if self.time_in_phase >= 2.0:
            self.cycle_phase = "FINISH"
            self.time_in_phase = 0.0

    def _phase_finish(self):
        self.execution = "RUNNING"
        self.part_count += 1
        self.total_cycles += 1
        self.cycle_phase = "IDLE"
        self.time_in_phase = 0.0

    def _failures(self):
        # resonador caliente
        self.temp_resonator -= 0.05
        if self.temp_resonator < 26:
            self.temp_resonator = 26

        if self.temp_resonator > 85 and random.random() < 0.08:
            self.execution = "ALARM"
            self.alarm = "RESONATOR_OVERHEAT"
            self.cycle_phase = "IDLE"

        if self.execution == "ALARM" and random.random() < 0.03:
            self.execution = "IDLE"
            self.alarm = None
            self.temp_resonator = 50

    def tick(self):
        self.time_in_phase += TICK_SECONDS
        self.machine_on_hours += TICK_SECONDS / 3600.0
        if self.execution == "RUNNING":
            self.spindle_hours += TICK_SECONDS / 3600.0

        if self.execution == "ALARM":
            self._failures()
            return

        if self.cycle_phase == "IDLE":
            self._phase_idle()
        elif self.cycle_phase == "PIERCE":
            self._phase_pierce()
        elif self.cycle_phase == "CUTTING":
            self._phase_cutting()
        elif self.cycle_phase == "TRAVEL":
            self._phase_travel()
        elif self.cycle_phase == "DWELL":
            self._phase_dwell()
        elif self.cycle_phase == "FINISH":
            self._phase_finish()

        self._failures()

        # mapear a spindle_load / feed_rate
        self.spindle_load = min(100.0, (self.power_kw / self.max_power_kw) * 100.0)
        self.feed_rate = self.cut_feed

        # gas va bajando poco a poco
        self.gas_pressure -= 0.1
        if self.gas_pressure < 100:
            self.gas_pressure = 100

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "execution": self.execution,
            "cycle_phase": self.cycle_phase,
            "spindle_speed": 0,
            "spindle_load": round(self.spindle_load, 2),
            "feed_rate": round(self.feed_rate),
            "axis_positions": {"X": 0.0, "Y": 0.0, "Z": 0.0},
            "temp_spindle": round(self.temp_resonator, 2),  # mapeamos nombre
            "vibration": 0.0,
            "current_amps": round(15 + self.spindle_load * 0.2, 2),
            "tool_wear": 0.0,
            "coolant_level": 100.0,
            "part_count": self.part_count,
            "machine_on_hours": round(self.machine_on_hours, 4),
            "spindle_hours": round(self.spindle_hours, 4),
            "total_cycles": self.total_cycles,
            "alarm": self.alarm,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

# ======================================================
# Máquinas
# ======================================================

machines: Dict[str, object] = {
    "haas_vf2": CNCRealistic("haas_vf2", "Haas VF-2", 30, {"X": (0, 762), "Y": (0, 406), "Z": (0, 508)}),
    "haas_vf4": CNCRealistic("haas_vf4", "Haas VF-4", 30, {"X": (0, 1270), "Y": (0, 508), "Z": (0, 635)}),
    "toyoda_hmc": CNCRealistic("toyoda_hmc", "Toyoda HMC", 40, {"X": (0, 800), "Y": (0, 700), "Z": (0, 600)}),
    "cnc_lathe": CNCRealistic("cnc_lathe", "CNC Lathe", 20, {"X": (0, 300), "Y": (0, 200), "Z": (0, 500)}),
    "durma_press": PressBrakeRealistic("durma_press", "Durma Press Brake"),
    "fiber_laser": LaserRealistic("fiber_laser", "Fiber Laser"),
}

# ======================================================
# API
# ======================================================

@app.route("/api/machines")
def get_all():
    return jsonify([m.to_dict() for m in machines.values()])

@app.route("/api/machines/<mid>")
def get_one(mid):
    if mid not in machines:
        return jsonify({"error": "Machine not found"}), 404
    return jsonify(machines[mid].to_dict())

def loop_background():
    while True:
        for m in machines.values():
            m.tick()
        time.sleep(TICK_SECONDS)

if __name__ == "__main__":
    import threading
    t = threading.Thread(target = loop_background, daemon = True)
    t.start()

    print("Simulador industrial con ciclos realistas en http://localhost:8000")
    app.run(host = "0.0.0.0", port = 8000)