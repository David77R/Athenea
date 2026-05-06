import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { Audio } from 'expo-av';
import Voice from '@react-native-voice/voice';
import CONFIG from '../config';

export default function GrabacionScreen({ navigation }) {
  const [grabando, setGrabando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [textoTranscrito, setTextoTranscrito] = useState('');
  const [textoEnVivo, setTextoEnVivo] = useState('');
  const [duracion, setDuracion] = useState(0);
  const [grabacionFinalizada, setGrabacionFinalizada] = useState(false);
  const grabacionRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      if (e.value && e.value[0]) {
        setTextoEnVivo(e.value[0]);
      }
    };
    Voice.onSpeechPartialResults = (e) => {
      if (e.value && e.value[0]) {
        setTextoEnVivo(e.value[0]);
      }
    };
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  async function iniciarGrabacion() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitas permitir el acceso al micrófono');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      grabacionRef.current = recording;
      setGrabando(true);
      setTextoTranscrito('');
      setTextoEnVivo('');
      setGrabacionFinalizada(false);
      setDuracion(0);

      intervalRef.current = setInterval(() => {
        setDuracion((d) => d + 1);
      }, 1000);

      // Iniciar reconocimiento en vivo
      await Voice.start('es-ES');

    } catch (e) {
      console.error('Error al grabar:', e);
      Alert.alert('Error', 'No se pudo iniciar la grabación');
    }
  }

  async function detenerGrabacion() {
    try {
      clearInterval(intervalRef.current);
      setGrabando(false);
      setGrabacionFinalizada(true);
      setProcesando(true);

      // Detener reconocimiento en vivo
      await Voice.stop();

      await grabacionRef.current.stopAndUnloadAsync();
      const uri = grabacionRef.current.getURI();

      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'grabacion.m4a',
        type: 'audio/m4a',
      });

      const respuesta = await fetch(`${CONFIG.IA_URL}/transcribir`, {
        method: 'POST',
        body: formData,
      });

      if (respuesta.ok) {
        const datos = await respuesta.json();
        setTextoTranscrito(datos.texto || textoEnVivo || 'No se detectó texto');
      } else {
        setTextoTranscrito(textoEnVivo || 'Error al transcribir');
      }

    } catch (e) {
      console.error('Error al detener:', e);
      setTextoTranscrito(textoEnVivo || 'Sin conexión al servidor');
    } finally {
      setProcesando(false);
    }
  }

  function formatearTiempo(segundos) {
    const m = Math.floor(segundos / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  async function usarTexto() {
    if (!textoTranscrito) {
      Alert.alert('Sin texto', 'Primero graba y transcribe el audio');
      return;
    }

    setProcesando(true);
    try {
      // Enviar al ia-service para estructurar en campos clínicos
      const respuesta = await fetch(`${CONFIG.IA_URL}/structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: textoTranscrito }),
      });

      if (respuesta.ok) {
        const datos = await respuesta.json();
        navigation.navigate('Formulario', {
          textoIA: textoTranscrito,
          datosIA: datos,
        });
      } else {
        navigation.navigate('Formulario', { textoIA: textoTranscrito });
      }
    } catch (e) {
      navigation.navigate('Formulario', { textoIA: textoTranscrito });
    } finally {
      setProcesando(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.volver}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>Registro por Voz</Text>
          <Text style={styles.subtitulo}>IA Offline · Vosk</Text>
        </View>

        <View style={styles.areaGrabacion}>
          <View style={[styles.circulo, grabando && styles.circuloActivo]}>
            <Text style={styles.microIcono}>🎙️</Text>
            {grabando && (
              <Text style={styles.tiempoTexto}>{formatearTiempo(duracion)}</Text>
            )}
          </View>

          {grabando ? (
            <Text style={styles.estadoTexto}>Grabando... habla claramente</Text>
          ) : procesando ? (
            <Text style={styles.estadoTexto}>Procesando con Vosk...</Text>
          ) : grabacionFinalizada && !textoTranscrito ? (
            <Text style={styles.estadoTexto}>Grabación finalizada</Text>
          ) : (
            <Text style={styles.estadoTexto}>Presiona para iniciar la grabación</Text>
          )}

          {/* Transcripción en vivo */}
          {grabando && textoEnVivo ? (
            <View style={styles.enVivoContainer}>
              <Text style={styles.enVivoLabel}>🔴 EN VIVO</Text>
              <Text style={styles.enVivoTexto}>{textoEnVivo}</Text>
            </View>
          ) : null}

          {!procesando && !grabacionFinalizada && (
            <TouchableOpacity
              style={[styles.botonGrabar, grabando && styles.botonDetener]}
              onPress={grabando ? detenerGrabacion : iniciarGrabacion}
              activeOpacity={0.85}
            >
              <Text style={styles.botonTexto}>
                {grabando ? '⏹ Finalizar grabación' : '⏺ Iniciar grabación'}
              </Text>
            </TouchableOpacity>
          )}

          {grabacionFinalizada && !procesando && !textoTranscrito && (
            <View style={styles.finalizadoContainer}>
              <Text style={styles.finalizadoTexto}>
                ✅ Grabación finalizada
              </Text>
            </View>
          )}

          {procesando && (
            <View style={styles.procesandoContainer}>
              <ActivityIndicator color="#1A237E" size="large" />
              <Text style={styles.procesandoTexto}>
                {grabacionFinalizada ? 'Vosk está transcribiendo...' : 'Estructurando con IA...'}
              </Text>
            </View>
          )}
        </View>

        {textoTranscrito ? (
          <View style={styles.resultado}>
            <Text style={styles.resultadoTitulo}>📝 Texto transcrito</Text>
            <Text style={styles.resultadoTexto}>{textoTranscrito}</Text>

            <TouchableOpacity
              style={styles.botonUsar}
              onPress={usarTexto}
              disabled={procesando}
              activeOpacity={0.85}
            >
              {procesando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.botonUsarTexto}>✨ Rellenar formulario con IA →</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonReintentar}
              onPress={() => {
                setTextoTranscrito('');
                setTextoEnVivo('');
                setGrabacionFinalizada(false);
                setDuracion(0);
              }}
            >
              <Text style={styles.botonReintentarTexto}>Grabar de nuevo</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.instrucciones}>
          <Text style={styles.instruccionesTitulo}>💡 Consejos</Text>
          <Text style={styles.instruccionesTexto}>
            • Menciona nombre y cédula del paciente{'\n'}
            • Dicta el motivo de consulta claramente{'\n'}
            • Menciona "miopía", "astigmatismo" o "hipermetropía"{'\n'}
            • Funciona sin conexión a internet
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#F0F4FF' },
  header: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 24, paddingVertical: 20, paddingTop: 40,
  },
  volver: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 },
  titulo: { color: '#fff', fontSize: 20, fontWeight: '700' },
  subtitulo: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  areaGrabacion: {
    alignItems: 'center', padding: 32,
    backgroundColor: '#fff', margin: 16, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  circulo: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#E8EAF6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  circuloActivo: {
    backgroundColor: '#FFEBEE', borderWidth: 3, borderColor: '#E53935',
  },
  microIcono: { fontSize: 48 },
  tiempoTexto: { fontSize: 14, fontWeight: '700', color: '#E53935', marginTop: 4 },
  estadoTexto: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 16 },
  enVivoContainer: {
    backgroundColor: '#FFF3E0', borderRadius: 12, padding: 12,
    width: '100%', marginBottom: 16,
  },
  enVivoLabel: { fontSize: 11, fontWeight: '700', color: '#E53935', marginBottom: 4 },
  enVivoTexto: { fontSize: 13, color: '#333', lineHeight: 20 },
  botonGrabar: {
    backgroundColor: '#1A237E', borderRadius: 12,
    padding: 16, paddingHorizontal: 32,
  },
  botonDetener: { backgroundColor: '#E53935' },
  botonTexto: { color: '#fff', fontSize: 15, fontWeight: '600' },
  procesandoContainer: { alignItems: 'center' },
  procesandoTexto: { color: '#1A237E', fontSize: 14, marginTop: 12 },
  finalizadoContainer: {
    backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  finalizadoTexto: { color: '#2E7D32', fontSize: 14, fontWeight: '600' },
  resultado: {
    backgroundColor: '#fff', margin: 16, marginTop: 0,
    borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  resultadoTitulo: { fontSize: 15, fontWeight: '700', color: '#1A237E', marginBottom: 12 },
  resultadoTexto: {
    fontSize: 14, color: '#333', lineHeight: 22, marginBottom: 16,
    backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8,
  },
  botonUsar: {
    backgroundColor: '#1A237E', borderRadius: 12,
    padding: 14, alignItems: 'center', marginBottom: 8,
  },
  botonUsarTexto: { color: '#fff', fontSize: 15, fontWeight: '600' },
  botonReintentar: {
    borderWidth: 1, borderColor: '#1A237E',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  botonReintentarTexto: { color: '#1A237E', fontSize: 14 },
  instrucciones: {
    backgroundColor: '#E8EAF6', margin: 16, marginTop: 0, borderRadius: 16, padding: 20,
  },
  instruccionesTitulo: { fontSize: 14, fontWeight: '700', color: '#1A237E', marginBottom: 8 },
  instruccionesTexto: { fontSize: 13, color: '#555', lineHeight: 22 },
});