import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORES from '../constantes/colores';
import HeaderConDrawer from '../componentes/HeaderConDrawer';
import { useAlerta } from '../componentes/AlertaPersonalizada';
import CONFIG from '../config';

export default function PerfilScreen({ navigation, setToken }) {
  const [perfil,         setPerfil]         = useState(null);
  const [cargando,       setCargando]       = useState(true);
  const [totalPacientes, setTotalPacientes] = useState(null);
  const [cargandoStats,  setCargandoStats]  = useState(false);
  const [modalEditar,    setModalEditar]    = useState(false);
  const [editNombre,     setEditNombre]     = useState('');
  const [editTelefono,   setEditTelefono]   = useState('');
  const [guardando,      setGuardando]      = useState(false);

  const { mostrar, AlertaPersonalizada } = useAlerta();

  useEffect(() => { cargarPerfil(); }, []);

  useFocusEffect(
    useCallback(() => {
      cargarEstadisticas();
    }, [])
  );

  async function cargarPerfil() {
    try {
      setCargando(true);
      const nombre   = await AsyncStorage.getItem('nombre')   || '';
      const email    = await AsyncStorage.getItem('email')    || '';
      const rol      = await AsyncStorage.getItem('rol')      || 'Optometrista';
      const telefono = await AsyncStorage.getItem('telefono') || '';

      const raw   = await AsyncStorage.getItem('perfil_especialista');
      const extra = raw ? JSON.parse(raw) : {};

      setPerfil({
        nombre:       extra.nombre       || nombre,
        email:        extra.email        || email,
        rol:          extra.rol          || rol,
        telefono:     extra.telefono     || telefono,
        especialidad: extra.especialidad || '',
        consultorio:  extra.consultorio  || '',
      });
    } catch {
      mostrar({
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'No se pudo cargar el perfil.',
        boton: 'Entendido',
      });
    } finally {
      setCargando(false);
    }
  }

  async function cargarEstadisticas() {
    try {
      setCargandoStats(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const resp = await fetch(`${CONFIG.CLINICAL_URL}/historias`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.ok) {
        const historias = await resp.json();
        const cedulas = new Set(
          historias
            .map(h => h.paciente?.cedula?.replace(/[^0-9]/g, '').trim())
            .filter(Boolean)
        );
        setTotalPacientes(cedulas.size);
      }
    } catch {
      setTotalPacientes(null);
    } finally {
      setCargandoStats(false);
    }
  }

  function abrirEditar() {
    setEditNombre(perfil?.nombre || '');
    setEditTelefono(perfil?.telefono || '');
    setModalEditar(true);
  }

  async function guardarPerfil() {
    if (!editNombre.trim()) {
      mostrar({
        tipo: 'error',
        titulo: 'Campo requerido',
        mensaje: 'El nombre no puede estar vacío.',
        boton: 'Entendido',
      });
      return;
    }
    try {
      setGuardando(true);
      const token = await AsyncStorage.getItem('token');
      const resp = await fetch(`${CONFIG.API_URL}/perfil`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre: editNombre.trim(), telefono: editTelefono.trim() }),
      });

      if (resp.ok) {
        await AsyncStorage.setItem('nombre',   editNombre.trim());
        await AsyncStorage.setItem('telefono', editTelefono.trim());
        setModalEditar(false);
        await cargarPerfil();
        mostrar({
          tipo: 'exito',
          titulo: 'Perfil actualizado',
          mensaje: 'Tus datos han sido guardados correctamente.',
          boton: 'Listo',
        });
      } else {
        mostrar({
          tipo: 'error',
          titulo: 'Error',
          mensaje: 'No se pudo actualizar el perfil.',
          boton: 'Entendido',
        });
      }
    } catch {
      mostrar({
        tipo: 'error',
        titulo: 'Sin conexión',
        mensaje: 'No se pudo conectar con el servidor.',
        boton: 'Entendido',
      });
    } finally {
      setGuardando(false);
    }
  }

  function cerrarSesion() {
    mostrar({
      tipo: 'confirmacion',
      titulo: '¿Cerrar sesión?',
      mensaje: '¿Estás seguro de que deseas salir de tu cuenta?',
      icono: 'log-out-outline',
      botonCancelar: 'Cancelar',
      botonConfirmar: 'Cerrar sesión',
      onConfirmar: async () => {
        try {
          const { borrarTodasLasHistorias } = await import('../baseDatosLite/basedatoslt');
          await borrarTodasLasHistorias();
          await AsyncStorage.multiRemove([
            'token', 'nombre', 'email', 'rol',
            'telefono', 'perfil_especialista', 'ultima_sincronizacion',
          ]);
        } catch(e) {
          console.log('ERROR LOGOUT:', e.message);
        }
        setTimeout(() => setToken(null), 300);
      },
    });
  }

  return (
    <View style={styles.contenedor}>
      <HeaderConDrawer
        navigation={navigation}
        titulo="Mi Perfil"
        subtitulo="Información de tu cuenta"
        mostrarBack={true}
      />

      <ScrollView contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false}>

        <View style={styles.avatarContenedor}>
          <LinearGradient
            colors={[COLORES.gradienteInicio, COLORES.gradienteFin]}
            style={styles.avatarCirculo}
          >
            <Text style={styles.avatarLetra}>
              {perfil?.nombre?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </LinearGradient>
          {perfil && (
            <>
              <Text style={styles.avatarNombre}>{perfil.nombre || 'Especialista'}</Text>
              <View style={styles.rolBadge}>
                <Text style={styles.rolTexto}>
                  {perfil.rol === 'optometrist' ? 'Especialista de Optometría' : perfil.rol || 'Optometrista'}
                </Text>
              </View>
            </>
          )}
        </View>

        {cargando && (
          <ActivityIndicator size="large" color={COLORES.primario} style={{ marginTop: 40 }} />
        )}

        {!cargando && (
          <TouchableOpacity
            style={styles.tarjetaStats}
            onPress={() => navigation.navigate('HistorialClinico')}
            activeOpacity={0.82}
          >
            <LinearGradient
              colors={[COLORES.gradienteInicio, COLORES.gradienteFin]}
              style={styles.statsGradiente}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statsIcono}>
                <Ionicons name="people-outline" size={28} color="#fff" />
              </View>
              <View style={styles.statsTextos}>
                <Text style={styles.statsNumero}>
                  {cargandoStats ? '—' : totalPacientes !== null ? totalPacientes : '—'}
                </Text>
                <Text style={styles.statsLabel}>Pacientes registrados</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {!cargando && perfil && (
          <View style={styles.tarjeta}>
            <FilaDato icono="person-outline" label="Nombre"   valor={perfil.nombre} />
            <FilaDato icono="mail-outline"   label="Correo"   valor={perfil.email} />
            <FilaDato icono="shield-outline" label="Rol"      valor={perfil.rol === 'optometrist' ? 'Especialista de Optometría' : perfil.rol} />
            {perfil.telefono     ? <FilaDato icono="call-outline"     label="Teléfono"     valor={perfil.telefono} /> : null}
            {perfil.especialidad ? <FilaDato icono="medical-outline"  label="Especialidad" valor={perfil.especialidad} /> : null}
            {perfil.consultorio  ? <FilaDato icono="business-outline" label="Consultorio"  valor={perfil.consultorio} ultimo /> : null}
          </View>
        )}

        {!cargando && (
          <TouchableOpacity style={styles.btnEditar} onPress={abrirEditar} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={18} color={COLORES.primario} style={{ marginRight: 8 }} />
            <Text style={styles.btnEditarTexto}>Editar perfil</Text>
          </TouchableOpacity>
        )}

        {!cargando && (
          <TouchableOpacity style={styles.btnCerrar} onPress={cerrarSesion} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnCerrarTexto}>Cerrar sesión</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* Modal editar perfil */}
      <Modal visible={modalEditar} animationType="slide" transparent onRequestClose={() => setModalEditar(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCaja}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Editar perfil</Text>
              <TouchableOpacity onPress={() => setModalEditar(false)} style={styles.modalCerrar}>
                <Ionicons name="close" size={22} color={COLORES.oscuro} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nombre</Text>
            <View style={styles.inputFila}>
              <Ionicons name="person-outline" size={18} color={COLORES.mutedForeground} style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.input}
                value={editNombre}
                onChangeText={setEditNombre}
                placeholder="Tu nombre completo"
                placeholderTextColor={COLORES.mutedForeground}
              />
            </View>

            <Text style={styles.inputLabel}>Teléfono</Text>
            <View style={styles.inputFila}>
              <Ionicons name="call-outline" size={18} color={COLORES.mutedForeground} style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.input}
                value={editTelefono}
                onChangeText={setEditTelefono}
                placeholder="Tu número de teléfono"
                placeholderTextColor={COLORES.mutedForeground}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.btnGuardar, guardando && { opacity: 0.7 }]}
              onPress={guardarPerfil}
              disabled={guardando}
              activeOpacity={0.85}
            >
              {guardando
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="checkmark-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnGuardarTexto}>Guardar cambios</Text>
                  </>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AlertaPersonalizada />
    </View>
  );
}

