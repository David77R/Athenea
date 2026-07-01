import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import COLORES from '../constantes/colores';

const TIPOS = {
  exito: {
    icono:    'checkmark-circle',
    colores:  [COLORES.gradienteInicio, COLORES.gradienteMedio],
    colorBtn: COLORES.primario,
  },
  error: {
    icono:    'close-circle',
    colores:  ['#B71C1C', '#E53935'],
    colorBtn: COLORES.error,
  },
  confirmacion: {
    icono:    'alert-circle',
    colores:  [COLORES.oscuro, COLORES.gradienteMedio],
    colorBtn: COLORES.primario,
  },
};

export function useAlerta() {
  const [config,  setConfig]  = useState(null);
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacidad  = useRef(new Animated.Value(0)).current;

  const mostrar = useCallback((opciones) => {
    setConfig(opciones);
    setVisible(true);
    scaleAnim.setValue(0.85);
    opacidad.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      Animated.timing(opacidad,  { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  function cerrar(cb) {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
      Animated.timing(opacidad,  { toValue: 0,    duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setConfig(null);
      if (cb) cb();
    });
  }

  function AlertaPersonalizada() {
    if (!config) return null;
    const tipo   = TIPOS[config.tipo] || TIPOS.exito;
    const esConf = config.tipo === 'confirmacion';

    const iconoFinal = config.icono || tipo.icono;

    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={() => cerrar()}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.overlay}>
            <Animated.View style={[
              styles.caja,
              { transform: [{ scale: scaleAnim }], opacity: opacidad }
            ]}>
              <LinearGradient
                colors={tipo.colores}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.iconoCaja}
              >
                <Ionicons name={iconoFinal} size={38} color="#fff" />
              </LinearGradient>

              <Text style={styles.titulo}>{config.titulo}</Text>
              {config.mensaje ? <Text style={styles.mensaje}>{config.mensaje}</Text> : null}

              {esConf ? (
                <View style={styles.botonesConf}>
                  <TouchableOpacity
                    style={styles.btnCancelar}
                    onPress={() => cerrar(config.onCancelar)}
                  >
                    <Text style={styles.btnCancelarTexto}>{config.botonCancelar || 'Cancelar'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnConfirmar, { backgroundColor: tipo.colorBtn }]}
                    onPress={() => cerrar(config.onConfirmar)}
                  >
                    <Text style={styles.btnConfirmarTexto}>{config.botonConfirmar || 'Confirmar'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.btnUnico} onPress={() => cerrar(config.onConfirmar)}>
                  <LinearGradient
                    colors={tipo.colores}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.btnUnicoGrad}
                  >
                    <Text style={styles.btnUnicoTexto}>{config.boton || 'Entendido'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </Animated.View>
          </View>
        </BlurView>
      </Modal>
    );
  }

  return { mostrar, AlertaPersonalizada };
}

const styles = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  caja:      { width: '100%', backgroundColor: '#fff', borderRadius: 28, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 16 },
  iconoCaja: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  titulo:    { fontSize: 20, fontWeight: '800', color: COLORES.oscuro, textAlign: 'center', marginBottom: 8 },
  mensaje:   { fontSize: 14, color: COLORES.mutedForeground, textAlign: 'center', lineHeight: 22, marginBottom: 24 },

  btnUnico:          { width: '100%', borderRadius: 16, overflow: 'hidden' },
  btnUnicoGrad:      { paddingVertical: 15, alignItems: 'center' },
  btnUnicoTexto:     { color: '#fff', fontSize: 15, fontWeight: '700' },

  botonesConf:       { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  btnCancelar:       { flex: 1, borderWidth: 1.5, borderColor: COLORES.borde, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  btnCancelarTexto:  { color: COLORES.mutedForeground, fontWeight: '600', fontSize: 14 },
  btnConfirmar:      { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  btnConfirmarTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});