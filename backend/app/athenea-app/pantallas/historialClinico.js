import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('athenea.db');

const TURQUESA = '#00BCD4';
const TURQUESA_DARK = '#0097A7';
const TURQUESA_LIGHT = '#E0F7FA';

export default function HistorialClinico({ navigation, route }) {
  const [historias, setHistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [pendientesSync, setPendientesSync] = useState(0);

  const cedula = route?.params?.cedula || null;

  const cargarHistorias = useCallback(async () => {
    try {
      let query = 'SELECT * FROM historias_clinicas ORDER BY fecha_creacion DESC';
      const params = [];

      if (cedula) {
        query = 'SELECT * FROM historias_clinicas WHERE cedula_paciente = ? ORDER BY fecha_creacion DESC';
        params.push(cedula);
      } else if (busqueda.trim()) {
        query =
          'SELECT * FROM historias_clinicas WHERE cedula_paciente LIKE ? OR nombre_paciente LIKE ? ORDER BY fecha_creacion DESC';
        const term = `%${busqueda.trim()}%`;
        params.push(term, term);
      }

      const result = db.getAllSync(query, params);
      setHistorias(result || []);

      const pendResult = db.getFirstSync(
        'SELECT COUNT(*) as total FROM historias_clinicas WHERE sincronizado = 0'
      );
      setPendientesSync(pendResult?.total || 0);
    } catch (error) {
      console.error('Error cargando historias:', error);
      Alert.alert('Error', 'No se pudo cargar el historial clínico');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cedula, busqueda]);

  useEffect(() => {
    cargarHistorias();
  }, [cargarHistorias]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', cargarHistorias);
    return unsubscribe;
  }, [navigation, cargarHistorias]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarHistorias();
  };

  const formatFecha = (fechaStr) => {
    if (!fechaStr) return 'Sin fecha';
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return fechaStr;
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('DetalleHistoria', { historia: item })}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.nombrePaciente}>{item.nombre_paciente || 'Paciente sin nombre'}</Text>
          <Text style={styles.cedulaPaciente}>C.I.: {item.cedula_paciente || '—'}</Text>
        </View>
        {item.sincronizado === 0 && (
          <View style={styles.badgePendiente}>
            <Text style={styles.badgeTexto}>PENDIENTE</Text>
          </View>
        )}
        {item.sincronizado === 1 && (
          <View style={styles.badgeSincronizado}>
            <Text style={styles.badgeTextoSync}>SYNC</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.diagnostico} numberOfLines={2}>
          {item.diagnostico || 'Sin diagnóstico registrado'}
        </Text>
        <View style={styles.avRow}>
          {item.av_od && (
            <Text style={styles.avText}>OD: {item.av_od}</Text>
          )}
          {item.av_oi && (
            <Text style={styles.avText}>OI: {item.av_oi}</Text>
          )}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.fechaText}>{formatFecha(item.fecha_creacion)}</Text>
        <Text style={styles.verMas}>Ver detalle →</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {pendientesSync > 0 && (
        <View style={styles.bannerSync}>
          <Text style={styles.bannerText}>
            {pendientesSync} historia{pendientesSync !== 1 ? 's' : ''} pendiente{pendientesSync !== 1 ? 's' : ''} de sincronizar
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Ajustes')}>
            <Text style={styles.bannerLink}>Sincronizar</Text>
          </TouchableOpacity>
        </View>
      )}
      {!cedula && (
        <View style={styles.buscadorContainer}>
          <TextInput
            style={styles.buscador}
            placeholder="Buscar por cédula o nombre..."
            placeholderTextColor="#90A4AE"
            value={busqueda}
            onChangeText={setBusqueda}
            onSubmitEditing={cargarHistorias}
            returnKeyType="search"
          />
        </View>
      )}
    </View>
  );

  const renderVacio = () => (
    <View style={styles.vacioCont}>
      <Text style={styles.vacioIcono}>📋</Text>
      <Text style={styles.vacioTitulo}>Sin historias clínicas</Text>
      <Text style={styles.vacioSub}>
        {cedula
          ? 'No hay consultas registradas para este paciente.'
          : 'Las consultas guardadas aparecerán aquí.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingCont}>
        <ActivityIndicator size="large" color={TURQUESA} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>
          {cedula ? `Historial · ${cedula}` : 'Historial Clínico'}
        </Text>
        <Text style={styles.headerSub}>{historias.length} registro{historias.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={historias}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderVacio}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TURQUESA} />}
        contentContainerStyle={historias.length === 0 ? styles.listaVacia : styles.lista}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: TURQUESA,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitulo: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },

  bannerSync: {
    backgroundColor: '#FFF9C4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9A825',
  },
  bannerText: { color: '#F57F17', fontSize: 13, flex: 1 },
  bannerLink: { color: TURQUESA_DARK, fontWeight: '700', fontSize: 13, marginLeft: 8 },

  buscadorContainer: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  buscador: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#263238',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  lista: { padding: 12 },
  listaVacia: { flexGrow: 1 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardInfo: { flex: 1 },
  nombrePaciente: { fontSize: 15, fontWeight: '700', color: '#263238' },
  cedulaPaciente: { fontSize: 12, color: '#78909C', marginTop: 2 },

  badgePendiente: {
    backgroundColor: '#FF6F00',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeTexto: { color: '#fff', fontSize: 10, fontWeight: '700' },
  badgeSincronizado: {
    backgroundColor: '#43A047',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeTextoSync: { color: '#fff', fontSize: 10, fontWeight: '700' },

  cardBody: { padding: 14, paddingTop: 10, paddingBottom: 8 },
  diagnostico: { fontSize: 13, color: '#546E7A', lineHeight: 18 },
  avRow: { flexDirection: 'row', marginTop: 6, gap: 12 },
  avText: { fontSize: 12, color: TURQUESA_DARK, fontWeight: '600' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: TURQUESA_LIGHT,
  },
  fechaText: { fontSize: 11, color: '#78909C' },
  verMas: { fontSize: 12, color: TURQUESA_DARK, fontWeight: '600' },

  vacioCont: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  vacioIcono: { fontSize: 52, marginBottom: 12 },
  vacioTitulo: { fontSize: 17, fontWeight: '700', color: '#455A64', marginBottom: 6 },
  vacioSub: { fontSize: 13, color: '#90A4AE', textAlign: 'center', lineHeight: 20 },

  loadingCont: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  loadingText: { marginTop: 12, color: '#78909C', fontSize: 14 },
});
