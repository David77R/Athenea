import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DrawerMenu from './drawerMenu';
import COLORES from '../constantes/colores';

export default function HeaderConDrawer({ titulo, subtitulo, navigation, setToken, pantallaActual, mostrarVolver = true }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [email, setEmail]                 = useState('');

  useEffect(() => {
    async function cargar() {
      const n = await AsyncStorage.getItem('nombre');
      const e = await AsyncStorage.getItem('email');
      if (n) setNombreUsuario(n);
      if (e) setEmail(e);
    }
    cargar();
  }, []);

  const paddingTop = Platform.OS === 'android' ? 48 : 60;

  return (
    <>
      <LinearGradient
        colors={[COLORES.gradienteInicio, COLORES.gradienteMedio]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: paddingTop + 8 }]}
      >
        <View style={styles.fila}>
          {mostrarVolver ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.btn} />
          )}

          <View style={styles.centro}>
            <Text style={styles.titulo}>{titulo}</Text>
            {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
          </View>

          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.btn}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        setToken={setToken}
        nombreUsuario={nombreUsuario}
        email={email}
        pantallaActual={pantallaActual || ''}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header:  { paddingHorizontal: 16, paddingBottom: 16 },
  fila:    { flexDirection: 'row', alignItems: 'center' },
  btn:     { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  centro:  { flex: 1, alignItems: 'center' },
  titulo:  { fontSize: 17, fontWeight: '700', color: '#fff' },
  subtitulo: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
});