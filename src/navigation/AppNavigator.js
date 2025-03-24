import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import PropertyScreen from '../screens/PropertyScreen';
import AddPropertyScreen from '../screens/AddPropertyScreen';

const Stack = createStackNavigator();

// Authentication Stack Navigator
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
};

// Main App Stack Navigator
const AppStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="PropertyDetail" component={PropertyScreen} />
      <Stack.Screen name="AddProperty" component={AddPropertyScreen} />
    </Stack.Navigator>
  );
};

// Root Navigator that switches between Auth and App stacks
const AppNavigator = ({ user }) => {
  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator; 