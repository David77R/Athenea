import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { obtenerTodasLasHistorias, obtenerHistoriasPendientes } from '../baseDatosLite/basedatoslt';
import COLORES from '../constantes/colores';

const CAMPOS = [
  { key: 'nombre',       label: 'Nombre completo',  placeholder: 'Dr. Juan Pérez',        icono: 'person-outline'   },
  { key: 'cedula',       label: 'Cédula / RIF',     placeholder: 'V-12345678',            icono: 'card-outline'     },
  { key: 'especialidad', label: 'Especialidad',     placeholder: 'Optometrista',          icono: 'medical-outline'  },
  { key: 'consultorio',  label: 'Consultorio',      placeholder: 'Centro Óptico Visión',  icono: 'business-outline' },
  { key: 'telefono',     label: 'Teléfono',         placeholder: '0414-1234567',          icono: 'call-outline'     },
  { key: 'email',        label: 'Correo electrónico', placeholder: 'doctor@correo.com',   icono: 'mail-outline'     },
];

export default function PerfilScreen({ navigation, setToken }) {
  const [perfil,     setPerfil]     = useState({});
  const [borrador,   setBorrador]   = useState({});
  const [editando,   setEditando]   = useState(false);
  const [guardando,  setGuardando]  = useState(false);
  const [stats,      setStats]      = useState({ total: 0, pendientes: 0, sincronizadas: 0 });

  useEffect(() => {
    async function cargar() {
      // Cargar perfil guardado
      const raw = await AsyncStorage.getItem('perfil_especialista');
      if (raw) {
        const datos = JSON.parse(raw);
        setPerfil(datos);
        setBorrador(datos);
      } else {
        // Precargar desde AsyncStorage individual
        const nombre = await AsyncStorage.getItem('nombre') || '';
        const email  = await AsyncStorage.getItem('email')  || '';
        const cedula = await AsyncStorage.getItem('cedula') || '';
        const base   = { nombre, email, cedula };
        setPerfil(base);
        setBorrador(base);
      }

      // Stats
      const todas      = await obtenerTodasLasHistorias();
      const pendientes = await obtenerHistoriasPendientes();
      setStats({
        total:        todas.length,
        pendientes:   pendientes.length,
        sincronizadas: todas.length - pendientes.length,
      });
    }
    cargar();
  }, []);

  async function guardarPerfil() {
    setGuardando(true);
    try {
      await AsyncStorage.setItem('perfil_especialista', JSON.stringify(borrador));
      // Sincronizar también los campos individuales más usados
      if (borrador.nombre) await AsyncStorage.setItem('nombre', borrador.nombre);
      if (borrador.email)  await AsyncStorage.setItem('email',  borrador.email);
      setPerfil(borrador);
      setEditando(false);
      Alert.alert('✓ Guardado', 'Perfil actualizado correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el perfil.');
    } finally {
      setGuardando(false);
    }
  }

  async function cerrarSesion() {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['token', 'nombre', 'email', 'perfil_especialista']);
            setToken(null);
          },
        },
      ]
    );
  }

  const inicial = () => {
    const n = perfil.nombre || '';
    const partes = n.trim().split(' ');
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return partes[0]?.[0]?.toUpperCase() || 'A';
  };

  const paddingTop = Platform.OS === 'android' ? 48 : 60;

  return (
    <View style={styles.raiz}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header degradado */}
        <LinearGradient
          colors={[COLORES.gradienteInicio, COLORES.gradienteMedio]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.headerGrad, { paddingTop: paddingTop + 12 }]}
        >
          <View style={styles.headerFila}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitulo}>Mi Perfil</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.avatarCaja}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{inicial()}</Text>
            </View>
            <Text style={styles.avatarNombre}>{perfil.nombre || 'Especialista'}</Text>
            <Text style={styles.avatarEsp}>{perfil.especialidad || 'Optometría'}</Text>
            {perfil.consultorio ? <Text style={styles.avatarConsultorio}>{perfil.consultorio}</Text> : null}
          </View>
        </LinearGradient>

        {/* Stats flotantes */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>Consultas</Text>
          </View>
          <View style={[styles.statCard, styles.statBorde]}>
            <Text style={[styles.statNum, stats.pendientes > 0 && { color: COLORES.advertencia }]}>
              {stats.pendientes}
            </Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: COLORES.exito }]}>{stats.sincronizadas}</Text>
            <Text style={styles.statLabel}>Sincronizadas</Text>
          </View>
        </View>

        {/* Datos del especialista */}
        <View style={styles.seccion}>
          <View style={styles.seccionHeaderFila}>
            <Text style={styles.seccionTitulo}>Datos del especialista</Text>
            {!editando && (
              <TouchableOpacity onPress={() => setEditando(true)} style={styles.btnEditar}>
                <Ionicons name="create-outline" size={14} color={COLORES.primario} />
                <Text style={styles.btnEditarTexto}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          {CAMPOS.map(({ key, label, placeholder, icono }) => (
            <View key={key} style={styles.campo}>
              <View style={styles.campoLabelFila}>
                <Ionicons name={icono} size={13} color={COLORES.mutedForeground} />
                <Text style={styles.campoLabel}>{label}</Text>
              </View>
              {editando ? (
                <TextInput
                  style={styles.input}
                  value={borrador[key] || ''}
                  onChangeText={(v) => setBorrador((p) => ({ ...p, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={COLORES.mutedForeground}
                />
              ) : (
                <Text style={[styles.campoValor, !perfil[key] && { color: COLORES.mutedForeground }]}>
                  {perfil[key] || 'No registrado'}
                </Text>
              )}
            </View>
          ))}

          {editando && (
            <View style={styles.editBotones}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => { setBorrador(perfil); setEditando(false); }}
              >
                <Text style={styles.btnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGuardar} onPress={guardarPerfil} disabled={guardando}>
                <LinearGradient
                  colors={[COLORES.primario, COLORES.gradienteFin]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.btnGradiente}
                >
                  {guardando
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.btnGuardarTexto}>Guardar</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Accesos rápidos */}
        <View style={styles.seccion}>
          {[
            { label: 'Historial clínico', icono: 'document-text-outline', pantalla: 'HistorialClinico' },
            { label: 'Ajustes',           icono: 'settings-outline',       pantalla: 'Ajustes' },
          ].map(({ label, icono, pantalla }) => (
            <TouchableOpacity
              key={pantalla}
              style={styles.accionFila}
              onPress={() => navigation.navigate(pantalla)}
            >
              <View style={styles.accionIconCaja}>
                <Ionicons name={icono} size={18} color={COLORES.primario} />
              </View>
              <Text style={styles.accionLabel}>{label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORES.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity style={styles.btnCerrarSesion} onPress={cerrarSesion}>
          <Ionicons name="log-out-outline" size={18} color={COLORES.error} />
          <Text style={styles.btnCerrarSesionTexto}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: COLORES.fondo },

  headerGrad:  { paddingHorizontal: 20, paddingBottom: 28 },
  headerFila:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn:     { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitulo: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#fff' },

  avatarCaja:       { alignItems: 'center' },
  avatar:           { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', marginBottom: 12 },
  avatarTexto:      { fontSize: 32, fontWeight: '800', color: '#fff' },
  avatarNombre:     { fontSize: 20, fontWeight: '700', color: '#fff' },
  avatarEsp:        { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  avatarConsultorio: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  statsRow:  { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: -20, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 5, marginBottom: 16 },
  statCard:  { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBorde: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORES.borde },
  statNum:   { fontSize: 22, fontWeight: '800', color: COLORES.primario },
  statLabel: { fontSize: 11, color: COLORES.mutedForeground, marginTop: 2 },

  seccion: { backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16, marginBottom: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  seccionHeaderFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seccionTitulo:     { fontSize: 15, fontWeight: '700', color: COLORES.foreground },
  btnEditar:         { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.secundario, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, gap: 5 },
  btnEditarTexto:    { color: COLORES.primario, fontWeight: '700', fontSize: 13 },

  campo:         { marginBottom: 12 },
  campoLabelFila: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  campoLabel:    { fontSize: 11, color: COLORES.mutedForeground, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  campoValor:    { fontSize: 14, color: COLORES.foreground },
  input:         { borderWidth: 1.5, borderColor: COLORES.primario, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORES.foreground, backgroundColor: COLORES.muted },

  editBotones:       { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnCancelar:       { flex: 1, borderWidth: 1.5, borderColor: COLORES.borde, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnCancelarTexto:  { color: COLORES.mutedForeground, fontWeight: '600' },
  btnGuardar:        { flex: 1, borderRadius: 12, overflow: 'hidden' },
  btnGradiente:      { paddingVertical: 12, alignItems: 'center' },
  btnGuardarTexto:   { color: '#fff', fontWeight: '700' },

  accionFila:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORES.muted, gap: 12 },
  accionIconCaja: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORES.secundario, justifyContent: 'center', alignItems: 'center' },
  accionLabel:   { flex: 1, fontSize: 14, color: COLORES.foreground },

  btnCerrarSesion:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: '#FFCDD2', gap: 8, marginBottom: 20 },
  btnCerrarSesionTexto: { color: COLORES.error, fontWeight: '700', fontSize: 15 },
});
