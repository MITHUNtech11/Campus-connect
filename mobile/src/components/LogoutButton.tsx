/**
 * The log-out action from the web nav's avatar dropdown
 * (frontend/src/components/Navigation.tsx), reduced to a header button — a
 * hover dropdown has no touch equivalent, and everything else in that menu
 * (name, email, reputation, "View Profile", the nav mirror) is already reachable
 * from the Profile tab and the tab bar itself.
 */

import { Pressable, View } from 'react-native';
import { Text } from './Text';
import { LogOut } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/colors';

export default function LogoutButton() {
  const { logout } = useAuth();
  return (
    <Pressable onPress={() => logout()} hitSlop={8} className="px-3">
      <View className="flex-row items-center gap-1.5">
        <LogOut size={16} color={colors.red600} />
        <Text className="text-sm font-medium text-red-600">Log out</Text>
      </View>
    </Pressable>
  );
}
