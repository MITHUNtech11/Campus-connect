/**
 * Navigation shell — the RN equivalent of frontend/src/App.tsx's <Shell/> plus
 * frontend/src/components/Navigation.tsx.
 *
 *   - Logged out  → an auth stack (Login / Signup), mirroring the web's
 *                   `!user ? <Login/> : <Navigate to="/"/>` route guards.
 *   - Logged in   → a bottom-tab navigator whose items are NAV_ITEMS filtered by
 *                   role (the Admin tab is admin-only, exactly as on the web),
 *                   wrapped in a stack so Profile/:id and Unauthorized can be
 *                   pushed over the tabs from anywhere.
 *   - Dashboard   → role-routed to Student/Teacher/Admin, the same switch
 *                   DashboardRouter() performs.
 *
 * Onboarding gating and the Copilot FAB live in App.tsx, one level up, because
 * both are overlays that must sit above every screen in this tree.
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  LayoutDashboard,
  Map as MapIcon,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/colors';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import StudentDashboardScreen from '../screens/StudentDashboardScreen';
import TeacherDashboardScreen from '../screens/TeacherDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import CommunityScreen from '../screens/CommunityScreen';
import MapHeatmapScreen from '../screens/MapHeatmapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UnauthorizedScreen from '../screens/UnauthorizedScreen';
import LogoutButton from '../components/LogoutButton';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/** Role-appropriate landing screen — port of App.tsx's DashboardRouter(). */
function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;
  // The onboarding modal covers the screen until this is true — skip mounting
  // the dashboard (and its data fetch) underneath it until then.
  if (!user.onboarding_completed) return null;
  if (user.role === 'admin') return <AdminDashboardScreen user={user} />;
  if (user.role === 'teacher') return <TeacherDashboardScreen user={user} />;
  return <StudentDashboardScreen user={user} />;
}

function AnnouncementsTab() {
  const { user } = useAuth();
  return user ? <AnnouncementsScreen user={user} /> : null;
}

function CommunityTab() {
  const { user } = useAuth();
  return user ? <CommunityScreen user={user} /> : null;
}

/** Admin console reached from the admin-only tab (web: the role-gated /admin route). */
function AdminTab() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role !== 'admin') return <UnauthorizedScreen />;
  return <AdminDashboardScreen user={user} />;
}

function MainTabs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.indigo700,
        tabBarInactiveTintColor: colors.slate400,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.slate200 },
        tabBarLabelStyle: { fontSize: 10 },
        headerStyle: { backgroundColor: colors.white },
        headerTitleStyle: { color: colors.slate900, fontWeight: '700' },
        headerRight: () => <LogoutButton />,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardRouter}
        options={{
          title: 'CampusConnect',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Announcements"
        component={AnnouncementsTab}
        options={{
          tabBarLabel: 'News',
          tabBarIcon: ({ color, size }) => <Megaphone size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityTab}
        options={{
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapHeatmapScreen}
        options={{
          title: 'Campus Map',
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => <MapIcon size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <UserIcon size={size} color={color} />,
        }}
      />
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminTab}
          options={{
            tabBarIcon: ({ color, size }) => <ShieldCheck size={size} color={color} />,
          }}
        />
      )}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator>
      {!user ? (
        <Stack.Group screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </Stack.Group>
      ) : (
        <>
          <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen
            name="Unauthorized"
            component={UnauthorizedScreen}
            options={{ title: 'Access restricted' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
