import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { CoachColors } from '@/constants/coach-theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { isOwner, isCoachMode } = useAuth();
  const router = useRouter();
  const notifChecked = useRef(false);

  useEffect(() => {
    if (notifChecked.current) return;
    notifChecked.current = true;
    AsyncStorage.getItem('fitora_owner_notification_asked').then((val) => {
      if (!val) router.push('/notification-permission' as never);
    });
  }, [router]);

  const coachTabBar = {
    backgroundColor: CoachColors.tabBar,
    borderTopColor: CoachColors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  };

  const ownerTabBar = {
    backgroundColor: colors.tabBar,
    borderTopWidth: 0,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isCoachMode ? CoachColors.tabBarActive : '#fff',
        tabBarInactiveTintColor: isCoachMode ? CoachColors.tabBarInactive : colors.tabBarInactive,
        tabBarStyle: isCoachMode ? coachTabBar : ownerTabBar,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isCoachMode ? 'Home' : 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isCoachMode ? 'home-outline' : 'grid-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          href: isCoachMode ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <CoachTabIcon
              focused={focused && isCoachMode}
              color={color}
              size={size}
              name="people"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: isCoachMode ? 'Training' : 'Schedule',
          href: isCoachMode ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <CoachTabIcon
              focused={focused && isCoachMode}
              color={color}
              size={size}
              name="calendar"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: isCoachMode ? 'Analytics' : 'Stats',
          href: isCoachMode || isOwner ? undefined : null,
          tabBarIcon: ({ color, size, focused }) =>
            isCoachMode ? (
              <CoachTabIcon focused={focused} color={color} size={size} name="stats-chart" />
            ) : (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: isCoachMode ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <CoachTabIcon
              focused={focused && isCoachMode}
              color={color}
              size={size}
              name="person"
            />
          ),
        }}
      />
      <Tabs.Screen name="attendance" options={{ href: null, title: 'Attendance' }} />
      <Tabs.Screen name="training" options={{ href: null, title: 'Batches' }} />
      <Tabs.Screen
        name="courts"
        options={{
          title: 'Courts',
          href: isOwner && !isCoachMode ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="tennisball-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          href: isOwner && !isCoachMode ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="notifications" options={{ href: null, title: 'Alerts' }} />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Settings',
          href: isOwner && !isCoachMode ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function CoachTabIcon({
  focused,
  color,
  size,
  name,
}: {
  focused: boolean;
  color: string;
  size: number;
  name: 'people' | 'calendar' | 'stats-chart' | 'person';
}) {
  const iconName = `${name}-outline` as keyof typeof Ionicons.glyphMap;
  if (!focused) {
    return <Ionicons name={iconName} size={size} color={color} />;
  }
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: CoachColors.primary,
        borderRadius: 12,
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
      }}
    >
      <Ionicons name={name} size={size - 2} color="#fff" />
    </View>
  );
}
