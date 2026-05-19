import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORES from '../constantes/colores';

const OD = '#1565C0';
const OI = '#C62828';

function filaTabla(label, od, oi) {
  if (!od && !oi) return '';
  return `
    <tr>
      <td class="label-cell">${label}</td>
      <td class="od-cell">${od || '—'}</td>
      <td class="oi-cell">${oi || '—'}</td>
    </tr>`;
}

function generarHTML({ especialista, paciente, examen, anamnesis, diagnostico, fecha, nroHistoria }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receta Óptica — ${paciente.nombre}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 32px; font-size: 13px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #0B7B8B; margin-bottom: 24px; }
    .logo-area { display: flex; align-items: center; gap: 14px; }
    .logo-circle { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #0D3B44, #0B7B8B); display: flex; align-items: center; justify-content: center; }
    .logo-eye { font-size: 26px; }
    .logo-text h1 { font-size: 22px; font-weight: 800; color: #0B7B8B; letter-spacing: 3px; }
    .logo-text p { font-size: 11px; color: #6A9BAB; margin-top: 2px; }
    .header-right { text-align: right; }
    .header-right h3 { font-size: 14px; font-weight: 700; color: #0D3B44; }
    .header-right p { font-size: 11px; color: #6A9BAB; margin-top: 2px; }

    /* Especialista */
    .especialista-bar { background: #EAF4F5; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .esp-nombre { font-size: 14px; font-weight: 700; color: #0D3B44; }
    .esp-data { font-size: 11px; color: #6A9BAB; margin-top: 2px; }
    .esp-right { text-align: right; font-size: 11px; color: #6A9BAB; }

    /* Secciones */
    .seccion { margin-bottom: 20px; }
    .seccion-titulo { font-size: 10px; font-weight: 700; color: #0B7B8B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #C8E6EA; }

    /* Paciente grid */
    .paciente-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .dato-item { background: #F5F9FA; border-radius: 8px; padding: 10px 12px; }
    .dato-label { font-size: 9px; font-weight: 700; color: #6A9BAB; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .dato-valor { font-size: 13px; font-weight: 600; color: #0D3B44; }

    /* Motivo */
    .motivo-box { background: #F5F9FA; border-radius: 8px; padding: 12px; border-left: 3px solid #0B7B8B; }
    .motivo-texto { font-size: 13px; color: #0D3B44; line-height: 1.5; }

    /* Tabla refracción */
    table { width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; }
    th { padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    th:first-child { background: #EAF4F5; color: #6A9BAB; text-align: left; }
    th.od { background: #EEF4FF; color: ${OD}; }
    th.oi { background: #FFF0F0; color: ${OI}; }
    td { padding: 10px 12px; border-top: 1px solid #EAF4F5; }
    .label-cell { font-weight: 600; color: #547D8A; background: #F8FBFC; }
    .od-cell { text-align: center; color: ${OD}; font-weight: 700; background: #F5F8FF; }
    .oi-cell { text-align: center; color: ${OI}; font-weight: 700; background: #FFF8F8; }

    /* AV */
    .av-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .av-card { background: #F5F9FA; border-radius: 8px; padding: 10px; text-align: center; }
    .av-label { font-size: 9px; color: #6A9BAB; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
    .av-od { font-size: 15px; font-weight: 800; color: ${OD}; }
    .av-oi { font-size: 15px; font-weight: 800; color: ${OI}; }

    /* Diagnóstico */
    .dx-box { background: #F0FFF4; border-radius: 8px; padding: 12px; border-left: 3px solid #43A047; margin-bottom: 10px; }
    .dx-label { font-size: 9px; font-weight: 700; color: #43A047; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .dx-texto { font-size: 13px; color: #0D3B44; line-height: 1.5; }
    .presc-box { background: #FFF8E1; border-radius: 8px; padding: 12px; border-left: 3px solid #FF8F00; }
    .presc-label { font-size: 9px; font-weight: 700; color: #FF8F00; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }

    /* Footer */
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #C8E6EA; display: flex; justify-content: space-between; align-items: flex-end; }
    .firma-area { text-align: center; }
    .firma-linea { width: 180px; border-top: 1px solid #0D3B44; margin: 0 auto 6px; }
    .firma-texto { font-size: 11px; color: #547D8A; }
    .footer-info { text-align: right; font-size: 10px; color: #9DB4BA; line-height: 1.6; }
    .nro-historia { background: #0B7B8B; color: #fff; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; display: inline-block; margin-bottom: 4px; }

    /* Badge válido */
    .validez { background: #EAF4F5; border-radius: 6px; padding: 6px 12px; font-size: 10px; color: #6A9BAB; text-align: center; margin-top: 12px; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      <div class="logo-circle"><span class="logo-eye">👁</span></div>
      <div class="logo-text">
        <h1>ATHENEA</h1>
        <p>Sistema de Optometría con IA</p>
      </div>
    </div>
    <div class="header-right">
      <h3>Receta Óptica</h3>
      <p>Fecha: ${fecha}</p>
      <p style="margin-top:4px"><span class="nro-historia">${nroHistoria}</span></p>
    </div>
  </div>

  <!-- Especialista -->
  <div class="especialista-bar">
    <div>
      <div class="esp-nombre">${especialista.nombre || 'Especialista'}</div>
      <div class="esp-data">Optometrista${especialista.especialidad ? ' · ' + especialista.especialidad : ''}</div>
    </div>
    <div class="esp-right">
      ${especialista.cedula ? '<div>C.I. ' + especialista.cedula + '</div>' : ''}
      ${especialista.telefono ? '<div>' + especialista.telefono + '</div>' : ''}
      ${especialista.consultorio ? '<div>' + especialista.consultorio + '</div>' : ''}
    </div>
  </div>

  <!-- Paciente -->
  <div class="seccion">
    <div class="seccion-titulo">Datos del Paciente</div>
    <div class="paciente-grid">
      <div class="dato-item">
        <div class="dato-label">Nombre completo</div>
        <div class="dato-valor">${paciente.nombre || '—'}</div>
      </div>
      <div class="dato-item">
        <div class="dato-label">Cédula</div>
        <div class="dato-valor">${paciente.cedula || '—'}</div>
      </div>
      ${paciente.edad ? `<div class="dato-item"><div class="dato-label">Edad</div><div class="dato-valor">${paciente.edad} años</div></div>` : ''}
      ${paciente.fechaNac ? `<div class="dato-item"><div class="dato-label">Fecha de nacimiento</div><div class="dato-valor">${paciente.fechaNac}</div></div>` : ''}
      ${paciente.telefono ? `<div class="dato-item"><div class="dato-label">Teléfono</div><div class="dato-valor">${paciente.telefono}</div></div>` : ''}
      ${paciente.ocupacion ? `<div class="dato-item"><div class="dato-label">Ocupación</div><div class="dato-valor">${paciente.ocupacion}</div></div>` : ''}
    </div>
  </div>

  <!-- Motivo -->
  ${anamnesis?.motivo ? `
  <div class="seccion">
    <div class="seccion-titulo">Motivo de Consulta</div>
    <div class="motivo-box">
      <div class="motivo-texto">${anamnesis.motivo}</div>
    </div>
  </div>` : ''}

  <!-- Agudeza Visual -->
  ${(examen?.avscOD || examen?.avscOI || examen?.avccOD || examen?.avccOI) ? `
  <div class="seccion">
    <div class="seccion-titulo">Agudeza Visual</div>
    <div class="av-grid">
      ${examen?.avscOD || examen?.avscOI ? `
      <div class="av-card">
        <div class="av-label">SC — OD</div>
        <div class="av-od">${examen.avscOD || '—'}</div>
      </div>
      <div class="av-card">
        <div class="av-label">SC — OI</div>
        <div class="av-oi">${examen.avscOI || '—'}</div>
      </div>` : ''}
      ${examen?.avccOD || examen?.avccOI ? `
      <div class="av-card">
        <div class="av-label">CC — OD</div>
        <div class="av-od">${examen.avccOD || '—'}</div>
      </div>` : ''}
    </div>
  </div>` : ''}

  <!-- Refracción -->
  ${(examen?.esfOD || examen?.esfOI || examen?.cilOD || examen?.cilOI) ? `
  <div class="seccion">
    <div class="seccion-titulo">Refracción</div>
    <table>
      <thead>
        <tr>
          <th></th>
          <th class="od">Ojo Derecho (OD)</th>
          <th class="oi">Ojo Izquierdo (OI)</th>
        </tr>
      </thead>
      <tbody>
        ${filaTabla('Esférico',   examen.esfOD, examen.esfOI)}
        ${filaTabla('Cilíndrico', examen.cilOD, examen.cilOI)}
        ${filaTabla('Eje',        examen.ejeOD ? examen.ejeOD + '°' : '', examen.ejeOI ? examen.ejeOI + '°' : '')}
        ${filaTabla('Adición',    examen.addOD, examen.addOI)}
        ${filaTabla('PIO',        examen.pioOD ? examen.pioOD + ' mmHg' : '', examen.pioOI ? examen.pioOI + ' mmHg' : '')}
      </tbody>
    </table>
  </div>` : ''}

  <!-- Diagnóstico -->
  <div class="seccion">
    <div class="seccion-titulo">Diagnóstico y Prescripción</div>
    ${diagnostico?.diagPrincipal ? `
    <div class="dx-box">
      <div class="dx-label">Diagnóstico principal</div>
      <div class="dx-texto">${diagnostico.diagPrincipal}</div>
    </div>` : ''}
    ${diagnostico?.prescripcion ? `
    <div class="presc-box" style="margin-top:10px">
      <div class="presc-label">Prescripción de lentes</div>
      <div class="dx-texto">${diagnostico.prescripcion}</div>
    </div>` : ''}
    ${diagnostico?.proximaCita ? `
    <div style="margin-top:10px; font-size:12px; color:#547D8A;">
      <strong>Próxima cita:</strong> ${diagnostico.proximaCita}
    </div>` : ''}
    ${diagnostico?.observaciones ? `
    <div style="margin-top:8px; font-size:12px; color:#547D8A;">
      <strong>Observaciones:</strong> ${diagnostico.observaciones}
    </div>` : ''}
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="firma-area">
      <div class="firma-linea"></div>
      <div class="firma-texto">${especialista.nombre || 'Especialista'}</div>
      <div class="firma-texto" style="color:#0B7B8B">Optometrista</div>
    </div>
    <div class="footer-info">
      <div>Generado con ATHENEA IA</div>
      <div>${fecha}</div>
      <div>${nroHistoria}</div>
    </div>
  </div>

  <div class="validez">
    Esta receta óptica tiene validez de 12 meses a partir de la fecha de emisión.
  </div>

</body>
</html>`;
}

export default function GenerarRecetaScreen({ route, navigation }) {
  const { historia } = route.params || {};
  const [generando,    setGenerando]    = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [especialista, setEspecialista] = useState({});

  useEffect(() => {
    async function cargarEspecialista() {
      try {
        const raw = await AsyncStorage.getItem('perfil_especialista');
        if (raw) setEspecialista(JSON.parse(raw));
        else {
          const nombre = await AsyncStorage.getItem('nombre') || '';
          const email  = await AsyncStorage.getItem('email')  || '';
          setEspecialista({ nombre, email });
        }
      } catch {}
    }
    cargarEspecialista();
  }, []);

  if (!historia) {
    return (
      <View style={styles.raiz}>
        <Text style={{ textAlign: 'center', marginTop: 100, color: COLORES.mutedForeground }}>
          No se recibieron datos de la historia.
        </Text>
      </View>
    );
  }

  const { paciente, anamnesis, examen, diagnostico } = historia;
  const fecha      = paciente?.fechaConsulta || new Date().toLocaleDateString('es-ES');
  const nroHistoria = paciente?.nroHistoria  || `HC-${Date.now()}`;

  async function generarPDF() {
    setGenerando(true);
    try {
      const html = generarHTML({ especialista, paciente, examen, anamnesis, diagnostico, fecha, nroHistoria });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      setGenerando(false);

      // Compartir directamente
      setCompartiendo(true);
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Receta — ${paciente?.nombre || 'Paciente'}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setGenerando(false);
      setCompartiendo(false);
    }
  }

  async function imprimirDirecto() {
    setGenerando(true);
    try {
      const html = generarHTML({ especialista, paciente, examen, anamnesis, diagnostico, fecha, nroHistoria });
      await Print.printAsync({ html });
    } catch {
      Alert.alert('Error', 'No se pudo abrir la impresora.');
    } finally {
      setGenerando(false);
    }
  }

  const paddingTop = Platform.OS === 'android' ? 48 : 60;

  return (
    <View style={styles.raiz}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[COLORES.gradienteInicio, COLORES.gradienteMedio]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: paddingTop + 8 }]}
      >
        <View style={styles.headerFila}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Generar Receta</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Preview de la receta */}
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={styles.previewLogo}>
              <Ionicons name="eye-outline" size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.previewTitulo}>ATHENEA</Text>
              <Text style={styles.previewSub}>Receta Óptica</Text>
            </View>
            <Text style={styles.previewFecha}>{fecha}</Text>
          </View>

          <View style={styles.previewSep} />

          <SeccionPreview titulo="Paciente">
            <FilaPreview label="Nombre"  valor={paciente?.nombre} />
            <FilaPreview label="Cédula"  valor={paciente?.cedula} />
            <FilaPreview label="Edad"    valor={paciente?.edad ? `${paciente.edad} años` : null} />
            <FilaPreview label="Teléfono" valor={paciente?.telefono} />
          </SeccionPreview>

          {(examen?.esfOD || examen?.esfOI) && (
            <SeccionPreview titulo="Refracción">
              <View style={styles.tablaPreview}>
                <View style={styles.tablaHeaderFila}>
                  <Text style={[styles.tablaTh, { flex: 1.2 }]}></Text>
                  <Text style={[styles.tablaTh, { color: OD }]}>OD</Text>
                  <Text style={[styles.tablaTh, { color: OI }]}>OI</Text>
                </View>
                {[
                  { l: 'Esf', od: examen.esfOD, oi: examen.esfOI },
                  { l: 'Cil', od: examen.cilOD, oi: examen.cilOI },
                  { l: 'Eje', od: examen.ejeOD, oi: examen.ejeOI },
                  { l: 'ADD', od: examen.addOD, oi: examen.addOI },
                ].filter(r => r.od || r.oi).map(({ l, od, oi }) => (
                  <View key={l} style={styles.tablaFila}>
                    <Text style={[styles.tablaTd, { flex: 1.2, color: COLORES.mutedForeground }]}>{l}</Text>
                    <Text style={[styles.tablaTd, { color: OD, fontWeight: '700' }]}>{od || '—'}</Text>
                    <Text style={[styles.tablaTd, { color: OI, fontWeight: '700' }]}>{oi || '—'}</Text>
                  </View>
                ))}
              </View>
            </SeccionPreview>
          )}

          {diagnostico?.diagPrincipal && (
            <SeccionPreview titulo="Diagnóstico">
              <Text style={styles.diagTexto}>{diagnostico.diagPrincipal}</Text>
              {diagnostico?.prescripcion && <Text style={[styles.diagTexto, { color: COLORES.mutedForeground, marginTop: 4 }]}>Prescripción: {diagnostico.prescripcion}</Text>}
            </SeccionPreview>
          )}

          <View style={styles.previewSep} />
          <Text style={styles.previewFirma}>— {especialista.nombre || 'Especialista'} · Optometrista</Text>
        </View>

        {/* Botones de acción */}
        <TouchableOpacity
          style={[styles.btnPDF, (generando || compartiendo) && { opacity: 0.7 }]}
          onPress={generarPDF}
          disabled={generando || compartiendo}
        >
          <LinearGradient
            colors={[COLORES.primario, COLORES.gradienteFin]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.btnGrad}
          >
            {generando || compartiendo
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="share-outline" size={20} color="#fff" />
                  <Text style={styles.btnTexto}>Generar y compartir PDF</Text>
                </>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnImprimir, generando && { opacity: 0.7 }]}
          onPress={imprimirDirecto}
          disabled={generando}
        >
          <Ionicons name="print-outline" size={18} color={COLORES.primario} />
          <Text style={styles.btnImprimirTexto}>Imprimir directamente</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

function SeccionPreview({ titulo, children }) {
  return (
    <View style={styles.seccionPreview}>
      <Text style={styles.seccionPreviewTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

function FilaPreview({ label, valor }) {
  if (!valor) return null;
  return (
    <View style={styles.filaPreview}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={styles.filaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz:    { flex: 1, backgroundColor: COLORES.fondo },
  header:  { paddingHorizontal: 16, paddingBottom: 16 },
  headerFila: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitulo: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#fff' },

  scroll:  { padding: 16, paddingBottom: 60 },

  previewCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  previewLogo: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORES.primario, justifyContent: 'center', alignItems: 'center' },
  previewTitulo: { fontSize: 16, fontWeight: '800', color: COLORES.primario, letterSpacing: 2 },
  previewSub:    { fontSize: 11, color: COLORES.mutedForeground },
  previewFecha:  { marginLeft: 'auto', fontSize: 11, color: COLORES.mutedForeground },
  previewSep:    { height: 1, backgroundColor: COLORES.borde, marginVertical: 12 },
  previewFirma:  { fontSize: 12, color: COLORES.mutedForeground, textAlign: 'center', fontStyle: 'italic' },

  seccionPreview:      { marginBottom: 14 },
  seccionPreviewTitulo: { fontSize: 10, fontWeight: '700', color: COLORES.primario, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },

  filaPreview: { flexDirection: 'row', paddingVertical: 4 },
  filaLabel:   { width: 90, fontSize: 12, color: COLORES.mutedForeground },
  filaValor:   { flex: 1, fontSize: 12, color: COLORES.foreground, fontWeight: '600' },

  tablaPreview:   { borderWidth: 1, borderColor: COLORES.borde, borderRadius: 10, overflow: 'hidden' },
  tablaHeaderFila: { flexDirection: 'row', backgroundColor: COLORES.muted, paddingVertical: 8, paddingHorizontal: 10 },
  tablaFila:      { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: COLORES.borde },
  tablaTh:        { flex: 1, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  tablaTd:        { flex: 1, fontSize: 12, textAlign: 'center' },

  diagTexto: { fontSize: 13, color: COLORES.foreground, lineHeight: 20 },

  btnPDF:      { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  btnGrad:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  btnTexto:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnImprimir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORES.primario, borderRadius: 16, paddingVertical: 14 },
  btnImprimirTexto: { color: COLORES.primario, fontWeight: '700', fontSize: 15 },
});