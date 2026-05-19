import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Platform, StatusBar,
  KeyboardAvoidingView, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../config';
import COLORES from '../constantes/colores';

// ─── Intento de registro en el servidor ────────────────────────────────────
async function intentarRegistroServidor(email, password) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const resp = await fetch(`${CONFIG.API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return resp;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ─── Registro local si no hay servidor ─────────────────────────────────────
async function registrarLocal(email, password, nombre) {
  const raw = await AsyncStorage.getItem('cuentas_locales');
  const cuentas = raw ? JSON.parse(raw) : {};
  if (cuentas[email]) return { ok: false, error: 'El correo ya está registrado localmente' };
  cuentas[email] = { password, nombre };
  await AsyncStorage.setItem('cuentas_locales', JSON.stringify(cuentas));
  const token = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return { ok: true, token };
}

// ─── Campo reutilizable ────────────────────────────────────────────────────
function Campo({ label, value, onChange, onClearError, placeholder, icono, keyboardType = 'default', secure = false, onToggleSecure, mostrarToggle = false, error = '' }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.campoLabel}>{label}</Text>
      <View style={[styles.inputFila, !!error && styles.inputError]}>
        <Ionicons name={icono} size={18} color={COLORES.mutedForeground} style={styles.inputIcono} />
        <TextInput
          style={[styles.input, mostrarToggle && { flex: 1 }]}
          placeholder={placeholder}
          placeholderTextColor={COLORES.mutedForeground}
          value={value}
          onChangeText={(t) => { onChange(t); onClearError(label); }}
          keyboardType={keyboardType}
          autoCapitalize="none"
          secureTextEntry={secure}
          blurOnSubmit={false}
        />
        {mostrarToggle && (
          <TouchableOpacity onPress={onToggleSecure} style={styles.ojito}>
            <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORES.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.textoError}>{error}</Text>}
    </View>
  );
}

export default function RegistroScreen({ navigation, setToken }) {
  const [nombre,    setNombre]    = useState('');
  const [cedula,    setCedula]    = useState('');
  const [email,     setEmail]     = useState('');
  const [telefono,  setTelefono]  = useState('');
  const [password,  setPassword]  = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando,  setCargando]  = useState(false);
  const [errores,   setErrores]   = useState({});
  const [verPass,   setVerPass]   = useState(false);
  const [verConf,   setVerConf]   = useState(false);

  const clearError = useCallback((label) => {
    setErrores((prev) => {
      if (!prev[label]) return prev;
      const next = { ...prev };
      delete next[label];
      return next;
    });
  }, []);

  function validar() {
    const e = {};
    if (!nombre || nombre.trim().length < 3)  e.nombre    = 'Mínimo 3 caracteres';
    if (!cedula || cedula.trim().length < 5)   e.cedula    = 'Cédula inválida';
    if (!email)                                e.email     = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Correo no válido';
    if (!telefono || telefono.length < 7)      e.telefono  = 'Teléfono inválido';
    if (!password)                             e.password  = 'La contraseña es obligatoria';
    else if (password.length < 6)             e.password  = 'Mínimo 6 caracteres';
    if (!confirmar)                            e.confirmar = 'Confirme su contraseña';
    else if (confirmar !== password)          e.confirmar = 'Las contraseñas no coinciden';
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegistro() {
    if (!validar()) return;
    setCargando(true);
    const emailNorm = email.toLowerCase().trim();

    try {
      const resp = await intentarRegistroServidor(emailNorm, password);

      let token;

      if (resp && resp.ok) {
        // Servidor disponible
        const datos = await resp.json();
        token = datos.token;
      } else if (resp && !resp.ok) {
        let msg = 'Error al registrar';
        try { const d = await resp.json(); msg = d.error || msg; } catch {}
        setErrores({ general: msg });
        return;
      } else {
        // Sin servidor → registro local
        const local = await registrarLocal(emailNorm, password, nombre);
        if (!local.ok) { setErrores({ general: local.error || 'Error local' }); return; }
        token = local.token;
      }

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('nombre', nombre);
      await AsyncStorage.setItem('email', emailNorm);
      await AsyncStorage.setItem('cedula', cedula);
      await AsyncStorage.setItem('perfil_especialista', JSON.stringify({
        nombre, cedula, email: emailNorm, telefono,
      }));

     setToken(token);
      Alert.alert(
        'Athenea le saluda',
        `Hola ${nombre}, tu cuenta fue creada exitosamente.`,
        [{
          text: 'Comenzar',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] }),
        }]
      );
   } catch (e) {
      console.log('ERROR REGISTRO:', e.message, e);
      setErrores({ general: 'Error inesperado. Intenta de nuevo.' });
    } finally {
      setCargando(false);
    }
  }
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />

      {/* Header gradiente */}
      <LinearGradient
        colors={[COLORES.gradienteInicio, COLORES.gradienteMedio]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.headerGradiente, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitulos}>
          <Ionicons name="eye-outline" size={24} color="#fff" style={{ marginBottom: 6 }} />
          <Text style={styles.titulo}>ATHENEA</Text>
          <Text style={styles.subtitulo}>Crear cuenta</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tarjeta}>

          <Text style={styles.seccionTitulo}>Datos personales</Text>

          <Campo label="Nombre completo" value={nombre} onChange={setNombre} onClearError={clearError}
            placeholder="Nombre y apellido" icono="person-outline" error={errores.nombre} />
          <Campo label="Cédula" value={cedula} onChange={setCedula} onClearError={clearError}
            placeholder="Ej: V-12345678" icono="card-outline" error={errores.cedula} />
          <Campo label="Teléfono" value={telefono} onChange={setTelefono} onClearError={clearError}
            placeholder="0414-1234567" icono="call-outline" keyboardType="phone-pad" error={errores.telefono} />

          <Text style={[styles.seccionTitulo, { marginTop: 8 }]}>Cuenta</Text>

          <Campo label="Correo electrónico" value={email} onChange={setEmail} onClearError={clearError}
            placeholder="correo@ejemplo.com" icono="mail-outline" keyboardType="email-address" error={errores.email} />
          <Campo label="Contraseña" value={password} onChange={setPassword} onClearError={clearError}
            placeholder="Mínimo 6 caracteres" icono="lock-closed-outline"
            secure={!verPass} onToggleSecure={() => setVerPass(!verPass)} mostrarToggle error={errores.password} />
          <Campo label="Confirmar contraseña" value={confirmar} onChange={setConfirmar} onClearError={clearError}
            placeholder="Repite tu contraseña" icono="lock-closed-outline"
            secure={!verConf} onToggleSecure={() => setVerConf(!verConf)} mostrarToggle error={errores.confirmar} />

          {errores.general ? <Text style={styles.errorGeneral}>{errores.general}</Text> : null}

          <TouchableOpacity
            style={[styles.boton, cargando && styles.botonDesactivado]}
            onPress={handleRegistro}
            disabled={cargando}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORES.primario, COLORES.gradienteFin]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.botonGradiente}
            >
              {cargando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.botonTexto}>Crear cuenta</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkFila} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkTexto}>
              ¿Ya tienes cuenta?{' '}
              <Text style={styles.linkAccent}>Inicia sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORES.fondo },

  headerGradiente: { paddingHorizontal: 20, paddingBottom: 28 },
  backBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  headerTitulos: { alignItems: 'center' },
  titulo:    { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 6 },
  subtitulo: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },

  tarjeta: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
  },
  seccionTitulo: {
    fontSize: 12, fontWeight: '700', color: COLORES.primario,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 16, textAlign: 'center',
  },

  campo:     { marginBottom: 14 },
  campoLabel: { fontSize: 11, color: COLORES.mutedForeground, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputFila: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORES.borde,
    borderRadius: 14, backgroundColor: COLORES.muted,
  },
  inputIcono: { paddingLeft: 14 },
  input:      { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: COLORES.foreground },
  inputError: { borderColor: COLORES.error },
  ojito:      { paddingHorizontal: 14 },
  textoError: { color: COLORES.error, fontSize: 12, marginTop: 4, marginLeft: 4 },
  errorGeneral: { color: COLORES.error, fontSize: 13, textAlign: 'center', marginBottom: 12, lineHeight: 18 },

  boton:         { borderRadius: 14, overflow: 'hidden', marginTop: 12 },
  botonDesactivado: { opacity: 0.7 },
  botonGradiente: { paddingVertical: 16, alignItems: 'center' },
  botonTexto:    { color: '#fff', fontSize: 16, fontWeight: '700' },

  linkFila:   { alignItems: 'center', marginTop: 20 },
  linkTexto:  { fontSize: 14, color: COLORES.mutedForeground },
  linkAccent: { color: COLORES.primario, fontWeight: '700' },
});
