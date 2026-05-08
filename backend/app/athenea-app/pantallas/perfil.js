import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PerfilScreen() {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.texto}>Mi Perfil</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  texto: { fontSize: 20, fontWeight: '700', color: '#1A237E' },
});