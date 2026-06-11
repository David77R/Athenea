import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, TouchableWithoutFeedback, ScrollView
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { obtenerTodasLasHistorias } from '../baseDatosLite/basedatoslt';
import { useAlerta } from '../componentes/AlertaPersonalizada';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.82;

const AZUL_OSCURO  = '#0D1B2A';
const AZUL_MEDIO   = '#1B2E45';
const AZUL_ITEM    = '#1E3A5F';
const AZUL_ACTIVO  = '#2E5F8A';
const TEXTO_BLANCO = '#FFFFFF';
const TEXTO_GRIS   = 'rgba(255,255,255,0.55)';
const VERDE        = '#4CAF50';
const ROJO         = '#EF5350';

const MENU_PRINCIPAL = [
  { name: 'Home',             label: 'Inicio',            icono: 'home-outline' },
  { name: 'BuscarPaciente',   label: 'Pacientes',         icono: 'search-outline' },
  { name: 'HistorialClinico', label: 'Historial clínico', icono: 'document-text-outline' },
  { name: 'Perfil',           label: 'Mi perfil',         icono: 'person-outline' },
  { name: 'Ajustes',          label: 'Ajustes',           icono: 'settings-outline' },
];

const ACCIONES = [
  { name: 'Grabacion', label: 'Grabar historia',  icono: 'mic-outline' },
  { name: 'SUBMENU',   label: 'Nueva historia',   icono: 'add-circle-outline', tieneFlecha: true },
  { name: 'RECETA',    label: 'Generar receta',   icono: 'receipt-outline' },
];

