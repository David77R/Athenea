require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const Groq = require('groq-sdk');

const app = express();
const PORT = Number(process.env.PORT || 3003);
const upload = multer({ dest: 'uploads/' });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());

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

function convertirTextoANumeros(texto) {
  return texto
    .replace(/veinti[uú]n/g, "21")
    .replace(/veintid[oó]s/g, "22")
    .replace(/veintitr[eé]s/g, "23")
    .replace(/veinticuatro/g, "24")
    .replace(/veinticinco/g, "25")
    .replace(/veintis[eé]is/g, "26")
    .replace(/veintisiete/g, "27")
    .replace(/veintiocho/g, "28")
    .replace(/veintinueve/g, "29")
    .replace(/treinta\s+y\s+uno/g, "31")
    .replace(/treinta\s+y\s+dos/g, "32")
    .replace(/treinta\s+y\s+tres/g, "33")
    .replace(/treinta\s+y\s+cuatro/g, "34")
    .replace(/treinta\s+y\s+cinco/g, "35")
    .replace(/treinta\s+y\s+seis/g, "36")
    .replace(/treinta\s+y\s+siete/g, "37")
    .replace(/treinta\s+y\s+ocho/g, "38")
    .replace(/treinta\s+y\s+nueve/g, "39")
    .replace(/cuarenta\s+y\s+uno/g, "41")
    .replace(/cuarenta\s+y\s+dos/g, "42")
    .replace(/cuarenta\s+y\s+cinco/g, "45")
    .replace(/cincuenta\s+y\s+cinco/g, "55")
    .replace(/sesenta\s+y\s+tres/g, "63")
    .replace(/noventa/g, "90")
    .replace(/ochenta/g, "80")
    .replace(/setenta/g, "70")
    .replace(/sesenta/g, "60")
    .replace(/cincuenta/g, "50")
    .replace(/cuarenta/g, "40")
    .replace(/treinta/g, "30")
    .replace(/veinte/g, "20")
    .replace(/doscientos/g, "200")
    .replace(/ciento/g, "100")
    .replace(/cien/g, "100")
    .replace(/punto\s+cinco/g, ".5")
    .replace(/punto\s+veinticinco/g, ".25")
    .replace(/punto\s+setenta\s+y\s+cinco/g, ".75")
    .replace(/punto/g, ".")
    .replace(/coma/g, ".")
    .replace(/menos/g, "-")
    .replace(/m[aá]s/g, "+")
    .replace(/\bmil\b/g, "000")
    .replace(/\bmillones\b/g, "000000")
    .replace(/\bmill[oó]n\b/g, "000000")
    .replace(/\bcero\b/g, "0")
    .replace(/\buno\b/g, "1")
    .replace(/\buna\b/g, "1")
    .replace(/\bdos\b/g, "2")
    .replace(/\btres\b/g, "3")
    .replace(/\bcuatro\b/g, "4")
    .replace(/\bcinco\b/g, "5")
    .replace(/\bseis\b/g, "6")
    .replace(/\bsiete\b/g, "7")
    .replace(/\bocho\b/g, "8")
    .replace(/\bnueve\b/g, "9")
    .replace(/\bdiez\b/g, "10")
    .replace(/\bonce\b/g, "11")
    .replace(/\bdoce\b/g, "12")
    .replace(/\btrece\b/g, "13")
    .replace(/\bcatorce\b/g, "14")
    .replace(/\bquince\b/g, "15")
    .replace(/\bdieci[sé]is\b/g, "16")
    .replace(/\bdiecisiete\b/g, "17")
    .replace(/\bdieciocho\b/g, "18")
    .replace(/\bdiecinueve\b/g, "19")
    .replace(/\s+/g, " ")
    .trim();
}

function extraerPaciente(lower) {
  const procesado = convertirTextoANumeros(lower);
  const matchNombre = lower.match(
    /paciente\s+([a-záéíóúñ\s]+?)(?:\s*,|\s+c[eé]dula|\s+ci\b|\s+edad|\s+tel[eé]fono|$)/i
  );
  const matchCedula = procesado.match(
    /(?:c[eé]dula|c\.i\.?|ci)\s*[:\-]?\s*([\d\s]{5,15})/i
  );
  const matchTelefono = procesado.match(
    /(?:tel[eé]fono|telf|cel(?:ular)?)\s*[:\-]?\s*([\d\s\-]{7,15})/i
  );
  const matchEdad = procesado.match(
    /edad\s+(\d{1,3})\s*(?:años|año)?/i
  );
  const matchOcupacion = lower.match(
    /(?:ocupa[cs]i[oó]n|trabaja\s+(?:como|de)|es\s+(?:un|una)?)\s+([a-záéíóúñ\s]+?)(?:\s*,|motivo|$)/i
  );
  return {
    nombre: matchNombre ? matchNombre[1].trim() : "",
    cedula: matchCedula ? matchCedula[1].replace(/[\s\-]/g, "") : "",
    telefono: matchTelefono ? matchTelefono[1].replace(/[\s\-]/g, "") : "",
    edad: matchEdad ? matchEdad[1] : "",
    ocupacion: matchOcupacion ? matchOcupacion[1].trim() : "",
  };
}

