import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated, Dimensions,
  Modal, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import DrawerMenu from '../componentes/drawerMenu';
import CONFIG from '../config';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation, setToken }) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [fabAbierto, setFabAbierto] = useState(false);
  const [busquedaVisible, setBusquedaVisible] = useState(false);
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  
  const animFab = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [historias, setHistorias] = useState([]);

  // Carga de datos inicial
  useEffect(() => {
    async function cargarDatos() {
      const n = await AsyncStorage.getItem('nombre');
      const e = await AsyncStorage.getItem('email');
      if (n) setNombreUsuario(n);
      if (e) setEmail(e);
    }
    cargarDatos();
  }, []);

  const handleResultados = useCallback((resultados) => {
    const lista = Array.isArray(resultados) ? resultados : (resultados ? [resultados] : []);
    setHistorias([...lista]);
    setModalVisible(false);
  }, []);

  const buscarPaciente = async () => {
    if (!cedulaBusqueda.trim()) return;
    setCargandoBusqueda(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${CONFIG.CLINICAL_URL}/historias?cedula=${cedulaBusqueda}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const textoRespuesta = await response.text();
      let lista = [];

      try {
        const data = JSON.parse(textoRespuesta);
        lista = response.ok ? (Array.isArray(data) ? data : [data]) : [];
      } catch (e) {
        lista = [];
      }

      setResultados(lista);
      if (typeof handleResultados === 'function') handleResultados(lista);
    } catch (error) {
      console.error(error);
    } finally {
      setCargandoBusqueda(false);
    }
  };

  function toggleFab() {
    const toValue = fabAbierto ? 0 : 1;
    Animated.spring(animFab, {
      toValue,
      useNativeDriver: true,
      friction: 6,
    }).start();
    setFabAbierto(!fabAbierto);
  }

  function cerrarFab() {
    Animated.spring(animFab, {
      toValue: 0,
      useNativeDriver: true,
      friction: 6,
    }).start();
    setFabAbierto(false);
  }

  const opcionesStyle = (offset) => ({
    opacity: animFab,
    transform: [{
      translateY: animFab.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -offset],
      })
    }],
  });

  return (
    <View style={styles.contenedorRaiz}>
      <StatusBar barStyle="light-content" backgroundColor="#0B7B8B" />
      <SafeAreaView style={styles.contenedor}>

        {/* Header Rediseñado */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuBtn}>
            <View style={styles.hamburguesa} />
            <View style={styles.hamburguesa} />
            <View style={styles.hamburguesa} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitulo}>ATHENEA</Text>
            <Text style={styles.headerSub}>Historias Clínicas con IA</Text>
          </View>

          <View style={styles.headerDerecha}>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => {
                setResultados([]);
                setCedulaBusqueda('');
                setBusquedaVisible(true);
              }}
            >
              <Text style={styles.searchIcono}>🔍</Text>
            </TouchableOpacity>
            <View style={styles.avatarPequeno}>
              <Text style={styles.avatarTexto}>
                {nombreUsuario ? nombreUsuario.charAt(0).toUpperCase() : 'A'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Bienvenida */}
          <View style={styles.saludoSeccion}>
            <Text style={styles.saludoTexto}>Hola, {nombreUsuario || 'Especialista'} 👋</Text>
            <Text style={styles.saludoSub}>Panel de control para hoy</Text>
          </View>

          {/* Grid de Estadísticas (Placeholder visual) */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumero}>{historias.length > 0 ? historias.length : '--'}</Text>
              <Text style={styles.statLabel}>Pacientes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumero}>05</Text>
              <Text style={styles.statLabel}>Citas</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#0B7B8B' }]}>
              <Text style={[styles.statNumero, { color: '#fff' }]}>Active</Text>
              <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]}>Sincro</Text>
            </View>
          </View>

          {/* Botón Principal (Hero Card) */}
          <TouchableOpacity
            style={styles.heroCard}
            onPress={() => navigation.navigate('Grabacion')}
            activeOpacity={0.9}
          >
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitulo}>Nueva Historia</Text>
              <Text style={styles.heroSub}>Dictado por voz con IA</Text>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>🎙️ MODO OFFLINE</Text>
              </View>
            </View>
            <View style={styles.heroIconContainer}>
               <Text style={styles.heroIconA}>A</Text>
            </View>
          </TouchableOpacity>

          {/* Acciones Rápidas */}
          <View style={styles.seccionAcciones}>
            <Text style={styles.seccionTitulo}>Acciones rápidas</Text>
            <View style={styles.gridAcciones}>
              <TouchableOpacity style={styles.accionItem} onPress={() => navigation.navigate('Formulario')}>
                <View style={[styles.accionIcono, { backgroundColor: '#E1F5F7' }]}>
                  <Text style={styles.accionEmoji}>✏️</Text>
                </View>
                <Text style={styles.accionTexto}>Manual</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.accionItem}>
                <View style={[styles.accionIcono, { backgroundColor: '#FFF4E5' }]}>
                  <Text style={styles.accionEmoji}>📅</Text>
                </View>
                <Text style={styles.accionTexto}>Agenda</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.accionItem}>
                <View style={[styles.accionIcono, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={styles.accionEmoji}>📁</Text>
                </View>
                <Text style={styles.accionTexto}>Archivo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.accionItem} onPress={() => setBusquedaVisible(true)}>
                <View style={[styles.accionIcono, { backgroundColor: '#F3E5F5' }]}>
                  <Text style={styles.accionEmoji}>🔎</Text>
                </View>
                <Text style={styles.accionTexto}>Buscar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Barra de Estado */}
          <View style={styles.estadoSyncCompacto}>
            <View style={styles.puntoSync} />
            <Text style={styles.textoSync}>Conectado — Sincronización activa</Text>
          </View>

        </ScrollView>

        {/* Modal de Búsqueda Mejorado */}
        <Modal
          visible={busquedaVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setBusquedaVisible(false)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
              <View style={styles.modalOverlay}>
              <View style={styles.modalContenido}>
                  <View style={styles.modalBarra} />
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitulo}>Buscador</Text>
                    <TouchableOpacity onPress={() => setBusquedaVisible(false)} style={styles.btnCerrarModal}>
                        <Text style={{color: '#999', fontWeight: 'bold'}}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.inputBusqueda}
                        placeholder="Cédula del paciente..."
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        value={cedulaBusqueda}
                        onChangeText={setCedulaBusqueda}
                        autoFocus={true}
                    />
                    <TouchableOpacity style={styles.btnBusqueda} onPress={buscarPaciente}>
                        {cargandoBusqueda ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnBusquedaTexto}>IR</Text>}
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={resultados}
                    keyExtractor={(item) => item._id || String(Math.random())}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={styles.itemResultado}
                          onPress={() => {
                              setBusquedaVisible(false);
                              navigation.navigate('Formulario', { historiaExistente: item });
                          }}
                        >
                          <View>
                              <Text style={styles.itemNombre}>{item.paciente?.nombre || 'Paciente'}</Text>
                              <Text style={styles.itemSub}>CI: {item.paciente?.cedula}</Text>
                          </View>
                          <View style={styles.itemIconoCirculo}>
                            <Text style={styles.itemFlecha}>→</Text>
                          </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={!cargandoBusqueda && <Text style={styles.busquedaVacia}>{cedulaBusqueda ? "Sin resultados" : "Ingresa un número"}</Text>}
                  />
              </View>
              </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* FAB y Drawer (Se mantienen igual en lógica) */}
        {fabAbierto && <TouchableOpacity style={styles.fabOverlay} onPress={cerrarFab} activeOpacity={1} />}

        <View style={styles.fabContenedor}>
          <Animated.View style={[styles.fabOpcion, opcionesStyle(140)]}>
            <TouchableOpacity style={styles.fabOpcionBtn} onPress={() => { cerrarFab(); navigation.navigate('Grabacion'); }}>
              <Text style={styles.fabOpcionIcono}>🎙️</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.fabOpcion, opcionesStyle(80)]}>
            <TouchableOpacity style={styles.fabOpcionBtn} onPress={() => { cerrarFab(); navigation.navigate('Formulario'); }}>
              <Text style={styles.fabOpcionIcono}>✏️</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.fabPrincipal} onPress={toggleFab}>
            <Animated.Text style={[styles.fabIcono, {
              transform: [{ rotate: animFab.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }]
            }]}>+</Animated.Text>
          </TouchableOpacity>
        </View>

        <DrawerMenu
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          navigation={navigation}
          setToken={setToken}
          nombreUsuario={nombreUsuario}
          email={email}
          pantallaActual="Home"
        />

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedorRaiz: { flex: 1, backgroundColor: '#0B7B8B' },
  contenedor: { flex: 1, backgroundColor: '#F8FBFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B7B8B',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: Platform.OS === 'android' ? 45 : 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
  },
  menuBtn: { padding: 8 },
  hamburguesa: { width: 22, height: 2, backgroundColor: '#fff', borderRadius: 2, marginVertical: 2.5 },
  headerCenter: { alignItems: 'center' },
  headerTitulo: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  headerDerecha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  searchIcono: { fontSize: 18 },
  avatarPequeno: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#0D3B44', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  avatarTexto: { fontSize: 16, fontWeight: '700', color: '#fff' },
  scrollContent: { paddingBottom: 100 },
  saludoSeccion: { paddingHorizontal: 25, paddingTop: 30, marginBottom: 20 },
  saludoTexto: { fontSize: 26, fontWeight: '800', color: '#0D3B44' },
  saludoSub: { fontSize: 14, color: '#6A9BAB', marginTop: 4 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 25 },
  statCard: { width: '30%', backgroundColor: '#fff', padding: 15, borderRadius: 20, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  statNumero: { fontSize: 20, fontWeight: '800', color: '#0B7B8B' },
  statLabel: { fontSize: 11, color: '#6A9BAB', marginTop: 2 },
  heroCard: {
    backgroundColor: '#0D3B44',
    marginHorizontal: 25,
    borderRadius: 30,
    padding: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 12,
    shadowColor: '#0B7B8B',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    marginBottom: 35
  },
  heroInfo: { flex: 1 },
  heroTitulo: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 5, marginBottom: 15 },
  heroBadge: { backgroundColor: '#0B7B8B', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  heroIconContainer: { width: 60, height: 60, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  heroIconA: { fontSize: 40, fontWeight: '900', color: '#fff', opacity: 0.8 },
  seccionAcciones: { paddingHorizontal: 25 },
  seccionTitulo: { fontSize: 18, fontWeight: '700', color: '#0D3B44', marginBottom: 20 },
  gridAcciones: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  accionItem: { width: '22%', alignItems: 'center', marginBottom: 20 },
  accionIcono: { width: 55, height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 2 },
  accionEmoji: { fontSize: 22 },
  accionTexto: { fontSize: 12, fontWeight: '600', color: '#547D8A' },
  estadoSyncCompacto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, backgroundColor: '#EAF4F5', alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  puntoSync: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0B7B8B', marginRight: 8 },
  textoSync: { fontSize: 12, color: '#0B7B8B', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(13, 59, 68, 0.8)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, height: height * 0.8, padding: 25 },
  modalBarra: { width: 50, height: 5, backgroundColor: '#E0EAEB', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 24, fontWeight: '800', color: '#0D3B44' },
  btnCerrarModal: { width: 35, height: 35, backgroundColor: '#F3F7F8', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  inputContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  inputBusqueda: { flex: 1, height: 55, backgroundColor: '#F3F7F8', borderRadius: 15, paddingHorizontal: 20, fontSize: 16, color: '#0D3B44', borderWidth: 1, borderColor: '#E0EAEB' },
  btnBusqueda: { width: 60, backgroundColor: '#0B7B8B', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnBusquedaTexto: { color: '#fff', fontWeight: 'bold' },
  itemResultado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F4F5' },
  itemNombre: { fontSize: 16, fontWeight: '700', color: '#0D3B44' },
  itemSub: { fontSize: 13, color: '#6A9BAB' },
  itemIconoCirculo: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EAF4F5', justifyContent: 'center', alignItems: 'center' },
  itemFlecha: { fontSize: 18, color: '#0B7B8B' },
  busquedaVacia: { textAlign: 'center', marginTop: 40, color: '#6A9BAB' },
  fabOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 98 },
  fabContenedor: { position: 'absolute', bottom: 30, right: 25, alignItems: 'center', zIndex: 99 },
  fabPrincipal: { width: 65, height: 65, borderRadius: 22, backgroundColor: '#0B7B8B', justifyContent: 'center', alignItems: 'center', elevation: 8 },
  fabIcono: { fontSize: 35, color: '#fff', fontWeight: '300' },
  fabOpcion: { position: 'absolute', right: 5 },
  fabOpcionBtn: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#0D3B44', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabOpcionIcono: { fontSize: 22 },
});