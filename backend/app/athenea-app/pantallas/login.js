import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ImageBackground, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CONFIG from '../config';

const { width, height } = Dimensions.get('window');

const IMAGEN_FONDO = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState({});

  function validar() {
    const nuevosErrores = {};
    if (!email) {
      nuevosErrores.email = 'El correo es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nuevosErrores.email = 'Correo no válido';
    }
    if (!password) {
      nuevosErrores.password = 'La contraseña es obligatoria';
    } else if (password.length < 6) {
      nuevosErrores.password = 'Mínimo 6 caracteres';
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function handleLogin() {
    if (!validar()) return;
    setCargando(true);
    try {
      const respuesta = await fetch(`${CONFIG.API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setErrores({ general: datos.error || 'Credenciales inválidas' });
        return;
      }
      await AsyncStorage.setItem('token', datos.token);
      navigation.replace('Home');
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
        <View style={styles.logoArea}>
          <View style={styles.logoExterno}>
            <View style={styles.logoInterno}>
              <View style={styles.pupila} />
            </View>
          </View>
          <Text style={styles.titulo}>ATHENEA</Text>
          <Text style={styles.subtitulo}>Historias Clínicas Optométricas</Text>
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.bienvenida}>Iniciar sesión</Text>

          <View style={styles.campoContenedor}>
            <TextInput
              style={[styles.input, errores.email && styles.inputError]}
              placeholder="Correo electrónico"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErrores((e) => ({ ...e, email: null }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errores.email ? (
              <Text style={styles.textoError}>{errores.email}</Text>
            ) : null}
          </View>

          <View style={styles.campoContenedor}>
            <TextInput
              style={[styles.input, errores.password && styles.inputError]}
              placeholder="Contraseña"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrores((e) => ({ ...e, password: null }));
              }}
              secureTextEntry
            />
            {errores.password ? (
              <Text style={styles.textoError}>{errores.password}</Text>
            ) : null}
          </View>

          {errores.general ? (
            <Text style={styles.errorGeneral}>{errores.general}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.boton, cargando && styles.botonDesactivado]}
            onPress={handleLogin}
            disabled={cargando}
            activeOpacity={0.85}
          >
            {cargando ? (
              <ActivityIndicator color="#1A237E" />
            ) : (
              <Text style={styles.botonTexto}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    width,
    height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 15, 60, 0.72)',
  },
  contenedor: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 48,
  },
  logoArea: {
    alignItems: 'center',
  },
  logoExterno: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 16,
  },
  logoInterno: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  pupila: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 8,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  tarjeta: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  bienvenida: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  campoContenedor: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  inputError: {
    borderColor: '#FF5252',
  },
  textoError: {
    color: '#FF5252',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  errorGeneral: {
    color: '#FF5252',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  boton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  botonDesactivado: {
    opacity: 0.7,
  },
  botonTexto: {
    color: '#1A237E',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});