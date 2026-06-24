require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const multer  = require("multer");
const fs      = require("fs");
const path    = require("path");
const { spawn } = require("child_process");
const Groq    = require("groq-sdk");

const app    = express();
const PORT   = Number(process.env.PORT || 3003);
const upload = multer({ dest: "uploads/" });
const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());

/** 
 * Primeramente la conversión y transcripción de audio de ffmpg a .wav para que vosk lo procese
*/

function transcribirAudio(audioPath, modelPath) {
  return new Promise((resolve, reject) => {
    const wavPath = audioPath + ".wav";
    const ffmpeg = spawn("ffmpeg", ["-i", audioPath, "-ar", "16000", "-ac", "1", "-f", "wav", wavPath]);
    let ffmpegError = "";
    ffmpeg.stderr.on("data", (d) => { ffmpegError += d.toString(); });
    ffmpeg.on("close", (code) => {
      if (code !== 0) { reject(new Error("ffmpeg: " + ffmpegError)); return; }
      const proc = spawn("python3", [path.join(__dirname, "transcribir.py"), wavPath, modelPath]);
      let out = "", err = "";
      proc.stdout.on("data", (d) => { out += d.toString(); });
      proc.stderr.on("data", (d) => { err += d.toString(); });
      proc.on("close", (c) => {
        if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
        c !== 0 ? reject(new Error(err)) : resolve(out.trim());
      });
    });
  });
}


/**
 * Funcion para convert los textos a los numeros
 */

function convertirTextoANumeros(texto) {
  return texto
    .replace(/veintiu?n/g, "21").replace(/veintid[oó]s/g, "22").replace(/veintitr[eé]s/g, "23")
    .replace(/veinticuatro/g, "24").replace(/veinticinco/g, "25").replace(/veintis[eé]is/g, "26")
    .replace(/veintisiete/g, "27").replace(/veintiocho/g, "28").replace(/veintinueve/g, "29")
    .replace(/treinta\s+y\s+uno/g, "31").replace(/treinta\s+y\s+dos/g, "32")
    .replace(/treinta\s+y\s+tres/g, "33").replace(/treinta\s+y\s+cuatro/g, "34")
    .replace(/treinta\s+y\s+cinco/g, "35").replace(/treinta\s+y\s+seis/g, "36")
    .replace(/treinta\s+y\s+siete/g, "37").replace(/treinta\s+y\s+ocho/g, "38")
    .replace(/treinta\s+y\s+nueve/g, "39").replace(/cuarenta\s+y\s+uno/g, "41")
    .replace(/cuarenta\s+y\s+dos/g, "42").replace(/cuarenta\s+y\s+cinco/g, "45")
    .replace(/cincuenta\s+y\s+cinco/g, "55").replace(/sesenta\s+y\s+tres/g, "63")
    .replace(/noventa/g, "90").replace(/ochenta/g, "80").replace(/setenta/g, "70")
    .replace(/sesenta/g, "60").replace(/cincuenta/g, "50").replace(/cuarenta/g, "40")
    .replace(/treinta/g, "30").replace(/veinte/g, "20")
    .replace(/doscientos/g, "200").replace(/ciento/g, "100").replace(/cien/g, "100")
    .replace(/punto\s+veinticinco/g, ".25").replace(/punto\s+setenta\s+y\s+cinco/g, ".75")
    .replace(/punto\s+cinco/g, ".5").replace(/punto/g, ".").replace(/coma/g, ".")
    .replace(/menos/g, "-").replace(/m[aá]s/g, "+")
    .replace(/\bmil\b/g, "000").replace(/\bmillones\b/g, "000000").replace(/\bmill[oó]n\b/g, "000000")
    .replace(/\bcero\b/g, "0").replace(/\buno\b/g, "1").replace(/\buna\b/g, "1")
    .replace(/\bdos\b/g, "2").replace(/\btres\b/g, "3").replace(/\bcuatro\b/g, "4")
    .replace(/\bcinco\b/g, "5").replace(/\bseis\b/g, "6").replace(/\bsiete\b/g, "7")
    .replace(/\bocho\b/g, "8").replace(/\bnueve\b/g, "9").replace(/\bdiez\b/g, "10")
    .replace(/\bonce\b/g, "11").replace(/\bdoce\b/g, "12").replace(/\btrece\b/g, "13")
    .replace(/\bcatorce\b/g, "14").replace(/\bquince\b/g, "15")
    .replace(/\bdieci[sé]is\b/g, "16").replace(/\bdiecisiete\b/g, "17")
    .replace(/\bdieciocho\b/g, "18").replace(/\bdiecinueve\b/g, "19")
    .replace(/\s+/g, " ").trim();
}
/**
 * Parsers locales por si falla la api de groq para recibir y rellenar los campos
 */

