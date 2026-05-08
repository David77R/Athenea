import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation, setToken }) {
  const [nombreUsuario, setNombreUsuario] = React.useState('');

  React.useEffect(() => {
    async function cargarNombre() {
      const n = await AsyncStorage.getItem('nombre');
      if (n) setNombreUsuario(n);
    }
    cargarNombre();
  }, []);

  async function handleLogout() {
    await AsyncStorage.clear();
    setToken(null);
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View>
            <Text style={styles.saludo}>Bienvenido, {nombreUsuario} 👋</Text>
            <Text style={styles.sistema}>Sistema Athenea</Text>
          </View>
          <TouchableOpacity style={styles.cerrarBtn} onPress={handleLogout}>
            <Text style={styles.cerrarTexto}>Salir</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.btnPrincipal}
          onPress={() => navigation.navigate('Grabacion')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrincipalIcono}>🎙️</Text>
          <Text style={styles.btnPrincipalTexto}>Nueva Historia Clínica</Text>
          <Text style={styles.btnPrincipalSub}>Graba el dictado para comenzar</Text>
        </TouchableOpacity>

        <Text style={styles.seccionTitulo}>Acceso rápido</Text>
        <View style={styles.grid}>

          <TouchableOpacity style={styles.tarjeta}>
            <Text style={styles.tarjetaIcono}>📁</Text>
            <Text style={styles.tarjetaTexto}>Historias{'\n'}guardadas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tarjeta}>
            <Text style={styles.tarjetaIcono}>🔄</Text>
            <Text style={styles.tarjetaTexto}>Estado de{'\n'}sincronización</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tarjeta}>
            <Text style={styles.tarjetaIcono}>👤</Text>
            <Text style={styles.tarjetaTexto}>Mi{'\n'}perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tarjeta}
            onPress={() => navigation.navigate('Formulario')}
          >
            <Text style={styles.tarjetaIcono}>📋</Text>
            <Text style={styles.tarjetaTexto}>Registro{'\n'}manual</Text>
          </TouchableOpacity>

        </View>

        <View style={styles.estadoOffline}>
          <Text style={styles.estadoTexto}>🟢 Conectado — Los datos se sincronizan automáticamente</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A237E',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 40,
  },
  saludo: {
    fontSize: 18, fontWeight: '700', color: '#fff',
  },
  sistema: {
    fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2,
  },
  cerrarBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },
  cerrarTexto: {
    color: '#fff', fontSize: 13, fontWeight: '600',
  },
  btnPrincipal: {
    backgroundColor: '#1A237E',
    margin: 20,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  btnPrincipalIcono: { fontSize: 48, marginBottom: 12 },
  btnPrincipalTexto: {
    fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 6,
  },
  btnPrincipalSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)',
  },
  seccionTitulo: {
    fontSize: 16, fontWeight: '700', color: '#1A237E',
    paddingHorizontal: 20, marginBottom: 12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tarjetaIcono: { fontSize: 32, marginBottom: 8 },
  tarjetaTexto: {
    fontSize: 13, fontWeight: '600',
    color: '#333', textAlign: 'center',
  },
  estadoOffline: {
    margin: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  estadoTexto: {
    fontSize: 12, color: '#2E7D32',
  },
});