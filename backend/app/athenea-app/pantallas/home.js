import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DrawerMenu from '../componentes/drawerMenu';

export default function HomeScreen({ navigation, setToken }) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    async function cargarDatos() {
      const n = await AsyncStorage.getItem('nombre');
      const e = await AsyncStorage.getItem('email');
      if (n) setNombreUsuario(n);
      if (e) setEmail(e);
    }
    cargarDatos();
  }, []);

  return (
    <SafeAreaView style={styles.contenedor}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuBtn}>
          <View style={styles.hamburguesa} />
          <View style={styles.hamburguesa} />
          <View style={styles.hamburguesa} />
        </TouchableOpacity>

        <View style={styles.headerLogo}>
          <Text style={styles.headerTitulo}>ATHENEA</Text>
          <Text style={styles.headerSub}>Historias Clínicas con IA</Text>
        </View>

        <View style={styles.avatarPequeno}>
          <Text style={styles.avatarPequenoTexto}>
            {nombreUsuario ? nombreUsuario.charAt(0).toUpperCase() : 'A'}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Saludo */}
        <View style={styles.saludo}>
          <Text style={styles.saludoTexto}>Hola, {nombreUsuario || 'Especialista'} 👋</Text>
          <Text style={styles.saludoSub}>¿Qué deseas hacer hoy?</Text>
        </View>

        {/* Botón principal */}
        <TouchableOpacity
          style={styles.btnPrincipal}
          onPress={() => navigation.navigate('Grabacion')}
          activeOpacity={0.85}
        >
          <View style={styles.btnPrincipalIconoContainer}>
            <Text style={styles.btnPrincipalIcono}>🎙️</Text>
          </View>
          <View style={styles.btnPrincipalTextos}>
            <Text style={styles.btnPrincipalTitulo}>Registrar Historia Clínica</Text>
            <Text style={styles.btnPrincipalSub}>Dicta por voz o ingresa manualmente</Text>
          </View>
          <Text style={styles.btnPrincipalFlecha}>→</Text>
        </TouchableOpacity>

        {/* Acceso rápido */}
        <Text style={styles.seccionTitulo}>Acceso rápido</Text>
        <View style={styles.grid}>

          <TouchableOpacity
            style={styles.tarjeta}
            onPress={() => navigation.navigate('BuscarPaciente')}
            activeOpacity={0.8}
          >
            <Text style={styles.tarjetaIcono}>🔍</Text>
            <Text style={styles.tarjetaTitulo}>Buscar</Text>
            <Text style={styles.tarjetaSub}>Pacientes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tarjeta}
            onPress={() => navigation.navigate('Historial')}
            activeOpacity={0.8}
          >
            <Text style={styles.tarjetaIcono}>📋</Text>
            <Text style={styles.tarjetaTitulo}>Historial</Text>
            <Text style={styles.tarjetaSub}>Clínico</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tarjeta}
            onPress={() => navigation.navigate('Formulario')}
            activeOpacity={0.8}
          >
            <Text style={styles.tarjetaIcono}>✏️</Text>
            <Text style={styles.tarjetaTitulo}>Registro</Text>
            <Text style={styles.tarjetaSub}>Manual</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tarjeta}
            onPress={() => navigation.navigate('Perfil')}
            activeOpacity={0.8}
          >
            <Text style={styles.tarjetaIcono}>👤</Text>
            <Text style={styles.tarjetaTitulo}>Mi</Text>
            <Text style={styles.tarjetaSub}>Perfil</Text>
          </TouchableOpacity>

        </View>

        {/* Estado de sincronización */}
        <View style={styles.estadoSync}>
          <View style={styles.estadoPunto} />
          <Text style={styles.estadoTexto}>Conectado — Sincronización activa</Text>
        </View>

      </ScrollView>

      {/* Drawer */}
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
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#F0F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B7B8B',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: 44,
  },
  menuBtn: { padding: 4, gap: 5 },
  hamburguesa: {
    width: 22, height: 2,
    backgroundColor: '#fff',
    borderRadius: 2,
    marginVertical: 2,
  },
  headerLogo: { alignItems: 'center' },
  headerTitulo: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 3 },
  headerSub: { fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  avatarPequeno: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarPequenoTexto: { fontSize: 16, fontWeight: '700', color: '#fff' },
  saludo: { padding: 20, paddingBottom: 8 },
  saludoTexto: { fontSize: 22, fontWeight: '700', color: '#1A3A4A' },
  saludoSub: { fontSize: 14, color: '#7A9BAB', marginTop: 2 },
  btnPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B7B8B',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#0B7B8B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnPrincipalIconoContainer: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  btnPrincipalIcono: { fontSize: 24 },
  btnPrincipalTextos: { flex: 1 },
  btnPrincipalTitulo: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnPrincipalSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  btnPrincipalFlecha: { fontSize: 20, color: 'rgba(255,255,255,0.7)' },
  seccionTitulo: {
    fontSize: 15, fontWeight: '700', color: '#1A3A4A',
    paddingHorizontal: 20, marginTop: 8, marginBottom: 12,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  tarjeta: {
    width: '46%',
    backgroundColor: '#fff',
    margin: '2%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#0B7B8B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tarjetaIcono: { fontSize: 28, marginBottom: 8 },
  tarjetaTitulo: { fontSize: 14, fontWeight: '700', color: '#1A3A4A' },
  tarjetaSub: { fontSize: 12, color: '#7A9BAB', marginTop: 2 },
  estadoSync: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    backgroundColor: '#E6F7F8',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  estadoPunto: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#0B7B8B',
  },
  estadoTexto: { fontSize: 12, color: '#0B7B8B', fontWeight: '500' },
});