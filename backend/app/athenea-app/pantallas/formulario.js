import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Switch, KeyboardAvoidingView,
  Platform, Alert, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { guardarHistoriaLocal } from '../baseDatosLite/basedatoslt';
import CONFIG from '../config';

const PASOS = ['Paciente', 'Anamnesis', 'Examen', 'Diagnóstico'];

const TURQUESA  = '#0B7B8B';
const OSCURO    = '#0D3B44';
const FONDO     = '#EEF4F6';
const BORDE     = '#D0E4E8';
const INPUT_BG  = '#F5F9FA';
const VERDE     = '#43A047';
const LABEL_COL = '#6A9BAB';
const OD_COLOR  = '#1565C0';
const OI_COLOR  = '#C62828';

// ─── Campo individual ───────────────────────────────────────────────────────
function Campo({ label, value, onChange, placeholder, keyboardType = 'default', multiline = false, editable = true, resaltado = false }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.campoLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMulti,
          !editable && styles.inputDesactivado,
          resaltado && styles.inputResaltado,
        ]}
        placeholder={placeholder}
        placeholderTextColor="#AAC4CC"
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        editable={editable}
      />
    </View>
  );
}

// ─── Banner IA ──────────────────────────────────────────────────────────────
function BannerIA({ texto }) {
  return (
    <View style={styles.bannerIA}>
      <Ionicons name="sparkles" size={14} color={TURQUESA} />
      <Text style={styles.bannerIATexto}>{texto}</Text>
    </View>
  );
}

