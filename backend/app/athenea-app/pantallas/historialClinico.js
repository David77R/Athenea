import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Modal,
  ScrollView, Platform, StatusBar, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { obtenerTodasLasHistorias, sincronizarPendientes, borrarHistoriaPorId } from '../baseDatosLite/basedatoslt';
import { sincronizarAhora } from '../servicios/syncEngine';
import COLORES from '../constantes/colores';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderConDrawer from '../componentes/HeaderConDrawer';
const OD_COLOR = '#1565C0';
const OI_COLOR = '#C62828';

// ─── Parsear datos JSON de cada historia ────────────────────────────────────
function parsearHistoria(item) {
  try {
    const datos = typeof item.datos === 'string' ? JSON.parse(item.datos) : item.datos;
    return {
      id:           item.id,
      sincronizado: item.sincronizado,
      creadoEn:     item.creado_en,
      paciente:     datos.paciente     || {},
      anamnesis:    datos.anamnesis    || {},
      examen:       datos.examen       || {},
      diagnostico:  datos.diagnostico  || {},
    };
  } catch {
    return {
      id:           item.id,
      sincronizado: item.sincronizado,
      creadoEn:     item.creado_en,
      paciente:     {},
      anamnesis:    {},
      examen:       {},
      diagnostico:  {},
    };
  }
}

// ─── Formatear fecha ────────────────────────────────────────────────────────
function formatFecha(fechaStr) {
  if (!fechaStr) return 'Sin fecha';
  try {
    const f = new Date(fechaStr);
    return f.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return fechaStr; }
}

// ─── Fila de detalle en el modal ────────────────────────────────────────────
function FilaDetalle({ label, valor }) {
  if (!valor) return null;
  return (
    <View style={styles.filaDetalle}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={styles.filaValor}>{valor}</Text>
    </View>
  );
}