function extraerAgudezaVisual(lower) {
  const procesado = convertirTextoANumeros(lower);
  const matchOD = procesado.match(
    /(?:ojo\s+derecho|agudeza.*?derecho|\bod\b)[:\s]+(\d+)\s*[\/\s]\s*(\d+)/i
  );
  const matchOI = procesado.match(
    /(?:ojo\s+izquierdo|agudeza.*?izquierdo|\boi\b)[:\s]+(\d+)\s*[\/\s]\s*(\d+)/i
  );
  return {
    od: matchOD ? `${matchOD[1]}/${matchOD[2]}` : "",
    oi: matchOI ? `${matchOI[1]}/${matchOI[2]}` : "",
  };
}

function extraerRefraccion(lower) {
  const procesado = convertirTextoANumeros(lower);
  const num = "([+-]?\\d+(?:\\.\\d+)?)";
  const esfOD = procesado.match(
    new RegExp(`(?:esf[eé]rico\\s+(?:ojo\\s+)?(?:derecho|od)|(?:ojo\\s+)?(?:derecho|od)\\s+esf[eé]rico)\\s*${num}`, "i")
  ) || procesado.match(/esf[eé]rico\s+od\s*([+-]?\d+(?:\.\d+)?)/i);
  const esfOI = procesado.match(
    new RegExp(`(?:esf[eé]rico\\s+(?:ojo\\s+)?(?:izquierdo|oi)|(?:ojo\\s+)?(?:izquierdo|oi)\\s+esf[eé]rico)\\s*${num}`, "i")
  ) || procesado.match(/esf[eé]rico\s+oi\s*([+-]?\d+(?:\.\d+)?)/i);
  const cilOD = procesado.match(
    new RegExp(`(?:cil[ií]ndrico\\s+(?:ojo\\s+)?(?:derecho|od)|(?:ojo\\s+)?(?:derecho|od)\\s+cil[ií]ndrico)\\s*${num}`, "i")
  );
  const cilOI = procesado.match(
    new RegExp(`(?:cil[ií]ndrico\\s+(?:ojo\\s+)?(?:izquierdo|oi)|(?:ojo\\s+)?(?:izquierdo|oi)\\s+cil[ií]ndrico)\\s*${num}`, "i")
  );
  const ejeOD = procesado.match(
    new RegExp(`(?:eje\\s+(?:ojo\\s+)?(?:derecho|od)|(?:ojo\\s+)?(?:derecho|od)\\s+eje)\\s*${num}`, "i")
  );
  const ejeOI = procesado.match(
    new RegExp(`(?:eje\\s+(?:ojo\\s+)?(?:izquierdo|oi)|(?:ojo\\s+)?(?:izquierdo|oi)\\s+eje)\\s*${num}`, "i")
  );
  return {
    esf_od: esfOD ? esfOD[1] : "",
    cil_od: cilOD ? cilOD[1] : "",
    eje_od: ejeOD ? ejeOD[1] : "",
    esf_oi: esfOI ? esfOI[1] : "",
    cil_oi: cilOI ? cilOI[1] : "",
    eje_oi: ejeOI ? ejeOI[1] : "",
  };
}

function extraerPresionIntraocular(lower) {
  const procesado = convertirTextoANumeros(lower);
  const num = "(\\d+(?:\\.\\d+)?)";
  const matchOD = procesado.match(
    new RegExp(`(?:pio|presi[oó]n\\s+intraocular)\\s+(?:ojo\\s+)?(?:derecho|od)[:\\s]+${num}`, "i")
  ) || procesado.match(new RegExp(`(?:derecho|od)\\s+${num}\\s*mmhg`, "i"));
  const matchOI = procesado.match(
    new RegExp(`(?:pio|presi[oó]n\\s+intraocular)\\s+(?:ojo\\s+)?(?:izquierdo|oi)[:\\s]+${num}`, "i")
  ) || procesado.match(new RegExp(`(?:izquierdo|oi)\\s+${num}\\s*mmhg`, "i"));
  return {
    od: matchOD ? matchOD[1] : "",
    oi: matchOI ? matchOI[1] : "",
  };
}

