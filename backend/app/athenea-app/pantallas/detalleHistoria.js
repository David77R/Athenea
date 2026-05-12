import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { obtenerHistoriaPorId } from '../baseDatosLite/basedatoslt';

export default function DetalleHistoriaScreen({ route, navigation }) {
  const { historiaId } = route.params;
  const [historia, setHistoria] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const fila = await obtenerHistoriaPorId(historiaId);
        if (fila) {
          let datos = {};
          try { datos = JSON.parse(fila.datos); } catch {}
          setHistoria({ ...fila, datos });
        }
      } catch (e) {
        console.error('Error cargando detalle:', e);
      } finally {
        setCargando(false);
      }
    })();
  }, [historiaId]);

  if (cargando) {
    return (
      <SafeAreaView style={styles.contenedor}>
        <ActivityIndicator size="large" color="#0B7B8B" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!historia) {
    return (
      <SafeAreaView style={styles.contenedor}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcono}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Detalle</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={styles.vacio}>No se encontró la historia</Text>
      </SafeAreaView>
    );
  }

  const { paciente = {}, anamnesis = {}, examen = {}, diagnostico = {} } = historia.datos;
  const pendiente = historia.sincronizado === 0;

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcono}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Detalle Historia</Text>
        <View style={pendiente ? styles.badgePendiente : styles.badgeSync}>
          <Text style={pendiente ? styles.badgePendienteTexto : styles.badgeSyncTexto}>
            {pendiente ? '⏳' : '✓'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contenido}>
        <Seccion titulo="Paciente">
          <Campo label="Nombre" valor={paciente.nombre} />
          <Campo label="Cédula" valor={paciente.cedula} />
          <Campo label="Edad" valor={paciente.edad} />
          <Campo label="Teléfono" valor={paciente.telefono} />
          <Campo label="Ocupación" valor={paciente.ocupacion} />
          <Campo label="N° Historia" valor={paciente.nroHistoria} />
          <Campo label="Fecha consulta" valor={paciente.fechaConsulta} />
        </Seccion>

        <Seccion titulo="Anamnesis">
          <Campo label="Motivo de consulta" valor={anamnesis.motivo} />
          <Campo label="Tiempo de evolución" valor={anamnesis.tiempoEvolucion} />
          <Campo label="Antecedentes oculares personales" valor={anamnesis.antOcularPersonal} />
          <Campo label="Antecedentes oculares familiares" valor={anamnesis.antOcularFamiliar} />
          <Campo label="Antecedentes médicos" valor={anamnesis.antMedicos} />
          <Campo label="Usa lentes" valor={anamnesis.usaLentes ? 'Sí' : 'No'} />
          {anamnesis.usaLentes && <Campo label="Tipo de lentes" valor={anamnesis.tipoLentes} />}
          <Campo label="Medicamentos" valor={anamnesis.medicamentos} />
        </Seccion>

        <Seccion titulo="Examen">
          <FilaODOI label="AVSC" od={examen.avscOD} oi={examen.avscOI} />
          <FilaODOI label="AVCC" od={examen.avccOD} oi={examen.avccOI} />
          <FilaODOI label="Esférico" od={examen.esfOD} oi={examen.esfOI} />
          <FilaODOI label="Cilíndrico" od={examen.cilOD} oi={examen.cilOI} />
          <FilaODOI label="Eje" od={examen.ejeOD} oi={examen.ejeOI} />
          <FilaODOI label="ADD" od={examen.addOD} oi={examen.addOI} />
          <FilaODOI label="PIO" od={examen.pioOD} oi={examen.pioOI} />
          <FilaODOI label="Ishihara" od={examen.ishaOD} oi={examen.ishaOI} />
        </Seccion>

        <Seccion titulo="Diagnóstico">
          <Campo label="Diagnóstico principal" valor={diagnostico.diagPrincipal} />
          <Campo label="Diagnóstico secundario" valor={diagnostico.diagSecundario} />
          <Campo label="Prescripción" valor={diagnostico.prescripcion} />
          <Campo label="Próxima cita" valor={diagnostico.proximaCita} />
          <Campo label="Observaciones" valor={diagnostico.observaciones} />
        </Seccion>
      </ScrollView>
    </SafeAreaView>
  );
}

function Seccion({ titulo, children }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

function Campo({ label, valor }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.campoLabel}>{label}</Text>
      <Text style={styles.campoValor}>{valor || '—'}</Text>
    </View>
  );
}

function FilaODOI({ label, od, oi }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaLabel}>{label}</Text>
      <View style={styles.filaOjo}>
        <Text style={styles.filaOjoLabelOD}>OD</Text>
        <Text style={styles.filaOjoValor}>{od || '—'}</Text>
      </View>
      <View style={styles.filaOjo}>
        <Text style={styles.filaOjoLabelOI}>OI</Text>
        <Text style={styles.filaOjoValor}>{oi || '—'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#EAF4F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0B7B8B', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 44,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  backIcono: { fontSize: 18, color: '#fff', fontWeight: '700' },
  headerTitulo: { fontSize: 17, fontWeight: '700', color: '#fff' },
  badgePendiente: { backgroundColor: '#FFF3E0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
  badgePendienteTexto: { fontSize: 12, color: '#E65100', fontWeight: '700' },
  badgeSync: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
  badgeSyncTexto: { fontSize: 12, color: '#fff', fontWeight: '700' },
  contenido: { padding: 16, paddingBottom: 40 },
  seccion: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#0B7B8B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  seccionTitulo: { fontSize: 15, fontWeight: '700', color: '#0B7B8B', marginBottom: 12 },
  campo: { marginBottom: 10 },
  campoLabel: { fontSize: 11, color: '#6A9BAB', fontWeight: '600', marginBottom: 2 },
  campoValor: { fontSize: 14, color: '#0D3B44' },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F0F9FA' },
  filaLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0D3B44' },
  filaOjo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filaOjoLabelOD: { fontSize: 11, fontWeight: '700', color: '#1565C0' },
  filaOjoLabelOI: { fontSize: 11, fontWeight: '700', color: '#C62828' },
  filaOjoValor: { fontSize: 13, color: '#0D3B44' },
  vacio: { textAlign: 'center', marginTop: 40, color: '#6A9BAB' },
});
