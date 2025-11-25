const express = require('express');
const cors = require('cors');
const HaasMachine = require('./haasMachine');

const app = express();
app.use(cors());
app.use(express.json());

// ---- MACHINE REGISTRY ----
const machines = {
  vf2: new HaasMachine("vf2", "Haas VF-2", "CNC"),
  lathe: new HaasMachine("lathe", "CNC Lathe", "LATHE"),
  press: new HaasMachine("press", "Durma Press Brake", "PRESS_BRAKE"),
  laser: new HaasMachine("laser", "Fiber Laser", "LASER")
};

// ---- SIMULATION LOOPER ----
setInterval(() => {
  Object.values(machines).forEach(machine => machine.update(1));
}, 1000);

// ---- ROUTES ----

// Get all machines
app.get('/api/machines', (req, res) => {
  const result = Object.values(machines).map(m => m.toJSON());
  res.json(result);
});

// Get a single machine
app.get('/api/machines/:id', (req, res) => {
  const id = req.params.id;
  const machine = machines[id];

  if (!machine) {
    return res.status(404).json({ error: "Machine not found" });
  }

  res.json(machine.toJSON());
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: "OK", machines: Object.keys(machines) });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: "Haas Machine Simulator",
    endpoints: {
      all: "/api/machines",
      machine: "/api/machines/:id"
    }
  });
});

// ---- PORT ----
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
