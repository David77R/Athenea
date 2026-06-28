import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../config';
import COLORES from '../constantes/colores';
import { useAlerta } from '../componentes/AlertaPersonalizada';

// ─── Intento de login contra el servidor ───────────────────────────────────
async function intentarLoginServidor(email, password) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const resp = await fetch(`${CONFIG.API_URL}/login`, {
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

// ─── Login offline con cuentas locales ─────────────────────────────────────
async function loginLocal(email, password) {
  try {
    const raw     = await AsyncStorage.getItem('cuentas_locales');
    const cuentas = raw ? JSON.parse(raw) : {};
    const cuenta  = cuentas[email];
    if (!cuenta) return null;
    if (cuenta.password !== password) return null;
    const token = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { token, nombre: cuenta.nombre };
  } catch {
    return null;
  }
}

export default function LoginScreen({ navigation, setToken }) {
  const [credencial,   setCredencial]   = useState('');
  const [password,     setPassword]     = useState('');
  const [cargando,     setCargando]     = useState(false);
  const [errores,      setErrores]      = useState({});
  const [verPass,      setVerPass]      = useState(false);
  const [modoOffline,  setModoOffline]  = useState('');

  const { mostrar, AlertaPersonalizada } = useAlerta();

  function validar() {
    const e = {};
    if (!credencial) e.credencial = 'El usuario o correo es obligatorio';
    if (!password)   e.password   = 'La contraseña es obligatoria';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  // Email no verificado (403): alert con mensaje del backend + botón para abrir Gmail.
  function mostrarAlertaNoVerificado(mensajeBackend) {
    mostrar({
      tipo: 'error',
      titulo: 'Confirma tu correo',
      mensaje: mensajeBackend || 'Debes confirmar tu correo electrónico antes de iniciar sesión.',
      icono: 'mail-outline',
      boton: 'Abrir Gmail',
      onConfirmar: () => {
        Linking.openURL('https://mail.google.com').catch(() => {});
      },
    });
  }

  // Bloqueo temporal por intentos fallidos (429): alert con minutos restantes.
  function mostrarAlertaBloqueo(minutosRestantes) {
    mostrar({
      tipo: 'error',
      titulo: 'Cuenta bloqueada temporalmente',
      mensaje: minutosRestantes
        ? `Demasiados intentos fallidos. Intenta de nuevo en ${minutosRestantes} minuto(s).`
        : 'Demasiados intentos fallidos. Intenta de nuevo más tarde.',
      icono: 'lock-closed-outline',
      boton: 'Entendido',
      onConfirmar: () => {},
    });
  }

  async function handleLogin() {
    if (!validar()) return;
    setCargando(true);
    setModoOffline('');
    const emailNorm = credencial.toLowerCase().trim();

    try {
      const resp = await intentarLoginServidor(emailNorm, password);

      // ── Servidor disponible y responde OK ──
      if (resp && resp.ok) {
        const datos = await resp.json();
        console.log('datos del servidor:', JSON.stringify(datos));
        await AsyncStorage.multiSet([
          ['token',    datos.token],
          ['email',    emailNorm],
          ['nombre',   datos.user?.nombre   || ''],
          ['rol',      datos.user?.rol      || 'optometrist'],
          ['telefono', datos.user?.telefono || ''],
            ['cedula',   datos.user?.cedula   || ''],

        ]);
        setToken(datos.token); // ← el navigator condicional redirige automáticamente
        return;
      }

      // ── Servidor responde con error ──
      if (resp && !resp.ok) {
        let d = {};
        try { d = await resp.json(); } catch {}

        // Email no verificado (Fase 4b)
        if (resp.status === 403) {
          mostrarAlertaNoVerificado(d.mensaje);
          return;
        }

        // Bloqueo temporal por intentos fallidos (Fase 4a)
        if (resp.status === 429) {
          mostrarAlertaBloqueo(d.minutosRestantes);
          return;
        }

        // Credenciales inválidas (401) u otro error — comportamiento original,
        // mostrando además los intentos restantes si el backend los envía,
        // para avisar al usuario antes de que llegue al bloqueo.
        let msg = d.error || 'Credenciales inválidas';
        if (typeof d.intentosRestantes === 'number') {
          msg += ` (te quedan ${d.intentosRestantes} intento${d.intentosRestantes === 1 ? '' : 's'} antes del bloqueo temporal)`;
        }
        setErrores({ general: msg });
        return;
      }

      // ── Sin servidor — intentar cuenta local ──
      const local = await loginLocal(emailNorm, password);
      if (local) {
        await AsyncStorage.multiSet([
          ['token',  local.token],
          ['email',  emailNorm],
          ['nombre', local.nombre],
        ]);
        setModoOffline('Modo offline — datos locales');
        setToken(local.token); // ← el navigator condicional redirige automáticamente
        return;
      }

      setErrores({ general: 'Servidor no disponible y no hay cuenta local. Verifica tu conexión o regístrate primero.' });
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[COLORES.gradienteInicio, COLORES.gradienteMedio, COLORES.gradienteFin]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.gradiente}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoExterno}>
              <View style={styles.logoInterno}>
                <Ionicons name="eye-outline" size={32} color="#fff" />
              </View>
            </View>
            <Text style={styles.titulo}>ATHENEA</Text>
            <Text style={styles.subtitulo}>Sistema de Optometría con IA</Text>
          </View>

          {/* Tarjeta */}
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaTitulo}>Iniciar sesión</Text>

            {/* Usuario */}
            <View style={styles.campo}>
              <View style={[styles.inputFila, errores.credencial && styles.inputError]}>
                <Ionicons name="person-outline" size={18} color={COLORES.mutedForeground} style={styles.inputIcono} />
                <TextInput
                  style={styles.input}
                  placeholder="Usuario o correo electrónico"
                  placeholderTextColor={COLORES.mutedForeground}
                  value={credencial}
                  onChangeText={(t) => { setCredencial(t); setErrores((e) => ({ ...e, credencial: '' })); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errores.credencial ? <Text style={styles.textoError}>{errores.credencial}</Text> : null}
            </View>

            {/* Contraseña */}
            <View style={styles.campo}>
              <View style={[styles.inputFila, errores.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORES.mutedForeground} style={styles.inputIcono} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Contraseña"
                  placeholderTextColor={COLORES.mutedForeground}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrores((e) => ({ ...e, password: '' })); }}
                  secureTextEntry={!verPass}
                />
                <TouchableOpacity onPress={() => setVerPass(!verPass)} style={styles.ojito}>
                  <Ionicons name={verPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORES.mutedForeground} />
                </TouchableOpacity>
              </View>
              {errores.password ? <Text style={styles.textoError}>{errores.password}</Text> : null}
            </View>

            {errores.general ? <Text style={styles.errorGeneral}>{errores.general}</Text> : null}

            {modoOffline ? (
              <View style={styles.offlineBanner}>
                <Ionicons name="wifi-outline" size={14} color={COLORES.advertencia} />
                <Text style={styles.offlineTexto}>{modoOffline}</Text>
              </View>
            ) : null}

            {/* Botón */}
            <TouchableOpacity
              style={[styles.boton, cargando && styles.botonDesactivado]}
              onPress={handleLogin}
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
                  : <Text style={styles.botonTexto}>Iniciar sesión</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkFila} onPress={() => navigation.navigate('Registro')}>
              <Text style={styles.linkTexto}>
                ¿No tienes cuenta?{' '}
                <Text style={styles.linkAccent}>Regístrate</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBarra}>
            <Ionicons name="shield-checkmark-outline" size={13} color="rgba(255,255,255,0.5)" />
            <Text style={styles.infoTexto}>v1.0.0 · Offline habilitado · Docker ready</Text>
          </View>
        </ScrollView>
      </LinearGradient>
      <AlertaPersonalizada />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1 },
  gradiente: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  logoArea:    { alignItems: 'center', marginBottom: 40 },
  logoExterno: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 20,
  },
  logoInterno: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  titulo:    { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: 8, marginBottom: 8 },
  subtitulo: { fontSize: 13, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.5, textAlign: 'center' },

  tarjeta: {
    backgroundColor: '#fff',
    borderRadius: 28, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  tarjetaTitulo: { fontSize: 22, fontWeight: '700', color: COLORES.foreground, marginBottom: 24 },

  campo:     { marginBottom: 16 },
  inputFila: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORES.borde,
    borderRadius: 14, backgroundColor: COLORES.muted,
  },
  inputIcono:  { paddingLeft: 14 },
  input: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 14,
    fontSize: 15, color: COLORES.foreground,
  },
  inputError:   { borderColor: COLORES.error },
  ojito:        { paddingHorizontal: 14 },
  textoError:   { color: COLORES.error, fontSize: 12, marginTop: 4, marginLeft: 4 },
  errorGeneral: { color: COLORES.error, fontSize: 13, textAlign: 'center', marginBottom: 12, lineHeight: 18 },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF8E1', borderRadius: 10,
    padding: 10, marginBottom: 10,
  },
  offlineTexto: { fontSize: 12, color: COLORES.advertencia, flex: 1 },

  boton:            { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  botonDesactivado: { opacity: 0.7 },
  botonGradiente:   { paddingVertical: 16, alignItems: 'center' },
  botonTexto:       { color: '#fff', fontSize: 16, fontWeight: '700' },

  linkFila:   { alignItems: 'center', marginTop: 20 },
  linkTexto:  { fontSize: 14, color: COLORES.mutedForeground },
  linkAccent: { color: COLORES.primario, fontWeight: '700' },

  infoBarra: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, marginTop: 24,
  },
  infoTexto: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)' },
});