function FilaDato({ icono, label, valor, ultimo }) {
  if (!valor) return null;
  return (
    <View style={[styles.fila, ultimo && { borderBottomWidth: 0 }]}>
      <View style={styles.filaIzq}>
        <Ionicons name={icono} size={16} color={COLORES.primario} style={{ marginRight: 8 }} />
        <Text style={styles.filaLabel}>{label}</Text>
      </View>
      <Text style={styles.filaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  cuerpo:     { padding: 16, paddingBottom: 50 },

  avatarContenedor: { alignItems: 'center', paddingVertical: 28 },
  avatarCirculo:    { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarLetra:      { fontSize: 38, fontWeight: '800', color: '#fff' },
  avatarNombre:     { fontSize: 20, fontWeight: '700', color: COLORES.oscuro, marginBottom: 6 },
  rolBadge:         { backgroundColor: COLORES.secundario, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  rolTexto:         { fontSize: 13, fontWeight: '600', color: COLORES.primario },

  tarjetaStats: {
    borderRadius: 20, marginBottom: 16,
    elevation: 4, shadowColor: COLORES.primario, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  statsGradiente: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, padding: 20, gap: 14,
  },
  statsIcono: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  statsTextos:  { flex: 1 },
  statsNumero:  { fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 36 },
  statsLabel:   { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginTop: 2 },

  tarjeta: {
    backgroundColor: '#fff', borderRadius: 20, padding: 8, marginBottom: 16,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
  },
  fila:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORES.muted },
  filaIzq:   { flexDirection: 'row', alignItems: 'center' },
  filaLabel: { fontSize: 14, color: COLORES.mutedForeground, fontWeight: '600' },
  filaValor: { fontSize: 14, color: COLORES.oscuro, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 12 },

  btnEditar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORES.primario, borderRadius: 16, paddingVertical: 14, marginBottom: 12 },
  btnEditarTexto: { color: COLORES.primario, fontSize: 15, fontWeight: '700' },

  btnCerrar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORES.error, borderRadius: 16, paddingVertical: 15 },
  btnCerrarTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCaja:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitulo:  { fontSize: 18, fontWeight: '700', color: COLORES.oscuro },
  modalCerrar:  { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORES.muted, justifyContent: 'center', alignItems: 'center' },

  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORES.mutedForeground, marginBottom: 6, marginLeft: 4 },
  inputFila:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORES.borde, borderRadius: 14, backgroundColor: COLORES.muted, marginBottom: 16 },
  input:      { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: COLORES.foreground },

  btnGuardar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORES.primario, borderRadius: 14, paddingVertical: 15, marginTop: 8 },
  btnGuardarTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
});