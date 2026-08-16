/** Port of frontend/src/pages/Unauthorized.tsx. */

import { View } from 'react-native';
import { Text } from '../components/Text';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ShieldAlert } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';
import { colors } from '../lib/colors';
import type { RootStackParamList } from '../navigation/types';

export default function UnauthorizedScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View className="flex-1 bg-slate-50 items-center justify-center p-4">
      <View className="w-full bg-white rounded-3xl border border-slate-200 p-8 items-center">
        <View className="w-16 h-16 rounded-2xl bg-red-50 items-center justify-center mb-6">
          <ShieldAlert size={30} color={colors.red600} />
        </View>

        <Text className="text-2xl font-bold text-slate-900 mb-2">Access restricted</Text>
        <Text className="text-slate-500 leading-relaxed mb-8 text-center">
          {user
            ? `Your account is signed in as a ${user.role}, which doesn't have permission to open this page.`
            : 'You need to be signed in to view this page.'}
        </Text>

        <Button
          label="Back to dashboard"
          variant="dark"
          icon={<ArrowLeft size={16} color={colors.white} />}
          onPress={() => navigation.navigate('Tabs', { screen: 'Dashboard' })}
        />
      </View>
    </View>
  );
}
