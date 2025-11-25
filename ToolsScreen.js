import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const ToolsScreen = () => {
  const [toolsData, setToolsData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadToolsData();
    const interval = setInterval(loadToolsData, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadToolsData = async () => {
    try {
      const response = await fetch('https://haas-backend-fyke.onrender.com/api/tools');
      const data = await response.json();
      setToolsData(data);
    } catch (error) {
      console.error('Failed to load tools data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadToolsData();
    setRefreshing(false);
  };

  const getLifeColor = (currentLife) => {
    if (currentLife > 50) return ['#10b981', '#34d399'];
    if (currentLife > 25) return ['#f59e0b', '#fbbf24'];
    return ['#ef4444', '#f87171'];
  };

  if (!toolsData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading tools data...</Text>
      </View>
    );
  }

  const { currentTool, tools } = toolsData;
  const activeTools = tools.filter(tool => tool.inUse);
  const criticalTools = activeTools.filter(tool => tool.currentLife < 25);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#8b5cf6', '#6366f1', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Tool Magazine</Text>
        <Text style={styles.headerSubtitle}>24 Tool Capacity</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.summaryGradient}
            >
              <Text style={styles.summaryValue}>{currentTool}</Text>
              <Text style={styles.summaryLabel}>Current Tool</Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.summaryGradient}
            >
              <Text style={styles.summaryValue}>{activeTools.length}</Text>
              <Text style={styles.summaryLabel}>Active Tools</Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={criticalTools.length > 0 ? ['#ef4444', '#dc2626'] : ['#6b7280', '#4b5563']}
              style={styles.summaryGradient}
            >
              <Text style={styles.summaryValue}>{criticalTools.length}</Text>
              <Text style={styles.summaryLabel}>Critical Wear</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Critical Tools Alert */}
        {criticalTools.length > 0 && (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <Text style={styles.alertTitle}>Tools Requiring Attention</Text>
            </View>
            {criticalTools.map(tool => (
              <View key={tool.toolNumber} style={styles.alertItem}>
                <View style={styles.alertBadge}>
                  <Text style={styles.alertBadgeText}>#{tool.toolNumber}</Text>
                </View>
                <Text style={styles.alertText}>
                  {tool.currentLife.toFixed(1)}% life remaining
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tools List */}
        <View style={styles.toolsList}>
          {tools.map(tool => {
            const isCurrentTool = tool.toolNumber === currentTool;
            const lifeColors = getLifeColor(tool.currentLife);
            
            return (
              <View
                key={tool.toolNumber}
                style={[
                  styles.toolCard,
                  isCurrentTool && styles.currentToolCard,
                  !tool.inUse && styles.emptyToolCard
                ]}
              >
                <View style={styles.toolHeader}>
                  <View style={styles.toolNumberBadge}>
                    <LinearGradient
                      colors={isCurrentTool ? ['#8b5cf6', '#7c3aed'] : ['#6b7280', '#4b5563']}
                      style={styles.toolNumberGradient}
                    >
                      <Text style={styles.toolNumber}>#{tool.toolNumber}</Text>
                    </LinearGradient>
                  </View>
                  
                  {isCurrentTool && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>IN USE</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.toolDescription}>{tool.description}</Text>

                {tool.inUse && (
                  <>
                    <View style={styles.toolSpecs}>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>Diameter</Text>
                        <Text style={styles.specValue}>Ø {tool.diameter}"</Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>Max Life</Text>
                        <Text style={styles.specValue}>{tool.maxLife}%</Text>
                      </View>
                    </View>

                    <View style={styles.lifeSection}>
                      <View style={styles.lifeHeader}>
                        <Text style={styles.lifeLabel}>Tool Life</Text>
                        <Text style={[styles.lifeValue, { color: lifeColors[0] }]}>
                          {tool.currentLife.toFixed(1)}%
                        </Text>
                      </View>
                      <View style={styles.lifeBarContainer}>
                        <LinearGradient
                          colors={lifeColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.lifeBar, { width: `${tool.currentLife}%` }]}
                        />
                      </View>
                    </View>

                    {tool.currentLife < 25 && (
                      <View style={[styles.warning, tool.currentLife < 10 && styles.criticalWarning]}>
                        <Text style={styles.warningText}>
                          {tool.currentLife < 10 ? '🔴 Replace immediately' : '⚠️ Replace soon'}
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {!tool.inUse && (
                  <Text style={styles.emptyText}>Empty Slot</Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    paddingHorizontal: 7.5,
    marginTop: 20,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 7.5,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryGradient: {
    padding: 20,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#fef2f2',
    marginHorizontal: 15,
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991b1b',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  alertBadgeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  alertText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  toolsList: {
    paddingHorizontal: 15,
    marginTop: 20,
  },
  toolCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  currentToolCard: {
    borderWidth: 2,
    borderColor: '#8b5cf6',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  emptyToolCard: {
    opacity: 0.5,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolNumberBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginRight: 10,
  },
  toolNumberGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  currentBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  toolDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  toolSpecs: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  specItem: {
    flex: 1,
  },
  specLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  lifeSection: {
    marginTop: 10,
  },
  lifeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lifeLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  lifeValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  lifeBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  lifeBar: {
    height: '100%',
    borderRadius: 4,
  },
  warning: {
    backgroundColor: '#fffbeb',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  criticalWarning: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#ef4444',
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 30,
  },
});

export default ToolsScreen;
