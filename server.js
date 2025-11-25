const express = require('express');
const cors = require('cors');
const HaasMachine = require('./HaasMachine'); // <-- MATCH EXACT FILE NAME

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

// ---- SIMULATION ----
setInterval(() => {
  Object.values(machines).forEach(m => m.update(1));
}, 1000);

// ---- ROUTES ----
app.get('/api/machines', (req, res) => {
  res.json(Object.values(machines).map(m => m.toJSON()));
});

app.get('/api/machines/:id', (req, res) => {
  const m = machines[req.params.id];
  if (!m) return res.status(404).json({ error: "Machine not found" });
  res.json(m.toJSON());
});

app.get('/', (req, res) => {
  res.json({
    message: "Haas Machine Simulator",
    endpoints: ["/api/machines", "/api/machines/:id"]
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port", PORT));
