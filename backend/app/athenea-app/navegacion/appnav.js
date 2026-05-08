import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { NavigationContainer, DrawerActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from '../pantallas/login';
import RegistroScreen from '../pantallas/registro';
import HomeScreen from '../pantallas/home';
import FormularioScreen from '../pantallas/formulario';
import GrabacionScreen from '../pantallas/grabacion';
import BuscarPacienteScreen from '../pantallas/buscarPaciente';
import HistorialClinicoScreen from '../pantallas/historialClinico';
import PerfilScreen from '../pantallas/perfil';
import AjustesScreen from '../pantallas/ajustes';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const MENU_ITEMS = [
  { name: 'Home',            label: 'Inicio',             icono: '🏠' },
  { name: 'Grabacion',       label: 'Grabar Historia',    icono: '🎙️' },
  { name: 'BuscarPaciente',  label: 'Buscar Pacientes',   icono: '🔍' },
  { name: 'Historial',       label: 'Historias Clínicas', icono: '📋' },
  { name: 'Perfil',          label: 'Mi Perfil',          icono: '👤' },
  { name: 'Ajustes',         label: 'Ajustes',            icono: '⚙️' },
];

function ContenidoDrawer({ state, navigation, setToken }) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    async function cargarDatos() {
      const n = await AsyncStorage.getItem('nombre');
      const e = await AsyncStorage.getItem('email');
      if (n) setNombreUsuario(n);
      if (e) setEmail(e);
    }
    cargarDatos();
  }, []);

  async function handleLogout() {
    await AsyncStorage.clear();
    setToken(null);
  }

  const rutaActual = state.routes[state.index].name;

  return (
    <DrawerContentScrollView style={styles.drawerContenedor}>

      {/* Header del drawer con perfil */}
      <View style={styles.drawerHeader}>
        <View style={styles.avatarCirculo}>
          <Text style={styles.avatarTexto}>
            {nombreUsuario ? nombreUsuario.charAt(0).toUpperCase() : '👤'}
          </Text>
        </View>
        <Text style={styles.drawerNombre}>{nombreUsuario || 'Usuario'}</Text>
        <Text style={styles.drawerEmail}>{email || ''}</Text>
      </View>

      {/* Separador */}
      <View style={styles.separador} />

      {/* Items del menú */}
      {MENU_ITEMS.map((item) => {
        const activo = rutaActual === item.name;
        return (
          <TouchableOpacity
            key={item.name}
            style={[styles.menuItem, activo && styles.menuItemActivo]}
            onPress={() => navigation.navigate(item.name)}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcono}>{item.icono}</Text>
            <Text style={[styles.menuTexto, activo && styles.menuTextoActivo]}>
              {item.label}
            </Text>
            {activo && <View style={styles.indicadorActivo} />}
          </TouchableOpacity>
        );
      })}

      {/* Separador */}
      <View style={styles.separador} />

      {/* Botón cerrar sesión */}
      <TouchableOpacity style={styles.cerrarSesion} onPress={handleLogout}>
        <Text style={styles.cerrarSesionIcono}>🚪</Text>
        <Text style={styles.cerrarSesionTexto}>Cerrar sesión</Text>
      </TouchableOpacity>

    </DrawerContentScrollView>
  );
}

function DrawerNavigator({ setToken }) {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false }}
      drawerContent={(props) => <ContenidoDrawer {...props} setToken={setToken} />}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Grabacion" component={GrabacionScreen} />
      <Drawer.Screen name="BuscarPaciente" component={BuscarPacienteScreen} />
      <Drawer.Screen name="Historial" component={HistorialClinicoScreen} />
      <Drawer.Screen name="Perfil" component={PerfilScreen} />
      <Drawer.Screen name="Ajustes" component={AjustesScreen} />
      <Drawer.Screen name="Formulario" component={FormularioScreen} />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function verificarSesion() {
      const tokenGuardado = await AsyncStorage.getItem('token');
      setToken(tokenGuardado);
      setCargando(false);
    }
    verificarSesion();
  }, []);

  if (cargando) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="App">
            {(props) => <DrawerNavigator {...props} setToken={setToken} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} setToken={setToken} />}
            </Stack.Screen>
            <Stack.Screen name="Registro">
              {(props) => <RegistroScreen {...props} setToken={setToken} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  drawerContenedor: { flex: 1, backgroundColor: '#fff' },
  drawerHeader: {
    backgroundColor: '#1A237E',
    padding: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  avatarCirculo: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarTexto: { fontSize: 32, color: '#fff', fontWeight: '700' },
  drawerNombre: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  drawerEmail: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  separador: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8, marginHorizontal: 16 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 12, marginHorizontal: 8, marginVertical: 2,
    position: 'relative',
  },
  menuItemActivo: { backgroundColor: '#E8EAF6' },
  menuIcono: { fontSize: 20, marginRight: 14 },
  menuTexto: { fontSize: 15, color: '#555', fontWeight: '500' },
  menuTextoActivo: { color: '#1A237E', fontWeight: '700' },
  indicadorActivo: {
    position: 'absolute', right: 16,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#1A237E',
  },
  cerrarSesion: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    marginHorizontal: 8, marginBottom: 20,
  },
  cerrarSesionIcono: { fontSize: 20, marginRight: 14 },
  cerrarSesionTexto: { fontSize: 15, color: '#E53935', fontWeight: '600' },
});