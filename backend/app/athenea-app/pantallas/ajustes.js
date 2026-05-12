import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { sincronizarAhora, contarPendientes } from '../servicios/syncEngine';

const db = SQLite.openDatabaseSync('athenea.db');

const TURQUESA = '#00BCD4';
const TURQUESA_DARK = '#0097A7';
const TURQUESA_LIGHT = '#E0F7FA';

export default function Ajustes({ navigation }) {
  const [sincronizando, setSincronizando] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const [hayInternet, setHayInternet] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [notificaciones, setNotificaciones] = useState(true);
  const [ultimaSync, setUltimaSync] = useState(null);
  const [version] = useState('1.0.0');

  const cargarEstado = useCallback(async () => {
    try {
      const pend = db.getFirstSync(
        'SELECT COUNT(*) as c FROM historias_clinicas WHERE sincronizado = 0'
      );
      setPendientes(pend?.c || 0);

      const autoSyncVal = await AsyncStorage.getItem('auto_sync');
      setAutoSync(autoSyncVal !== 'false');

      const notifVal = await AsyncStorage.getItem('notificaciones');
      setNotificaciones(notifVal !== 'false');

      const ultima = await AsyncStorage.getItem('ultima_sincronizacion');
      setUltimaSync(ultima);
    } catch (e) {
      console.error('Error cargando ajustes:', e);
    }
  }, []);

  useEffect(() => {
    cargarEstado();
    const unsub = NetInfo.addEventListener((state) => {
      setHayInternet(state.isConnected && state.isInternetReachable);
    });
    return unsub;
  }, [cargarEstado]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', cargarEstado);
    return unsub;
  }, [navigation, cargarEstado]);

  const handleSync = async () => {
    if (!hayInternet) {
      Alert.alert('Sin conexión', 'No hay acceso a internet. Conéctate e intenta de nuevo.');
      return;
    }
    if (pendientes === 0) {
      Alert.alert('Al día', 'No hay historias pendientes de sincronizar.');
      return;
    }
    setSincronizando(true);
    try {
      const resultado = await sincronizarAhora();
      const ahora = new Date().toLocaleString('es-VE');
      await AsyncStorage.setItem('ultima_sincronizacion', ahora);
      setUltimaSync(ahora);
      await cargarEstado();
      Alert.alert(
        'Sincronización completada',
        `${resultado.exitosas} historia${resultado.exitosas !== 1 ? 's' : ''} sincronizada${resultado.exitosas !== 1 ? 's' : ''}.${resultado.fallidas > 0 ? `\n${resultado.fallidas} con error.` : ''}`
      );
    } catch (e) {
      Alert.alert('Error', 'No se pudo completar la sincronización. Intenta más tarde.');
    } finally {
      setSincronizando(false);
    }
  };

  const toggleAutoSync = async (val) => {
    setAutoSync(val);
    await AsyncStorage.setItem('auto_sync', val ? 'true' : 'false');
  };

  const toggleNotificaciones = async (val) => {
    setNotificaciones(val);
    await AsyncStorage.setItem('notificaciones', val ? 'true' : 'false');
  };

  const limpiarDatosLocales = () => {
    Alert.alert(
      'Limpiar datos locales',
      '¿Seguro? Se eliminarán todas las historias que ya están sincronizadas con el servidor. Las pendientes se conservan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: () => {
            try {
              db.runSync('DELETE FROM historias_clinicas WHERE sincronizado = 1');
              cargarEstado();
              Alert.alert('Listo', 'Se eliminaron las historias sincronizadas del almacenamiento local.');
            } catch (e) {
              Alert.alert('Error', 'No se pudieron limpiar los datos.');
            }
          },
        },
      ]
    );
  };

  const ItemSwitch = ({ label, sub, value, onToggle }) => (
    <View style={styles.fila}>
      <View style={{ flex: 1 }}>
        <Text style={styles.filaLabel}>{label}</Text>
        {sub && <Text style={styles.filaSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E0E0E0', true: TURQUESA_LIGHT }}
        thumbColor={value ? TURQUESA : '#BDBDBD'}
      />
    </View>
  );

  const ItemAccion = ({ label, sub, onPress, color, icono }) => (
    <TouchableOpacity style={styles.fila} onPress={onPress} activeOpacity={0.7}>
      {icono && <Text style={styles.filaIcono}>{icono}</Text>}
      <View style={{ flex: 1 }}>
        <Text style={[styles.filaLabel, color && { color }]}>{label}</Text>
        {sub && <Text style={styles.filaSub}>{sub}</Text>}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Ajustes</Text>
        <Text style={styles.headerSub}>Configuración de la aplicación</Text>
      </View>

      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Sincronización</Text>

        <View style={styles.syncStatus}>
          <View style={[styles.indicador, { backgroundColor: hayInternet ? '#43A047' : '#E53935' }]} />
          <Text style={styles.syncStatusText}>
            {hayInternet ? 'Conectado a internet' : 'Sin conexión a internet'}
          </Text>
        </View>

        {pendientes > 0 && (
          <View style={styles.pendientesBanner}>
            <Text style={styles.pendientesText}>
              {pendientes} historia{pendientes !== 1 ? 's' : ''} pendiente{pendientes !== 1 ? 's' : ''} de sincronizar
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btnSync, (!hayInternet || sincronizando) && styles.btnSyncDisabled]}
          onPress={handleSync}
          disabled={sincronizando || !hayInternet}
        >
          {sincronizando ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnSyncText}>
              {pendientes === 0 ? 'Todo sincronizado' : `Sincronizar ahora (${pendientes})`}
            </Text>
          )}
        </TouchableOpacity>

        {ultimaSync && (
          <Text style={styles.ultimaSync}>Última sincronización: {ultimaSync}</Text>
        )}

        <View style={styles.separador} />

        <ItemSwitch
          label="Sincronización automática"
          sub="Sincroniza al detectar conexión a internet"
          value={autoSync}
          onToggle={toggleAutoSync}
        />
      </View>

      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Notificaciones</Text>
        <ItemSwitch
          label="Alertas de sincronización"
          sub="Avisa cuando hay historias pendientes"
          value={notificaciones}
          onToggle={toggleNotificaciones}
        />
      </View>

      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Datos</Text>
        <ItemAccion
          icono="🗑️"
          label="Limpiar datos sincronizados"
          sub="Libera espacio eliminando historias ya sincronizadas"
          onPress={limpiarDatosLocales}
          color="#E53935"
        />
        <View style={styles.separador} />
        <ItemAccion
          icono="👤"
          label="Editar mi perfil"
          sub="Nombre, especialidad, consultorio"
          onPress={() => navigation.navigate('Perfil')}
        />
      </View>

      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Acerca de</Text>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Versión</Text>
          <Text style={styles.filaValor}>{version}</Text>
        </View>
        <View style={styles.separador} />
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Modelo IA</Text>
          <Text style={styles.filaValor}>Vosk ES + Groq llama-3.1</Text>
        </View>
        <View style={styles.separador} />
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Almacenamiento</Text>
          <Text style={styles.filaValor}>SQLite + MongoDB Atlas</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: TURQUESA,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitulo: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  seccion: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  seccionTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: TURQUESA_DARK,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  syncStatus: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  indicador: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  syncStatusText: { fontSize: 14, color: '#546E7A' },
  pendientesBanner: {
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F9A825',
  },
  pendientesText: { color: '#F57F17', fontSize: 13 },
  btnSync: {
    backgroundColor: TURQUESA,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnSyncDisabled: { backgroundColor: '#B0BEC5' },
  btnSyncText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ultimaSync: { fontSize: 11, color: '#90A4AE', textAlign: 'center', marginTop: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  filaIcono: { fontSize: 20, marginRight: 10 },
  filaLabel: { fontSize: 14, color: '#263238', fontWeight: '500' },
  filaSub: { fontSize: 12, color: '#90A4AE', marginTop: 2 },
  filaValor: { fontSize: 13, color: '#546E7A' },
  chevron: { fontSize: 20, color: '#B0BEC5', marginLeft: 8 },
  separador: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },
});