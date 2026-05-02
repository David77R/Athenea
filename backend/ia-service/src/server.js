require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = Number(process.env.PORT || 3003);
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ia-service" });
});

app.post("/transcribir", upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió audio' });
  }

  const audioPath = req.file.path;
  const modelPath = path.join(__dirname, '..', 'model', 'vosk-model-small-es-0.42');

  try {
    const texto = await transcribirAudio(audioPath, modelPath);
    fs.unlinkSync(audioPath);
    return res.json({ texto });
  } catch (e) {
    console.error('Error transcribiendo:', e);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    return res.status(500).json({ error: 'Error al transcribir el audio' });
  }
});

function transcribirAudio(audioPath, modelPath) {
  return new Promise((resolve, reject) => {
    const proceso = spawn('python3', [
      path.join(__dirname, 'transcribir.py'),
      audioPath,
      modelPath
    ]);

    let resultado = '';
    let error = '';

    proceso.stdout.on('data', (data) => { resultado += data.toString(); });
    proceso.stderr.on('data', (data) => { error += data.toString(); });

    proceso.on('close', (code) => {
      if (code !== 0) reject(new Error(error));
      else resolve(resultado.trim());
    });
  });
}

app.post("/structure", (req, res) => {
  const rawText = String((req.body && req.body.rawText) || "").trim();
  if (!rawText) return res.status(400).json({ error: "rawText requerido" });

  const lower = rawText.toLowerCase();

  const diagnosisPreliminary = lower.includes("miop")
    ? "Miopía (preliminar, requiere confirmación)"
    : lower.includes("astig")
      ? "Astigmatismo (preliminar)"
      : lower.includes("hipermet")
        ? "Hipermetropía (preliminar)"
        : lower.includes("presbic")
          ? "Presbicia (preliminar)"
          : lower.includes("glaucom")
            ? "Glaucoma (preliminar — requiere evaluación urgente)"
            : "Sin patrón simple detectado";

  return res.json({
    narrative: rawText,
    diagnosisPreliminary,
    observations: "Generado por ia-service — requiere confirmación del especialista.",
    visualAcuity: {},
    intraocularPressure: {},
  });
});

app.post("/diagnostico", (req, res) => {
  const { agudeza_visual, refraccion } = req.body;
  const sugerencias = generarSugerencias({ agudeza_visual, refraccion });
  return res.json({ sugerencias });
});

function generarSugerencias({ agudeza_visual, refraccion }) {
  const sugerencias = [];

  if (agudeza_visual) {
    const od = agudeza_visual.ojo_derecho;
    const oi = agudeza_visual.ojo_izquierdo;

    if (od === '20/200' || oi === '20/200') {
      sugerencias.push('Baja visión severa — evaluar ayudas ópticas');
    } else if (od === '20/100' || oi === '20/100') {
      sugerencias.push('Baja visión moderada — referir a especialista');
    } else if (od === '20/40' || oi === '20/40') {
      sugerencias.push('Agudeza visual reducida — considerar corrección óptica');
    } else if (od === '20/20' && oi === '20/20') {
      sugerencias.push('Agudeza visual normal en ambos ojos');
    }
  }

  if (refraccion) {
    const esf_od = refraccion?.ojo_derecho?.esferico || 0;
    const esf_oi = refraccion?.ojo_izquierdo?.esferico || 0;
    const cil_od = refraccion?.ojo_derecho?.cilindrico || 0;
    const cil_oi = refraccion?.ojo_izquierdo?.cilindrico || 0;

    if (esf_od < -0.5 || esf_oi < -0.5) {
      sugerencias.push('Miopía detectada — recomendar lentes correctivos');
    }
    if (esf_od > 0.5 || esf_oi > 0.5) {
      sugerencias.push('Hipermetropía detectada — evaluar corrección');
    }
    if (Math.abs(cil_od) > 0.75 || Math.abs(cil_oi) > 0.75) {
      sugerencias.push('Astigmatismo significativo — corrección cilíndrica recomendada');
    }
    if (esf_od < -6.0 || esf_oi < -6.0) {
      sugerencias.push('Miopía alta — evaluar fondo de ojo');
    }
    if (esf_od > 2.0 || esf_oi > 2.0) {
      sugerencias.push('Hipermetropía alta — considerar evaluación de acomodación');
    }
  }

  if (sugerencias.length === 0) {
    sugerencias.push('Datos insuficientes para generar sugerencias');
  }

  return sugerencias;
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ia-service escuchando en :${PORT}`);
});