/** 
 * Aqui va la seccion del modal detallada del parse del JSON
*/
function SeccionModal({ titulo, icono, children }) {
  return (
    <View style={styles.seccionModal}>
      <View style={styles.seccionModalHeader}>
        <Ionicons name={icono} size={15} color={COLORES.primario} />
        <Text style={styles.seccionModalTitulo}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

export default function HistorialClinico({ navigation, route, setToken }) {
  const [historias,     setHistorias]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [busqueda,      setBusqueda]      = useState('');
  const [pendientes,    setPendientes]    = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [historiaSeleccionada, setHistoriaSeleccionada] = useState(null);

  const cedulaFiltro = route?.params?.cedula || null;

 const cargar = useCallback(async () => {
    try {
      const emailEspecialista = await AsyncStorage.getItem('email') || '';
      const todas = await obtenerTodasLasHistorias();
      const parseadas = todas.map(parsearHistoria);

      let filtradas = parseadas;

      if (cedulaFiltro) {
        filtradas = parseadas.filter(h => h.paciente?.cedula === cedulaFiltro);
      } else if (busqueda.trim()) {
        const term = busqueda.trim().toLowerCase();
        filtradas = parseadas.filter(h =>
          h.paciente?.nombre?.toLowerCase().includes(term) ||
          h.paciente?.cedula?.includes(term)
        );
      }

      setHistorias(filtradas);
      setPendientes(parseadas.filter(h => h.sincronizado === 0).length);
} catch (e) {
      console.log('ERROR HISTORIAL:', e.message, e);
      Alert.alert('Error', 'No se pudo cargar el historial.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [busqueda, cedulaFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', cargar);
    return unsub;
  }, [navigation, cargar]);

  async function handleSync() {
    setSincronizando(true);
    const resultado = await sincronizarAhora();
    setSincronizando(false);
    await cargar();
    Alert.alert(
      resultado.success ? 'Sincronización completada' : 'Error',
      resultado.message
    );
  }

  function abrirDetalle(historia) {
    setHistoriaSeleccionada(historia);
    setModalVisible(true);
  }

  // ─── Card de historia ──────────────────────────────────────────────────
  function renderCard({ item }) {
    const sync = item.sincronizado === 1;
    return (
      <TouchableOpacity style={styles.card} onPress={() => abrirDetalle(item)} activeOpacity={0.85}>
        <View style={styles.cardHeader}>
          <View style={styles.cardAvatar}>
            <Text style={styles.cardAvatarTexto}>
              {item.paciente?.nombre?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardNombre}>{item.paciente?.nombre || 'Paciente sin nombre'}</Text>
            <Text style={styles.cardCedula}>CI: {item.paciente?.cedula || '—'}</Text>
          </View>
          <View style={[styles.badge, sync ? styles.badgeSync : styles.badgePend]}>
            <Ionicons
              name={sync ? 'cloud-done-outline' : 'cloud-upload-outline'}
              size={10} color="#fff"
            />
            <Text style={styles.badgeTexto}>{sync ? 'SYNC' : 'PEND'}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardMotivo} numberOfLines={2}>
            {item.anamnesis?.motivo || 'Sin motivo registrado'}
          </Text>
          {(item.examen?.avscOD || item.examen?.avscOI) ? (
            <View style={styles.avFila}>
              {item.examen?.avscOD ? <Text style={[styles.avTexto, { color: OD_COLOR }]}>OD: {item.examen.avscOD}</Text> : null}
              {item.examen?.avscOI ? <Text style={[styles.avTexto, { color: OI_COLOR }]}>OI: {item.examen.avscOI}</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <Ionicons name="calendar-outline" size={12} color={COLORES.mutedForeground} />
          <Text style={styles.cardFecha}>{formatFecha(item.creadoEn)}</Text>
          <Text style={styles.cardVerMas}>Ver detalle →</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ─── Modal de detalle ──────────────────────────────────────────────────
  function ModalDetalle() {
    if (!historiaSeleccionada) return null;
    const h = historiaSeleccionada;
    return (
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCaja}>
            <LinearGradient
              colors={[COLORES.gradienteInicio, COLORES.gradienteMedio]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.modalHeader}
            >
              <View style={styles.modalHeaderFila}>
                <View>
                  <Text style={styles.modalNombre}>{h.paciente?.nombre || 'Paciente'}</Text>
                  <Text style={styles.modalCedula}>CI: {h.paciente?.cedula || '—'}</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCerrar}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBadgeFila}>
                <View style={[styles.badge, h.sincronizado === 1 ? styles.badgeSync : styles.badgePend]}>
                  <Ionicons name={h.sincronizado === 1 ? 'cloud-done-outline' : 'cloud-upload-outline'} size={10} color="#fff" />
                  <Text style={styles.badgeTexto}>{h.sincronizado === 1 ? 'Sincronizado' : 'Pendiente'}</Text>
                </View>
                <Text style={styles.modalFecha}>{formatFecha(h.creadoEn)}</Text>
              </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>

              <SeccionModal titulo="Datos del Paciente" icono="person-outline">
                <FilaDetalle label="Nombre"     valor={h.paciente?.nombre} />
                <FilaDetalle label="Cédula"     valor={h.paciente?.cedula} />
                <FilaDetalle label="Edad"       valor={h.paciente?.edad ? `${h.paciente.edad} años` : null} />
                <FilaDetalle label="Teléfono"   valor={h.paciente?.telefono} />
                <FilaDetalle label="Ocupación"  valor={h.paciente?.ocupacion} />
                <FilaDetalle label="N° Historia" valor={h.paciente?.nroHistoria} />
              </SeccionModal>

              <SeccionModal titulo="Anamnesis" icono="clipboard-outline">
                <FilaDetalle label="Motivo"              valor={h.anamnesis?.motivo} />
                <FilaDetalle label="Tiempo de evolución" valor={h.anamnesis?.tiempoEvolucion} />
                <FilaDetalle label="Ant. oculares"       valor={h.anamnesis?.antOcularPersonal} />
                <FilaDetalle label="Ant. familiares"     valor={h.anamnesis?.antOcularFamiliar} />
                <FilaDetalle label="Ant. médicos"        valor={h.anamnesis?.antMedicos} />
                <FilaDetalle label="Medicamentos"        valor={h.anamnesis?.medicamentos} />
                {h.anamnesis?.usaLentes && <FilaDetalle label="Lentes" valor={h.anamnesis?.tipoLentes || 'Sí'} />}
              </SeccionModal>

              <SeccionModal titulo="Examen Visual" icono="eye-outline">
                {(h.examen?.avscOD || h.examen?.avscOI) && (
                  <View style={styles.examenFila}>
                    <Text style={styles.examenSubtitulo}>AVSC</Text>
                    <View style={styles.examenOjos}>
                      <Text style={[styles.examenOjo, { color: OD_COLOR }]}>OD: {h.examen.avscOD || '—'}</Text>
                      <Text style={[styles.examenOjo, { color: OI_COLOR }]}>OI: {h.examen.avscOI || '—'}</Text>
                    </View>
                  </View>
                )}
                {(h.examen?.avccOD || h.examen?.avccOI) && (
                  <View style={styles.examenFila}>
                    <Text style={styles.examenSubtitulo}>AVCC</Text>
                    <View style={styles.examenOjos}>
                      <Text style={[styles.examenOjo, { color: OD_COLOR }]}>OD: {h.examen.avccOD || '—'}</Text>
                      <Text style={[styles.examenOjo, { color: OI_COLOR }]}>OI: {h.examen.avccOI || '—'}</Text>
                    </View>
                  </View>
                )}
                {(h.examen?.esfOD || h.examen?.esfOI) && (
                  <View style={styles.tablaRefraccion}>
                    <View style={styles.tablaHeaderFila}>
                      <Text style={styles.tablaCeldaLabel}></Text>
                      <Text style={[styles.tablaHeaderOjo, { color: OD_COLOR }]}>OD</Text>
                      <Text style={[styles.tablaHeaderOjo, { color: OI_COLOR }]}>OI</Text>
                    </View>
                    {[
                      { label: 'Esf',  od: h.examen?.esfOD, oi: h.examen?.esfOI },
                      { label: 'Cil',  od: h.examen?.cilOD, oi: h.examen?.cilOI },
                      { label: 'Eje',  od: h.examen?.ejeOD, oi: h.examen?.ejeOI },
                      { label: 'ADD',  od: h.examen?.addOD, oi: h.examen?.addOI },
                    ].filter(r => r.od || r.oi).map(({ label, od, oi }) => (
                      <View key={label} style={styles.tablaFila}>
                        <Text style={styles.tablaCeldaLabel}>{label}</Text>
                        <Text style={[styles.tablaCeldaValor, { color: OD_COLOR }]}>{od || '—'}</Text>
                        <Text style={[styles.tablaCeldaValor, { color: OI_COLOR }]}>{oi || '—'}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {(h.examen?.pioOD || h.examen?.pioOI) && (
                  <View style={styles.examenFila}>
                    <Text style={styles.examenSubtitulo}>PIO</Text>
                    <View style={styles.examenOjos}>
                      <Text style={[styles.examenOjo, { color: OD_COLOR }]}>OD: {h.examen.pioOD || '—'} mmHg</Text>
                      <Text style={[styles.examenOjo, { color: OI_COLOR }]}>OI: {h.examen.pioOI || '—'} mmHg</Text>
                    </View>
                  </View>
                )}
              </SeccionModal>

              <SeccionModal titulo="Diagnóstico" icono="medical-outline">
                <FilaDetalle label="Principal"    valor={h.diagnostico?.diagPrincipal} />
                <FilaDetalle label="Secundario"   valor={h.diagnostico?.diagSecundario} />
                <FilaDetalle label="Prescripción" valor={h.diagnostico?.prescripcion} />
                <FilaDetalle label="Próxima cita" valor={h.diagnostico?.proximaCita} />
                <FilaDetalle label="Observaciones" valor={h.diagnostico?.observaciones} />
              </SeccionModal>

            </ScrollView>
             {/* Botones editar y borrar */}
            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBtnEditar}
                onPress={() => {
                  setModalVisible(false);
                  setTimeout(() => navigation.navigate('Formulario', {
                    datosIA: {
                      paciente:     h.paciente,
                      motivo:       h.anamnesis?.motivo,
                      visualAcuity: { od: h.examen?.avscOD, oi: h.examen?.avscOI },
                      refraccion:   { esf_od: h.examen?.esfOD, esf_oi: h.examen?.esfOI, cil_od: h.examen?.cilOD, cil_oi: h.examen?.cilOI, eje_od: h.examen?.ejeOD, eje_oi: h.examen?.ejeOI },
                      intraocularPressure: { od: h.examen?.pioOD, oi: h.examen?.pioOI },
                    },
                  }), 300);
                }}
              >
                <Ionicons name="create-outline" size={16} color={COLORES.primario} />
                <Text style={styles.modalBtnEditarTexto}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnBorrar}
                onPress={() => {
                  Alert.alert(
                    'Borrar historia',
                    `¿Eliminar la historia de ${h.paciente?.nombre}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Borrar',
                        style: 'destructive',
                        onPress: async () => {
                          await borrarHistoriaPorId(h.id);
                          setModalVisible(false);
                          await cargar();
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={16} color={COLORES.error} />
                <Text style={styles.modalBtnBorrarTexto}>Borrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const paddingTop = Platform.OS === 'android' ? 48 : 60;

  if (loading) {
    return (
      <View style={styles.loadingCont}>
        <ActivityIndicator size="large" color={COLORES.primario} />
        <Text style={styles.loadingTexto}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.raiz}>
      <StatusBar barStyle="light-content" />

     <HeaderConDrawer
        titulo={cedulaFiltro ? `Historial · ${cedulaFiltro}` : 'Historial Clínico'}
        subtitulo={`${historias.length} registro${historias.length !== 1 ? 's' : ''}`}
        navigation={navigation}
        setToken={setToken}
        pantallaActual="HistorialClinico"
      />

      {/* Buscador */}
      {!cedulaFiltro && (
        <View style={styles.buscadorCaja}>
          <Ionicons name="search-outline" size={16} color={COLORES.mutedForeground} style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.buscador}
            placeholder="Buscar por nombre o cédula..."
            placeholderTextColor={COLORES.mutedForeground}
            value={busqueda}
            onChangeText={setBusqueda}
            returnKeyType="search"
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')} style={{ paddingRight: 12 }}>
              <Ionicons name="close-circle" size={16} color={COLORES.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Botón sync si hay pendientes */}
      {pendientes > 0 && (
        <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={sincronizando}>
          {sincronizando
            ? <ActivityIndicator color={COLORES.primario} size="small" />
            : <Ionicons name="cloud-upload-outline" size={22} color={COLORES.primario} />}
        </TouchableOpacity>
      )}

      {/* Banner pendientes */}
      {pendientes > 0 && (
        <TouchableOpacity style={styles.bannerPendientes} onPress={handleSync} disabled={sincronizando}>
          <Ionicons name="cloud-upload-outline" size={14} color="#F57F17" />
          <Text style={styles.bannerTexto}>{pendientes} historia{pendientes !== 1 ? 's' : ''} pendiente{pendientes !== 1 ? 's' : ''} de sincronizar</Text>
          <Text style={styles.bannerAccion}>Sincronizar</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={historias}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCard}
        ListEmptyComponent={
          <View style={styles.vacioCont}>
            <Ionicons name="document-text-outline" size={60} color={COLORES.borde} />
            <Text style={styles.vacioTitulo}>Sin historias clínicas</Text>
            <Text style={styles.vacioSub}>
              {cedulaFiltro
                ? 'No hay consultas para este paciente.'
                : busqueda
                ? 'No se encontraron resultados.'
                : 'Las consultas guardadas aparecerán aquí.'}
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} tintColor={COLORES.primario} />}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
      />

      <ModalDetalle />
    </View>
  );
}

const styles = StyleSheet.create({
  raiz:       { flex: 1, backgroundColor: COLORES.fondo },
  loadingCont: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORES.fondo },
  loadingTexto: { marginTop: 12, color: COLORES.mutedForeground, fontSize: 14 },

  header:      { paddingHorizontal: 16, paddingBottom: 16 },
  headerFila:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn:     { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitulo: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  syncBtn:     { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  buscadorCaja: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  buscador:    { flex: 1, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14, color: COLORES.foreground },

  bannerPendientes: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9C4', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F9A825' },
  bannerTexto:      { flex: 1, color: '#F57F17', fontSize: 13 },
  bannerAccion:     { color: COLORES.primario, fontWeight: '700', fontSize: 13 },

  lista: { padding: 14, paddingBottom: 40, flexGrow: 1 },

  card:       { backgroundColor: '#fff', borderRadius: 18, marginBottom: 12, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORES.muted },
  cardAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORES.secundario, justifyContent: 'center', alignItems: 'center' },
  cardAvatarTexto: { fontSize: 18, fontWeight: '700', color: COLORES.primario },
  cardNombre: { fontSize: 15, fontWeight: '700', color: COLORES.oscuro },
  cardCedula: { fontSize: 12, color: COLORES.mutedForeground, marginTop: 2 },

  badge:       { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 3 },
  badgeSync:   { backgroundColor: COLORES.exito },
  badgePend:   { backgroundColor: '#FF8F00' },
  badgeTexto:  { color: '#fff', fontSize: 9, fontWeight: '700' },

  cardBody:   { padding: 14, paddingTop: 10, paddingBottom: 8 },
  cardMotivo: { fontSize: 13, color: COLORES.mutedForeground, lineHeight: 18 },
  avFila:     { flexDirection: 'row', gap: 16, marginTop: 6 },
  avTexto:    { fontSize: 12, fontWeight: '700' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORES.muted, gap: 6 },
  cardFecha:  { flex: 1, fontSize: 11, color: COLORES.mutedForeground },
  cardVerMas: { fontSize: 12, color: COLORES.primario, fontWeight: '600' },

  vacioCont:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  vacioTitulo: { fontSize: 17, fontWeight: '700', color: COLORES.oscuro, marginTop: 16, marginBottom: 6 },
  vacioSub:   { fontSize: 13, color: COLORES.mutedForeground, textAlign: 'center', lineHeight: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(13,59,68,0.7)', justifyContent: 'flex-end' },
  modalCaja:    { backgroundColor: COLORES.fondo, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  modalHeader:  { padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalHeaderFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modalNombre:  { fontSize: 20, fontWeight: '800', color: '#fff' },
  modalCedula:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  modalCerrar:  { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  modalBadgeFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalFecha:   { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  modalScroll:  { padding: 16, paddingBottom: 40 },

  seccionModal: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, elevation: 1 },
  seccionModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  seccionModalTitulo: { fontSize: 13, fontWeight: '700', color: COLORES.oscuro, textTransform: 'uppercase', letterSpacing: 0.5 },

  filaDetalle: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORES.muted },
  filaLabel:   { width: 110, fontSize: 12, color: COLORES.mutedForeground, fontWeight: '600' },
  filaValor:   { flex: 1, fontSize: 13, color: COLORES.foreground },

  examenFila:     { marginBottom: 10 },
  examenSubtitulo: { fontSize: 10, fontWeight: '700', color: COLORES.primario, letterSpacing: 0.5, marginBottom: 4 },
  examenOjos:     { flexDirection: 'row', gap: 20 },
  examenOjo:      { fontSize: 13, fontWeight: '600' },

  tablaRefraccion: { borderWidth: 1, borderColor: COLORES.borde, borderRadius: 10, overflow: 'hidden', marginVertical: 8 },
  tablaHeaderFila: { flexDirection: 'row', backgroundColor: COLORES.muted, padding: 8 },
  tablaHeaderOjo:  { flex: 1, fontWeight: '700', fontSize: 12, textAlign: 'center' },
  tablaFila:       { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORES.morde, padding: 8 },
  tablaCeldaLabel: { flex: 1, fontSize: 12, color: COLORES.mutedForeground, fontWeight: '600' },
  tablaCeldaValor: { flex: 1, fontSize: 13, textAlign: 'center', fontWeight: '600' },
modalBotones:        { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 30 },
  modalBtnEditar:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORES.primario, borderRadius: 14, paddingVertical: 13 },
  modalBtnEditarTexto: { color: COLORES.primario, fontWeight: '700', fontSize: 14 },
  modalBtnBorrar:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORES.error, borderRadius: 14, paddingVertical: 13 },
  modalBtnBorrarTexto: { color: COLORES.error, fontWeight: '700', fontSize: 14 },
});