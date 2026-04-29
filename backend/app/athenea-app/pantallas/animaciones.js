import React, { useEffect, useRef } from 'react';
import {
  View, Text, Animated, StyleSheet, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const opacidadLogo = useRef(new Animated.Value(0)).current;
  const escalaLogo = useRef(new Animated.Value(0.3)).current;
  const opacidadTexto = useRef(new Animated.Value(0)).current;
  const opacidadSub = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacidadLogo, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(escalaLogo, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacidadTexto, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(opacidadSub, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        navigation.replace('Login');
      }, 1200);
    });
  }, []);

  return (
    <LinearGradient
      colors={['#0A0F3C', '#1A237E', '#1565C0']}
      style={styles.contenedor}
    >
      <Animated.View style={[
        styles.logoContenedor,
        { opacity: opacidadLogo, transform: [{ scale: escalaLogo }] }
      ]}>
        <View style={styles.logoexterno}>
          <View style={styles.logointerno}>
            <View style={styles.pupila} />
          </View>
        </View>
      </Animated.View>

      <Animated.Text style={[styles.titulo, { opacity: opacidadTexto }]}>
        ATHENEA
      </Animated.Text>

      <Animated.Text style={[styles.subtitulo, { opacity: opacidadSub }]}>
        Sistema de Historias Clínicas{'\n'}Optométricas
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContenedor: {
    marginBottom: 32,
  },
  logoexterno: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logointerno: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  pupila: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 8,
    marginBottom: 12,
  },
  subtitulo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    letterSpacing: 1.5,
    lineHeight: 22,
  },
});