/**
 * ia-service (nube): hoy es un stub que estructura texto.
 * En tu tesis, la IA offline real vive en el dispositivo (TensorFlow Lite / ONNX / API nativa);
 * este servicio puede enriquecer o validar cuando hay red sin bloquear el consultorio.
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT || 4003);

app.use(cors());
app.use(express.json());

/**
 * POST /structure { "rawText": "..." }
 * Devuelve campos sugeridos para rellenar la historia (reglas simples = baseline auditable).
 */
app.post("/structure", (req, res) => {
  const rawText = String((req.body && req.body.rawText) || "").trim();
  if (!rawText) return res.status(400).json({ error: "rawText requerido" });

  const lower = rawText.toLowerCase();
  const diagnosisPreliminary = lower.includes("miop")
    ? "Miopía (preliminar, requiere confirmación)"
    : lower.includes("astig")
      ? "Astigmatismo (preliminar)"
      : "Sin patrón simple detectado";

  return res.json({
    narrative: rawText,
    diagnosisPreliminary,
    observations: "Generado por ia-service stub; reemplazar por modelo on-device + supervisión clínica.",
    visualAcuity: {},
    intraocularPressure: {},
  });
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "ia-service" }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ia-service escuchando en :${PORT}`);
});