function extraerPaciente(lower) {
  const p = convertirTextoANumeros(lower);
  const matchNombre   = lower.match(/paciente\s+([a-záéíóúñ\s]+?)(?:\s*,|\s+c[eé]dula|\s+ci\b|\s+edad|\s+tel[eé]fono|$)/i);
  const matchCedula   = p.match(/(?:c[eé]dula|c\.i\.?|ci)\s*[:\-]?\s*([\d\s]{5,15})/i);
  const matchTelefono = p.match(/(?:tel[eé]fono|telf|cel(?:ular)?)\s*[:\-]?\s*([\d\s\-]{7,15})/i);
  const matchEdad     = p.match(/edad\s+(\d{1,3})\s*(?:años|año)?/i);
  const matchOcup     = lower.match(/(?:ocupa[cs]i[oó]n|trabaja\s+(?:como|de)|es\s+(?:un|una)?)\s+([a-záéíóúñ\s]+?)(?:\s*,|motivo|$)/i);
  return {
    nombre:   matchNombre   ? matchNombre[1].trim()                    : "",
    cedula:   matchCedula   ? matchCedula[1].replace(/[\s\-]/g, "")   : "",
    telefono: matchTelefono ? matchTelefono[1].replace(/[\s\-]/g, "") : "",
    edad:     matchEdad     ? matchEdad[1]                            : "",
    ocupacion: matchOcup   ? matchOcup[1].trim()                      : "",
  };
}

function extraerAgudezaVisual(lower) {
  const p = convertirTextoANumeros(lower);
  const od = p.match(/(?:ojo\s+derecho|agudeza.*?derecho|\bod\b)[:\s]+(\d+)\s*[\/\s]\s*(\d+)/i);
  const oi = p.match(/(?:ojo\s+izquierdo|agudeza.*?izquierdo|\boi\b)[:\s]+(\d+)\s*[\/\s]\s*(\d+)/i);
  return {
    od: od ? `${od[1]}/${od[2]}` : "",
    oi: oi ? `${oi[1]}/${oi[2]}` : "",
  };
}

function extraerRefraccion(lower) {
  const p   = convertirTextoANumeros(lower);
  const num = "([+-]?\\d+(?:\\.\\d+)?)";
  const match = (re) => { const m = p.match(re); return m ? m[1] : ""; };
  return {
    esf_od: match(new RegExp(`(?:esf[eé]rico\\s+(?:ojo\\s+)?(?:derecho|od))\\s*${num}`, "i")) ||
            match(/esf[eé]rico\s+od\s*([+-]?\d+(?:\.\d+)?)/i),
    esf_oi: match(new RegExp(`(?:esf[eé]rico\\s+(?:ojo\\s+)?(?:izquierdo|oi))\\s*${num}`, "i")) ||
            match(/esf[eé]rico\s+oi\s*([+-]?\d+(?:\.\d+)?)/i),
    cil_od: match(new RegExp(`(?:cil[ií]ndrico\\s+(?:ojo\\s+)?(?:derecho|od))\\s*${num}`, "i")),
    cil_oi: match(new RegExp(`(?:cil[ií]ndrico\\s+(?:ojo\\s+)?(?:izquierdo|oi))\\s*${num}`, "i")),
    eje_od: match(new RegExp(`(?:eje\\s+(?:ojo\\s+)?(?:derecho|od))\\s*${num}`, "i")),
    eje_oi: match(new RegExp(`(?:eje\\s+(?:ojo\\s+)?(?:izquierdo|oi))\\s*${num}`, "i")),
    add_od: match(new RegExp(`(?:adi[cs]i[oó]n\\s+(?:ojo\\s+)?(?:derecho|od))\\s*${num}`, "i")),
    add_oi: match(new RegExp(`(?:adi[cs]i[oó]n\\s+(?:ojo\\s+)?(?:izquierdo|oi))\\s*${num}`, "i")),
  };
}

function extraerPIO(lower) {
  const p   = convertirTextoANumeros(lower);
  const num = "(\\d+(?:\\.\\d+)?)";
  const od  = p.match(new RegExp(`(?:pio|presi[oó]n\\s+intraocular)\\s+(?:ojo\\s+)?(?:derecho|od)[:\\s]+${num}`, "i"))
           || p.match(new RegExp(`(?:derecho|od)\\s+${num}\\s*mmhg`, "i"));
  const oi  = p.match(new RegExp(`(?:pio|presi[oó]n\\s+intraocular)\\s+(?:ojo\\s+)?(?:izquierdo|oi)[:\\s]+${num}`, "i"))
           || p.match(new RegExp(`(?:izquierdo|oi)\\s+${num}\\s*mmhg`, "i"));
  return { od: od ? od[1] : "", oi: oi ? oi[1] : "" };
}

