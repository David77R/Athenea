import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, FlatList,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Modal, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../config';

export default function BuscarPacienteScreen({ navigation }) {
  const [cedula, setCedula] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [buscado, setBuscado] = useState(false);

  // Modal de registro
  const [modalVisible, setModalVisible] = useState(false);
  const [guardandoPaciente, setGuardandoPaciente] = useState(false);
  const [formNombre, setFormNombre] = useState('');
  const [formApellido, setFormApellido] = useState('');
  const [formEdad, setFormEdad] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formOcupacion, setFormOcupacion] = useState('');

  async function buscar() {
    if (!cedula.trim()) {
      Alert.alert('Campo requerido', 'Ingresa una cédula para buscar');
      return;
    }
    setBuscando(true);
    setBuscado(false);
    setResultados([]);

    try {
      const token = await AsyncStorage.getItem('token');
      const respuesta = await fetch(`${CONFIG.CLINICAL_URL}/historias?cedula=${cedula.trim()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (respuesta.ok) {
        const datos = await respuesta.json();
        setResultados(Array.isArray(datos) ? datos : []);
      } else {
        setResultados([]);
      }
    } catch (e) {
      Alert.alert('Sin conexión', 'No se pudo conectar al servidor');
    } finally {
      setBuscando(false);
      setBuscado(true);
    }
  }

  function abrirModalRegistro() {
    setFormNombre('');
    setFormApellido('');
    setFormEdad('');
    setFormTelefono('');
    setFormOcupacion('');
    setModalVisible(true);
  }

  async function registrarPaciente() {
    if (!formNombre.trim() || !formApellido.trim()) {
      Alert.alert('Campos requeridos', 'El nombre y apellido son obligatorios');
      return;
    }

    setGuardandoPaciente(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const respuesta = await fetch(`${CONFIG.API_URL}/api/pacientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cedula: cedula.trim(),
          nombre: formNombre.trim(),
          apellido: formApellido.trim(),
          edad: formEdad ? Number(formEdad) : undefined,
          telefono: formTelefono.trim() || undefined,
          ocupacion: formOcupacion.trim() || undefined,
        }),
      });

      if (respuesta.ok || respuesta.status === 409) {
        setModalVisible(false);
        Alert.alert(
          respuesta.status === 409 ? 'Paciente ya existe' : '✅ Paciente registrado',
          respuesta.status === 409
            ? 'Este paciente ya está registrado. ¿Deseas crear una historia clínica?'
            : `${formNombre} ${formApellido} fue registrado correctamente. ¿Deseas crear una historia clínica ahora?`,
          [
            { text: 'No por ahora', style: 'cancel' },
            {
              text: 'Crear historia',
              onPress: () =>
                navigation.navigate('Formulario', {
                  datosIA: {
                    paciente: {
                      nombre: `${formNombre.trim()} ${formApellido.trim()}`,
                      cedula: cedula.trim(),
                      telefono: formTelefono.trim(),
                      ocupacion: formOcupacion.trim(),
                      edad: formEdad,
                    },
                  },
                }),
            },
          ]
        );
      } else {
        const error = await respuesta.json().catch(() => ({}));
        Alert.alert('Error', error.message || 'No se pudo registrar el paciente');
      }
    } catch (e) {
      Alert.alert('Sin conexión', 'No se pudo conectar al servidor de autenticación');
    } finally {
      setGuardandoPaciente(false);
    }
  }

  function formatearFecha(fechaISO) {
    if (!fechaISO) return 'Sin fecha';
    const d = new Date(fechaISO);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const EmptyComponent = buscado && !buscando ? (
    <View style={styles.vacio}>
      <Text style={styles.vacioIcono}>🔍</Text>
      <Text style={styles.vacioTexto}>No se encontraron historias</Text>
      <Text style={styles.vacioSub}>No hay historias clínicas para la cédula {cedula}</Text>
      <TouchableOpacity style={styles.btnRegistrarNuevo} onPress={abrirModalRegistro}>
        <Text style={styles.btnRegistrarNuevoTexto}>+ Registrar paciente nuevo</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.contenedor}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcono}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Buscar Paciente</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcono}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Número de cédula..."
              placeholderTextColor="#9DB4BA"
              value={cedula}
              onChangeText={setCedula}
              keyboardType="numeric"
              onSubmitEditing={buscar}
              returnKeyType="search"
            />
            {cedula.length > 0 && (
              <TouchableOpacity onPress={() => { setCedula(''); setResultados([]); setBuscado(false); }}>
                <Text style={styles.clearIcono}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.btnBuscar, buscando && styles.btnBuscarDesactivado]}
            onPress={buscar}
            disabled={buscando}
            activeOpacity={0.85}
          >
            {buscando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnBuscarTexto}>Buscar</Text>
            }
          </TouchableOpacity>
        </View>

        {buscado && !buscando && (
          <View style={styles.resultadosHeader}>
            <Text style={styles.resultadosTexto}>
              {resultados.length > 0
                ? `${resultados.length} historia${resultados.length > 1 ? 's' : ''} encontrada${resultados.length > 1 ? 's' : ''}`
                : 'Sin resultados para esa cédula'
              }
            </Text>
          </View>
        )}

        <FlatList
          data={resultados}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={EmptyComponent}
          renderItem={({ item }) => (
            <View style={styles.tarjeta}>
              <View style={styles.tarjetaHeader}>
                <View style={styles.tarjetaAvatar}>
                  <Text style={styles.tarjetaAvatarTexto}>
                    {item.paciente?.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.tarjetaInfo}>
                  <Text style={styles.tarjetaNombre}>
                    {item.paciente?.nombre || 'Sin nombre'}
                  </Text>
                  <Text style={styles.tarjetaCedula}>
                    C.I. {item.paciente?.cedula || cedula}
                  </Text>
                </View>
                <Text style={styles.tarjetaFecha}>
                  {formatearFecha(item.fecha_consulta || item.createdAt)}
                </Text>
              </View>

              <View style={styles.tarjetaDivider} />

              <Text style={styles.tarjetaMotivo} numberOfLines={2}>
                {item.motivo_consulta || 'Sin motivo registrado'}
              </Text>

              {item.diagnostico && (
                <View style={styles.tarjetaBadge}>
                  <Text style={styles.tarjetaBadgeTexto}>
                    Dx: {item.diagnostico}
                  </Text>
                </View>
              )}

              <View style={styles.tarjetaBotones}>
                <TouchableOpacity
                  style={styles.btnVer}
                  onPress={() => navigation.navigate('Formulario', { historiaVer: item })}
                >
                  <Text style={styles.btnVerTexto}>Ver historia</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnDiagnostico}
                  onPress={() => Alert.alert('Próximamente', 'Pantalla de diagnóstico en desarrollo')}
                >
                  <Text style={styles.btnDiagnosticoTexto}>Diagnóstico →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

      </KeyboardAvoidingView>

      {/* Modal de registro de paciente nuevo */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContenido}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitulo}>Registrar paciente</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCerrar}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalCedulaBadge}>
                <Text style={styles.modalCedulaLabel}>Cédula</Text>
                <Text style={styles.modalCedulaValor}>{cedula}</Text>
              </View>

              <Text style={styles.modalLabel}>Nombre *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nombre(s)"
                value={formNombre}
                onChangeText={setFormNombre}
                autoCapitalize="words"
              />

              <Text style={styles.modalLabel}>Apellido *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Apellido(s)"
                value={formApellido}
                onChangeText={setFormApellido}
                autoCapitalize="words"
              />

              <View style={styles.modalFila}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.modalLabel}>Edad</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Años"
                    value={formEdad}
                    onChangeText={setFormEdad}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={styles.modalLabel}>Teléfono</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="04XX-XXXXXXX"
                    value={formTelefono}
                    onChangeText={setFormTelefono}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <Text style={styles.modalLabel}>Ocupación</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Profesión u oficio"
                value={formOcupacion}
                onChangeText={setFormOcupacion}
                autoCapitalize="words"
              />

              <TouchableOpacity
                style={[styles.modalBtnGuardar, guardandoPaciente && { opacity: 0.6 }]}
                onPress={registrarPaciente}
                disabled={guardandoPaciente}
              >
                {guardandoPaciente
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalBtnGuardarTexto}>Registrar paciente</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#EAF4F5' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B7B8B',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 44,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  backIcono: { fontSize: 18, color: '#fff', fontWeight: '700' },
  headerTitulo: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0EDEF',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FA',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#C8E6EA',
    gap: 8,
  },
  searchIcono: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0D3B44',
    paddingVertical: 12,
  },
  clearIcono: { fontSize: 14, color: '#9DB4BA', padding: 4 },
  btnBuscar: {
    backgroundColor: '#0B7B8B',
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnBuscarDesactivado: { opacity: 0.6 },
  btnBuscarTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },

  resultadosHeader: { paddingHorizontal: 20, paddingVertical: 12 },
  resultadosTexto: { fontSize: 13, color: '#6A9BAB', fontWeight: '600' },

  lista: { padding: 16, paddingTop: 4 },

  vacio: { alignItems: 'center', paddingTop: 50 },
  vacioIcono: { fontSize: 48, marginBottom: 16 },
  vacioTexto: { fontSize: 16, fontWeight: '600', color: '#0D3B44', marginBottom: 6 },
  vacioSub: { fontSize: 13, color: '#6A9BAB', marginBottom: 24, textAlign: 'center' },
  btnRegistrarNuevo: {
    backgroundColor: '#0B7B8B',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  btnRegistrarNuevoTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },

  tarjeta: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#0B7B8B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  tarjetaHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tarjetaAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E6F7F8', justifyContent: 'center', alignItems: 'center',
  },
  tarjetaAvatarTexto: { fontSize: 18, fontWeight: '700', color: '#0B7B8B' },
  tarjetaInfo: { flex: 1 },
  tarjetaNombre: { fontSize: 15, fontWeight: '700', color: '#0D3B44' },
  tarjetaCedula: { fontSize: 12, color: '#6A9BAB', marginTop: 2 },
  tarjetaFecha: { fontSize: 11, color: '#9DB4BA' },
  tarjetaDivider: { height: 1, backgroundColor: '#F0F9FA', marginVertical: 12 },
  tarjetaMotivo: { fontSize: 13, color: '#4A7A8A', lineHeight: 20, marginBottom: 10 },
  tarjetaBadge: {
    backgroundColor: '#E6F7F8', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', marginBottom: 12,
  },
  tarjetaBadgeTexto: { fontSize: 12, color: '#0B7B8B', fontWeight: '600' },
  tarjetaBotones: { flexDirection: 'row', gap: 8 },
  btnVer: {
    flex: 1, borderWidth: 1.5, borderColor: '#0B7B8B',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  btnVerTexto: { color: '#0B7B8B', fontWeight: '600', fontSize: 13 },
  btnDiagnostico: {
    flex: 1, backgroundColor: '#0B7B8B',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  btnDiagnosticoTexto: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContenido: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: '#0D3B44' },
  modalCerrar: { fontSize: 18, color: '#9DB4BA', padding: 4 },

  modalCedulaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F7F8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 10,
  },
  modalCedulaLabel: { fontSize: 12, color: '#6A9BAB', fontWeight: '600', textTransform: 'uppercase' },
  modalCedulaValor: { fontSize: 16, fontWeight: '700', color: '#0B7B8B' },

  modalLabel: { fontSize: 12, color: '#6A9BAB', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#C8E6EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#0D3B44',
    backgroundColor: '#F0F9FA',
    marginBottom: 14,
  },
  modalFila: { flexDirection: 'row' },

  modalBtnGuardar: {
    backgroundColor: '#0B7B8B',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  modalBtnGuardarTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalBtnCancelar: {
    borderWidth: 1.5,
    borderColor: '#C8E6EA',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalBtnCancelarTexto: { color: '#6A9BAB', fontWeight: '600', fontSize: 15 },
});