export default function DrawerMenu({ visible, onClose, navigation, setToken, nombreUsuario, email, pantallaActual }) {
  const insets     = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacidad   = useRef(new Animated.Value(0)).current;
  const [montado,  setMontado]  = useState(false);
  const [stats,    setStats]    = useState({ pacientes: 0, consultas: 0 });
  const [subMenu,  setSubMenu]  = useState(false);

  const { mostrar, AlertaPersonalizada } = useAlerta();

  const itemAnims = useRef(
    [...Array(MENU_PRINCIPAL.length + ACCIONES.length + 2)].map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (visible) {
      setMontado(true);
      setSubMenu(false);
      cargarStats();

      Animated.parallel([
        Animated.timing(translateX, { toValue: 0,            duration: 300, useNativeDriver: true }),
        Animated.timing(opacidad,   { toValue: 1,            duration: 300, useNativeDriver: true }),
      ]).start(() => {
        const animaciones = itemAnims.map((anim, i) =>
          Animated.spring(anim, {
            toValue: 1, delay: i * 20,
            tension: 120, friction: 8,
            useNativeDriver: true,
          })
        );
        Animated.stagger(20, animaciones).start();
      });
    } else {
      itemAnims.forEach(a => a.setValue(0));
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 240, useNativeDriver: true }),
        Animated.timing(opacidad,   { toValue: 0,             duration: 240, useNativeDriver: true }),
      ]).start(() => setMontado(false));
    }
  }, [visible]);

  async function cargarStats() {
    try {
      const todas = await obtenerTodasLasHistorias();
      const pacientes = new Set(todas.map(h => {
        try { return JSON.parse(h.datos)?.paciente?.cedula || h.id; } catch { return h.id; }
      })).size;
      setStats({ pacientes, consultas: todas.length });
    } catch {
      setStats({ pacientes: 0, consultas: 0 });
    }
  }

 function handleLogout() {
  mostrar({
    tipo: 'confirmacion',
    titulo: 'Cerrar sesión',
    mensaje: '¿Desea usted salir de su cuenta?',
    icono: 'log-out-outline',
    botonCancelar: 'Cancelar',
    botonConfirmar: 'Cerrar sesión',
onConfirmar: async () => {
  try {
    const { borrarTodasLasHistorias } = await import('../baseDatosLite/basedatoslt');
    await borrarTodasLasHistorias();
    await AsyncStorage.multiRemove(['token', 'nombre', 'email', 'perfil_especialista']);
  } catch(e) {
    console.log('ERROR LOGOUT:', e.message);
  }
  setTimeout(() => setToken(null), 300);
},
  });
}
  function navegar(pantalla) {
    setSubMenu(false);
    onClose();
    setTimeout(() => navigation.navigate(pantalla), 260);
  }

  function handleAccion(name) {
    if (name === 'SUBMENU') { setSubMenu(!subMenu); return; }
    if (name === 'RECETA')  { navegar('GenerarReceta'); return; }
    navegar(name);
  }

  if (!montado) return null;

  const inicial = nombreUsuario ? nombreUsuario.charAt(0).toUpperCase() : 'A';
  let animIdx = 0;

  function itemStyle(anim) {
    return {
      opacity: anim,
      transform: [{
        translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }),
      }],
    };
  }

  return (
    <View style={styles.overlay}>
      {/* Fondo con blur */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacidad }]}>
          <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
        </Animated.View>
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        <ScrollView
          contentContainerStyle={[styles.drawerContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Animated.View style={itemStyle(itemAnims[animIdx++])}>
              <View style={styles.headerFila}>
                <View style={styles.logoCirculo}>
                  <Ionicons name="eye-outline" size={22} color={TEXTO_BLANCO} />
                </View>
                <View>
                  <Text style={styles.appNombre}>Athenea</Text>
                  <Text style={styles.appSub}>Optometría Clínica</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={itemStyle(itemAnims[animIdx++])}>
              <View style={styles.usuarioFila}>
                <View style={styles.avatarCirculo}>
                  <Text style={styles.avatarTexto}>{inicial}</Text>
                </View>
                <View>
                  <Text style={styles.usuarioNombre}>{nombreUsuario || 'Especialista'}</Text>
                  <Text style={styles.usuarioEmail}>{email || 'Optometría Clínica'}</Text>
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Menú principal */}
          <View style={styles.seccion}>
            <Text style={styles.seccionLabel}>MENÚ PRINCIPAL</Text>
            {MENU_PRINCIPAL.map((item) => {
              const anim   = itemAnims[animIdx++];
              const activo = pantallaActual === item.name;
              return (
                <Animated.View key={item.name} style={itemStyle(anim)}>
                  <TouchableOpacity
                    style={[styles.menuItem, activo && styles.menuItemActivo]}
                    onPress={() => navegar(item.name)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconoCaja, activo && styles.iconoCajaActivo]}>
                      <Ionicons name={item.icono} size={18} color={activo ? TEXTO_BLANCO : TEXTO_GRIS} />
                    </View>
                    <Text style={[styles.menuTexto, activo && styles.menuTextoActivo]}>{item.label}</Text>
                    {activo && <View style={styles.activoPunto} />}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Acciones rápidas */}
          <View style={styles.seccion}>
            <Text style={styles.seccionLabel}>ACCIONES RÁPIDAS</Text>
            {ACCIONES.map((item) => {
              const anim = itemAnims[animIdx++];
              return (
                <Animated.View key={item.name} style={itemStyle(anim)}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleAccion(item.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconoCaja}>
                      <Ionicons name={item.icono} size={18} color={TEXTO_GRIS} />
                    </View>
                    <Text style={[styles.menuTexto, { flex: 1 }]}>{item.label}</Text>
                    {item.tieneFlecha && (
                      <Ionicons
                        name={subMenu ? 'chevron-down' : 'chevron-forward'}
                        size={14} color={TEXTO_GRIS}
                      />
                    )}
                  </TouchableOpacity>

                  {item.tieneFlecha && subMenu && (
                    <View style={styles.subMenu}>
                      <TouchableOpacity style={styles.subItem} onPress={() => navegar('Grabacion')}>
                        <Ionicons name="mic" size={13} color={TEXTO_GRIS} />
                        <Text style={styles.subItemTexto}>Grabar con Athenea IA</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.subItem} onPress={() => navegar('Formulario')}>
                        <Ionicons name="create-outline" size={13} color={TEXTO_GRIS} />
                        <Text style={styles.subItemTexto}>Llenar manualmente</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>

          {/* Stats */}
          <Animated.View style={itemStyle(itemAnims[Math.min(animIdx, itemAnims.length - 1)])}>
            <View style={styles.statsBox}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{stats.pacientes}</Text>
                <Text style={styles.statLabel}>Pacientes</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{stats.consultas}</Text>
                <Text style={styles.statLabel}>Consultas</Text>
              </View>
            </View>
          </Animated.View>

          {/* Cerrar sesión */}
          <TouchableOpacity style={styles.cerrarSesion} onPress={handleLogout}>
            <View style={[styles.iconoCaja, { backgroundColor: 'rgba(239,83,80,0.15)', marginRight: 12 }]}>
              <Ionicons name="log-out-outline" size={18} color={ROJO} />
            </View>
            <Text style={styles.cerrarTexto}>Cerrar sesión</Text>
          </TouchableOpacity>

        </ScrollView>
      </Animated.View>

      {/* AlertaPersonalizada fuera del ScrollView para que se muestre encima de todo */}
      <AlertaPersonalizada />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, flexDirection: 'row' },
  drawer:       { width: DRAWER_WIDTH, backgroundColor: AZUL_OSCURO, height: '100%', shadowColor: '#000', shadowOffset: { width: 6, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 20 },
  drawerContent: { paddingBottom: 30 },

  header:       { backgroundColor: AZUL_MEDIO, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  headerFila:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  logoCirculo:  { width: 38, height: 38, borderRadius: 19, backgroundColor: AZUL_ACTIVO, justifyContent: 'center', alignItems: 'center' },
  appNombre:    { fontSize: 17, fontWeight: '800', color: TEXTO_BLANCO },
  appSub:       { fontSize: 11, color: TEXTO_GRIS, marginTop: 1 },
  usuarioFila:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCirculo: { width: 44, height: 44, borderRadius: 22, backgroundColor: AZUL_ACTIVO, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  avatarTexto:  { fontSize: 18, fontWeight: '700', color: TEXTO_BLANCO },
  usuarioNombre: { fontSize: 15, fontWeight: '700', color: TEXTO_BLANCO },
  usuarioEmail:  { fontSize: 12, color: TEXTO_GRIS, marginTop: 1 },

  seccion:      { paddingHorizontal: 14, paddingTop: 18 },
  seccionLabel: { fontSize: 10, fontWeight: '700', color: TEXTO_GRIS, letterSpacing: 1.2, marginBottom: 8, marginLeft: 6 },

  menuItem:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, marginBottom: 2 },
  menuItemActivo:  { backgroundColor: AZUL_ACTIVO },
  iconoCaja:       { width: 34, height: 34, borderRadius: 10, backgroundColor: AZUL_ITEM, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconoCajaActivo: { backgroundColor: 'rgba(255,255,255,0.2)' },
  menuTexto:       { fontSize: 14, color: TEXTO_GRIS, fontWeight: '500' },
  menuTextoActivo: { color: TEXTO_BLANCO, fontWeight: '700' },
  activoPunto:     { width: 6, height: 6, borderRadius: 3, backgroundColor: VERDE, marginLeft: 'auto' },

  subMenu:      { marginLeft: 46, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)', paddingLeft: 12, marginBottom: 4 },
  subItem:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  subItemTexto: { fontSize: 13, color: TEXTO_GRIS },

  statsBox:  { flexDirection: 'row', backgroundColor: AZUL_MEDIO, marginHorizontal: 14, marginTop: 18, borderRadius: 16, padding: 16 },
  statItem:  { flex: 1, alignItems: 'center' },
  statNum:   { fontSize: 22, fontWeight: '800', color: TEXTO_BLANCO },
  statLabel: { fontSize: 11, color: TEXTO_GRIS, marginTop: 2 },
  statSep:   { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.1)' },

  cerrarSesion: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginTop: 16, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,83,80,0.3)' },
  cerrarTexto:  { fontSize: 14, color: ROJO, fontWeight: '600' },
});