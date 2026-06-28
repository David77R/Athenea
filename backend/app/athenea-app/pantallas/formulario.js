import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Switch, KeyboardAvoidingView,
  Platform, Alert, StatusBar, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { guardarHistoriaLocal } from '../baseDatosLite/basedatoslt';
import CONFIG from '../config';
import COLORES from '../constantes/colores';
import { useAlerta } from '../componentes/AlertaPersonalizada';

const PASOS    = ['Paciente', 'Anamnesis', 'Examen', 'Especializado', 'Diagnóstico'];
const TURQUESA = '#0B7B8B';
const OSCURO   = '#0D3B44';
const FONDO    = '#EEF4F6';
const BORDE    = '#D0E4E8';
const INPUT_BG = '#F5F9FA';
const VERDE    = '#43A047';
const LABEL_COL = '#6A9BAB';
const OD_COLOR  = '#1565C0';
const OI_COLOR  = '#C62828';

function capitalizeWords(str) {
  if (!str) return '';
  return str.split(' ').map(w => w.length === 0 ? '' : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function parsearFecha(str) {
  if (!str) return null;
  const partes = str.split('/');
  if (partes.length !== 3) return null;
  const [dia, mes, anio] = partes.map(Number);
  if (!dia || !mes || !anio) return null;
  const fecha = new Date(anio, mes - 1, dia);
  if (isNaN(fecha.getTime())) return null;
  return fecha;
}

function Campo({ label, value, onChange, placeholder, keyboardType = 'default', multiline = false, editable = true, resaltado = false, error = '' }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.campoLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti, !editable && styles.inputDesactivado, resaltado && styles.inputResaltado, !!error && styles.inputError]}
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
      {!!error && <Text style={styles.textoError}>{error}</Text>}
    </View>
  );
}