function extraerMotivo(lower) {
  const m = lower.match(/motivo\s+(?:de\s+)?consulta\s*[:\-]?\s*([^,\.]+?)(?:\s*,|\s+ojo|\s+agudeza|\s+esf|\s+pio|$)/i);
  return m ? m[1].trim() : "";
}

function extraerTiempoEvolucion(lower) {
  const p = convertirTextoANumeros(lower);
  const m = p.match(/(?:tiempo\s+(?:de\s+)?evoluci[oó]n|lleva|hace|desde\s+hace)\s+([^,\.]+?)(?:\s*,|motivo|$)/i);
  return m ? m[1].trim() : "";
}

function extraerDiagPreliminar(lower) {
  if (lower.includes("miop"))     return "Miopía (preliminar)";
  if (lower.includes("astigmat")) return "Astigmatismo (preliminar)";
  if (lower.includes("hipermet")) return "Hipermetropía (preliminar)";
  if (lower.includes("presbic"))  return "Presbicia (preliminar)";
  if (lower.includes("glaucom"))  return "Glaucoma (preliminar — requiere evaluación urgente)";
  if (lower.includes("catarata")) return "Catarata (preliminar)";
  if (lower.includes("estrabism"))return "Estrabismo (preliminar)";
  return "";
}

function parsearLocal(rawText) {
  const lower = rawText.toLowerCase();
  return {
    paciente:           extraerPaciente(lower),
    motivo:             extraerMotivo(lower),
    tiempoEvolucion:    extraerTiempoEvolucion(lower),
    antOcularPersonal:  "",
    antOcularFamiliar:  "",
    antMedicos:         "",
    usaLentes:          lower.includes("usa lentes") || lower.includes("usa lente"),
    tipoLentes:         "",
    medicamentos:       "",
    visualAcuity:       extraerAgudezaVisual(lower),
    refraccion:         extraerRefraccion(lower),
    intraocularPressure: extraerPIO(lower),
    ishihara:           { od: "", oi: "" },
    diagnosisPreliminary: extraerDiagPreliminar(lower),
    observations:       "",
    narrative:          rawText,
    _fuente:            "parser_local",
  };
}
/**
 * Prompt de Groq para procesar el audio y rellenar los campos 
 */