function extraerMotivo(lower) {
  const match = lower.match(
    /motivo\s+(?:de\s+)?consulta\s*[:\-]?\s*([^,\.]+?)(?:\s*,|\s+ojo|\s+agudeza|\s+esf|\s+pio|$)/i
  );
  return match ? match[1].trim() : "";
}

function extraerTiempoEvolucion(lower) {
  const procesado = convertirTextoANumeros(lower);
  const match = procesado.match(
    /(?:tiempo\s+(?:de\s+)?evoluci[oó]n|lleva|hace|desde\s+hace)\s+([^,\.]+?)(?:\s*,|motivo|$)/i
  );
  return match ? match[1].trim() : "";
}

function extraerDiagnosticoPreliminar(lower) {
  if (lower.includes('miop')) return 'Miopía (preliminar)';
  if (lower.includes('astigmat')) return 'Astigmatismo (preliminar)';
  if (lower.includes('hipermet')) return 'Hipermetropía (preliminar)';
  if (lower.includes('presbic')) return 'Presbicia (preliminar)';
  if (lower.includes('glaucom')) return 'Glaucoma (preliminar — requiere evaluación urgente)';
  if (lower.includes('catarata')) return 'Catarata (preliminar)';
  if (lower.includes('estrabism')) return 'Estrabismo (preliminar)';
  return "";
}

async function procesarConGroq(texto) {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `Eres un asistente médico especializado en optometría. Recibes el dictado de voz de un especialista y debes extraer los datos clínicos. Responde ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional:
{
        Extrae TODOS los datos del dictado aunque estén en palabras. 
Las cédulas venezolanas tienen 7-8 dígitos. La agudeza visual se expresa como fracción 20/X.
Convierte números en palabras a dígitos. Si el especialista dice "veinte cuarenta" es "20/40".
Si dice "menos uno punto cinco" es "-1.50". Si dice "ciento ochenta" como eje es "180".
Responde ÚNICAMENTE JSON válido sin texto adicional ni backticks.
  "paciente": { "nombre": "", "cedula": "", "edad": "", "telefono": "", "ocupacion": "" },
  "motivo": "",
  "tiempoEvolucion": "",
  "antOcularPersonal": "",
  "antOcularFamiliar": "",
  "antMedicos": "",
  "usaLentes": false,
  "tipoLentes": "",
  "visualAcuity": { "od": "", "oi": "" },
  "refraccion": { "esf_od": "", "cil_od": "", "eje_od": "", "esf_oi": "", "cil_oi": "", "eje_oi": "" },
  "intraocularPressure": { "od": "", "oi": "" },
  "diagnosisPreliminary": "",
  "observations": ""
}`
      },
      {
        role: 'user',
        content: `Extrae los datos clínicos de este dictado: "${texto}"`
      }
    ],
    model: 'llama-3.1-8b-instant',
    temperature: 0.1,
    max_tokens: 1024,
  });
  const respuesta = completion.choices[0]?.message?.content || '{}';
  const clean = respuesta.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

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

app.post("/structure", async (req, res) => {
  const rawText = String((req.body && req.body.rawText) || "").trim();
  if (!rawText) return res.status(400).json({ error: "rawText requerido" });
  const lower = rawText.toLowerCase();
  try {
    if (process.env.GROQ_API_KEY) {
      const datosGroq = await procesarConGroq(rawText);
      return res.json({ ...datosGroq, narrative: rawText });
    }
  } catch (e) {
    console.error('Groq falló, usando parser local:', e.message);
  }
  res.json({
    paciente: extraerPaciente(lower),
    narrative: rawText,
    motivo: extraerMotivo(lower),
    visualAcuity: extraerAgudezaVisual(lower),
    refraccion: extraerRefraccion(lower),
    intraocularPressure: extraerPresionIntraocular(lower),
    diagnosisPreliminary: extraerDiagnosticoPreliminar(lower),
    observations: "",
    tiempoEvolucion: extraerTiempoEvolucion(lower),
  });
});

app.post("/diagnostico", (req, res) => {
  const { agudeza_visual, refraccion } = req.body;
  const sugerencias = [];
  if (refraccion) {
    const esf_od = parseFloat(refraccion.esf_od) || 0;
    const esf_oi = parseFloat(refraccion.esf_oi) || 0;
    if (esf_od < -0.5 || esf_oi < -0.5) sugerencias.push("Miopía detectada");
    if (esf_od > 0.5 || esf_oi > 0.5) sugerencias.push("Hipermetropía detectada");
  }
  if (sugerencias.length === 0) sugerencias.push("Sin hallazgos significativos");
  res.json({ sugerencias });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ia-service escuchando en :${PORT}`);
});