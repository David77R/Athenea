import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, Platform, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { obtenerHistoriasPendientes } from '../baseDatosLite/basedatoslt';
import { sincronizarAhora } from '../servicios/syncEngine';
import COLORES from '../constantes/colores';
import { useAlerta } from '../componentes/AlertaPersonalizada';

export default function AjustesScreen({ navigation }) {
  const [pendientes,     setPendientes]     = useState(0);
  const [hayInternet,    setHayInternet]    = useState(true);
  const [sincronizando,  setSincronizando]  = useState(false);
  const [ultimaSync,     setUltimaSync]     = useState('');
  const [autoSync,       setAutoSync]       = useState(true);
  const [notificaciones, setNotificaciones] = useState(true);

  const { mostrar, AlertaPersonalizada } = useAlerta();

  useEffect(() => {
    cargarDatos();
    const unsub = NetInfo.addEventListener((state) => {
      setHayInternet(state.isConnected);
    });
    return () => unsub();
  }, []);

  async function cargarDatos() {
    const pend = await obtenerHistoriasPendientes();
    setPendientes(pend.length);
    const lastSync = await AsyncStorage.getItem('ultima_sincronizacion');
    if (lastSync) setUltimaSync(lastSync);
    const as    = await AsyncStorage.getItem('auto_sync');
    const notif = await AsyncStorage.getItem('notificaciones');
    setAutoSync(as !== 'false');
    setNotificaciones(notif !== 'false');
  }

  async function handleSync() {
    if (pendientes === 0) {
      mostrar({
        tipo: 'exito',
        titulo: '¡Todo al día!',
        mensaje: 'No hay historias pendientes de sincronizar.',
        icono: 'cloud-done-outline',
        boton: 'Perfecto',
      });
      return;
    }
    setSincronizando(true);
    const resultado = await sincronizarAhora();
    setSincronizando(false);
    await cargarDatos();
    mostrar({
      tipo: resultado.success ? 'exito' : 'error',
      titulo: resultado.success ? 'Sincronización completada' : 'Error al sincronizar',
      mensaje: resultado.message,
      icono: resultado.success ? 'cloud-done-outline' : 'cloud-offline-outline',
      boton: 'Entendido',
    });
  }

  
  

  async function borrarTodosLosDatos() {
    mostrar({
      tipo: 'confirmacion',
      titulo: '⚠️ Borrar todo',
      mensaje: '¿Estás seguro? Se eliminarán TODAS las historias del dispositivo, incluyendo las no sincronizadas. Esta acción no se puede deshacer.',
      icono: 'warning-outline',
      botonCancelar: 'Cancelar',
      botonConfirmar: 'Sí, borrar todo',
      onConfirmar: async () => {
        const { borrarTodasLasHistorias } = await import('../baseDatosLite/basedatoslt');
        await borrarTodasLasHistorias();
        await cargarDatos();
        mostrar({
          tipo: 'exito',
          titulo: 'Datos eliminados',
          mensaje: 'Todos los datos locales fueron eliminados exitosamente.',
          icono: 'checkmark-circle-outline',
          boton: 'Entendido',
        });
      },
    });
  }

  async function toggleAutoSync(v) {
    setAutoSync(v);
    await AsyncStorage.setItem('auto_sync', v ? 'true' : 'false');
  }

  async function toggleNotif(v) {
    setNotificaciones(v);
    await AsyncStorage.setItem('notificaciones', v ? 'true' : 'false');
  }

  const paddingTop = Platform.OS === 'android' ? 48 : 60;

  function Fila({ label, sub, value, onToggle }) {
    return (
      <View style={styles.fila}>
        <View style={{ flex: 1 }}>
          <Text style={styles.filaLabel}>{label}</Text>
          {sub ? <Text style={styles.filaSub}>{sub}</Text> : null}
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: COLORES.borde, true: COLORES.secundario }}
          thumbColor={value ? COLORES.primario : '#ccc'}
        />
      </View>
    );
  }

  function Accion({ label, sub, icono, color, onPress }) {
    return (
      <TouchableOpacity style={styles.fila} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.accionIcono, { backgroundColor: color ? '#FFF3E0' : COLORES.secundario }]}>
          <Ionicons name={icono} size={16} color={color || COLORES.primario} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.filaLabel, color && { color }]}>{label}</Text>
          {sub ? <Text style={styles.filaSub}>{sub}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORES.mutedForeground} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.raiz}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[COLORES.gradienteInicio, COLORES.gradienteMedio]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: paddingTop + 12 }]}
      >
        <View style={styles.headerFila}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCentro}>
            <Text style={styles.headerTitulo}>Ajustes</Text>
            <Text style={styles.headerSub}>Athenea APP</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Sincronización */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Sincronización</Text>

          <View style={styles.estadoFila}>
            <View style={[styles.estadoPunto, { backgroundColor: hayInternet ? COLORES.exito : COLORES.error }]} />
            <Text style={styles.estadoTexto}>{hayInternet ? 'Conectado a internet' : 'Sin conexión'}</Text>
          </View>

          {pendientes > 0 && (
            <View style={styles.pendBanner}>
              <Ionicons name="cloud-upload-outline" size={16} color={COLORES.advertencia} />
              <Text style={styles.pendTexto}>
                {pendientes} historia{pendientes !== 1 ? 's' : ''} pendiente{pendientes !== 1 ? 's' : ''} de sync
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btnSync, (!hayInternet || sincronizando) && styles.btnSyncDesactivado]}
            onPress={handleSync}
            disabled={sincronizando || !hayInternet}
          >
            <LinearGradient
              colors={sincronizando || !hayInternet ? ['#B0BEC5', '#B0BEC5'] : [COLORES.primario, COLORES.gradienteFin]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btnSyncGrad}
            >
              {sincronizando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnSyncTexto}>
                    {pendientes === 0 ? 'Todo sincronizado ✓' : `Sincronizar ahora (${pendientes})`}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {ultimaSync ? <Text style={styles.ultimaSync}>Última sincronización: {ultimaSync}</Text> : null}

          <View style={styles.separador} />
          <Fila
            label="Sincronización automática"
            sub="Sincroniza cada 60 segundos al detectar internet"
            value={autoSync}
            onToggle={toggleAutoSync}
          />
        </View>

        {/* Notificaciones */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Notificaciones</Text>
          <Fila
            label="Alertas de sincronización"
            sub="Avisa cuando hay historias pendientes"
            value={notificaciones}
            onToggle={toggleNotif}
          />
        </View>

        {/* Datos */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Datos</Text>
         
          <Accion
            icono="trash-outline"
            label="Borrar todos los datos"
            sub="Elimina TODAS las historias del dispositivo incluyendo las no sincronizadas"
            color={COLORES.error}
            onPress={borrarTodosLosDatos}
          />
          <View style={styles.separador} />
          <Accion
            icono="person-outline"
            label="Editar mi perfil"
            sub="Nombre, especialidad, consultorio"
            onPress={() => navigation.navigate('Perfil')}
          />
        </View>

        {/* Acerca de */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Acerca de</Text>
          {[
            { label: 'Versión',        valor: '1.0.0' },
            { label: 'Modelo IA',      valor: 'Vosk ES · Offline' },
            { label: 'Almacenamiento', valor: 'SQLite + MongoDB Atlas' },
            { label: 'Backend',        valor: 'Node.js · Express · PostgreSQL' },
            { label: 'IA en la nube',  valor: 'Groq · llama-3.3-70b' },
          ].map(({ label, valor }) => (
            <View key={label} style={styles.infoFila}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValor}>{valor}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      <AlertaPersonalizada />
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: COLORES.fondo },

  header:       { paddingHorizontal: 20, paddingBottom: 20 },
  headerFila:   { flexDirection: 'row', alignItems: 'center' },
  backBtn:      { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerCentro: { flex: 1, alignItems: 'center' },
  headerTitulo: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  scroll:        { padding: 16, paddingBottom: 40 },
  seccion:       { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  seccionTitulo: { fontSize: 11, fontWeight: '700', color: COLORES.primario, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },

  estadoFila:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  estadoPunto: { width: 10, height: 10, borderRadius: 5 },
  estadoTexto: { fontSize: 14, color: COLORES.foreground },

  pendBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9C4', borderRadius: 12, padding: 10, marginBottom: 12, gap: 8, borderWidth: 1, borderColor: '#F9A825' },
  pendTexto:  { color: '#F57F17', fontSize: 13, flex: 1 },

  btnSync:            { borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
  btnSyncDesactivado: { opacity: 0.7 },
  btnSyncGrad:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  btnSyncTexto:       { color: '#fff', fontWeight: '700', fontSize: 15 },
  ultimaSync:         { fontSize: 11, color: COLORES.mutedForeground, textAlign: 'center', marginTop: 4 },

  fila:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  accionIcono: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  filaLabel:   { fontSize: 14, color: COLORES.foreground, fontWeight: '500' },
  filaSub:     { fontSize: 12, color: COLORES.mutedForeground, marginTop: 2 },
  separador:   { height: 1, backgroundColor: COLORES.muted, marginVertical: 4 },

  infoFila:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORES.muted },
  infoLabel: { fontSize: 14, color: COLORES.foreground },
  infoValor: { fontSize: 13, color: COLORES.mutedForeground },
});