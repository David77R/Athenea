import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
  Platform, StatusBar, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import CONFIG from '../config';
import COLORES from '../constantes/colores';

export default function GrabacionScreen({ navigation }) {
  const [grabando,            setGrabando]            = useState(false);
  const [procesando,          setProcesando]          = useState(false);
  const [textoTranscrito,     setTextoTranscrito]     = useState('');
  const [duracion,            setDuracion]            = useState(0);
  const [grabacionFinalizada, setGrabacionFinalizada] = useState(false);
  const [etapaProceso,        setEtapaProceso]        = useState(''); // 'transcribiendo' | 'estructurando'

  const grabacionRef = useRef(null);
  const intervalRef  = useRef(null);
  const pulsoAnim    = useRef(new Animated.Value(1)).current;

  // ─── Animación de pulso mientras graba ──────────────────────────────────
  function iniciarPulso() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulsoAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulsoAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }

  function detenerPulso() {
    pulsoAnim.stopAnimation();
    Animated.timing(pulsoAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }

  // ─── Iniciar grabación ──────────────────────────────────────────────────
  async function iniciarGrabacion() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesita permitir el acceso al micrófono.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      grabacionRef.current = recording;
      setGrabando(true);
      setTextoTranscrito('');
      setGrabacionFinalizada(false);
      setDuracion(0);
      iniciarPulso();

      intervalRef.current = setInterval(() => setDuracion((d) => d + 1), 1000);
    } catch {
      Alert.alert('Error', 'No se pudo iniciar la grabación.');
    }
  }

  // ─── Detener y transcribir ──────────────────────────────────────────────
  async function detenerGrabacion() {
    try {
      clearInterval(intervalRef.current);
      detenerPulso();
      setGrabando(false);
      setGrabacionFinalizada(true);
      setProcesando(true);
      setEtapaProceso('transcribiendo');

      await grabacionRef.current.stopAndUnloadAsync();
      const uri = grabacionRef.current.getURI();

      const formData = new FormData();
      formData.append('audio', { uri, name: 'grabacion.m4a', type: 'audio/m4a' });

      const resp = await fetch(`${CONFIG.IA_URL}/transcribir`, {
        method: 'POST',
        body: formData,
      });

      if (resp.ok) {
        const datos = await resp.json();
        setTextoTranscrito(datos.texto || 'No se detectó texto.');
      } else {
        setTextoTranscrito('Error al transcribir. Intente de nuevo.');
      }
    } catch {
      Alert.alert(
        'Servidor no disponible',
        'Athenea sigue despertándose...\n¿Deseas registrar la historia manualmente?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Registro manual', onPress: () => navigation.navigate('Formulario') },
        ]
      );
    } finally {
      setProcesando(false);
      setEtapaProceso('');
    }
  }

  // ─── Enviar a /structure y navegar al formulario ─────────────────────────
  async function usarTexto() {
    if (!textoTranscrito) return;
    setProcesando(true);
    setEtapaProceso('estructurando');
    try {
      const resp = await fetch(`${CONFIG.IA_URL}/structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: textoTranscrito }),
      });

      if (resp.ok) {
        const datosIA = await resp.json();
        navigation.navigate('Formulario', { textoIA: textoTranscrito, datosIA });
      } else {
        // Sin datos de IA pero igualmente navega con el texto
        navigation.navigate('Formulario', { textoIA: textoTranscrito });
      }
    } catch {
      // Sin conexión: navega igual, el especialista completa manualmente
      navigation.navigate('Formulario', { textoIA: textoTranscrito });
    } finally {
      setProcesando(false);
      setEtapaProceso('');
    }
  }

  function formatearTiempo(seg) {
    const m = Math.floor(seg / 60).toString().padStart(2, '0');
    const s = (seg % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function reiniciar() {
    setTextoTranscrito('');
    setGrabacionFinalizada(false);
    setDuracion(0);
  }

  const paddingTop = Platform.OS === 'android' ? 48 : 60;

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
            <Text style={styles.headerTitulo}>Registro por Voz</Text>
            <Text style={styles.headerSub}>Athenea voz especialista</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Área de grabación */}
        <View style={styles.tarjeta}>
          <Animated.View style={[styles.circuloExterno, grabando && styles.circuloExternoActivo, { transform: [{ scale: pulsoAnim }] }]}>
            <View style={[styles.circuloInterno, grabando && styles.circuloInternoActivo]}>
              <Ionicons
                name={grabando ? 'mic' : 'mic-outline'}
                size={48}
                color={grabando ? '#fff' : COLORES.primario}
              />
              {grabando && (
                <Text style={styles.tiempoTexto}>{formatearTiempo(duracion)}</Text>
              )}
            </View>
          </Animated.View>

          <Text style={styles.estadoTexto}>
            {grabando
              ? 'Grabando... habla claramente'
              : procesando && etapaProceso === 'transcribiendo'
              ? 'Athenea transcribiendo el audio...'
              : procesando && etapaProceso === 'estructurando'
              ? 'Estructurando los datos...'
              : grabacionFinalizada && textoTranscrito
              ? 'Transcripción lista ✓'
              : grabacionFinalizada
              ? 'Grabación finalizada'
              : 'Presiona el botón para iniciar'}
          </Text>

          {procesando ? (
            <View style={styles.cargandoCaja}>
              <ActivityIndicator color={COLORES.primario} size="large" />
              <Text style={styles.cargandoTexto}>
                {etapaProceso === 'transcribiendo' ? 'Athenea está pensando :)' : 'Enseguida le genero resultados...'}
              </Text>
            </View>
          ) : !grabacionFinalizada ? (
            <TouchableOpacity
              style={[styles.btnGrabar, grabando && styles.btnDetener]}
              onPress={grabando ? detenerGrabacion : iniciarGrabacion}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={grabando ? [COLORES.error, '#B71C1C'] : [COLORES.primario, COLORES.gradienteFin]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.btnGrabarGradiente}
              >
                <Ionicons name={grabando ? 'stop' : 'mic'} size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnGrabarTexto}>
                  {grabando ? 'Finalizar grabación' : 'Iniciar grabación'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Resultado de transcripción */}
        {textoTranscrito ? (
          <View style={styles.tarjeta}>
            <View style={styles.resultadoHeader}>
              <Ionicons name="document-text-outline" size={18} color={COLORES.primario} />
              <Text style={styles.resultadoTitulo}>Texto transcrito</Text>
            </View>
            <View style={styles.resultadoCaja}>
              <Text style={styles.resultadoTexto}>{textoTranscrito}</Text>
            </View>

            <TouchableOpacity
              style={styles.btnUsar}
              onPress={usarTexto}
              disabled={procesando}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORES.primario, COLORES.gradienteFin]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.btnUsarGradiente}
              >
                {procesando
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.btnUsarTexto}>Rellenar formulario</Text>
                    </>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnReintentar} onPress={reiniciar}>
              <Ionicons name="refresh" size={16} color={COLORES.primario} style={{ marginRight: 6 }} />
              <Text style={styles.btnReintentarTexto}>Grabar de nuevo</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Consejos */}
        <View style={styles.tarjetaConsejos}>
          <View style={styles.consejosHeader}>
            <Ionicons name="bulb-outline" size={16} color={COLORES.advertencia} />
            <Text style={styles.consejosTitle}>Consejos para mejores resultados</Text>
          </View>
          {[
            'Mencione nombre y cédula del paciente',
            'Dicte el motivo de consulta claramente',
            'Diga "ojo derecho" u "ojo izquierdo" antes de cada valor',
            'Para refracción: "esférico ojo derecho menos uno punto cinco"',
            'Para agudeza: "veinte cuarenta" equivale a 20/40',
            'Voz clara y precisa',
          ].map((c, i) => (
            <View key={i} style={styles.consejoFila}>
              <View style={styles.consejoPunto} />
              <Text style={styles.consejoTexto}>{c}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz:   { flex: 1, backgroundColor: COLORES.fondo },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerFila:   { flexDirection: 'row', alignItems: 'center' },
  backBtn:      { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerCentro: { flex: 1, alignItems: 'center' },
  headerTitulo: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub:    { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  scroll: { padding: 16, paddingBottom: 60 },

  tarjeta: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    marginBottom: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },

  circuloExterno: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: COLORES.secundario,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, borderWidth: 3, borderColor: COLORES.borde,
  },
  circuloExternoActivo: { backgroundColor: '#FFEBEE', borderColor: COLORES.error },
  circuloInterno: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: COLORES.muted,
    justifyContent: 'center', alignItems: 'center',
  },
  circuloInternoActivo: { backgroundColor: COLORES.error },

  tiempoTexto:  { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 4 },
  estadoTexto:  { fontSize: 14, color: COLORES.mutedForeground, textAlign: 'center', marginBottom: 20 },

  cargandoCaja:  { alignItems: 'center', gap: 10 },
  cargandoTexto: { color: COLORES.primario, fontSize: 14, fontWeight: '600' },

  btnGrabar:         { borderRadius: 16, overflow: 'hidden', width: '100%' },
  btnDetener:        {},
  btnGrabarGradiente: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  btnGrabarTexto:    { color: '#fff', fontSize: 15, fontWeight: '700' },

  resultadoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 12 },
  resultadoTitulo: { fontSize: 15, fontWeight: '700', color: COLORES.oscuro },
  resultadoCaja:   { backgroundColor: COLORES.muted, borderRadius: 14, padding: 14, width: '100%', marginBottom: 16 },
  resultadoTexto:  { fontSize: 14, color: COLORES.foreground, lineHeight: 22 },

  btnUsar:          { borderRadius: 14, overflow: 'hidden', width: '100%', marginBottom: 10 },
  btnUsarGradiente: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
  btnUsarTexto:     { color: '#fff', fontSize: 15, fontWeight: '700' },

  btnReintentar:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORES.primario, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  btnReintentarTexto: { color: COLORES.primario, fontSize: 14, fontWeight: '600' },

  tarjetaConsejos: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  consejosHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  consejosTitle:   { fontSize: 14, fontWeight: '700', color: COLORES.oscuro },
  consejoFila:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  consejoPunto:    { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORES.primario, marginTop: 6 },
  consejoTexto:    { flex: 1, fontSize: 13, color: COLORES.mutedForeground, lineHeight: 20 },
});