function CedulaInput({ value, onValueChange, prefix, onPrefixChange }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.campoLabel}>CÉDULA *</Text>
      <View style={styles.cedulaContainer}>
        <View style={styles.prefixSelector}>
          {['V', 'E'].map(p => (
            <TouchableOpacity key={p} style={[styles.prefixBtn, prefix === p && styles.prefixBtnActivo]} onPress={() => onPrefixChange(p)}>
              <Text style={[styles.prefixTexto, prefix === p && styles.prefixTextoActivo]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.cedulaInput}
          placeholder="Números de cédula"
          placeholderTextColor="#AAC4CC"
          value={value}
          onChangeText={onValueChange}
          keyboardType="numeric"
          maxLength={10}
        />
      </View>
    </View>
  );
}

function BannerIA({ texto }) {
  if (!texto) return null;
  return (
    <View style={styles.bannerIA}>
      <Ionicons name="sparkles" size={14} color={TURQUESA} />
      <Text style={styles.bannerIATexto}>{texto}</Text>
    </View>
  );
}

function ModalTextoIA({ textoIA, visible, onCerrar }) {
  if (!textoIA) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContenido}>
          <View style={styles.modalHeader}>
            <Ionicons name="mic-outline" size={18} color={TURQUESA} />
            <Text style={styles.modalTitulo}>Texto dictado (referencia)</Text>
            <TouchableOpacity onPress={onCerrar} style={styles.modalCerrar}>
              <Ionicons name="close" size={20} color="#888" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTexto}>{textoIA}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function FormularioScreen({ route, navigation }) {
  const { textoIA, datosIA } = route.params || {};
  const insets = useSafeAreaInsets();
  const { mostrar, AlertaPersonalizada } = useAlerta();
  const [pasoActual,   setPasoActual]   = useState(0);
  const [verTextoIA,   setVerTextoIA]   = useState(false);

  const [nombre,       setNombre]       = useState('');
  const [cedula,       setCedula]       = useState('');
  const [cedulaPrefix, setCedulaPrefix] = useState('V');
  const [fechaNac,     setFechaNac]     = useState('');
  const [fechaObj,     setFechaObj]     = useState(new Date(2000, 0, 1));
  const [mostrarCal,   setMostrarCal]   = useState(false);
  const [edad,         setEdad]         = useState('');
  const [telefono,     setTelefono]     = useState('');
  const [ocupacion,    setOcupacion]    = useState('');
  const [nroHistoria]  = useState(`HC-${Date.now()}`);
  const fechaConsulta  = new Date().toLocaleDateString('es-ES');

  const [motivo,            setMotivo]       = useState('');
  const [tiempoEvolucion,   setTiempoEvo]    = useState('');
  const [antOcularPersonal, setAntOcPer]     = useState('');
  const [antOcularFamiliar, setAntOcFam]     = useState('');
  const [antMedicos,        setAntMed]       = useState('');
  const [usaLentes,         setUsaLentes]    = useState(false);
  const [tipoLentes,        setTipoLentes]   = useState('');
  const [medicamentos,      setMedicamentos] = useState('');

  const [avscOD,       setAvscOD]       = useState('');
  const [avscOI,       setAvscOI]       = useState('');
  const [avccOD,       setAvccOD]       = useState('');
  const [avccOI,       setAvccOI]       = useState('');
  const [esfOD,        setEsfOD]        = useState('');
  const [esfOI,        setEsfOI]        = useState('');
  const [cilOD,        setCilOD]        = useState('');
  const [cilOI,        setCilOI]        = useState('');
  const [ejeOD,        setEjeOD]        = useState('');
  const [ejeOI,        setEjeOI]        = useState('');
  const [addOD,        setAddOD]        = useState('');
  const [addOI,        setAddOI]        = useState('');
  const [pioOD,        setPioOD]        = useState('');
  const [pioOI,        setPioOI]        = useState('');
  const [ishaOD,       setIshaOD]       = useState('');
  const [ishaOI,       setIshaOI]       = useState('');
  const [biomicroscopia, setBiomicroscopia] = useState('');
  const [fondoOjoOD,   setFondoOjoOD]   = useState('');
  const [fondoOjoOI,   setFondoOjoOI]   = useState('');

  const [tonometria,          setTonometria]          = useState('');
  const [lensometria,         setLensometria]         = useState('');
  const [autorrefractometria, setAutorrefractometria] = useState('');
  const [oftalmoscopio,       setOftalmoscopio]       = useState('');
  const [derivacion,          setDerivacion]          = useState('');

  const [diagPrincipal,  setDiagPrincipal]  = useState('');
  const [prescripcion,   setPrescripcion]   = useState('');
  const [proximaCita,    setProximaCita]    = useState('');
  const [observaciones,  setObservaciones]  = useState('');

  useEffect(() => {
    if (!datosIA) return;

    if (datosIA.paciente?.nombre)    setNombre(capitalizeWords(datosIA.paciente.nombre));
    if (datosIA.paciente?.cedula) {
      const ced = String(datosIA.paciente.cedula).toUpperCase();
      if (ced.startsWith('V') || ced.startsWith('E')) { setCedulaPrefix(ced.charAt(0)); setCedula(ced.substring(1)); }
      else { setCedulaPrefix('V'); setCedula(ced); }
    }

    if (datosIA.paciente?.fechaNac) {
      const f = datosIA.paciente.fechaNac;
      setFechaNac(f);
      const fecha = parsearFecha(f);
      if (fecha) {
        setFechaObj(fecha);
        const hoy = new Date();
        let e = hoy.getFullYear() - fecha.getFullYear();
        const m = hoy.getMonth() - fecha.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) e--;
        setEdad(String(e));
      }
    }

    if (datosIA.paciente?.edad)      setEdad(String(datosIA.paciente.edad));
    if (datosIA.paciente?.telefono)  setTelefono(String(datosIA.paciente.telefono));
    if (datosIA.paciente?.ocupacion) setOcupacion(capitalizeWords(datosIA.paciente.ocupacion));

    if (datosIA.motivo)             setMotivo(datosIA.motivo);
    if (datosIA.tiempoEvolucion)    setTiempoEvo(datosIA.tiempoEvolucion);
    if (datosIA.antOcularPersonal)  setAntOcPer(datosIA.antOcularPersonal);
    if (datosIA.antOcularFamiliar)  setAntOcFam(datosIA.antOcularFamiliar);
    if (datosIA.antMedicos)         setAntMed(datosIA.antMedicos);
    if (datosIA.usaLentes !== undefined) setUsaLentes(!!datosIA.usaLentes);
    if (datosIA.tipoLentes)         setTipoLentes(datosIA.tipoLentes);
    if (datosIA.medicamentos)       setMedicamentos(datosIA.medicamentos);

    if (datosIA.visualAcuity?.od)   setAvscOD(datosIA.visualAcuity.od);
    if (datosIA.visualAcuity?.oi)   setAvscOI(datosIA.visualAcuity.oi);
    if (datosIA.visualAcuity?.ccOD) setAvccOD(datosIA.visualAcuity.ccOD);
    if (datosIA.visualAcuity?.ccOI) setAvccOI(datosIA.visualAcuity.ccOI);

    const ref = datosIA.refraccion;
    if (ref) {
      if (ref.esf_od != null && ref.esf_od !== '') setEsfOD(String(ref.esf_od));
      if (ref.esf_oi != null && ref.esf_oi !== '') setEsfOI(String(ref.esf_oi));
      if (ref.cil_od != null && ref.cil_od !== '') setCilOD(String(ref.cil_od));
      if (ref.cil_oi != null && ref.cil_oi !== '') setCilOI(String(ref.cil_oi));
      if (ref.eje_od != null && ref.eje_od !== '') setEjeOD(String(ref.eje_od));
      if (ref.eje_oi != null && ref.eje_oi !== '') setEjeOI(String(ref.eje_oi));
      if (ref.add_od != null && ref.add_od !== '') setAddOD(String(ref.add_od));
      if (ref.add_oi != null && ref.add_oi !== '') setAddOI(String(ref.add_oi));
    }

    const pio = datosIA.intraocularPressure;
    if (pio) {
      if (pio.od != null && pio.od !== '') setPioOD(String(pio.od));
      if (pio.oi != null && pio.oi !== '') setPioOI(String(pio.oi));
    }

    if (datosIA.ishihara?.od)          setIshaOD(datosIA.ishihara.od);
    if (datosIA.ishihara?.oi)          setIshaOI(datosIA.ishihara.oi);

    if (datosIA.tonometria)          setTonometria(datosIA.tonometria);
    if (datosIA.lensometria)         setLensometria(datosIA.lensometria);
    if (datosIA.autorrefractometria) setAutorrefractometria(datosIA.autorrefractometria);
    if (datosIA.oftalmoscopio)       setOftalmoscopio(datosIA.oftalmoscopio);
    if (datosIA.derivacion)          setDerivacion(datosIA.derivacion);

    if (datosIA.diagnosisPreliminary)  setDiagPrincipal(datosIA.diagnosisPreliminary);
    if (datosIA.observations)          setObservaciones(datosIA.observations);
  }, [datosIA]);

  function onFechaSeleccionada(event, selectedDate) {
    setMostrarCal(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    setFechaObj(selectedDate);
    const dia  = String(selectedDate.getDate()).padStart(2, '0');
    const mes  = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const anio = selectedDate.getFullYear();
    setFechaNac(`${dia}/${mes}/${anio}`);
    const hoy = new Date();
    let e = hoy.getFullYear() - selectedDate.getFullYear();
    const m = hoy.getMonth() - selectedDate.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < selectedDate.getDate())) e--;
    setEdad(String(e));
  }

  function validarPaso(paso) {
    switch (paso) {
      case 0:
        if (!nombre.trim())           { Alert.alert('Error', 'El nombre es obligatorio.'); return false; }
        if (!cedula.trim())           { Alert.alert('Error', 'La cédula es obligatoria.'); return false; }
        if (cedula.trim().length < 5) { Alert.alert('Error', 'La cédula debe tener al menos 5 dígitos.'); return false; }
        if (edad && isNaN(Number(edad))) { Alert.alert('Error', 'La edad debe ser un número.'); return false; }
        return true;
      case 1:
        if (!motivo.trim()) { Alert.alert('Error', 'El motivo de consulta es obligatorio.'); return false; }
        return true;
      case 4:
        if (!diagPrincipal.trim()) { Alert.alert('Error', 'El diagnóstico principal es obligatorio.'); return false; }
        return true;
      default: return true;
    }
  }

  function siguientePaso() {
    if (!validarPaso(pasoActual)) return;
    if (pasoActual < PASOS.length - 1) { setPasoActual(p => p + 1); }
    else { guardar(); }
  }

  async function guardar() {
    const historia = {
      paciente:      { nombre: capitalizeWords(nombre), cedula: `${cedulaPrefix}${cedula}`, fechaNac, edad, telefono, ocupacion, fechaConsulta, nroHistoria },
      anamnesis:     { motivo, tiempoEvolucion, antOcularPersonal, antOcularFamiliar, antMedicos, usaLentes, tipoLentes, medicamentos },
      examen:        { avscOD, avscOI, avccOD, avccOI, esfOD, esfOI, cilOD, cilOI, ejeOD, ejeOI, addOD, addOI, pioOD, pioOI, ishaOD, ishaOI, biomicroscopia, fondoOjoOD, fondoOjoOI },
      especializado: { tonometria, lensometria, autorrefractometria, oftalmoscopio, derivacion },
      diagnostico:   { diagPrincipal, prescripcion, proximaCita, observaciones },
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
            paciente: { nombre: historia.paciente.nombre, cedula: historia.paciente.cedula, fecha_nacimiento: fechaNac || null, telefono: telefono || '' },
            motivo_consulta: motivo,
            agudeza_visual:  { ojo_derecho: avscOD, ojo_izquierdo: avscOI },
            refraccion: {
              ojo_derecho:   { esferico: parseFloat(esfOD)||0, cilindrico: parseFloat(cilOD)||0, eje: parseFloat(ejeOD)||0, adicion: parseFloat(addOD)||0 },
              ojo_izquierdo: { esferico: parseFloat(esfOI)||0, cilindrico: parseFloat(cilOI)||0, eje: parseFloat(ejeOI)||0, adicion: parseFloat(addOI)||0 },
            },
            presion_intraocular: { ojo_derecho: parseFloat(pioOD)||0, ojo_izquierdo: parseFloat(pioOI)||0 },
            examen_especializado: { tonometria, lensometria, autorrefractometria, oftalmoscopio, derivacion },
            diagnostico: diagPrincipal || '', tratamiento: prescripcion || '', observaciones: observaciones || '',
          }),
        });
        if (resp.ok) guardadoEnNube = true;
      } catch {}
      await guardarHistoriaLocal(id, { ...historia, sincronizado: guardadoEnNube ? 1 : 0 });
   mostrar({
        tipo: 'exito',
        titulo: guardadoEnNube ? '¡Historia guardada!' : '📱 Guardada localmente',
        mensaje: guardadoEnNube
          ? `La historia de ${nombre} fue guardada y sincronizada exitosamente.\n\n⚠️ Precaución: si borra todos los datos desde Ajustes Generales, no podrá recuperar esta información.`
          : `La historia de ${nombre} fue guardada en el dispositivo. Se sincronizará al conectarse.\n\n⚠️ Precaución: si borra todos los datos desde Ajustes Generales antes de sincronizar, esta información se perderá permanentemente.`,
        icono: guardadoEnNube ? 'cloud-done-outline' : 'phone-portrait-outline',
        boton: guardadoEnNube ? '¡Perfecto!' : 'Entendido',
onConfirmar: () => navigation.navigate('Home'),
      });
    } catch {
      Alert.alert('Error', 'No se pudo guardar la historia clínica.');
    }
  }

  const renderPaso = () => {
    switch (pasoActual) {
      case 0:
        return (
          <View style={styles.pasoContainer}>
            <BannerIA texto={datosIA ? 'Datos pre-rellenados por Athenea, por favor verifique' : null} />
            <View style={styles.rowDos}>
              <Campo label="N° HISTORIA"    value={nroHistoria}   editable={false} placeholder="" onChange={() => {}} />
              <View style={{ width: 12 }} />
              <Campo label="FECHA CONSULTA" value={fechaConsulta} editable={false} placeholder="" onChange={() => {}} />
            </View>
            <Campo label="NOMBRE COMPLETO *" value={nombre} onChange={v => setNombre(capitalizeWords(v))} placeholder="Nombre y Apellido" resaltado={!!datosIA?.paciente?.nombre} />
            <CedulaInput value={cedula} onValueChange={setCedula} prefix={cedulaPrefix} onPrefixChange={setCedulaPrefix} />

            <View style={styles.campo}>
              <Text style={styles.campoLabel}>FECHA DE NACIMIENTO</Text>
              <TouchableOpacity
                style={[styles.input, styles.inputFecha, fechaNac && styles.inputResaltado]}
                onPress={() => setMostrarCal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={16} color={fechaNac ? OSCURO : '#AAC4CC'} />
                <Text style={[styles.fechaTexto, !fechaNac && { color: '#AAC4CC' }]}>{fechaNac || 'DD/MM/AAAA'}</Text>
                <Ionicons name="chevron-down" size={14} color="#AAC4CC" />
              </TouchableOpacity>
            </View>

            {mostrarCal && (
              <DateTimePicker
                value={fechaObj}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onFechaSeleccionada}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}

            <Campo label="EDAD (AÑOS)" value={edad} onChange={setEdad} placeholder="Ej: 30" keyboardType="numeric" resaltado={!!datosIA?.paciente?.edad} />
            <Campo label="TELÉFONO" value={telefono} onChange={setTelefono} placeholder="04XX-XXXXXXX" keyboardType="phone-pad" resaltado={!!datosIA?.paciente?.telefono} />
            <Campo label="OCUPACIÓN" value={ocupacion} onChange={v => setOcupacion(capitalizeWords(v))} placeholder="Profesión u Oficio" resaltado={!!datosIA?.paciente?.ocupacion} />
          </View>
        );

      case 1:
        return (
          <View style={styles.pasoContainer}>
            <BannerIA texto={datosIA?.motivo ? 'Anamnesis pre-rellenada por Athenea IA · Verifica' : null} />
            <Campo label="MOTIVO DE CONSULTA *" value={motivo} onChange={setMotivo} placeholder="Describe el motivo de la visita" multiline resaltado={!!datosIA?.motivo} />
            <Campo label="TIEMPO DE EVOLUCIÓN" value={tiempoEvolucion} onChange={setTiempoEvo} placeholder="Cuánto tiempo lleva con el problema" resaltado={!!datosIA?.tiempoEvolucion} />
            <Campo label="ANTECEDENTES OCULARES PERSONALES" value={antOcularPersonal} onChange={setAntOcPer} placeholder="Enfermedades oculares, cirugías, traumas" multiline />
            <Campo label="ANTECEDENTES OCULARES FAMILIARES" value={antOcularFamiliar} onChange={setAntOcFam} placeholder="Glaucoma, catarata, estrabismo en la familia" multiline />
            <Campo label="ANTECEDENTES MÉDICOS GENERALES" value={antMedicos} onChange={setAntMed} placeholder="Diabetes, hipertensión, alergias" multiline />
            <View style={styles.switchFila}>
              <Text style={styles.campoLabel}>¿USA LENTES ACTUALMENTE?</Text>
              <Switch value={usaLentes} onValueChange={setUsaLentes} trackColor={{ false: '#ccc', true: TURQUESA }} thumbColor="#fff" />
            </View>
            {usaLentes && <Campo label="TIPO DE LENTES" value={tipoLentes} onChange={setTipoLentes} placeholder="Monofocales, bifocales, progresivos, contacto" />}
            <Campo label="MEDICAMENTOS ACTUALES" value={medicamentos} onChange={setMedicamentos} placeholder="Nombres de medicamentos que toma" multiline resaltado={!!datosIA?.medicamentos} />
          </View>
        );

      case 2:
        return (
          <View style={styles.pasoContainer}>
            <BannerIA texto={datosIA?.visualAcuity?.od ? 'Examen pre-rellenado por Athenea IA · Verifica' : null} />

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
              <View style={[styles.tablaFila, styles.tablaEncabezado]}>
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
                <TextInput style={[styles.ojoInput, datosIA?.intraocularPressure?.od != null && styles.inputResaltado]} placeholder="mmHg" keyboardType="decimal-pad" value={pioOD} onChangeText={setPioOD} />
              </View>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OI_COLOR }]}>OI</Text>
                <TextInput style={[styles.ojoInput, datosIA?.intraocularPressure?.oi != null && styles.inputResaltado]} placeholder="mmHg" keyboardType="decimal-pad" value={pioOI} onChangeText={setPioOI} />
              </View>
            </View>

            <Text style={styles.subtituloSeccion}>OTRAS PRUEBAS</Text>
            <View style={styles.filaOjos}>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OD_COLOR }]}>Ishihara OD</Text>
                <TextInput style={styles.ojoInput} placeholder="Normal/Alterada" value={ishaOD} onChangeText={setIshaOD} />
              </View>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OI_COLOR }]}>Ishihara OI</Text>
                <TextInput style={styles.ojoInput} placeholder="Normal/Alterada" value={ishaOI} onChangeText={setIshaOI} />
              </View>
            </View>
            <Campo label="BIOMICROSCOPÍA" value={biomicroscopia} onChange={setBiomicroscopia} placeholder="Descripción de estructuras oculares" multiline />
            <View style={styles.filaOjos}>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OD_COLOR }]}>Fondo OD</Text>
                <TextInput style={styles.ojoInput} placeholder="Descripción OD" value={fondoOjoOD} onChangeText={setFondoOjoOD} multiline />
              </View>
              <View style={styles.ojoCard}>
                <Text style={[styles.ojoLabel, { color: OI_COLOR }]}>Fondo OI</Text>
                <TextInput style={styles.ojoInput} placeholder="Descripción OI" value={fondoOjoOI} onChangeText={setFondoOjoOI} multiline />
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.pasoContainer}>
            <BannerIA texto={datosIA?.tonometria || datosIA?.lensometria ? 'Examen especializado pre-rellenado por Athenea IA · Verifica' : null} />

            <Campo
              label="TONOMETRÍA"
              value={tonometria}
              onChange={setTonometria}
              placeholder="Ej: 12 mmHg AO"
              resaltado={!!datosIA?.tonometria}
            />

            <Campo
              label="LENSOMETRÍA"
              value={lensometria}
              onChange={setLensometria}
              placeholder="Refracción hallada, patologías o defectos refractivos"
              multiline
              resaltado={!!datosIA?.lensometria}
            />

            <Campo
              label="AUTORREFRACTOMETRÍA"
              value={autorrefractometria}
              onChange={setAutorrefractometria}
              placeholder="Defectos visuales detectados digitalmente"
              multiline
              resaltado={!!datosIA?.autorrefractometria}
            />

            <Campo
              label="OFTALMOSCOPIO"
              value={oftalmoscopio}
              onChange={setOftalmoscopio}
              placeholder="Hallazgos del fondo de ojo, o 'No aplica'"
              multiline
              resaltado={!!datosIA?.oftalmoscopio}
            />

            <Campo
              label="DERIVACIÓN / RECOMENDACIÓN"
              value={derivacion}
              onChange={setDerivacion}
              placeholder="Ej: Derivar a oftalmólogo por sospecha de catarata"
              multiline
              resaltado={!!datosIA?.derivacion}
            />
          </View>
        );

      case 4:
        return (
          <View style={styles.pasoContainer}>
            <View style={styles.badgeEspecialista}>
              <Ionicons name="lock-closed" size={14} color="#E65100" />
              <Text style={styles.badgeTexto}>Sección exclusiva del especialista · La IA no interviene en el diagnóstico</Text>
            </View>
            <Campo label="DIAGNÓSTICO PRINCIPAL *" value={diagPrincipal} onChange={setDiagPrincipal} placeholder="Ej: Miopía simple" multiline />
            <Campo label="PRESCRIPCIÓN DE LENTES" value={prescripcion} onChange={setPrescripcion} placeholder="Ej: Lentes monofocales, protección UV" multiline />
            <Campo label="PRÓXIMA CITA" value={proximaCita} onChange={setProximaCita} placeholder="DD/MM/AAAA" />
            <Campo label="OBSERVACIONES" value={observaciones} onChange={setObservaciones} placeholder="Notas adicionales" multiline />
          </View>
        );
    }
  };

  const paddingTop = Platform.OS === 'android' ? 48 : insets.top + 10;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: FONDO }}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[OSCURO, TURQUESA]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop }]}
      >
        <View style={styles.headerFila}>
          <TouchableOpacity onPress={() => pasoActual > 0 ? setPasoActual(p => p - 1) : navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCentro}>
            <Text style={styles.headerTitulo}>
              <Text style={styles.headerNum}>{pasoActual + 1}/{PASOS.length} </Text>
              {PASOS[pasoActual]}
            </Text>
            <Text style={styles.headerSub}>Formulario de Historia Clínica</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.wizard}>
          {PASOS.map((_, index) => {
            const listo  = pasoActual > index;
            const activo = pasoActual === index;
            return (
              <React.Fragment key={index}>
                <TouchableOpacity style={styles.wizardPaso} onPress={() => listo && setPasoActual(index)}>
                  <View style={[styles.wizardCirculo, listo && styles.wizardListo, activo && styles.wizardActivo]}>
                    {listo
                      ? <Ionicons name="checkmark" size={14} color="#fff" />
                      : <Text style={[styles.wizardNum, activo && { color: TURQUESA }]}>{index + 1}</Text>}
                  </View>
                  <Text style={[styles.wizardLabel, activo && styles.wizardLabelActivo, listo && styles.wizardLabelListo]}>
                    {PASOS[index]}
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

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        {renderPaso()}
      </ScrollView>

      <View style={[styles.botonesBar, { paddingBottom: insets.bottom + 10 }]}>
        {pasoActual > 0 ? (
          <TouchableOpacity style={styles.btnAnterior} onPress={() => setPasoActual(p => p - 1)}>
            <Ionicons name="chevron-back" size={16} color={TURQUESA} />
            <Text style={styles.btnAnteriorTexto}>Atrás</Text>
          </TouchableOpacity>
        ) : <View style={{ flex: 1 }} />}
        <TouchableOpacity style={pasoActual < PASOS.length - 1 ? styles.btnSiguiente : styles.btnGuardar} onPress={siguientePaso}>
          <Text style={styles.btnSiguienteTexto}>{pasoActual < PASOS.length - 1 ? 'Siguiente' : 'Guardar'}</Text>
          <Ionicons name={pasoActual < PASOS.length - 1 ? 'chevron-forward' : 'save-outline'} size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {textoIA ? (
        <TouchableOpacity style={styles.botonFlotante} onPress={() => setVerTextoIA(true)} activeOpacity={0.85}>
          <Ionicons name="document-text-outline" size={22} color="#fff" />
        </TouchableOpacity>
      ) : null}
      <ModalTextoIA textoIA={textoIA} visible={verTextoIA} onCerrar={() => setVerTextoIA(false)} />

      <AlertaPersonalizada />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:       { paddingHorizontal: 16, paddingBottom: 16 },
  headerFila:   { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn:      { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerCentro: { flex: 1, alignItems: 'center' },
  headerTitulo: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerNum:    { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.8)' },
  headerSub:    { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  wizard:            { flexDirection: 'row', alignItems: 'center' },
  wizardPaso:        { alignItems: 'center', flex: 1 },
  wizardCirculo:     { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'transparent' },
  wizardListo:       { backgroundColor: VERDE, borderColor: VERDE },
  wizardActivo:      { backgroundColor: '#fff', borderColor: '#fff' },
  wizardNum:         { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  wizardLabel:       { fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 3, textAlign: 'center' },
  wizardLabelActivo: { color: '#fff', fontWeight: '700' },
  wizardLabelListo:  { color: 'rgba(255,255,255,0.8)' },
  wizardLinea:       { flex: 0.5, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 14 },
  wizardLineaActiva: { backgroundColor: VERDE },

  scrollContent: { padding: 16, paddingTop: 20 },

  pasoContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },

  bannerIA:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORES.secundario, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  bannerIATexto: { fontSize: 13, fontWeight: '600', color: TURQUESA, flex: 1 },

  campo:      { marginBottom: 14 },
  campoLabel: { fontSize: 10, fontWeight: '700', color: LABEL_COL, letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  input:      { backgroundColor: INPUT_BG, borderWidth: 1.5, borderColor: BORDE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: OSCURO },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  inputDesactivado: { backgroundColor: '#E8F0F2', color: '#8AAAB5' },
  inputResaltado:   { borderColor: TURQUESA, backgroundColor: '#EAF7F8' },
  inputError:       { borderColor: COLORES.error, borderWidth: 2 },
  textoError:       { color: COLORES.error, fontSize: 12, marginTop: 4, marginLeft: 4 },
  inputFecha:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fechaTexto:  { flex: 1, fontSize: 14, color: OSCURO },
  rowDos:      { flexDirection: 'row' },
  switchFila:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingVertical: 4 },

  cedulaContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDE, borderRadius: 12, backgroundColor: INPUT_BG, overflow: 'hidden' },
  prefixSelector:  { flexDirection: 'row', backgroundColor: BORDE, borderRadius: 8, marginVertical: 4, marginLeft: 4, overflow: 'hidden' },
  prefixBtn:       { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'transparent' },
  prefixBtnActivo: { backgroundColor: TURQUESA },
  prefixTexto:     { fontSize: 15, fontWeight: '700', color: LABEL_COL },
  prefixTextoActivo: { color: '#fff' },
  cedulaInput:     { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: OSCURO },

  subtituloSeccion:  { fontSize: 11, fontWeight: '700', color: TURQUESA, letterSpacing: 0.8, marginBottom: 10, marginTop: 4, borderBottomWidth: 1, borderBottomColor: BORDE, paddingBottom: 6 },
  filaOjos:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  ojoCard:   { flex: 1, backgroundColor: INPUT_BG, borderWidth: 1.5, borderColor: BORDE, borderRadius: 12, padding: 12 },
  ojoLabel:  { fontSize: 11, fontWeight: '800', marginBottom: 6 },
  ojoInput:  { fontSize: 14, color: OSCURO, borderBottomWidth: 1, borderBottomColor: BORDE, paddingBottom: 4 },

  tablaRefraccion:     { backgroundColor: INPUT_BG, borderWidth: 1.5, borderColor: BORDE, borderRadius: 12, overflow: 'hidden', marginBottom: 14 },
  tablaFila:           { flexDirection: 'row' },
  tablaEncabezado:     { backgroundColor: '#E2EEF0' },
  tablaFilaDato:       { borderTopWidth: 1, borderTopColor: BORDE },
  tablaCelda:          { flex: 1, padding: 10 },
  tablaCeldaNombre:    { fontWeight: '600', color: '#547D8A', fontSize: 12 },
  tablaHeaderOD:       { fontWeight: '700', color: OD_COLOR, fontSize: 12 },
  tablaHeaderOI:       { fontWeight: '700', color: OI_COLOR, fontSize: 12 },
  tablaCeldaInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 8 },
  tablaCeldaInput:     { flex: 1, fontSize: 13, color: OSCURO },

  badgeEspecialista: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', borderRadius: 12, padding: 12, marginBottom: 16, gap: 8, borderWidth: 1, borderColor: '#FFE0B2' },
  badgeTexto:        { color: '#E65100', fontSize: 12, fontWeight: '600', flex: 1 },

  botonesBar:        { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: BORDE, gap: 10 },
  btnAnterior:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 1.5, borderColor: TURQUESA, borderRadius: 14 },
  btnAnteriorTexto:  { color: TURQUESA, fontWeight: '700', fontSize: 14 },
  btnSiguiente:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: TURQUESA, borderRadius: 14, gap: 6 },
  btnGuardar:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: VERDE, borderRadius: 14, gap: 6 },
  btnSiguienteTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },

  botonFlotante: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -24,
    width: 48, height: 48, borderRadius: 24,
    borderTopRightRadius: 0, borderBottomRightRadius: 0,
    backgroundColor: TURQUESA,
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: TURQUESA, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: -2, height: 0 },
  },

  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContenido:  { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  modalTitulo:     { flex: 1, fontSize: 15, fontWeight: '700', color: OSCURO },
  modalCerrar:     { padding: 4 },
  modalScroll:     { maxHeight: 300 },
  modalTexto:      { fontSize: 14, color: '#547D8A', lineHeight: 22, fontStyle: 'italic' },
});