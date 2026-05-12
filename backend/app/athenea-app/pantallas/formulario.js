import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Switch, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { guardarHistoriaLocal } from '../baseDatosLite/basedatoslt';
import CONFIG from '../config';

const PASOS = ['Paciente', 'Anamnesis', 'Examen', 'Diagnóstico'];

export default function FormularioScreen({ route, navigation }) {
  const { textoIA, datosIA } = route.params || {};

  const [pasoActual, setPasoActual] = useState(0);

  const [nombre, setNombre]               = useState('');
  const [cedula, setCedula]               = useState('');
  const [fechaNac, setFechaNac]           = useState('');
  const [edad, setEdad]                   = useState('');
  const [telefono, setTelefono]           = useState('');
  const [ocupacion, setOcupacion]         = useState('');
  const nroHistoria                       = `HC-${Date.now()}`;
  const fechaConsulta                     = new Date().toLocaleDateString('es-ES');

  const [motivo, setMotivo]               = useState('');
  const [tiempoEvolucion, setTiempoEvo]  = useState('');
  const [antOcularPersonal, setAntOcPer] = useState('');
  const [antOcularFamiliar, setAntOcFam] = useState('');
  const [antMedicos, setAntMed]          = useState('');
  const [usaLentes, setUsaLentes]        = useState(false);
  const [tipoLentes, setTipoLentes]      = useState('');
  const [medicamentos, setMedicamentos]  = useState('');

  const [avscOD, setAvscOD] = useState('');
  const [avscOI, setAvscOI] = useState('');
  const [avccOD, setAvccOD] = useState('');
  const [avccOI, setAvccOI] = useState('');
  const [esfOD, setEsfOD]   = useState('');
  const [esfOI, setEsfOI]   = useState('');
  const [cilOD, setCilOD]   = useState('');
  const [cilOI, setCilOI]   = useState('');
  const [ejeOD, setEjeOD]   = useState('');
  const [ejeOI, setEjeOI]   = useState('');
  const [addOD, setAddOD]   = useState('');
  const [addOI, setAddOI]   = useState('');
  const [pioOD, setPioOD]   = useState('');
  const [pioOI, setPioOI]   = useState('');
  const [ishaOD, setIshaOD] = useState('');
  const [ishaOI, setIshaOI] = useState('');

  const [observaciones, setObservaciones]   = useState('');
  const [diagPrincipal, setDiagPrincipal]   = useState('');
  const [diagSecundario, setDiagSecundario] = useState('');
  const [prescripcion, setPrescripcion]     = useState('');
  const [proximaCita, setProximaCita]       = useState('');

  useEffect(() => {
    if (datosIA) {
      setMotivo(datosIA.motivo || datosIA.narrative || '');
setTiempoEvo(datosIA.tiempoEvolucion || '');
      setAntOcPer(datosIA.antOcularPersonal || '');
setAntOcFam(datosIA.antOcularFamiliar || '');
setAntMed(datosIA.antMedicos || '');
if (datosIA.usaLentes) setUsaLentes(true);
setTipoLentes(datosIA.tipoLentes || '');
setObservaciones(datosIA.observations || '');

      if (datosIA.visualAcuity) {
        setAvscOD(datosIA.visualAcuity.od || '');
        setAvscOI(datosIA.visualAcuity.oi || '');
      }
      if (datosIA.intraocularPressure) {
        setPioOD(datosIA.intraocularPressure.od || '');
        setPioOI(datosIA.intraocularPressure.oi || '');
      }
      if (datosIA.refraccion) {
        setEsfOD(datosIA.refraccion.esf_od || '');
        setEsfOI(datosIA.refraccion.esf_oi || '');
        setCilOD(datosIA.refraccion.cil_od || '');
        setCilOI(datosIA.refraccion.cil_oi || '');
        setEjeOD(datosIA.refraccion.eje_od || '');
        setEjeOI(datosIA.refraccion.eje_oi || '');
      }
      if (datosIA.paciente) {
        setNombre(datosIA.paciente.nombre || '');
        setCedula(datosIA.paciente.cedula || '');
        setTelefono(datosIA.paciente.telefono || '');
        setOcupacion(datosIA.paciente.ocupacion || '');
      setEdad(datosIA.paciente.edad || '');
      }
    }
  }, [datosIA]);

  const guardar = async () => {
    if (!nombre || !cedula || !motivo) {
      Alert.alert('Campos requeridos', 'Nombre, cédula y motivo de consulta son obligatorios');
      return;
    }

    const historia = {
      paciente:    { nombre, cedula, fechaNac, edad, telefono, ocupacion, fechaConsulta, nroHistoria },
      anamnesis:   { motivo, tiempoEvolucion, antOcularPersonal, antOcularFamiliar, antMedicos, usaLentes, tipoLentes, medicamentos },
      examen:      { avscOD, avscOI, avccOD, avccOI, esfOD, esfOI, cilOD, cilOI, ejeOD, ejeOI, addOD, addOI, pioOD, pioOI, ishaOD, ishaOI },
      diagnostico: { diagPrincipal, diagSecundario, prescripcion, proximaCita, observaciones },
      sincronizado: 0,
    };

    const id = `HC-${Date.now()}`;

    try {
      // 1 — Guardar en SQLite offline primero
      await guardarHistoriaLocal(id, historia);

      // 2 — Intentar sincronizar con MongoDB
      const token = await AsyncStorage.getItem('token');
      try {
        const respuesta = await fetch(`${CONFIG.CLINICAL_URL}/historias`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            paciente: historia.paciente,
            motivo_consulta: historia.anamnesis.motivo,
            agudeza_visual: {
              ojo_derecho: historia.examen.avscOD,
              ojo_izquierdo: historia.examen.avscOI,
            },
            refraccion: {
              ojo_derecho: {
                esferico: parseFloat(historia.examen.esfOD) || 0,
                cilindrico: parseFloat(historia.examen.cilOD) || 0,
                eje: parseFloat(historia.examen.ejeOD) || 0,
              },
              ojo_izquierdo: {
                esferico: parseFloat(historia.examen.esfOI) || 0,
                cilindrico: parseFloat(historia.examen.cilOI) || 0,
                eje: parseFloat(historia.examen.ejeOI) || 0,
              },
            },
            diagnostico: historia.diagnostico.diagPrincipal,
            observaciones: historia.diagnostico.observaciones,
            sincronizado: true,
          }),
        });

        if (respuesta.ok) {
          Alert.alert('✅ Guardado', 'Historia clínica guardada y sincronizada.',
            [{ text: 'OK', onPress: () => navigation.navigate('Home') }]);
        } else {
          Alert.alert('⚠️ Guardado local', 'Sin conexión. Se sincronizará automáticamente.',
            [{ text: 'OK', onPress: () => navigation.navigate('Home') }]);
        }
      } catch {
        Alert.alert('⚠️ Guardado local', 'Sin conexión. Se sincronizará automáticamente.',
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }]);
      }

    } catch (e) {
      console.error('Error guardando:', e);
      Alert.alert('Error', 'No se pudo guardar la historia clínica');
    }
  };

  const renderPaso = () => {
    switch (pasoActual) {

      case 0:
        return (
          <View>
            <View style={styles.rowCampos}>
              <View style={[styles.campoMitad, { marginRight: 8 }]}>
                <Text style={styles.label}>N° Historia</Text>
                <TextInput style={[styles.input, styles.inputDesactivado]} value={nroHistoria} editable={false} />
              </View>
              <View style={styles.campoMitad}>
                <Text style={styles.label}>Fecha consulta</Text>
                <TextInput style={[styles.input, styles.inputDesactivado]} value={fechaConsulta} editable={false} />
              </View>
            </View>

            <Text style={styles.label}>Nombre completo *</Text>
            <TextInput style={styles.input} placeholder="Nombre y apellido" value={nombre} onChangeText={setNombre} />

            <Text style={styles.label}>Cédula *</Text>
            <TextInput style={styles.input} placeholder="Número de cédula" keyboardType="numeric" value={cedula} onChangeText={setCedula} />

            <View style={styles.rowCampos}>
              <View style={[styles.campoMitad, { marginRight: 8 }]}>
                <Text style={styles.label}>Fecha nacimiento</Text>
                <TextInput style={styles.input} placeholder="DD/MM/AAAA" value={fechaNac} onChangeText={setFechaNac} />
              </View>
              <View style={styles.campoMitad}>
                <Text style={styles.label}>Edad</Text>
                <TextInput style={styles.input} placeholder="Años" keyboardType="numeric" value={edad} onChangeText={setEdad} />
              </View>
            </View>

            <Text style={styles.label}>Teléfono</Text>
            <TextInput style={styles.input} placeholder="Número de contacto" keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />

            <Text style={styles.label}>Ocupación</Text>
            <TextInput style={styles.input} placeholder="Profesión u oficio" value={ocupacion} onChangeText={setOcupacion} />
          </View>
        );

      case 1:
        return (
          <View>
            {datosIA?.narrative && <BannerIA texto="Motivo de consulta pre-rellenado por IA" />}

            <Text style={styles.label}>Motivo de consulta *</Text>
            <TextInput
              style={[styles.input, styles.inputMultilinea, datosIA?.narrative && styles.inputIA]}
              placeholder="¿Por qué consulta el paciente?"
              value={motivo} onChangeText={setMotivo}
              multiline numberOfLines={4}
            />

            <Text style={styles.label}>Tiempo de evolución</Text>
            <TextInput style={styles.input} placeholder="Ej: 2 semanas, 1 mes..." value={tiempoEvolucion} onChangeText={setTiempoEvo} />

            <Text style={styles.label}>Antecedentes oculares personales</Text>
            <TextInput style={[styles.input, styles.inputMultilinea]} placeholder="Cirugías, enfermedades oculares previas..."
              value={antOcularPersonal} onChangeText={setAntOcPer} multiline numberOfLines={3} />

            <Text style={styles.label}>Antecedentes oculares familiares</Text>
            <TextInput style={[styles.input, styles.inputMultilinea]} placeholder="Glaucoma, cataratas, degeneración macular..."
              value={antOcularFamiliar} onChangeText={setAntOcFam} multiline numberOfLines={3} />

            <Text style={styles.label}>Antecedentes médicos generales</Text>
            <TextInput style={[styles.input, styles.inputMultilinea]} placeholder="Diabetes, hipertensión, alergias..."
              value={antMedicos} onChangeText={setAntMed} multiline numberOfLines={3} />

            <View style={styles.switchFila}>
              <Text style={styles.label}>¿Usa lentes actualmente?</Text>
              <Switch value={usaLentes} onValueChange={setUsaLentes}
                trackColor={{ false: '#ccc', true: '#0B7B8B' }} thumbColor="#fff" />
            </View>

            {usaLentes && (
              <>
                <Text style={styles.label}>Tipo de lentes</Text>
                <TextInput style={styles.input} placeholder="Monofocales, bifocales, lentes de contacto..."
                  value={tipoLentes} onChangeText={setTipoLentes} />
              </>
            )}

            <Text style={styles.label}>Medicamentos actuales</Text>
            <TextInput style={styles.input} placeholder="Ninguno o liste los medicamentos"
              value={medicamentos} onChangeText={setMedicamentos} />
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={styles.subtitulo}>Agudeza Visual Sin Corrección (AVSC)</Text>
            <View style={styles.rowCampos}>
              <View style={[styles.campoMitad, { marginRight: 8 }]}>
                <Text style={styles.labelOD}>OD</Text>
                <TextInput style={[styles.input, datosIA?.visualAcuity?.od && styles.inputIA]}
                  placeholder="20/__" value={avscOD} onChangeText={setAvscOD} />
              </View>
              <View style={styles.campoMitad}>
                <Text style={styles.labelOI}>OI</Text>
                <TextInput style={[styles.input, datosIA?.visualAcuity?.oi && styles.inputIA]}
                  placeholder="20/__" value={avscOI} onChangeText={setAvscOI} />
              </View>
            </View>

            <Text style={styles.subtitulo}>Agudeza Visual Con Corrección (AVCC)</Text>
            <View style={styles.rowCampos}>
              <View style={[styles.campoMitad, { marginRight: 8 }]}>
                <Text style={styles.labelOD}>OD</Text>
                <TextInput style={styles.input} placeholder="20/__" value={avccOD} onChangeText={setAvccOD} />
              </View>
              <View style={styles.campoMitad}>
                <Text style={styles.labelOI}>OI</Text>
                <TextInput style={styles.input} placeholder="20/__" value={avccOI} onChangeText={setAvccOI} />
              </View>
            </View>

            <Text style={styles.subtitulo}>Refracción</Text>
            <View style={styles.tablaRefraccion}>
              <View style={[styles.tablaFila, styles.tablaEncabezado]}>
                <Text style={[styles.tablaCelda, styles.tablaCeldaLabel]}></Text>
                <Text style={[styles.tablaCelda, styles.tablaOD]}>OD</Text>
                <Text style={[styles.tablaCelda, styles.tablaOI]}>OI</Text>
              </View>
              {[
                { label: 'Esférico',   valOD: esfOD, setOD: setEsfOD, valOI: esfOI, setOI: setEsfOI, ph: '+/- 0.00' },
                { label: 'Cilíndrico', valOD: cilOD, setOD: setCilOD, valOI: cilOI, setOI: setCilOI, ph: '+/- 0.00' },
                { label: 'Eje',        valOD: ejeOD, setOD: setEjeOD, valOI: ejeOI, setOI: setEjeOI, ph: '0°–180°'  },
                { label: 'ADD',        valOD: addOD, setOD: setAddOD, valOI: addOI, setOI: setAddOI, ph: '0.00'     },
              ].map(({ label, valOD, setOD, valOI, setOI, ph }) => (
                <View key={label} style={[styles.tablaFila, styles.tablaFilaDatos]}>
                  <Text style={[styles.tablaCelda, styles.tablaCeldaLabel]}>{label}</Text>
                  <TextInput style={[styles.tablaCelda, styles.tablaCeldaInput]}
                    placeholder={ph} keyboardType="decimal-pad" value={valOD} onChangeText={setOD} />
                  <TextInput style={[styles.tablaCelda, styles.tablaCeldaInput, styles.tablaCeldaInputOI]}
                    placeholder={ph} keyboardType="decimal-pad" value={valOI} onChangeText={setOI} />
                </View>
              ))}
            </View>

            <Text style={styles.subtitulo}>Presión Intraocular (PIO)</Text>
            <View style={styles.rowCampos}>
              <View style={[styles.campoMitad, { marginRight: 8 }]}>
                <Text style={styles.labelOD}>OD</Text>
                <TextInput style={[styles.input, datosIA?.intraocularPressure?.od && styles.inputIA]}
                  placeholder="mmHg" keyboardType="decimal-pad" value={pioOD} onChangeText={setPioOD} />
              </View>
              <View style={styles.campoMitad}>
                <Text style={styles.labelOI}>OI</Text>
                <TextInput style={[styles.input, datosIA?.intraocularPressure?.oi && styles.inputIA]}
                  placeholder="mmHg" keyboardType="decimal-pad" value={pioOI} onChangeText={setPioOI} />
              </View>
            </View>

            <Text style={styles.subtitulo}>Visión de Color (Ishihara)</Text>
            <View style={styles.rowCampos}>
              <View style={[styles.campoMitad, { marginRight: 8 }]}>
                <Text style={styles.labelOD}>OD</Text>
                <TextInput style={styles.input} placeholder="Normal / Alterada" value={ishaOD} onChangeText={setIshaOD} />
              </View>
              <View style={styles.campoMitad}>
                <Text style={styles.labelOI}>OI</Text>
                <TextInput style={styles.input} placeholder="Normal / Alterada" value={ishaOI} onChangeText={setIshaOI} />
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            <View style={styles.badgeEspecialista}>
              <Text style={styles.badgeEspecialistaTexto}>
                🔒 Esta sección es exclusiva del especialista · La IA no interviene aquí
              </Text>
            </View>

            <Text style={styles.label}>Diagnóstico principal *</Text>
            <TextInput style={[styles.input, styles.inputMultilinea]} placeholder="Ingrese el diagnóstico..."
              value={diagPrincipal} onChangeText={setDiagPrincipal} multiline numberOfLines={3} />

            <Text style={styles.label}>Diagnóstico secundario</Text>
            <TextInput style={[styles.input, styles.inputMultilinea]} placeholder="Si aplica..."
              value={diagSecundario} onChangeText={setDiagSecundario} multiline numberOfLines={3} />

            <Text style={styles.label}>Prescripción de lentes</Text>
            <TextInput style={[styles.input, styles.inputMultilinea]} placeholder="Detalle si aplica..."
              value={prescripcion} onChangeText={setPrescripcion} multiline numberOfLines={3} />

            <Text style={styles.label}>Próxima cita</Text>
            <TextInput style={styles.input} placeholder="DD/MM/AAAA" value={proximaCita} onChangeText={setProximaCita} />

            <Text style={styles.label}>Observaciones adicionales</Text>
            <TextInput style={[styles.input, styles.inputMultilinea]} placeholder="Observaciones, recomendaciones..."
              value={observaciones} onChangeText={setObservaciones} multiline numberOfLines={4} />

            {textoIA ? (
              <>
                <Text style={[styles.label, { marginTop: 16, color: '#999' }]}>Texto capturado por IA:</Text>
                <Text style={styles.textoIA}>{textoIA}</Text>
              </>
            ) : null}
          </View>
        );
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.barraWizard}>
        {PASOS.map((nombre, index) => (
          <React.Fragment key={index}>
            <TouchableOpacity style={styles.paso} onPress={() => index < pasoActual && setPasoActual(index)}>
              <View style={[styles.circuloPaso, pasoActual >= index && styles.circuloActivo, pasoActual > index && styles.circuloListo]}>
                <Text style={[styles.numeroPaso, pasoActual >= index && styles.numeroPasoActivo]}>
                  {pasoActual > index ? '✓' : index + 1}
                </Text>
              </View>
              <Text style={[styles.nombrePaso, pasoActual >= index && styles.nombrePasoActivo]}>{nombre}</Text>
            </TouchableOpacity>
            {index < PASOS.length - 1 && (
              <View style={[styles.lineaPaso, pasoActual > index && styles.lineaPasoActiva]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Formulario Clínico</Text>
        {renderPaso()}
      </ScrollView>

      <View style={styles.botones}>
        {pasoActual > 0 && (
          <TouchableOpacity style={styles.btnAnterior} onPress={() => setPasoActual(p => p - 1)}>
            <Text style={styles.btnAnteriorTexto}>← Anterior</Text>
          </TouchableOpacity>
        )}
        {pasoActual < PASOS.length - 1 ? (
          <TouchableOpacity style={styles.btnSiguiente} onPress={() => setPasoActual(p => p + 1)}>
            <Text style={styles.btnSiguienteTexto}>Siguiente →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
            <Text style={styles.btnGuardarTexto}>💾 Guardar Historia Clínica</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function BannerIA({ texto }) {
  return (
    <View style={styles.bannerIA}>
      <Text style={styles.bannerIATexto}>⚡ {texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:             { padding: 20, paddingBottom: 100 },
  title:                 { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label:                 { fontWeight: 'bold', marginTop: 10 },
  input:                 { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginTop: 5 },
  textoIA:               { marginTop: 10, fontStyle: 'italic', color: '#666' },
  inputDesactivado:      { backgroundColor: '#f4f4f4', color: '#999' },
  inputMultilinea:       { height: 80, textAlignVertical: 'top' },
  inputIA:               { borderColor: '#0B7B8B', backgroundColor: '#E6F7F8' },
  subtitulo:             { fontWeight: 'bold', marginTop: 16, marginBottom: 4, color: '#0B7B8B', fontSize: 13 },
  labelOD:               { fontWeight: 'bold', color: '#1565C0', marginTop: 10 },
  labelOI:               { fontWeight: 'bold', color: '#C62828', marginTop: 10 },
  rowCampos:             { flexDirection: 'row', marginTop: 0 },
  campoMitad:            { flex: 1 },
  switchFila:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  tablaRefraccion:       { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginTop: 5, overflow: 'hidden' },
  tablaFila:             { flexDirection: 'row' },
  tablaEncabezado:       { backgroundColor: '#f5f5f5' },
  tablaFilaDatos:        { borderTopWidth: 1, borderTopColor: '#eee' },
  tablaCelda:            { flex: 1, padding: 8, textAlign: 'center' },
  tablaCeldaLabel:       { fontWeight: 'bold', color: '#555', fontSize: 12 },
  tablaOD:               { fontWeight: 'bold', color: '#1565C0' },
  tablaOI:               { fontWeight: 'bold', color: '#C62828' },
  tablaCeldaInput:       { borderLeftWidth: 1, borderLeftColor: '#eee', fontSize: 13, textAlign: 'center' },
  tablaCeldaInputOI:     { borderLeftWidth: 1, borderLeftColor: '#eee' },
  badgeEspecialista:     { backgroundColor: '#FFF3E0', padding: 12, borderRadius: 8, marginBottom: 10 },
  badgeEspecialistaTexto:{ color: '#E65100', fontWeight: 'bold', fontSize: 13 },
  bannerIA:              { backgroundColor: '#E6F7F8', padding: 8, borderRadius: 6, marginBottom: 8 },
  bannerIATexto:         { color: '#0B7B8B', fontSize: 12, fontWeight: '600' },
  barraWizard:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  paso:                  { alignItems: 'center' },
  circuloPaso:           { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  circuloActivo:         { backgroundColor: '#0B7B8B' },
  circuloListo:          { backgroundColor: '#00C853' },
  numeroPaso:            { fontSize: 12, color: '#999', fontWeight: 'bold' },
  numeroPasoActivo:      { color: '#fff' },
  nombrePaso:            { fontSize: 9, color: '#aaa', marginTop: 3 },
  nombrePasoActivo:      { color: '#0B7B8B', fontWeight: 'bold' },
  lineaPaso:             { flex: 1, height: 2, backgroundColor: '#eee', marginBottom: 12 },
  lineaPasoActiva:       { backgroundColor: '#0B7B8B' },
  botones:               { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  btnAnterior:           { paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: '#0B7B8B', borderRadius: 8 },
  btnAnteriorTexto:      { color: '#0B7B8B', fontWeight: 'bold' },
  btnSiguiente:          { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#0B7B8B', borderRadius: 8, marginLeft: 'auto' },
  btnSiguienteTexto:     { color: '#fff', fontWeight: 'bold' },
  btnGuardar:            { flex: 1, paddingVertical: 12, backgroundColor: '#00C853', borderRadius: 8, alignItems: 'center' },
  btnGuardarTexto:       { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});