import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const ProfessionalDashboard = () => {
  const [machineData, setMachineData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState('haas_vf2');
  const [allMachines, setAllMachines] = useState([]);

  // Machine definitions
  const machines = [
    { id: 'haas_vf2', name: 'Haas VF-2', icon: '🔷' },
    { id: 'toyoda_hmc', name: 'Toyoda HMC', icon: '🔶' },
    { id: 'durma_press', name: 'Press Brake', icon: '🔨' },
    { id: 'cnc_lathe', name: 'CNC Lathe', icon: '⚙' },
    { id: 'fiber_laser', name: 'Fiber Laser', icon: '⚡' },
  ];

  useEffect(() => {
    loadMachineData();
    loadAllMachines();
    const interval = setInterval(() => {
      loadMachineData();
      loadAllMachines();
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedMachine]);

  const loadMachineData = async () => {
    try {
      const response = await fetch(`https://haas-backend-fyke.onrender.com/api/machines/${selectedMachine}`);
      const data = await response.json();
      
      // Transform to legacy format for compatibility
      const legacyData = {
        status: data.execution,
        model: data.name,
        serialNumber: data.id,
        data: {
          spindle: {
            speed: data.spindleSpeed,
            load: data.spindleLoad,
            temperature: data.temperature
          },
          axes: {
            x: {
              position: data.axisPositions.X,
              load: 20,
              temperature: data.temperature - 5
            },
            y: {
              position: data.axisPositions.Y,
              load: 20,
              temperature: data.temperature - 5
            },
            z: {
              position: data.axisPositions.Z,
              load: 20,
              temperature: data.temperature - 5
            }
          },
          feedRate: {
            current: data.feedRate,
            override: 100
          },
          partsCount: data.partCount,
          cycleTime: Math.floor(data.totalCycles * 120),
          powerOnTime: Math.floor(data.machineOnHours * 3600),
          currentTool: data.currentTool || 1,
          toolLife: data.tools || [],
          coolant: data.coolant || { level: 100, pressure: 50, temperature: 72 },
          alarms: data.alarm ? [{
            code: data.alarm,
            message: data.alarm.replace(/_/g, ' '),
            severity: 'CRITICAL'
          }] : [],
          programRunning: data.programRunning
        }
      };
      
      setMachineData(legacyData);
      setConnected(true);
    } catch (error) {
      console.error('Failed to load machine data:', error);
      setConnected(false);
    }
  };

  const loadAllMachines = async () => {
    try {
      const response = await fetch('https://haas-backend-fyke.onrender.com/api/machines');
      const data = await response.json();
      setAllMachines(data);
    } catch (error) {
      console.error('Failed to load all machines:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMachineData();
    setRefreshing(false);
  };

  if (!machineData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading CNC system...</Text>
      </View>
    );
  }

  const { data, status, model, serialNumber } = machineData;
  const hasAlarms = data.alarms?.length > 0;

  const getStatusColor = () => {
    switch (status) {
      case 'RUNNING': return '#45ffbc';
      case 'IDLE': return '#ffa500';
      case 'ALARM': return '#ff4444';
      default: return '#888';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>H</Text>
            </View>
            <View style={styles.logoText}>
              <Text style={styles.logoTitle}>HAAS</Text>
              <Text style={styles.logoSubtitle}>CNC Control</Text>
            </View>
          </View>
        </View>

        {/* Machine Selector */}
        <View style={styles.headerCenter}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.machineSelector}
          >
            {machines.map((machine) => (
              <TouchableOpacity
                key={machine.id}
                style={[
                  styles.machineButton,
                  selectedMachine === machine.id && styles.machineButtonActive
                ]}
                onPress={() => setSelectedMachine(machine.id)}
              >
                <Text style={styles.machineIcon}>{machine.icon}</Text>
                <Text style={[
                  styles.machineButtonText,
                  selectedMachine === machine.id && styles.machineButtonTextActive
                ]}>
                  {machine.name}
                </Text>
                {allMachines.find(m => m.id === machine.id)?.alarm && (
                  <View style={styles.machineAlarmDot} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: connected ? '#45ffbc' : '#ff4444' }]}>
            <View style={styles.statusDot} />
            <Text style={styles.statusBadgeText}>{connected ? 'ONLINE' : 'OFFLINE'}</Text>
          </View>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Spindle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Axes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Tools</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Alarms</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#45ffbc" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Machine Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Machine Status</Text>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Model</Text>
              <Text style={styles.infoValue}>{model}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Serial Number</Text>
              <Text style={styles.infoValue}>{serialNumber}</Text>
            </View>
            {data.programRunning && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Program</Text>
                <Text style={styles.infoValue}>{data.programRunning}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Alarms Section */}
        {hasAlarms && (
          <View style={[styles.card, styles.alarmCard]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, styles.alarmTitle]}>⚠ Active Alarms</Text>
              <View style={styles.alarmCount}>
                <Text style={styles.alarmCountText}>{data.alarms.length}</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              {data.alarms.map((alarm, index) => (
                <View key={index} style={styles.alarmItem}>
                  <View style={styles.alarmCode}>
                    <Text style={styles.alarmCodeText}>{alarm.code}</Text>
                  </View>
                  <View style={styles.alarmInfo}>
                    <Text style={styles.alarmMessage}>{alarm.message}</Text>
                    <Text style={styles.alarmSeverity}>{alarm.severity}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {/* Spindle Card */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>SPINDLE SPEED</Text>
              <Text style={styles.metricIcon}>⚙</Text>
            </View>
            <Text style={styles.metricValue}>{Math.round(data.spindle.speed)}</Text>
            <Text style={styles.metricUnit}>RPM</Text>
            <View style={styles.metricFooter}>
              <View style={styles.metricDetail}>
                <Text style={styles.metricDetailLabel}>Load</Text>
                <Text style={styles.metricDetailValue}>{data.spindle.load.toFixed(1)}%</Text>
              </View>
              <View style={styles.metricDetail}>
                <Text style={styles.metricDetailLabel}>Temp</Text>
                <Text style={styles.metricDetailValue}>{Math.round(data.spindle.temperature)}°F</Text>
              </View>
            </View>
          </View>

          {/* Feed Rate Card */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>FEED RATE</Text>
              <Text style={styles.metricIcon}>→</Text>
            </View>
            <Text style={styles.metricValue}>{Math.round(data.feedRate.current)}</Text>
            <Text style={styles.metricUnit}>in/min</Text>
            <View style={styles.metricFooter}>
              <View style={styles.metricDetail}>
                <Text style={styles.metricDetailLabel}>Override</Text>
                <Text style={styles.metricDetailValue}>{data.feedRate.override}%</Text>
              </View>
            </View>
          </View>

          {/* Parts Count Card */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>PARTS COUNT</Text>
              <Text style={styles.metricIcon}>📦</Text>
            </View>
            <Text style={styles.metricValue}>{data.partsCount}</Text>
            <Text style={styles.metricUnit}>pieces</Text>
            <View style={styles.metricFooter}>
              <View style={styles.metricDetail}>
                <Text style={styles.metricDetailLabel}>Cycle Time</Text>
                <Text style={styles.metricDetailValue}>
                  {Math.floor(data.cycleTime / 60)}:{(data.cycleTime % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            </View>
          </View>

          {/* Coolant Card */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>COOLANT</Text>
              <Text style={styles.metricIcon}>💧</Text>
            </View>
            <Text style={styles.metricValue}>{data.coolant.level.toFixed(0)}</Text>
            <Text style={styles.metricUnit}>%</Text>
            <View style={styles.metricFooter}>
              <View style={styles.metricDetail}>
                <Text style={styles.metricDetailLabel}>Pressure</Text>
                <Text style={styles.metricDetailValue}>{data.coolant.pressure} PSI</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Axes Position Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Axis Positions</Text>
          </View>
          <View style={styles.cardBody}>
            {Object.entries(data.axes).map(([axis, axisData]) => (
              <View key={axis} style={styles.axisRow}>
                <View style={styles.axisLabel}>
                  <Text style={styles.axisLabelText}>{axis.toUpperCase()}</Text>
                </View>
                <View style={styles.axisData}>
                  <Text style={styles.axisPosition}>{axisData.position.toFixed(4)}"</Text>
                  <View style={styles.axisMetrics}>
                    <Text style={styles.axisMetric}>Load: {axisData.load.toFixed(1)}%</Text>
                    <Text style={styles.axisMetric}>Temp: {Math.round(axisData.temperature)}°F</Text>
                  </View>
                </View>
                <View style={styles.axisProgress}>
                  <View style={[styles.axisProgressBar, { width: `${axisData.load}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Current Tool Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Active Tool</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.toolInfo}>
              <View style={styles.toolNumber}>
                <Text style={styles.toolNumberText}>T{data.currentTool}</Text>
              </View>
              <View style={styles.toolDetails}>
                <Text style={styles.toolName}>
                  {data.toolLife[data.currentTool - 1]?.description || 'N/A'}
                </Text>
                <Text style={styles.toolLife}>
                  Life Remaining: {data.toolLife[data.currentTool - 1]?.currentLife.toFixed(1) || 0}%
                </Text>
                <View style={styles.toolLifeBar}>
                  <View 
                    style={[
                      styles.toolLifeFill, 
                      { 
                        width: `${data.toolLife[data.currentTool - 1]?.currentLife || 0}%`,
                        backgroundColor: (data.toolLife[data.currentTool - 1]?.currentLife || 0) > 25 ? '#45ffbc' : '#ff4444'
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.2,
  },
  headerCenter: {
    flex: 0.6,
    paddingHorizontal: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.2,
    justifyContent: 'flex-end',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#45ffbc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  logoText: {
    marginLeft: 12,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
    marginRight: 6,
  },
  statusBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#45ffbc',
  },
  tabText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardBody: {
    padding: 16,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  infoLabel: {
    fontSize: 13,
    color: '#888',
  },
  infoValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  alarmCard: {
    borderColor: '#ff4444',
  },
  alarmTitle: {
    color: '#ff4444',
  },
  alarmCount: {
    backgroundColor: '#ff4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmCountText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  alarmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  alarmCode: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  alarmCodeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  alarmInfo: {
    flex: 1,
  },
  alarmMessage: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  alarmSeverity: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 7.5,
    marginTop: 15,
  },
  metricCard: {
    width: (width - 45) / 2,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 7.5,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    letterSpacing: 1,
  },
  metricIcon: {
    fontSize: 20,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#45ffbc',
    marginVertical: 4,
  },
  metricUnit: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  metricFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  metricDetail: {
    flex: 1,
  },
  metricDetailLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 2,
  },
  metricDetailValue: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  axisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  axisLabel: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  axisLabelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#45ffbc',
  },
  axisData: {
    flex: 1,
  },
  axisPosition: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  axisMetrics: {
    flexDirection: 'row',
  },
  axisMetric: {
    fontSize: 11,
    color: '#888',
    marginRight: 12,
  },
  axisProgress: {
    width: 60,
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  axisProgressBar: {
    height: '100%',
    backgroundColor: '#45ffbc',
  },
  toolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolNumber: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toolNumberText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#45ffbc',
  },
  toolDetails: {
    flex: 1,
  },
  toolName: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 4,
  },
  toolLife: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  toolLifeBar: {
    height: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  toolLifeFill: {
    height: '100%',
  },
  bottomSpacer: {
    height: 30,
  },
  machineSelector: {
    flexDirection: 'row',
  },
  machineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  machineButtonActive: {
    backgroundColor: '#45ffbc',
    borderColor: '#45ffbc',
  },
  machineIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  machineButtonText: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },
  machineButtonTextActive: {
    color: '#000',
  },
  machineAlarmDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff4444',
    marginLeft: 6,
  },
});

export default ProfessionalDashboard;