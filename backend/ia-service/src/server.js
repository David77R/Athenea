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
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    return res.json({ texto });
  } catch (e) {
    console.error('Error transcribiendo:', e);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    return res.status(500).json({ error: 'Error al transcribir el audio' });
  }
});

function transcribirAudio(audioPath, modelPath) {
  return new Promise((resolve, reject) => {
    const wavPath = audioPath + '.wav';

    const ffmpeg = spawn('ffmpeg', [
      '-i', audioPath,
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      wavPath
    ]);

    let ffmpegError = '';
    ffmpeg.stderr.on('data', (data) => { ffmpegError += data.toString(); });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Error convirtiendo audio: ' + ffmpegError));
        return;
      }

      const proceso = spawn('python3', [
        path.join(__dirname, 'transcribir.py'),
        wavPath,
        modelPath
      ]);

      let resultado = '';
      let error = '';

      proceso.stdout.on('data', (data) => { resultado += data.toString(); });
      proceso.stderr.on('data', (data) => { error += data.toString(); });

      proceso.on('close', (code) => {
        if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
        if (code !== 0) reject(new Error(error));
        else resolve(resultado.trim());
      });
    });
  });
}

app.post("/structure", (req, res) => {
  const rawText = String((req.body && req.body.rawText) || "").trim();
  if (!rawText) return res.status(400).json({ error: "rawText requerido" });

  const lower = rawText.toLowerCase();

  return res.json({
    narrative:           rawText,
    tiempoEvolucion:     extraerTiempoEvolucion(lower),
    paciente:            extraerPaciente(lower),
    visualAcuity:        extraerAgudezaVisual(lower),
    intraocularPressure: extraerPresionIntraocular(lower),
    refraccion:          extraerRefraccion(lower),
    diagnostico: {
      diagnostico_principal:  "",
      diagnostico_secundario: "",
      prescripcion:           "",
      proxima_cita:           "",
      observaciones:          "",
    }
  });
});

app.post("/diagnostico", (req, res) => {
  const { agudeza_visual, refraccion } = req.body;
  const sugerencias = generarSugerencias({ agudeza_visual, refraccion });
  return res.json({ sugerencias });
});

function extraerPaciente(lower) {
  const matchNombre = lower.match(
    /paciente\s+([a-záéíóúñ\s]+?)(?:,|\.|\bcédula\b|\btelefono\b|\btelefóno\b|$)/
  );
  const matchCedula = lower.match(
    /(?:cédula|cedula|c\.i|ci)[:\s]+([0-9]{6,10})/
  );
  const matchTelefono = lower.match(
    /(?:teléfono|telefono|tlf|cel)[:\s]+(\d{4}[-\s]?\d{7})/
  );
  const matchOcupacion = lower.match(
    /(?:ocupación|ocupacion|profesión|profesion)[:\s]+([a-záéíóúñ\s]+?)(?:,|\.|\b|$)/
  );

  return {
    nombre:    matchNombre    ? matchNombre[1].trim()    : "",
    cedula:    matchCedula    ? matchCedula[1].trim()    : "",
    telefono:  matchTelefono  ? matchTelefono[1].trim()  : "",
    ocupacion: matchOcupacion ? matchOcupacion[1].trim() : "",
  };
}

function extraerAgudezaVisual(lower) {
  const fraccion = "20\\/\\d{1,3}";

  const matchOD = lower.match(new RegExp(`(?:ojo derecho|od)[:\\s,]+?(${fraccion})`));
  const matchOI = lower.match(new RegExp(`(?:ojo izquierdo|oi)[:\\s,]+?(${fraccion})`));

  return {
    od: matchOD ? matchOD[1] : "",
    oi: matchOI ? matchOI[1] : "",
  };
}

function extraerPresionIntraocular(lower) {
  const numero = "\\d+(?:\\.\\d+)?";

  const matchOD = lower.match(new RegExp(`(?:pio|presión intraocular|presion intraocular)[^.]*?(?:od|ojo derecho)[:\\s,]+(${numero})`));
  const matchOI = lower.match(new RegExp(`(?:pio|presión intraocular|presion intraocular)[^.]*?(?:oi|ojo izquierdo)[:\\s,]+(${numero})`));

  let od = matchOD ? matchOD[1] : "";
  let oi = matchOI ? matchOI[1] : "";

  if (!od || !oi) {
    const matchSimple = lower.match(new RegExp(`(?:pio|presión intraocular)[:\\s]+(${numero})[,\\sy]+(${numero})`));
    if (matchSimple) {
      od = od || matchSimple[1];
      oi = oi || matchSimple[2];
    }
  }

  return { od, oi };
}

