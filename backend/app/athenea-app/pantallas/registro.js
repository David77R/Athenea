import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ImageBackground, Dimensions, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../config';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';


const { width, height } = Dimensions.get('window');
const IMAGEN_FONDO = 'https://images.unsplash.com/photo-1743183988213-d5e24edf3dc8?q=80&w=715&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

export default function RegistroScreen({ navigation, setToken }) {
  const [nombre, setNombre] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState({});
  const [verPassword, setVerPassword] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [mostrarPicker, setMostrarPicker] = useState(false);

  function onChangeFecha(event, selectedDate) {
  setMostrarPicker(false);
  if (selectedDate) {
    const dia = selectedDate.getDate().toString().padStart(2, '0');
    const mes = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const año = selectedDate.getFullYear();
    setFechaNacimiento(`${dia}/${mes}/${año}`);
  }
}


function validar() {
  const nuevosErrores = {};

  // Nombre
  if (!nombre || nombre.trim().length < 3) {
    nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
  }

  // Fecha de nacimiento
  if (!fechaNacimiento) {
    nuevosErrores.fechaNacimiento = 'La fecha de nacimiento es obligatoria';
  }

  // Email
  if (!email) {
    nuevosErrores.email = 'El correo es obligatorio';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    nuevosErrores.email = 'Correo no válido';
  }

  // Teléfono
  if (!telefono) {
    nuevosErrores.telefono = 'El número de teléfono es obligatorio';
  } else if (telefono.length < 7) {
    nuevosErrores.telefono = 'Número de teléfono no válido';
  }

  // Contraseña
  if (!password) {
    nuevosErrores.password = 'La contraseña es obligatoria';
  } else if (password.length < 6) {
    nuevosErrores.password = 'Mínimo 6 caracteres';
  }

  if (!confirmar) {
    nuevosErrores.confirmar = 'Confirme su contraseña';
  } else if (confirmar !== password) {
    nuevosErrores.confirmar = 'Las contraseñas no coinciden';
  }

  setErrores(nuevosErrores);
  return Object.keys(nuevosErrores).length === 0;
}


  async function handleRegistro() {
    if (!validar()) return;
    setCargando(true);
    try {
      const respuesta = await fetch(`${CONFIG.API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setErrores({ general: datos.error || 'Error al registrar' });
        return;
      }
      await AsyncStorage.setItem('token', datos.token);
      setToken(datos.token);
      await AsyncStorage.setItem('nombre', nombre);
    } catch (e) {
      setErrores({ general: 'Sin conexión al servidor' });
    } finally {
      setCargando(false);
    }
  }

  return (
    <ImageBackground
      source={{ uri: IMAGEN_FONDO }}
      style={styles.fondo}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={styles.contenedor}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
  <Text style={styles.ia}>IA</Text>
  <Text style={styles.tituloNuevo}>Athenea</Text>
  <Text style={styles.subtituloNuevo}>Tu asistente médica</Text>
</View>


          <View style={styles.tarjeta}>
<Text style={[styles.bienvenida, styles.registroOverride]}>Registro</Text>

            {/* Nombre */}
            <View style={styles.campoContenedor}>
              <TextInput
                style={[styles.input, errores.nombre && styles.inputError]}
                placeholder="Nombre completo"
                placeholderTextColor="#0A6C74"
                value={nombre}
                onChangeText={(t) => {
                  setNombre(t);
                  setErrores((e) => ({ ...e, nombre: null }));
                }}
              />
              {errores.nombre ? <Text style={styles.textoError}>{errores.nombre}</Text> : null}
            </View>

            {/* Fecha de nacimiento */}
<View style={styles.campoContenedor}>
  <TouchableOpacity
    style={[styles.input, errores.fechaNacimiento && styles.inputError]}
    onPress={() => setMostrarPicker(true)}
  >
    <Text style={{ color: fechaNacimiento ? '#344054' : '#0A6C74' }}>
      {fechaNacimiento || 'Fecha de nacimiento'}
    </Text>
  </TouchableOpacity>

  {errores.fechaNacimiento ? (
    <Text style={styles.textoError}>{errores.fechaNacimiento}</Text>
  ) : null}

  {mostrarPicker && (
    <DateTimePicker
      value={new Date()}
      mode="date"
      display="spinner"
      onChange={onChangeFecha}
      maximumDate={new Date()}
    />
  )}
</View>
{/* Teléfono */}
<View style={styles.campoContenedor}>
  <TextInput
    style={[styles.input, errores.telefono && styles.inputError]}
    placeholder="Número de teléfono"
    placeholderTextColor="#0A6C74"
    value={telefono}
    onChangeText={(t) => {
      setTelefono(t);
      setErrores((e) => ({ ...e, telefono: null }));
    }}
    keyboardType="phone-pad"
  />
  {errores.telefono ? <Text style={styles.textoError}>{errores.telefono}</Text> : null}
</View>


            {/* Email */}
            <View style={styles.campoContenedor}>
              <TextInput
                style={[styles.input, errores.email && styles.inputError]}
                placeholder="Correo electrónico"
                placeholderTextColor="#0A6C74"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setErrores((e) => ({ ...e, email: null }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errores.email ? <Text style={styles.textoError}>{errores.email}</Text> : null}
            </View>

            {/* Contraseña */}
            <View style={styles.campoContenedor}>
              <View style={styles.inputContenedor}>
                <TextInput
                  style={[styles.inputFlex, errores.password && styles.inputError]}
                  placeholder="Contraseña"
                  placeholderTextColor="#0A6C74"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setErrores((e) => ({ ...e, password: null }));
                  }}
                  secureTextEntry={!verPassword}
                />
               <TouchableOpacity
  style={styles.ojito}
  onPress={() => setVerPassword(!verPassword)}
>
  <Ionicons
    name={verPassword ? "eye-off-outline" : "eye-outline"}
    size={22}
    color="#0A6C74"
  />
</TouchableOpacity>

              </View>
              {errores.password ? <Text style={styles.textoError}>{errores.password}</Text> : null}
            </View>

            {/* Confirmar contraseña */}
            <View style={styles.campoContenedor}>
              <View style={styles.inputContenedor}>
                <TextInput
                  style={[styles.inputFlex, errores.confirmar && styles.inputError]}
                  placeholder="Confirmar contraseña"
                  placeholderTextColor="#0A6C74"
                  value={confirmar}
                  onChangeText={(t) => {
                    setConfirmar(t);
                    setErrores((e) => ({ ...e, confirmar: null }));
                  }}
                  secureTextEntry={!verConfirmar}
                />
               <TouchableOpacity
  style={styles.ojito}
  onPress={() => setVerConfirmar(!verConfirmar)}
>
  <Ionicons
    name={verConfirmar ? "eye-off-outline" : "eye-outline"}
    size={22}
    color="#0A6C74"
  />
</TouchableOpacity>

              </View>
              {errores.confirmar ? <Text style={styles.textoError}>{errores.confirmar}</Text> : null}
            </View>

            {errores.general ? (
              <Text style={styles.errorGeneral}>{errores.general}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.boton, cargando && styles.botonDesactivado]}
              onPress={handleRegistro}
              disabled={cargando}
              activeOpacity={0.85}
            >
              {cargando ? (
                <ActivityIndicator color="#1A237E" />
              ) : (
                <Text style={styles.botonTexto}>Crear cuenta</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkContenedor}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, width, height },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  contenedor: { flex: 1, paddingHorizontal: 28, paddingTop: 60 },
  logoArea: { alignItems: 'center', marginBottom: 24 },
  logoExterno: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 12,
  },
  logoInterno: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  pupila: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  titulo: {
    fontSize: 32, fontWeight: '800', color: '#fff',
    letterSpacing: 8, marginBottom: 4,
  },
  subtitulo: { fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
tarjeta: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 24,
  marginBottom: 40,
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
},

  bienvenida: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 20 },
  campoContenedor: { marginBottom: 14 },
  input: {
  borderWidth: 1,
  borderColor: '#D0D5DD',
  borderRadius: 12,
  padding: 14,
  fontSize: 15,
  color: '#344054',
  backgroundColor: '#F2F4F7',
},

inputContenedor: {
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#D0D5DD',
  borderRadius: 12,
  backgroundColor: '#F2F4F7',
},

 inputFlex: {
  flex: 1,
  padding: 14,
  fontSize: 15,
  color: '#344054',
},

  inputError: { borderColor: '#FF5252' },
  textoError: { color: '#FF5252', fontSize: 12, marginTop: 4, marginLeft: 4 },
  errorGeneral: { color: '#FF5252', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  boton: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  botonDesactivado: { opacity: 0.7 },
  botonTexto: { color: '#1A237E', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  linkContenedor: { alignItems: 'center', marginTop: 16 },
 link: {
  color: '#0A6C74',
  fontSize: 13,
  textAlign: 'center',
  fontWeight: '500',
  marginTop: 8,
},


  header: {
  alignItems: 'center',
  marginBottom: 30,
  marginTop: 10,
},

ia: {
  fontSize: 14,
  color: '#0A6C74',
  fontWeight: '700',
  letterSpacing: 2,
  marginBottom: -6,
},

tituloNuevo: {
  fontSize: 32,
  fontWeight: '800',
  color: '#0A6C74',
  letterSpacing: 2,
},

subtituloNuevo: {
  fontSize: 14,
  color: '#0A6C74',
  opacity: 0.8,
  marginTop: 4,
},

registroOverride: {
  color: '#0A6C74',
  textAlign: 'center',
  alignSelf: 'stretch',
  marginTop: 0,
  marginBottom: 20,
},


});