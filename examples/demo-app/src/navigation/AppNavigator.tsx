import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import LoginScreen from '../screens/Login/LoginScreen';
import ClaimListScreen from '../screens/ClaimList/ClaimListScreen';
import ClaimInspectionScreen from '../screens/ClaimInspection/ClaimInspectionScreen';

const Stack = createStackNavigator();

export const ROUTES = {
  LOGIN: 'LOGIN_SCREEN',
  CLAIM_LIST: 'CLAIM_LIST_SCREEN',
  CLAIM_INSPECTION: 'CLAIM_INSPECTION_SCREEN',
};

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.CLAIM_LIST} component={ClaimListScreen} />
      <Stack.Screen name={ROUTES.CLAIM_INSPECTION} component={ClaimInspectionScreen} />
    </Stack.Navigator>
  );
}