async function procesarConGroq(rawText) {
  const plantilla = JSON.stringify({
    paciente: {
      nombre: "nombre completo del paciente o string vacío",
      cedula: "número de cédula solo dígitos o string vacío",
      edad:   "edad en años como string o string vacío",
         fechaNac:  "fecha de nacimiento en formato DD/MM/AAAA o string vacío",
      telefono: "teléfono solo dígitos o string vacío",
      ocupacion: "profesión u oficio o string vacío",
    },
    motivo:            "motivo de consulta o string vacío",
    tiempoEvolucion:   "tiempo de evolución del problema o string vacío",
    antOcularPersonal: "antecedentes oculares personales o string vacío",
    antOcularFamiliar: "antecedentes oculares familiares o string vacío",
    antMedicos:        "antecedentes médicos generales o string vacío",
    usaLentes:         false,
    tipoLentes:        "tipo de lentes o string vacío",
    medicamentos:      "medicamentos actuales o string vacío",
    visualAcuity: {
      od: "agudeza visual SIN corrección OD como 20/X o string vacío",
      oi: "agudeza visual SIN corrección OI como 20/X o string vacío",
      ccOD: "agudeza visual CON corrección OD como 20/X o string vacío",
      ccOI: "agudeza visual CON corrección OI como 20/X o string vacío",
    },
    refraccion: {
      esf_od: "esférico OD como +/-X.XX o string vacío",
      cil_od: "cilíndrico OD como +/-X.XX o string vacío",
      eje_od: "eje OD en grados como número o string vacío",
      esf_oi: "esférico OI como +/-X.XX o string vacío",
      cil_oi: "cilíndrico OI como +/-X.XX o string vacío",
      eje_oi: "eje OI en grados como número o string vacío",
      add_od: "adición OD como X.XX o string vacío",
      add_oi: "adición OI como X.XX o string vacío",
    },
    intraocularPressure: {
      od: "PIO OD en mmHg como número o string vacío",
      oi: "PIO OI en mmHg como número o string vacío",
    },
    ishihara: {
      od: "resultado visión de color OD (Normal/Alterada) o string vacío",
      oi: "resultado visión de color OI (Normal/Alterada) o string vacío",
    },
    diagnosisPreliminary: "diagnóstico preliminar o string vacío",
    observations: "observaciones generales o string vacío",
  }, null, 2);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `Eres un asistente médico especializado en optometría venezolana de un consultorio optométrico venezolano.
Recibes el dictado de voz de un especialista y debes extraer TODOS los datos clínicos.

REGLAS CRÍTICAS:
- Responde ÚNICAMENTE con un objeto JSON válido, sin texto previo, sin backticks, sin explicaciones.
- Si un dato no se menciona, deja el campo como string vacío "" o false para booleanos.
- No inventes datos que no estén en el dictado.

CONVERSIÓN DE NÚMEROS:
- Convierte TODOS los números en palabras a dígitos.
- Teléfonos: "cero cuatro ciento veinticuatro cinco seis siete ocho nueve cero" → "04124567890". Procesa dígito por dígito después del prefijo.
- Cédulas venezolanas: 7-8 dígitos. "dieciséis cuatro tres dos uno ocho" → "16432108". Solo dígitos, sin letras.
- Agudeza visual: "veinte treinta" → "20/30", "veinte veinte" → "20/20".
- Refracción: "más uno punto veinticinco" → "+1.25", "menos cero punto cincuenta" → "-0.50", "ciento ochenta" → "180".
- Adición: si dice "adición más dos punto veinticinco ambos ojos" → add_od: "+2.25" y add_oi: "+2.25".

SEPARACIÓN DE CAMPOS — MUY IMPORTANTE:
- "motivo" es SOLO el síntoma principal en una frase corta. Ej: "visión borrosa de cerca y cansancio visual al leer".
- "tiempoEvolucion" es el tiempo que lleva con el problema. Ej: "seis meses" → "6 meses".
- "antOcularPersonal" son antecedentes oculares personales (cirugías, enfermedades oculares previas).
- "antOcularFamiliar" son antecedentes familiares oculares (glaucoma, catarata en familia).
- "antMedicos" son enfermedades generales (diabetes, hipertensión, alergias). Ej: "hipertensión controlada".
- "usaLentes" es true si menciona que usa lentes actualmente.
- "tipoLentes" es el tipo de lentes que usa actualmente. Ej: "monofocales".
- NO metas tiempoEvolucion ni antecedentes dentro de motivo.

DIAGNÓSTICO:
- "diagnosisPreliminary" debe ser solo el nombre de la condición, SIN agregar "(preliminar)" ni ningún sufijo.
- Ej: "presbicia con hipermetropía leve" NO "presbicia con hipermetropía leve (preliminar)".

Devuelve exactamente esta estructura JSON:
${plantilla}`,
      },
      {
        role: "user",
        content: `Extrae los datos clínicos de este dictado de optometrista:\n\n"${rawText}"`,
      },
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    max_tokens: 1500,
  });

  const contenido = completion.choices[0]?.message?.content || "{}";
  const limpio    = contenido.replace(/```json|```/g, "").trim();
  const datos     = JSON.parse(limpio);
    datos.paciente.nombre = datos.paciente.nombre.charAt(0).toUpperCase() + datos.paciente.nombre.slice(1).toLowerCase();

  return { ...datos, narrative: rawText, _fuente: "groq" };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status:  "ok",
    service: "ia-service",
    groq:    !!process.env.GROQ_API_KEY,
    vosk:    true,
  });
});

/**
 * Transcripcion del audio a texto 
 */

app.post("/transcribir", upload.single("audio"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se recibió audio" });
  const audioPath = req.file.path;
  const modelPath = path.join(__dirname, "..", "model", "vosk-model-small-es-0.42");
  try {
    const texto = await transcribirAudio(audioPath, modelPath);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    return res.json({ texto });
  } catch (e) {
    console.error("Error transcribiendo:", e);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    return res.status(500).json({ error: "Error al transcribir el audio" });
  }
});

/**
 * Post del  texto a datos clínicos estructurados, el groq mas el fallback local */

app.post("/structure", async (req, res) => {
  const rawText = String((req.body && req.body.rawText) || "").trim();
  if (!rawText) return res.status(400).json({ error: "rawText requerido" });

  if (process.env.GROQ_API_KEY) {
    try {
      const datos = await procesarConGroq(rawText);
      return res.json(datos);
    } catch (e) {
      console.error("[/structure] Groq falló, usando parser local:", e.message);
    }
  }

  // Fallback: parser local
  return res.json(parsearLocal(rawText));
});


// Diagnosticos y sugerencias por refraccion 

app.post("/diagnostico", (req, res) => {
  const { refraccion } = req.body;
  const sugerencias = [];
  if (refraccion) {
    if (parseFloat(refraccion.esf_od) < -0.5 || parseFloat(refraccion.esf_oi) < -0.5)
      sugerencias.push("Miopía detectada");
    if (parseFloat(refraccion.esf_od) > 0.5 || parseFloat(refraccion.esf_oi) > 0.5)
      sugerencias.push("Hipermetropía detectada");
  }
  if (!sugerencias.length) sugerencias.push("Sin hallazgos significativos");
  res.json({ sugerencias });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ia-service :${PORT} | Groq: ${process.env.GROQ_API_KEY ? "✓" : "✗ (parser local)"}`);
});
