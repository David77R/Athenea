import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('athenea.db');

const TURQUESA = '#00BCD4';
const TURQUESA_DARK = '#0097A7';
const TURQUESA_LIGHT = '#E0F7FA';

const CAMPOS_PERFIL = [
  { key: 'nombre', label: 'Nombre completo', placeholder: 'Dr. Juan Pérez' },
  { key: 'cedula', label: 'Cédula / RIF', placeholder: 'V-12345678' },
  { key: 'especialidad', label: 'Especialidad', placeholder: 'Optometrista' },
  { key: 'consultorio', label: 'Consultorio / Clínica', placeholder: 'Centro Óptico Visión' },
  { key: 'telefono', label: 'Teléfono', placeholder: '0414-1234567' },
  { key: 'email', label: 'Correo electrónico', placeholder: 'doctor@correo.com' },
];

export default function Perfil({ navigation }) {
  const [perfil, setPerfil] = useState({});
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [stats, setStats] = useState({ total: 0, pendientes: 0 });

  useEffect(() => {
    cargarPerfil();
    cargarStats();
  }, []);

  const cargarPerfil = async () => {
    try {
      const raw = await AsyncStorage.getItem('perfil_especialista');
      if (raw) {
        const data = JSON.parse(raw);
        setPerfil(data);
        setBorrador(data);
      }
    } catch (e) {
      console.error('Error cargando perfil:', e);
    }
  };

  const cargarStats = () => {
    try {
      const total = db.getFirstSync('SELECT COUNT(*) as c FROM historias_clinicas');
      const pendientes = db.getFirstSync(
        'SELECT COUNT(*) as c FROM historias_clinicas WHERE sincronizado = 0'
      );
      setStats({ total: total?.c || 0, pendientes: pendientes?.c || 0 });
    } catch (e) {
      setStats({ total: 0, pendientes: 0 });
    }
  };

  const guardarPerfil = async () => {
    setGuardando(true);
    try {
      await AsyncStorage.setItem('perfil_especialista', JSON.stringify(borrador));
      setPerfil(borrador);
      setEditando(false);
      Alert.alert('Guardado', 'Tu perfil fue actualizado correctamente.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const cancelarEdicion = () => {
    setBorrador(perfil);
    setEditando(false);
  };

  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['token', 'perfil_especialista', 'usuario_id']);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
  };

  const iniciales = () => {
    const nombre = perfil.nombre || '';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    if (partes[0]) return partes[0][0].toUpperCase();
    return '?';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{iniciales()}</Text>
        </View>
        <Text style={styles.nombreHeader}>{perfil.nombre || 'Especialista'}</Text>
        <Text style={styles.especialidadHeader}>{perfil.especialidad || 'Optometría'}</Text>
        <Text style={styles.consultorioHeader}>{perfil.consultorio || ''}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>Consultas</Text>
        </View>
        <View style={[styles.statCard, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E0E0E0' }]}>
          <Text style={[styles.statNum, stats.pendientes > 0 && { color: '#FF6F00' }]}>
            {stats.pendientes}
          </Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: '#43A047' }]}>{stats.total - stats.pendientes}</Text>
          <Text style={styles.statLabel}>Sincronizadas</Text>
        </View>
      </View>

      <View style={styles.seccion}>
        <View style={styles.seccionHeader}>
          <Text style={styles.seccionTitulo}>Datos del especialista</Text>
          {!editando && (
            <TouchableOpacity onPress={() => setEditando(true)} style={styles.btnEditar}>
              <Text style={styles.btnEditarText}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>

        {CAMPOS_PERFIL.map(({ key, label, placeholder }) => (
          <View key={key} style={styles.campo}>
            <Text style={styles.campoLabel}>{label}</Text>
            {editando ? (
              <TextInput
                style={styles.input}
                value={borrador[key] || ''}
                onChangeText={(val) => setBorrador((prev) => ({ ...prev, [key]: val }))}
                placeholder={placeholder}
                placeholderTextColor="#90A4AE"
              />
            ) : (
              <Text style={styles.campoValor}>{perfil[key] || <Text style={{ color: '#90A4AE' }}>No registrado</Text>}</Text>
            )}
          </View>
        ))}

        {editando && (
          <View style={styles.botonesEdicion}>
            <TouchableOpacity style={styles.btnCancelar} onPress={cancelarEdicion}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGuardar} onPress={guardarPerfil} disabled={guardando}>
              {guardando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnGuardarText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.seccion}>
        <TouchableOpacity style={styles.filaAccion} onPress={() => navigation.navigate('HistorialClinico')}>
          <Text style={styles.filaAccionIcono}>📋</Text>
          <Text style={styles.filaAccionTexto}>Ver historial completo</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filaAccion} onPress={() => navigation.navigate('Ajustes')}>
          <Text style={styles.filaAccionIcono}>⚙️</Text>
          <Text style={styles.filaAccionTexto}>Ajustes</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.btnCerrarSesion} onPress={cerrarSesion}>
        <Text style={styles.btnCerrarSesionText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },

  header: {
    backgroundColor: TURQUESA,
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  nombreHeader: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  especialidadHeader: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 2 },
  consultorioHeader: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    marginBottom: 16,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum: { fontSize: 22, fontWeight: '800', color: TURQUESA_DARK },
  statLabel: { fontSize: 11, color: '#90A4AE', marginTop: 2 },

  seccion: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seccionTitulo: { fontSize: 15, fontWeight: '700', color: '#263238' },
  btnEditar: { backgroundColor: TURQUESA_LIGHT, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 5 },
  btnEditarText: { color: TURQUESA_DARK, fontWeight: '700', fontSize: 13 },

  campo: { marginBottom: 12 },
  campoLabel: { fontSize: 11, color: '#90A4AE', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  campoValor: { fontSize: 15, color: '#263238' },
  input: {
    borderWidth: 1,
    borderColor: TURQUESA,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#263238',
    backgroundColor: '#F5F7FA',
  },

  botonesEdicion: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnCancelar: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnCancelarText: { color: '#546E7A', fontWeight: '600' },
  btnGuardar: {
    flex: 1,
    backgroundColor: TURQUESA,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnGuardarText: { color: '#fff', fontWeight: '700' },

  filaAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filaAccionIcono: { fontSize: 20, marginRight: 12 },
  filaAccionTexto: { flex: 1, fontSize: 14, color: '#263238' },
  chevron: { fontSize: 20, color: '#B0BEC5' },

  btnCerrarSesion: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  btnCerrarSesionText: { color: '#E53935', fontWeight: '700', fontSize: 15 },
});
