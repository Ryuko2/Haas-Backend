// App.js (React Native)
import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ModernDashboard from './ModernDashboard';
import ToolsScreen from './ToolsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#45ffbc',
          tabBarInactiveTintColor: '#888888',
          tabBarStyle: {
            backgroundColor: '#1a1a1a',
            borderTopWidth: 1,
            borderTopColor: '#2a2a2a',
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.5,
          },
        }}
      >
        <Tab.Screen
          name="Overview"
          component={ModernDashboard}
          options={{
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20 }}>📊</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Tools"
          component={ToolsScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20 }}>🔧</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
