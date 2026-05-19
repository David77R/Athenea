import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Modal, ScrollView, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buscarHistoriasLocales } from '../baseDatosLite/basedatoslt';
import CONFIG from '../config';
import COLORES from '../constantes/colores';

export default function BuscarPacienteScreen({ navigation }) {
  const [cedula,           setCedula]           = useState('');
  const [buscando,         setBuscando]         = useState(false);
  const [resultados,       setResultados]       = useState([]);
  const [buscado,          setBuscado]          = useState(false);
  const [fuenteLocal,      setFuenteLocal]      = useState(false);

  // Modal registro
  const [modalVisible,      setModalVisible]      = useState(false);
  const [guardando,         setGuardando]         = useState(false);
  const [formNombre,        setFormNombre]        = useState('');
  const [formApellido,      setFormApellido]      = useState('');
  const [formEdad,          setFormEdad]          = useState('');
  const [formTelefono,      setFormTelefono]      = useState('');
  const [formOcupacion,     setFormOcupacion]     = useState('');

  // ─── Buscar en servidor ──────────────────────────────────────────────────
  async function buscar() {
    if (!cedula.trim()) {
      Alert.alert('Campo requerido', 'Ingresa una cédula para buscar.');
      return;
    }
    setBuscando(true);
    setBuscado(false);
    setResultados([]);
    setFuenteLocal(false);

    try {
      const token = await AsyncStorage.getItem('token');
      const resp  = await fetch(`${CONFIG.CLINICAL_URL}/historias?cedula=${cedula.trim()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.ok) {
        const datos = await resp.json();
        const lista = Array.isArray(datos) ? datos : datos ? [datos] : [];
        setResultados(lista);
        setBuscado(true);
        return;
      }
    } catch {
      // Sin servidor → buscar local
    }

    // Fallback local
    try {
      const locales = await buscarHistoriasLocales(cedula.trim());
      const parseadas = locales.map(item => {
        try {
          const d = JSON.parse(item.datos);
          return {
            _id:            item.id,
            paciente:       d.paciente || {},
            motivo_consulta: d.anamnesis?.motivo || '',
            diagnostico:    d.diagnostico?.diagPrincipal || '',
            _local:         true,
            sincronizado:   item.sincronizado,
          };
        } catch { return null; }
      }).filter(Boolean);
      setResultados(parseadas);
      setFuenteLocal(true);
    } catch {
      setResultados([]);
    } finally {
      setBuscado(true);
      setBuscando(false);
    }
  }

  function limpiar() {
    setCedula('');
    setResultados([]);
    setBuscado(false);
    setFuenteLocal(false);
  }

  function abrirModal() {
    setFormNombre(''); setFormApellido('');
    setFormEdad(''); setFormTelefono(''); setFormOcupacion('');
    setModalVisible(true);
  }

  // ─── Registrar paciente nuevo ────────────────────────────────────────────
  async function registrarPaciente() {
    if (!formNombre.trim() || !formApellido.trim()) {
      Alert.alert('Campos requeridos', 'El nombre y apellido son obligatorios.');
      return;
    }
    setGuardando(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const resp  = await fetch(`${CONFIG.API_URL}/api/pacientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cedula:    cedula.trim(),
          nombre:    formNombre.trim(),
          apellido:  formApellido.trim(),
          edad:      formEdad ? Number(formEdad) : undefined,
          telefono:  formTelefono.trim() || undefined,
          ocupacion: formOcupacion.trim() || undefined,
        }),
      });

      const ok = resp.ok || resp.status === 409;
      setModalVisible(false);

      Alert.alert(
        ok ? (resp.status === 409 ? 'Paciente ya existe' : '✅ Registrado') : 'Error',
        ok
          ? '¿Deseas crear una historia clínica ahora?'
          : 'No se pudo registrar el paciente.',
        ok ? [
          { text: 'No por ahora', style: 'cancel' },
          {
            text: 'Crear historia',
            onPress: () => navigation.navigate('Formulario', {
              datosIA: {
                paciente: {
                  nombre:    `${formNombre.trim()} ${formApellido.trim()}`,
                  cedula:    cedula.trim(),
                  telefono:  formTelefono.trim(),
                  ocupacion: formOcupacion.trim(),
                  edad:      formEdad,
                },
              },
            }),
          },
        ] : [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Sin conexión', 'No se pudo conectar al servidor.');
    } finally {
      setGuardando(false);
    }
  }

  function formatFecha(f) {
    if (!f) return '';
    try { return new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return f; }
  }

  const paddingTop = Platform.OS === 'android' ? 48 : 60;

  // ─── Card de resultado ───────────────────────────────────────────────────
  function renderCard({ item }) {
    const nombre = item.paciente?.nombre || 'Paciente';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardAvatar}>
            <Text style={styles.cardAvatarTexto}>{nombre.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardNombre}>{nombre}</Text>
            <Text style={styles.cardCedula}>C.I. {item.paciente?.cedula || cedula}</Text>
          </View>
          {item._local && (
            <View style={styles.badgeLocal}>
              <Ionicons name="phone-portrait-outline" size={10} color="#fff" />
              <Text style={styles.badgeLocalTexto}>LOCAL</Text>
            </View>
          )}
          {item.fecha_consulta || item.createdAt ? (
            <Text style={styles.cardFecha}>{formatFecha(item.fecha_consulta || item.createdAt)}</Text>
          ) : null}
        </View>

        <View style={styles.divider} />

        <Text style={styles.cardMotivo} numberOfLines={2}>
          {item.motivo_consulta || 'Sin motivo registrado'}
        </Text>

        {item.diagnostico ? (
          <View style={styles.cardBadgeDx}>
            <Text style={styles.cardBadgeDxTexto}>Dx: {item.diagnostico}</Text>
          </View>
        ) : null}

        <View style={styles.cardBotones}>
          <TouchableOpacity
            style={styles.btnVer}
            onPress={() => navigation.navigate('HistorialClinico', { cedula: item.paciente?.cedula || cedula })}
          >
            <Ionicons name="document-text-outline" size={14} color={COLORES.primario} />
            <Text style={styles.btnVerTexto}>Ver historial</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnNueva}
            onPress={() => navigation.navigate('Grabacion')}
          >
            <Ionicons name="mic-outline" size={14} color="#fff" />
            <Text style={styles.btnNuevaTexto}>Nueva consulta</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[COLORES.gradienteInicio, COLORES.gradienteMedio]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: paddingTop + 8 }]}
      >
        <View style={styles.headerFila}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Buscar Paciente</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Buscador */}
        <View style={styles.buscadorFila}>
          <View style={styles.buscadorCaja}>
            <Ionicons name="search-outline" size={16} color={COLORES.mutedForeground} style={{ marginLeft: 12 }} />
            <TextInput
              style={styles.buscadorInput}
              placeholder="Número de cédula..."
              placeholderTextColor={COLORES.mutedForeground}
              value={cedula}
              onChangeText={setCedula}
              keyboardType="numeric"
              onSubmitEditing={buscar}
              returnKeyType="search"
            />
            {cedula.length > 0 && (
              <TouchableOpacity onPress={limpiar} style={{ paddingRight: 12 }}>
                <Ionicons name="close-circle" size={16} color={COLORES.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.btnBuscar, buscando && { opacity: 0.6 }]}
            onPress={buscar}
            disabled={buscando}
          >
            {buscando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnBuscarTexto}>Buscar</Text>}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Banner fuente local */}
      {fuenteLocal && (
        <View style={styles.bannerLocal}>
          <Ionicons name="wifi-outline" size={14} color="#F57F17" />
          <Text style={styles.bannerLocalTexto}>Sin conexión — mostrando resultados locales</Text>
        </View>
      )}

      {/* Contador */}
      {buscado && !buscando && (
        <View style={styles.contadorFila}>
          <Text style={styles.contadorTexto}>
            {resultados.length > 0
              ? `${resultados.length} historia${resultados.length > 1 ? 's' : ''} encontrada${resultados.length > 1 ? 's' : ''}`
              : `Sin resultados para cédula ${cedula}`}
          </Text>
        </View>
      )}

      <FlatList
        data={resultados}
        keyExtractor={(item) => item._id || item.id || String(Math.random())}
        renderItem={renderCard}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          buscado && !buscando ? (
            <View style={styles.vacioCont}>
              <Ionicons name="search-outline" size={60} color={COLORES.borde} />
              <Text style={styles.vacioTitulo}>No se encontraron historias</Text>
              <Text style={styles.vacioSub}>No hay historias clínicas para la cédula {cedula}</Text>
              <TouchableOpacity style={styles.btnRegistrar} onPress={abrirModal}>
                <Ionicons name="person-add-outline" size={16} color="#fff" />
                <Text style={styles.btnRegistrarTexto}>Registrar paciente nuevo</Text>
              </TouchableOpacity>
            </View>
          ) : !buscado ? (
            <View style={styles.vacioCont}>
              <Ionicons name="people-outline" size={60} color={COLORES.borde} />
              <Text style={styles.vacioTitulo}>Busca un paciente</Text>
              <Text style={styles.vacioSub}>Ingresa el número de cédula para encontrar sus historias clínicas</Text>
            </View>
          ) : null
        }
      />

      {/* Modal registro nuevo paciente */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCaja}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <View style={styles.modalBarra} />
              <View style={styles.modalHeaderFila}>
                <Text style={styles.modalTitulo}>Registrar paciente</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCerrarBtn}>
                  <Ionicons name="close" size={20} color={COLORES.mutedForeground} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalCedulaBadge}>
                <Ionicons name="card-outline" size={14} color={COLORES.primario} />
                <Text style={styles.modalCedulaLabel}>Cédula:</Text>
                <Text style={styles.modalCedulaValor}>{cedula}</Text>
              </View>

              {[
                { label: 'NOMBRE *',   value: formNombre,    set: setFormNombre,    ph: 'Nombre(s)',      cap: 'words' },
                { label: 'APELLIDO *', value: formApellido,  set: setFormApellido,  ph: 'Apellido(s)',    cap: 'words' },
                { label: 'TELÉFONO',   value: formTelefono,  set: setFormTelefono,  ph: '04XX-XXXXXXX',  kb: 'phone-pad' },
                { label: 'OCUPACIÓN',  value: formOcupacion, set: setFormOcupacion, ph: 'Profesión',      cap: 'words' },
              ].map(({ label, value, set, ph, cap, kb }) => (
                <View key={label} style={{ marginBottom: 12 }}>
                  <Text style={styles.modalLabel}>{label}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={ph}
                    placeholderTextColor={COLORES.mutedForeground}
                    value={value}
                    onChangeText={set}
                    autoCapitalize={cap || 'none'}
                    keyboardType={kb || 'default'}
                  />
                </View>
              ))}

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.modalLabel}>EDAD</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Años"
                  placeholderTextColor={COLORES.mutedForeground}
                  value={formEdad}
                  onChangeText={setFormEdad}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={[styles.modalBtnGuardar, guardando && { opacity: 0.6 }]}
                onPress={registrarPaciente}
                disabled={guardando}
              >
                <LinearGradient
                  colors={[COLORES.primario, COLORES.gradienteFin]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.modalBtnGrad}
                >
                  {guardando
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.modalBtnTexto}>Registrar paciente</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalBtnCancelar} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:      { paddingHorizontal: 16, paddingBottom: 16 },
  headerFila:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn:     { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitulo: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#fff' },

  buscadorFila: { flexDirection: 'row', gap: 10 },
  buscadorCaja: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14 },
  buscadorInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 15, color: COLORES.foreground },
  btnBuscar:    { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  btnBuscarTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },

  bannerLocal:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9C4', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F9A825' },
  bannerLocalTexto: { color: '#F57F17', fontSize: 13 },

  contadorFila:  { paddingHorizontal: 16, paddingVertical: 10 },
  contadorTexto: { fontSize: 13, color: COLORES.mutedForeground, fontWeight: '600' },

  lista: { padding: 14, paddingBottom: 40, flexGrow: 1 },

  card:       { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORES.secundario, justifyContent: 'center', alignItems: 'center' },
  cardAvatarTexto: { fontSize: 18, fontWeight: '700', color: COLORES.primario },
  cardNombre: { fontSize: 15, fontWeight: '700', color: COLORES.oscuro },
  cardCedula: { fontSize: 12, color: COLORES.mutedForeground, marginTop: 2 },
  cardFecha:  { fontSize: 11, color: COLORES.mutedForeground },
  divider:    { height: 1, backgroundColor: COLORES.muted, marginBottom: 10 },
  cardMotivo: { fontSize: 13, color: COLORES.mutedForeground, lineHeight: 20, marginBottom: 10 },
  cardBadgeDx: { backgroundColor: COLORES.secundario, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 12 },
  cardBadgeDxTexto: { fontSize: 12, color: COLORES.primario, fontWeight: '600' },
  cardBotones: { flexDirection: 'row', gap: 8 },
  btnVer:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORES.primario, borderRadius: 12, paddingVertical: 10 },
  btnVerTexto: { color: COLORES.primario, fontWeight: '600', fontSize: 13 },
  btnNueva:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORES.primario, borderRadius: 12, paddingVertical: 10 },
  btnNuevaTexto: { color: '#fff', fontWeight: '600', fontSize: 13 },

  badgeLocal:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF8F00', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, gap: 3 },
  badgeLocalTexto: { color: '#fff', fontSize: 9, fontWeight: '700' },

  vacioCont:   { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  vacioTitulo: { fontSize: 17, fontWeight: '700', color: COLORES.oscuro, marginTop: 16, marginBottom: 6 },
  vacioSub:    { fontSize: 13, color: COLORES.mutedForeground, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btnRegistrar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.primario, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, gap: 8 },
  btnRegistrarTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(13,59,68,0.7)', justifyContent: 'flex-end' },
  modalCaja:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalBarra:   { width: 50, height: 5, backgroundColor: COLORES.borde, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeaderFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo:  { fontSize: 18, fontWeight: '700', color: COLORES.oscuro },
  modalCerrarBtn: { width: 32, height: 32, backgroundColor: COLORES.muted, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  modalCedulaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.secundario, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20, gap: 8 },
  modalCedulaLabel: { fontSize: 12, color: COLORES.mutedForeground, fontWeight: '600' },
  modalCedulaValor: { fontSize: 16, fontWeight: '700', color: COLORES.primario },
  modalLabel:   { fontSize: 11, color: COLORES.mutedForeground, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput:   { borderWidth: 1.5, borderColor: COLORES.borde, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORES.foreground, backgroundColor: COLORES.muted },
  modalBtnGuardar:  { borderRadius: 14, overflow: 'hidden', marginTop: 8, marginBottom: 10 },
  modalBtnGrad:     { paddingVertical: 15, alignItems: 'center' },
  modalBtnTexto:    { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalBtnCancelar: { borderWidth: 1.5, borderColor: COLORES.borde, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  modalBtnCancelarTexto: { color: COLORES.mutedForeground, fontWeight: '600', fontSize: 15 },
});