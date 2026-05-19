import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Modal, TextInput, FlatList, ActivityIndicator,
  Platform, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DrawerMenu from '../componentes/drawerMenu';
import { obtenerTodasLasHistorias, contarHistoriasPendientes } from '../baseDatosLite/basedatoslt';
import CONFIG from '../config';
import COLORES from '../constantes/colores';

export default function HomeScreen({ navigation, setToken }) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [email, setEmail]                 = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [fabAbierto, setFabAbierto]       = useState(false);
  const [busquedaVisible, setBusquedaVisible] = useState(false);
  const [cedulaBusqueda, setCedulaBusqueda]   = useState('');
  const [resultados, setResultados]           = useState([]);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [totalHistorias, setTotalHistorias]   = useState(0);
  const [pendientes, setPendientes]           = useState(0);

  const fabAnim = useRef(new Animated.Value(0)).current;

  // Carga de datos al montar
  useEffect(() => {
    async function cargar() {
      const n = await AsyncStorage.getItem('nombre');
      const e = await AsyncStorage.getItem('email');
      if (n) setNombreUsuario(n);
      if (e) setEmail(e);

      const historias = await obtenerTodasLasHistorias();
      setTotalHistorias(historias.length);

      const pend = await contarHistoriasPendientes();
      setPendientes(pend);
    }
    cargar();
  }, []);

  // ─── FAB ───────────────────────────────────────────────────────────────────
  function toggleFab() {
    const toValue = fabAbierto ? 0 : 1;
    Animated.spring(fabAnim, { toValue, useNativeDriver: true, friction: 6 }).start();
    setFabAbierto(!fabAbierto);
  }

  function cerrarFab() {
    Animated.spring(fabAnim, { toValue: 0, useNativeDriver: true, friction: 6 }).start();
    setFabAbierto(false);
  }

  const opcionStyle = (offset) => ({
    opacity: fabAnim,
    transform: [{
      translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -offset] }),
    }],
  });

  // ─── Búsqueda ─────────────────────────────────────────────────────────────
  async function buscarPaciente() {
    if (!cedulaBusqueda.trim()) return;
    setCargandoBusqueda(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const resp = await fetch(`${CONFIG.CLINICAL_URL}/historias?cedula=${cedulaBusqueda}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setResultados(Array.isArray(data) ? data : [data]);
      } else {
        setResultados([]);
      }
    } catch {
      setResultados([]);
    } finally {
      setCargandoBusqueda(false);
    }
  }

  const inicial = nombreUsuario ? nombreUsuario.charAt(0).toUpperCase() : 'A';
  const paddingTop = Platform.OS === 'android' ? 45 : 10;

  return (
    <View style={styles.raiz}>
      <StatusBar barStyle="light-content" backgroundColor={COLORES.primario} />

      {/* ── Header con gradiente ── */}
      <LinearGradient
        colors={[COLORES.gradienteInicio, COLORES.gradienteMedio]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: paddingTop + 12 }]}
      >
        <View style={styles.headerFila}>
          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuBtn}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCentro}>
            <Text style={styles.headerTitulo}>ATHENEA</Text>
            <Text style={styles.headerSub}>Su asistente clínica</Text>
          </View>

          <View style={styles.headerDerecha}>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => { setResultados([]); setCedulaBusqueda(''); setBusquedaVisible(true); }}
            >
              <Ionicons name="search-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{inicial}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── Contenido ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Saludo */}
        <View style={styles.saludo}>
          <Text style={styles.saludoTexto}>¡Saludos!, {nombreUsuario || 'Especialista'}</Text>
          <Text style={styles.saludoSub}>Panel de control</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumero}>{totalHistorias > 0 ? totalHistorias : '--'}</Text>
            <Text style={styles.statLabel}>Pacientes</Text>
          </View>
          <View style={[styles.statCard, pendientes > 0 && styles.statCardAdvertencia]}>
            <Text style={[styles.statNumero, pendientes > 0 && { color: COLORES.advertencia }]}>
              {pendientes}
            </Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORES.primario }]}>
            <Text style={[styles.statNumero, { color: '#fff' }]}>Activo</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]}>Sincro</Text>
          </View>
        </View>

        {/* Hero card */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => navigation.navigate('Grabacion')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[COLORES.gradienteInicio, COLORES.gradienteMedio, COLORES.gradienteFin]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroGradiente}
          >
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitulo}>Nueva Historia</Text>
              <Text style={styles.heroSub}>Grabar con Athenea</Text>
              <View style={styles.heroBadge}>
                <Ionicons name="mic" size={12} color="#fff" />
                <Text style={styles.heroBadgeTexto}>MODO SIN CONEXIÓN</Text>
              </View>
            </View>
            <View style={styles.heroIconCaja}>
              <Ionicons name="eye" size={42} color="rgba(255,255,255,0.6)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Acciones rápidas */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Acciones rápidas</Text>
          <View style={styles.gridAcciones}>
            <TouchableOpacity style={styles.accionItem} onPress={() => navigation.navigate('Formulario')}>
              <View style={[styles.accionIcono, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="create-outline" size={22} color={COLORES.info} />
              </View>
              <Text style={styles.accionTexto}>Manual</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.accionItem} onPress={() => navigation.navigate('HistorialClinico')}>
              <View style={[styles.accionIcono, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="folder-outline" size={22} color={COLORES.exito} />
              </View>
              <Text style={styles.accionTexto}>Historial</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.accionItem} onPress={() => { setResultados([]); setCedulaBusqueda(''); setBusquedaVisible(true); }}>
              <View style={[styles.accionIcono, { backgroundColor: COLORES.secundario }]}>
                <Ionicons name="search-outline" size={22} color={COLORES.primario} />
              </View>
              <Text style={styles.accionTexto}>Buscar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.accionItem} onPress={() => navigation.navigate('Ajustes')}>
              <View style={[styles.accionIcono, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="settings-outline" size={22} color={COLORES.advertencia} />
              </View>
              <Text style={styles.accionTexto}>Ajustes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner de sync */}
        <View style={styles.syncBanner}>
          <View style={styles.syncPunto} />
          <Text style={styles.syncTexto}>Conectado · Sincronización activa</Text>
        </View>
      </ScrollView>

      {/* ── Modal de búsqueda ── */}
      <Modal
        visible={busquedaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBusquedaVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCaja}>
            <View style={styles.modalBarra} />
            <View style={styles.modalHeaderFila}>
              <Text style={styles.modalTitulo}>Buscar Paciente</Text>
              <TouchableOpacity onPress={() => setBusquedaVisible(false)} style={styles.modalCerrarBtn}>
                <Ionicons name="close" size={20} color={COLORES.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBusqueda}>
              <Ionicons name="card-outline" size={18} color={COLORES.mutedForeground} style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.modalInput}
                placeholder="Número de cédula..."
                placeholderTextColor={COLORES.mutedForeground}
                keyboardType="numeric"
                value={cedulaBusqueda}
                onChangeText={setCedulaBusqueda}
                autoFocus
              />
              <TouchableOpacity style={styles.modalBuscarBtn} onPress={buscarPaciente}>
                {cargandoBusqueda
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBuscarTexto}>Buscar</Text>}
              </TouchableOpacity>
            </View>

            <FlatList
              data={resultados}
              keyExtractor={(item) => item._id || String(Math.random())}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultadoItem}
                  onPress={() => { setBusquedaVisible(false); navigation.navigate('Formulario', { historiaExistente: item }); }}
                >
                  <View style={styles.resultadoAvatar}>
                    <Text style={styles.resultadoAvatarTexto}>
                      {item.paciente?.nombre?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultadoNombre}>{item.paciente?.nombre || 'Paciente'}</Text>
                    <Text style={styles.resultadoSub}>CI: {item.paciente?.cedula}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORES.mutedForeground} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !cargandoBusqueda
                  ? <Text style={styles.vacioTexto}>{cedulaBusqueda ? 'Sin resultados' : 'Ingresa un número de cédula'}</Text>
                  : null
              }
            />
          </View>
        </View>
      </Modal>

      {/* ── FAB ── */}
      {fabAbierto && <TouchableOpacity style={styles.fabOverlay} onPress={cerrarFab} activeOpacity={1} />}

      <View style={styles.fabContenedor}>
        <Animated.View style={[styles.fabOpcion, opcionStyle(130)]}>
          <TouchableOpacity
            style={[styles.fabOpcionBtn, { backgroundColor: COLORES.info }]}
            onPress={() => { cerrarFab(); navigation.navigate('Grabacion'); }}
          >
            <Ionicons name="mic" size={22} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.fabOpcion, opcionStyle(70)]}>
          <TouchableOpacity
            style={[styles.fabOpcionBtn, { backgroundColor: COLORES.oscuro }]}
            onPress={() => { cerrarFab(); navigation.navigate('Formulario'); }}
          >
            <Ionicons name="create-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity style={styles.fabPrincipal} onPress={toggleFab}>
          <LinearGradient
            colors={[COLORES.primario, COLORES.gradienteFin]}
            style={styles.fabGradiente}
          >
            <Animated.View style={{
              transform: [{ rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
            }}>
              <Ionicons name="add" size={30} color="#fff" />
            </Animated.View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Drawer ── */}
      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        setToken={setToken}
        nombreUsuario={nombreUsuario}
        email={email}
        pantallaActual="Home"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  raiz:  { flex: 1, backgroundColor: COLORES.fondo },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, elevation: 8 },
  headerFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerCentro: { alignItems: 'center' },
  headerTitulo: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  headerSub:    { fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
  headerDerecha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  avatar:    { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORES.oscuro, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  avatarTexto: { fontSize: 16, fontWeight: '700', color: '#fff' },

  scroll:       { flex: 1 },
  scrollContent: { paddingTop: 24, paddingBottom: 120 },

  saludo:     { paddingHorizontal: 24, marginBottom: 20 },
  saludoTexto: { fontSize: 26, fontWeight: '800', color: COLORES.oscuro },
  saludoSub:   { fontSize: 14, color: COLORES.mutedForeground, marginTop: 4 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 24, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 20, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  statCardAdvertencia: { borderWidth: 1, borderColor: COLORES.advertencia },
  statNumero: { fontSize: 20, fontWeight: '800', color: COLORES.primario },
  statLabel:  { fontSize: 11, color: COLORES.mutedForeground, marginTop: 2 },

  heroCard: { marginHorizontal: 20, borderRadius: 28, overflow: 'hidden', marginBottom: 32, elevation: 8, shadowColor: COLORES.primario, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14 },
  heroGradiente: { padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroInfo:   { flex: 1 },
  heroTitulo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroSub:    { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4, marginBottom: 14 },
  heroBadge:  { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 5 },
  heroBadgeTexto: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  heroIconCaja: { width: 70, height: 70, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

  seccion:       { paddingHorizontal: 20, marginBottom: 24 },
  seccionTitulo: { fontSize: 17, fontWeight: '700', color: COLORES.oscuro, marginBottom: 18 },
  gridAcciones:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  accionItem:    { width: '22%', alignItems: 'center', marginBottom: 20 },
  accionIcono:   { width: 55, height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 2 },
  accionTexto:   { fontSize: 12, fontWeight: '600', color: COLORES.mutedForeground },

  syncBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORES.secundario, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginHorizontal: 20 },
  syncPunto:  { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORES.exito, marginRight: 8 },
  syncTexto:  { fontSize: 12, color: COLORES.primario, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(13,59,68,0.7)', justifyContent: 'flex-end' },
  modalCaja:    { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalBarra:   { width: 50, height: 5, backgroundColor: COLORES.borde, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeaderFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitulo:  { fontSize: 20, fontWeight: '800', color: COLORES.oscuro },
  modalCerrarBtn: { width: 32, height: 32, backgroundColor: COLORES.muted, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  modalBusqueda: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.muted, borderRadius: 16, marginBottom: 16, borderWidth: 1.5, borderColor: COLORES.borde },
  modalInput:   { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: COLORES.foreground },
  modalBuscarBtn: { backgroundColor: COLORES.primario, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, margin: 5 },
  modalBuscarTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },

  resultadoItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORES.muted, gap: 12 },
  resultadoAvatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORES.secundario, justifyContent: 'center', alignItems: 'center' },
  resultadoAvatarTexto: { fontSize: 16, fontWeight: '700', color: COLORES.primario },
  resultadoNombre:     { fontSize: 15, fontWeight: '700', color: COLORES.oscuro },
  resultadoSub:        { fontSize: 12, color: COLORES.mutedForeground },
  vacioTexto:          { textAlign: 'center', color: COLORES.mutedForeground, marginTop: 32, fontSize: 14 },

  // FAB
  fabOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.05)', zIndex: 98 },
  fabContenedor: { position: 'absolute', bottom: 30, right: 24, alignItems: 'center', zIndex: 99 },
  fabPrincipal:  { width: 62, height: 62, borderRadius: 22, overflow: 'hidden', elevation: 8, shadowColor: COLORES.primario, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
  fabGradiente:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fabOpcion:     { position: 'absolute', right: 6 },
  fabOpcionBtn:  { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 5 },
});
