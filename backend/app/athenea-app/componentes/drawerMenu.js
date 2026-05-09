import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, TouchableWithoutFeedback
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

const MENU_ITEMS = [
  { name: 'Home',           label: 'Inicio',              icono: '🏠' },
  { name: 'Grabacion',      label: 'Grabar Historia',     icono: '🎙️' },
  { name: 'BuscarPaciente', label: 'Buscar Pacientes',    icono: '🔍' },
  { name: 'Historial',      label: 'Historias Clínicas',  icono: '📋' },
  { name: 'Perfil',         label: 'Mi Perfil',           icono: '👤' },
  { name: 'Ajustes',        label: 'Ajustes',             icono: '⚙️' },
];

export default function DrawerMenu({ visible, onClose, navigation, setToken, nombreUsuario, email, pantallaActual }) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacidad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(opacidad, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacidad, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  async function handleLogout() {
    onClose();
    await AsyncStorage.clear();
    setToken(null);
  }

  function navegar(pantalla) {
    onClose();
    setTimeout(() => navigation.navigate(pantalla), 250);
  }

  if (!visible && translateX._value === -DRAWER_WIDTH) return null;

  return (
    <View style={styles.overlay}>
      {/* Fondo oscuro al tocar cierra el drawer */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.fondo, { opacity: opacidad }]} />
      </TouchableWithoutFeedback>

      {/* Panel del drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>

        {/* Header con perfil */}
        <View style={styles.header}>
          <View style={styles.logoFila}>
            <View style={styles.logoCirculo}>
              <Text style={styles.logoTexto}>
                {nombreUsuario ? nombreUsuario.charAt(0).toUpperCase() : 'A'}
              </Text>
            </View>
            <View>
              <Text style={styles.appNombre}>ATHENEA</Text>
              <Text style={styles.appSub}>Historias Clínicas con IA</Text>
            </View>
          </View>
          <View style={styles.separadorHeader} />
          <Text style={styles.nombreUsuario}>{nombreUsuario || 'Usuario'}</Text>
          <Text style={styles.emailUsuario}>{email || 'Sin correo'}</Text>
        </View>

        {/* Items del menú */}
        <View style={styles.menuContenedor}>
          {MENU_ITEMS.map((item) => {
            const activo = pantallaActual === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                style={[styles.menuItem, activo && styles.menuItemActivo]}
                onPress={() => navegar(item.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcono}>{item.icono}</Text>
                <Text style={[styles.menuTexto, activo && styles.menuTextoActivo]}>
                  {item.label}
                </Text>
                {activo && <View style={styles.indicador} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Botón cerrar sesión */}
        <TouchableOpacity style={styles.cerrarSesion} onPress={handleLogout}>
          <Text style={styles.cerrarIcono}>🚪</Text>
          <Text style={styles.cerrarTexto}>Cerrar sesión</Text>
        </TouchableOpacity>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
    flexDirection: 'row',
  },
  fondo: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    backgroundColor: '#0B7B8B',
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  logoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  logoCirculo: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  logoTexto: { fontSize: 20, fontWeight: '700', color: '#fff' },
  appNombre: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  appSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  separadorHeader: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 14 },
  nombreUsuario: { fontSize: 15, fontWeight: '700', color: '#fff' },
  emailUsuario: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  menuContenedor: { flex: 1, paddingTop: 12, paddingHorizontal: 8 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 12, marginVertical: 2,
    position: 'relative',
  },
  menuItemActivo: { backgroundColor: '#E6F7F8' },
  menuIcono: { fontSize: 20, marginRight: 14 },
  menuTexto: { fontSize: 14, color: '#555', fontWeight: '500' },
  menuTextoActivo: { color: '#0B7B8B', fontWeight: '700' },
  indicador: {
    position: 'absolute', right: 14,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#0B7B8B',
  },
  cerrarSesion: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 24,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    marginBottom: 20,
  },
  cerrarIcono: { fontSize: 20, marginRight: 14 },
  cerrarTexto: { fontSize: 14, color: '#E53935', fontWeight: '600' },
});