export default function FormularioScreen({ route, navigation }) {
  const { textoIA, datosIA } = route.params || {};
  const [pasoActual, setPasoActual] = useState(0);

  // Paso 1
  const [nombre,    setNombre]    = useState('');
  const [cedula,    setCedula]    = useState('');
  const [fechaNac,  setFechaNac]  = useState('');
  const [edad,      setEdad]      = useState('');
  const [telefono,  setTelefono]  = useState('');
  const [ocupacion, setOcupacion] = useState('');
  const nroHistoria   = `HC-${Date.now()}`;
  const fechaConsulta = new Date().toLocaleDateString('es-ES');

  // Paso 2
  const [motivo,            setMotivo]       = useState('');
  const [tiempoEvolucion,   setTiempoEvo]    = useState('');
  const [antOcularPersonal, setAntOcPer]     = useState('');
  const [antOcularFamiliar, setAntOcFam]     = useState('');
  const [antMedicos,        setAntMed]       = useState('');
  const [usaLentes,         setUsaLentes]    = useState(false);
  const [tipoLentes,        setTipoLentes]   = useState('');
  const [medicamentos,      setMedicamentos] = useState('');

  // Paso 3
  const [avscOD, setAvscOD] = useState('');
  const [avscOI, setAvscOI] = useState('');
  const [avccOD, setAvccOD] = useState('');
  const [avccOI, setAvccOI] = useState('');
  const [esfOD,  setEsfOD]  = useState('');
  const [esfOI,  setEsfOI]  = useState('');
  const [cilOD,  setCilOD]  = useState('');
  const [cilOI,  setCilOI]  = useState('');
  const [ejeOD,  setEjeOD]  = useState('');
  const [ejeOI,  setEjeOI]  = useState('');
  const [addOD,  setAddOD]  = useState('');
  const [addOI,  setAddOI]  = useState('');
  const [pioOD,  setPioOD]  = useState('');
  const [pioOI,  setPioOI]  = useState('');
  const [ishaOD, setIshaOD] = useState('');
  const [ishaOI, setIshaOI] = useState('');

  // Paso 4
  const [diagPrincipal,  setDiagPrincipal]  = useState('');
  const [diagSecundario, setDiagSecundario] = useState('');
  const [prescripcion,   setPrescripcion]   = useState('');
  const [proximaCita,    setProximaCita]    = useState('');
  const [observaciones,  setObservaciones]  = useState('');

  // ─── Mapeo desde IA ────────────────────────────────────────────────────
  useEffect(() => {
    if (!datosIA) return;
    if (datosIA.paciente) {
      setNombre(datosIA.paciente.nombre    || '');
      setCedula(datosIA.paciente.cedula    || '');
      setTelefono(datosIA.paciente.telefono || '');
      setOcupacion(datosIA.paciente.ocupacion || '');
      setEdad(datosIA.paciente.edad        || '');
      setFechaNac(datosIA.paciente.fechaNac || '');
    }
    setMotivo(datosIA.motivo || datosIA.narrative || '');
    setTiempoEvo(datosIA.tiempoEvolucion   || '');
    setAntOcPer(datosIA.antOcularPersonal  || '');
    setAntOcFam(datosIA.antOcularFamiliar  || '');
    setAntMed(datosIA.antMedicos           || '');
    setMedicamentos(datosIA.medicamentos   || '');
    if (datosIA.usaLentes) setUsaLentes(true);
    setTipoLentes(datosIA.tipoLentes       || '');
    if (datosIA.visualAcuity) {
      setAvscOD(datosIA.visualAcuity.od   || '');
      setAvscOI(datosIA.visualAcuity.oi   || '');
      setAvccOD(datosIA.visualAcuity.ccOD || '');
      setAvccOI(datosIA.visualAcuity.ccOI || '');
    }
    if (datosIA.refraccion) {
      setEsfOD(datosIA.refraccion.esf_od || '');
      setEsfOI(datosIA.refraccion.esf_oi || '');
      setCilOD(datosIA.refraccion.cil_od || '');
      setCilOI(datosIA.refraccion.cil_oi || '');
      setEjeOD(datosIA.refraccion.eje_od || '');
      setEjeOI(datosIA.refraccion.eje_oi || '');
      setAddOD(datosIA.refraccion.add_od || '');
      setAddOI(datosIA.refraccion.add_oi || '');
    }
    if (datosIA.intraocularPressure) {
      setPioOD(datosIA.intraocularPressure.od || '');
      setPioOI(datosIA.intraocularPressure.oi || '');
    }
    if (datosIA.ishihara) {
      setIshaOD(datosIA.ishihara.od || '');
      setIshaOI(datosIA.ishihara.oi || '');
    }
    setObservaciones(datosIA.observations || '');
  }, [datosIA]);

  // ─── Guardar ───────────────────────────────────────────────────────────
const guardar = async () => {
    if (!nombre || !cedula || !motivo) {
      Alert.alert('Campos requeridos', 'Nombre, cédula y motivo de consulta son obligatorios.');
      return;
    }

    const historia = {
      paciente:    { nombre, cedula, fechaNac, edad, telefono, ocupacion, fechaConsulta, nroHistoria },
      anamnesis:   { motivo, tiempoEvolucion, antOcularPersonal, antOcularFamiliar, antMedicos, usaLentes, tipoLentes, medicamentos },
      examen:      { avscOD, avscOI, avccOD, avccOI, esfOD, esfOI, cilOD, cilOI, ejeOD, ejeOI, addOD, addOI, pioOD, pioOI, ishaOD, ishaOI },
      diagnostico: { diagPrincipal, diagSecundario, prescripcion, proximaCita, observaciones },
    };

    const id = `HC-${Date.now()}`;

    try {
      const token = await AsyncStorage.getItem('token');
      let guardadoEnNube = false;

      try {
        const resp = await fetch(`${CONFIG.CLINICAL_URL}/historias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
            especialista_email: await AsyncStorage.getItem('email') || '',
            paciente: {
              nombre:           historia.paciente.nombre,
              cedula:           historia.paciente.cedula,
              fecha_nacimiento: historia.paciente.fechaNac || null,
              telefono:         historia.paciente.telefono || '',
            },
            motivo_consulta: motivo,
            agudeza_visual: {
              ojo_derecho:    avscOD,
              ojo_izquierdo:  avscOI,
            },
            refraccion: {
              ojo_derecho:   { esferico: parseFloat(esfOD)||0, cilindrico: parseFloat(cilOD)||0, eje: parseFloat(ejeOD)||0 },
              ojo_izquierdo: { esferico: parseFloat(esfOI)||0, cilindrico: parseFloat(cilOI)||0, eje: parseFloat(ejeOI)||0 },
            },
            diagnostico:   diagPrincipal || '',
            tratamiento:   prescripcion  || '',
            observaciones: observaciones || '',
          }),
        });
        if (resp.ok) guardadoEnNube = true;
      } catch {
        // Sin internet — solo local
      }

      await guardarHistoriaLocal(id, { ...historia, sincronizado: guardadoEnNube ? 1 : 0 });

      Alert.alert(
        guardadoEnNube ? '✅ Historia guardada' : '📱 Guardada localmente',
        guardadoEnNube
          ? `La historia de ${nombre} fue guardada y sincronizada exitosamente.`
          : `La historia de ${nombre} fue guardada en el dispositivo. Se sincronizará al conectarse.`,
        [{
          text: guardadoEnNube ? '¡Perfecto!' : 'Entendido',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] }),
        }]
      );

    } catch {
      Alert.alert('Error', 'No se pudo guardar la historia clínica. Intenta de nuevo.');
    }
  };

  // ─── Render de cada paso ───────────────────────────────────────────────
  const renderPaso = () => {
    switch (pasoActual) {
      case 0:
        return (
          <View>
            <View style={styles.rowDos}>
              <Campo label="N° HISTORIA" value={nroHistoria} editable={false} placeholder="" onChange={() => {}} />
              <View style={{ width: 12 }} />
              <Campo label="FECHA CONSULTA" value={fechaConsulta} editable={false} placeholder="" onChange={() => {}} />
            </View>
            <Campo label="NOMBRE COMPLETO *" value={nombre} onChange={setNombre} placeholder="Nombre y apellido" resaltado={!!datosIA?.paciente?.nombre} />
            <Campo label="CÉDULA *" value={cedula} onChange={setCedula} placeholder="Número de cédula" keyboardType="numeric" resaltado={!!datosIA?.paciente?.cedula} />
            <View style={styles.rowDos}>
              <Campo label="FECHA NACIMIENTO" value={fechaNac} onChange={setFechaNac} placeholder="DD/MM/AAAA" />
              <View style={{ width: 12 }} />
              <Campo label="EDAD" value={edad} onChange={setEdad} placeholder="Años" keyboardType="numeric" resaltado={!!datosIA?.paciente?.edad} />
            </View>
            <Campo label="TELÉFONO" value={telefono} onChange={setTelefono} placeholder="Número de contacto" keyboardType="phone-pad" resaltado={!!datosIA?.paciente?.telefono} />
            <Campo label="OCUPACIÓN" value={ocupacion} onChange={setOcupacion} placeholder="Profesión u oficio" resaltado={!!datosIA?.paciente?.ocupacion} />
          </View>
        );

      case 1:
        return (
          <View>
            {datosIA?.motivo && <BannerIA texto="Anamnesis pre-rellenada por Athenea · Verifique los datos" />}
            <Campo label="MOTIVO DE CONSULTA *" value={motivo} onChange={setMotivo} placeholder="¿Por qué consulta el paciente?" multiline resaltado={!!datosIA?.motivo} />
            <Campo label="TIEMPO DE EVOLUCIÓN" value={tiempoEvolucion} onChange={setTiempoEvo} placeholder="Ej: 2 semanas, 1 mes..." resaltado={!!datosIA?.tiempoEvolucion} />
            <Campo label="ANTECEDENTES OCULARES PERSONALES" value={antOcularPersonal} onChange={setAntOcPer} placeholder="Cirugías, enfermedades previas..." multiline />
            <Campo label="ANTECEDENTES OCULARES FAMILIARES" value={antOcularFamiliar} onChange={setAntOcFam} placeholder="Glaucoma, cataratas, DM..." multiline />
            <Campo label="ANTECEDENTES MÉDICOS GENERALES" value={antMedicos} onChange={setAntMed} placeholder="Diabetes, hipertensión, alergias..." multiline />
            <View style={styles.switchFila}>
              <Text style={styles.campoLabel}>¿USA LENTES ACTUALMENTE?</Text>
              <Switch value={usaLentes} onValueChange={setUsaLentes} trackColor={{ false: '#ccc', true: TURQUESA }} thumbColor="#fff" />
            </View>
            {usaLentes && <Campo label="TIPO DE LENTES" value={tipoLentes} onChange={setTipoLentes} placeholder="Monofocales, bifocales, contacto..." />}
            <Campo label="MEDICAMENTOS ACTUALES" value={medicamentos} onChange={setMedicamentos} placeholder="Ninguno o liste los medicamentos" resaltado={!!datosIA?.medicamentos} />
          </View>
        );

      case 2:
        return (
          <View>
            {datosIA?.visualAcuity?.od && <BannerIA texto="Datos del examen pre-rellenados por IA · Verifica" />}

            <Text style={styles.subtituloSeccion}>AGUDEZA VISUAL SIN CORRECCIÓN (AVSC)</Text>
            <View style={styles.filaOjos}>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OD_COLOR }]}>OD</Text>
                <TextInput style={[styles.ojoInput, datosIA?.visualAcuity?.od && styles.inputResaltado]} placeholder="20/__" value={avscOD} onChangeText={setAvscOD} />
              </View>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OI_COLOR }]}>OI</Text>
                <TextInput style={[styles.ojoInput, datosIA?.visualAcuity?.oi && styles.inputResaltado]} placeholder="20/__" value={avscOI} onChangeText={setAvscOI} />
              </View>
            </View>

            <Text style={styles.subtituloSeccion}>AGUDEZA VISUAL CON CORRECCIÓN (AVCC)</Text>
            <View style={styles.filaOjos}>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OD_COLOR }]}>OD</Text>
                <TextInput style={[styles.ojoInput, datosIA?.visualAcuity?.ccOD && styles.inputResaltado]} placeholder="20/__" value={avccOD} onChangeText={setAvccOD} />
              </View>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OI_COLOR }]}>OI</Text>
                <TextInput style={[styles.ojoInput, datosIA?.visualAcuity?.ccOI && styles.inputResaltado]} placeholder="20/__" value={avccOI} onChangeText={setAvccOI} />
              </View>
            </View>

            <Text style={styles.subtituloSeccion}>REFRACCIÓN</Text>
            <View style={styles.tablaRefraccion}>
              <View style={[styles.tablaFila, styles.tablaHeader]}>
                <Text style={[styles.tablaCelda, styles.tablaCeldaNombre]}></Text>
                <Text style={[styles.tablaCelda, styles.tablaHeaderOD]}>OD</Text>
                <Text style={[styles.tablaCelda, styles.tablaHeaderOI]}>OI</Text>
              </View>
              {[
                { label: 'Esférico',   odV: esfOD, odS: setEsfOD, oiV: esfOI, oiS: setEsfOI },
                { label: 'Cilíndrico', odV: cilOD, odS: setCilOD, oiV: cilOI, oiS: setCilOI },
                { label: 'Eje',        odV: ejeOD, odS: setEjeOD, oiV: ejeOI, oiS: setEjeOI },
                { label: 'ADD',        odV: addOD, odS: setAddOD, oiV: addOI, oiS: setAddOI },
              ].map(({ label, odV, odS, oiV, oiS }) => (
                <View key={label} style={[styles.tablaFila, styles.tablaFilaDato]}>
                  <Text style={[styles.tablaCelda, styles.tablaCeldaNombre]}>{label}</Text>
                  <View style={[styles.tablaCelda, styles.tablaCeldaInputWrap]}>
                    <Text style={{ color: OD_COLOR, fontSize: 10, fontWeight: '700' }}>OD </Text>
                    <TextInput style={styles.tablaCeldaInput} placeholder="+/- 0.00" keyboardType="decimal-pad" value={odV} onChangeText={odS} />
                  </View>
                  <View style={[styles.tablaCelda, styles.tablaCeldaInputWrap, { borderLeftWidth: 1, borderLeftColor: BORDE }]}>
                    <Text style={{ color: OI_COLOR, fontSize: 10, fontWeight: '700' }}>OI </Text>
                    <TextInput style={styles.tablaCeldaInput} placeholder="+/- 0.00" keyboardType="decimal-pad" value={oiV} onChangeText={oiS} />
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.subtituloSeccion}>PRESIÓN INTRAOCULAR (PIO)</Text>
            <View style={styles.filaOjos}>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OD_COLOR }]}>OD</Text>
                <TextInput style={[styles.ojoInput, datosIA?.intraocularPressure?.od && styles.inputResaltado]} placeholder="mmHg" keyboardType="decimal-pad" value={pioOD} onChangeText={setPioOD} />
              </View>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OI_COLOR }]}>OI</Text>
                <TextInput style={[styles.ojoInput, datosIA?.intraocularPressure?.oi && styles.inputResaltado]} placeholder="mmHg" keyboardType="decimal-pad" value={pioOI} onChangeText={setPioOI} />
              </View>
            </View>

            <Text style={styles.subtituloSeccion}>VISIÓN DE COLOR — ISHIHARA</Text>
            <View style={styles.filaOjos}>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OD_COLOR }]}>OD</Text>
                <TextInput style={styles.ojoInput} placeholder="Normal/Alterada" value={ishaOD} onChangeText={setIshaOD} />
              </View>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OI_COLOR }]}>OI</Text>
                <TextInput style={styles.ojoInput} placeholder="Normal/Alterada" value={ishaOI} onChangeText={setIshaOI} />
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            <View style={styles.badgeEspecialista}>
              <Ionicons name="lock-closed" size={14} color="#E65100" />
              <Text style={styles.badgeTexto}>Sección exclusiva del especialista · La IA no interviene en el diagnóstico</Text>
            </View>
            <Campo label="DIAGNÓSTICO PRINCIPAL *" value={diagPrincipal} onChange={setDiagPrincipal} placeholder="Diagnóstico principal..." multiline />
            <Campo label="DIAGNÓSTICO SECUNDARIO" value={diagSecundario} onChange={setDiagSecundario} placeholder="Si aplica..." multiline />
            <Campo label="PRESCRIPCIÓN DE LENTES" value={prescripcion} onChange={setPrescripcion} placeholder="Detalle si aplica..." multiline />
            <Campo label="PRÓXIMA CITA" value={proximaCita} onChange={setProximaCita} placeholder="DD/MM/AAAA" />
            <Campo label="OBSERVACIONES ADICIONALES" value={observaciones} onChange={setObservaciones} placeholder="Observaciones, recomendaciones..." multiline />
            {textoIA ? (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.campoLabel, { color: '#AAC4CC' }]}>TEXTO DICTADO (REFERENCIA)</Text>
                <Text style={styles.textoIARef}>{textoIA}</Text>
              </View>
            ) : null}
          </View>
        );
    }
  };

  const paddingTop = Platform.OS === 'android' ? 48 : 60;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      {/* Header gradiente */}
      <LinearGradient
        colors={[OSCURO, TURQUESA]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: paddingTop + 8 }]}
      >
        <View style={styles.headerFila}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Historia Clínica</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Wizard */}
        <View style={styles.wizard}>
          {PASOS.map((nombre, index) => {
            const listo   = pasoActual > index;
            const activo  = pasoActual === index;
            const futuro  = pasoActual < index;
            return (
              <React.Fragment key={index}>
                <TouchableOpacity style={styles.wizardPaso} onPress={() => listo && setPasoActual(index)}>
                  <View style={[
                    styles.wizardCirculo,
                    listo  && styles.wizardListo,
                    activo && styles.wizardActivo,
                    futuro && styles.wizardFuturo,
                  ]}>
                    {listo
                      ? <Ionicons name="checkmark" size={14} color="#fff" />
                      : <Text style={[styles.wizardNum, activo && { color: TURQUESA }]}>{index + 1}</Text>}
                  </View>
                  <Text style={[styles.wizardLabel, activo && styles.wizardLabelActivo, listo && styles.wizardLabelListo]}>
                    {nombre}
                  </Text>
                </TouchableOpacity>
                {index < PASOS.length - 1 && (
                  <View style={[styles.wizardLinea, listo && styles.wizardLineaActiva]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </LinearGradient>

      {/* Contenido */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderPaso()}
      </ScrollView>

      {/* Botones */}
      <View style={styles.botonesBar}>
        {pasoActual > 0 ? (
          <TouchableOpacity style={styles.btnAnterior} onPress={() => setPasoActual(p => p - 1)}>
            <Ionicons name="chevron-back" size={16} color={TURQUESA} />
            <Text style={styles.btnAnteriorTexto}>Anterior</Text>
          </TouchableOpacity>
        ) : <View style={{ flex: 1 }} />}

        {pasoActual < PASOS.length - 1 ? (
          <TouchableOpacity style={styles.btnSiguiente} onPress={() => setPasoActual(p => p + 1)}>
            <Text style={styles.btnSiguienteTexto}>Siguiente</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
            <Ionicons name="save-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.btnGuardarTexto}>Guardar Historia</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:      { paddingHorizontal: 16, paddingBottom: 16 },
  headerFila:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn:     { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitulo: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#fff' },

  wizard:         { flexDirection: 'row', alignItems: 'center' },
  wizardPaso:     { alignItems: 'center', flex: 0 },
  wizardCirculo:  { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'transparent' },
  wizardListo:    { backgroundColor: VERDE, borderColor: VERDE },
  wizardActivo:   { backgroundColor: '#fff', borderColor: '#fff' },
  wizardFuturo:   { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)' },
  wizardNum:      { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  wizardLabel:    { fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 3, textAlign: 'center' },
  wizardLabelActivo: { color: '#fff', fontWeight: '700' },
  wizardLabelListo:  { color: 'rgba(255,255,255,0.8)' },
  wizardLinea:    { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 12 },
  wizardLineaActiva: { backgroundColor: VERDE },

  scroll:        { flex: 1, backgroundColor: FONDO },
  scrollContent: { padding: 16, paddingBottom: 100 },

  campo:     { marginBottom: 14 },
  campoLabel: { fontSize: 10, fontWeight: '700', color: LABEL_COL, letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  input:      { backgroundColor: INPUT_BG, borderWidth: 1.5, borderColor: BORDE, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: OSCURO },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  inputDesactivado: { backgroundColor: '#E8F0F2', color: '#8AAAB5' },
  inputResaltado:   { borderColor: TURQUESA, backgroundColor: '#EAF7F8' },

  rowDos:   { flexDirection: 'row' },

  switchFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },

  subtituloSeccion: { fontSize: 11, fontWeight: '700', color: TURQUESA, letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },

  filaOjos:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  ojoCard:   { flex: 1, backgroundColor: INPUT_BG, borderWidth: 1.5, borderColor: BORDE, borderRadius: 14, padding: 12 },
  ojoLabel:  { fontSize: 11, fontWeight: '800', marginBottom: 6 },
  ojoInput:  { fontSize: 14, color: OSCURO, borderBottomWidth: 1, borderBottomColor: BORDE, paddingBottom: 4 },

  tablaRefraccion:   { backgroundColor: INPUT_BG, borderWidth: 1.5, borderColor: BORDE, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  tablaFila:         { flexDirection: 'row' },
  tablaHeader:       { backgroundColor: '#E2EEF0' },
  tablaFilaDato:     { borderTopWidth: 1, borderTopColor: BORDE },
  tablaCelda:        { flex: 1, padding: 10 },
  tablaCeldaNombre:  { fontWeight: '600', color: '#547D8A', fontSize: 13 },
  tablaHeaderOD:     { fontWeight: '700', color: OD_COLOR, fontSize: 12 },
  tablaHeaderOI:     { fontWeight: '700', color: OI_COLOR, fontSize: 12 },
  tablaCeldaInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 8 },
  tablaCeldaInput:   { flex: 1, fontSize: 13, color: OSCURO },

  badgeEspecialista: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', borderRadius: 12, padding: 12, marginBottom: 16, gap: 8, borderWidth: 1, borderColor: '#FFE0B2' },
  badgeTexto:        { color: '#E65100', fontSize: 12, fontWeight: '600', flex: 1 },

  textoIARef: { fontStyle: 'italic', color: '#8AAAB5', fontSize: 12, lineHeight: 18, marginTop: 4 },

  botonesBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingBottom: Platform.OS === 'android' ? 24 : 34, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: BORDE, gap: 10 },
  btnAnterior:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 1.5, borderColor: TURQUESA, borderRadius: 14 },
  btnAnteriorTexto: { color: TURQUESA, fontWeight: '700', fontSize: 14 },
  btnSiguiente:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: TURQUESA, borderRadius: 14 },
  btnSiguienteTexto: { color: '#fff', fontWeight: '700', fontSize: 14, marginRight: 4 },
  btnGuardar:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: VERDE, borderRadius: 14 },
  btnGuardarTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});