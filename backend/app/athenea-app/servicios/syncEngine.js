import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { obtenerHistoriasPendientes, marcarComoSincronizada } from '../baseDatosLite/basedatoslt';
import CONFIG from '../config';

let intervalo = null;
let sincronizandoAhora = false;

// ─── Función principal de sincronización ───────────────────────────────────
export async function sincronizarPendientes() {
  console.log('INICIANDO SYNC...');
  if (sincronizandoAhora) return { success: false, message: 'Ya sincronizando' };
  const estado = await NetInfo.fetch();
  if (!estado.isConnected) {
    return { success: false, message: 'Sin conexión a internet' };
  }

  const pendientes = await obtenerHistoriasPendientes();
  if (pendientes.length === 0) {
    return { success: true, message: 'Todo al día', subidos: 0 };
  }

  sincronizandoAhora = true;
  const token = await AsyncStorage.getItem('token');
  let subidos = 0;
  let fallos = 0;
function convertirFecha(fechaStr) {
    if (!fechaStr) return null;
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      return new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
    }
    return null;
  }

 for (const registro of pendientes) {
    try {
      const datosParaSubir = JSON.parse(registro.datos);
      const paciente    = datosParaSubir.paciente    || {};
      const anamnesis   = datosParaSubir.anamnesis   || {};
      const examen      = datosParaSubir.examen      || {};
      const diagnostico = datosParaSubir.diagnostico || {};

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const respuesta = await fetch(`${CONFIG.CLINICAL_URL}/historias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          paciente: {
            nombre:           paciente.nombre   || '',
            cedula:           paciente.cedula   || '',
    fecha_nacimiento: paciente.fechaNac ? convertirFecha(paciente.fechaNac) : null,
            telefono:         paciente.telefono || '',
          },
          motivo_consulta: anamnesis.motivo || '',
          agudeza_visual: {
            ojo_derecho:   examen.avscOD || '',
            ojo_izquierdo: examen.avscOI || '',
          },
          refraccion: {
            ojo_derecho:   { esferico: parseFloat(examen.esfOD)||0, cilindrico: parseFloat(examen.cilOD)||0, eje: parseFloat(examen.ejeOD)||0 },
            ojo_izquierdo: { esferico: parseFloat(examen.esfOI)||0, cilindrico: parseFloat(examen.cilOI)||0, eje: parseFloat(examen.ejeOI)||0 },
          },
          diagnostico:   diagnostico.diagPrincipal || '',
          tratamiento:   diagnostico.prescripcion  || '',
          observaciones: diagnostico.observaciones || '',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

     console.log('RESPUESTA SYNC:', respuesta.status, respuesta.ok);
      if (respuesta.ok) {
        await marcarComoSincronizada(registro.id);
        subidos++;
      } else {
        const txt = await respuesta.text();
        console.log('ERROR RESPUESTA:', txt);
        fallos++;
      }
} catch (e) {
      console.log('ERROR SYNC REGISTRO:', e.message);
      fallos++;
    }
  }

  sincronizandoAhora = false;

  if (subidos > 0) {
    const ahora = new Date().toLocaleString('es-VE');
    await AsyncStorage.setItem('ultima_sincronizacion', ahora);
  }

  return {
    success: true,
    subidos,
    fallos,
    message: subidos > 0
      ? `✓ ${subidos} historia(s) sincronizada(s)`
      : `✗ ${fallos} historia(s) sin conexión — se reintentará`,
  };
}

// Alias
export const sincronizarAhora = sincronizarPendientes;

// ─── Auto-sync cada 60 segundos ────────────────────────────────────────────
export function iniciarAutoSync() {
  if (intervalo) return;
  intervalo = setInterval(() => {
    sincronizarPendientes().catch(() => {});
  }, 60_000);
}

export function detenerAutoSync() {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
  }
}

// ─── Objeto para usar como syncEngine.iniciar() / syncEngine.detener() ────
export const syncEngine = {
  iniciar: iniciarAutoSync,
  detener: detenerAutoSync,
};