function extraerRefraccion(lower) {
  const texto = convertirPalabrasANumeros(lower);
  const dioptria = "[+-]?\\d+(?:\\.\\d+)?";

  const matchOD = texto.match(new RegExp(
    `(?:od|ojo derecho)[:\\s]+esf[^\\d+-]*(${dioptria})[,\\s]+cil[^\\d+-]*(${dioptria})[,\\s]+eje[:\\s]*(\\d+)`
  ));
  const matchOI = texto.match(new RegExp(
    `(?:oi|ojo izquierdo)[:\\s]+esf[^\\d+-]*(${dioptria})[,\\s]+cil[^\\d+-]*(${dioptria})[,\\s]+eje[:\\s]*(\\d+)`
  ));

  return {
    esf_od: matchOD ? matchOD[1] : "",
    cil_od: matchOD ? matchOD[2] : "",
    eje_od: matchOD ? matchOD[3] : "",
    esf_oi: matchOI ? matchOI[1] : "",
    cil_oi: matchOI ? matchOI[2] : "",
    eje_oi: matchOI ? matchOI[3] : "",
  };
}

function convertirPalabrasANumeros(texto) {
  return texto
    .replace(/menos\s+/g, "-")
    .replace(/más\s+/g,   "+")
    .replace(/cero/g,  "0")
    .replace(/uno/g,   "1")
    .replace(/dos/g,   "2")
    .replace(/tres/g,  "3")
    .replace(/cuatro/g,"4")
    .replace(/cinco/g, "5")
    .replace(/seis/g,  "6")
    .replace(/siete/g, "7")
    .replace(/ocho/g,  "8")
    .replace(/nueve/g, "9")
    .replace(/punto/g, ".")
    .replace(/coma/g,  ".");
}

function extraerTiempoEvolucion(lower) {
  const match = lower.match(
    /(?:hace|desde hace)\s+(\d+\s+(?:días?|semanas?|meses?|años?))/
  );
  return match ? match[1] : "";
}

function generarSugerencias({ agudeza_visual, refraccion }) {
  const sugerencias = [];

  if (agudeza_visual) {
    const od = agudeza_visual.ojo_derecho;
    const oi = agudeza_visual.ojo_izquierdo;

    if (od === '20/200' || oi === '20/200')
      sugerencias.push('Baja visión severa — evaluar ayudas ópticas');
    else if (od === '20/100' || oi === '20/100')
      sugerencias.push('Baja visión moderada — referir a especialista');
    else if (od === '20/40' || oi === '20/40')
      sugerencias.push('Agudeza visual reducida — considerar corrección óptica');
    else if (od === '20/20' && oi === '20/20')
      sugerencias.push('Agudeza visual normal en ambos ojos');
  }

  if (refraccion) {
    const esf_od = refraccion?.ojo_derecho?.esferico   || 0;
    const esf_oi = refraccion?.ojo_izquierdo?.esferico || 0;
    const cil_od = refraccion?.ojo_derecho?.cilindrico   || 0;
    const cil_oi = refraccion?.ojo_izquierdo?.cilindrico || 0;

    if (esf_od < -0.5 || esf_oi < -0.5)
      sugerencias.push('Miopía detectada — recomendar lentes correctivos');
    if (esf_od > 0.5 || esf_oi > 0.5)
      sugerencias.push('Hipermetropía detectada — evaluar corrección');
    if (Math.abs(cil_od) > 0.75 || Math.abs(cil_oi) > 0.75)
      sugerencias.push('Astigmatismo significativo — corrección cilíndrica recomendada');
    if (esf_od < -6.0 || esf_oi < -6.0)
      sugerencias.push('Miopía alta — evaluar fondo de ojo');
    if (esf_od > 2.0 || esf_oi > 2.0)
      sugerencias.push('Hipermetropía alta — considerar evaluación de acomodación');
  }

  if (sugerencias.length === 0)
    sugerencias.push('Datos insuficientes para generar sugerencias');

  return sugerencias;
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ia-service escuchando en :${PORT}`);
});