import type { NavigatorScreenParams } from '@react-navigation/native';

/** Bottom tabs — mirrors NAV_ITEMS in frontend/src/components/Navigation.tsx. */
export type TabParamList = {
  Dashboard: undefined;
  Announcements: undefined;
  Community: undefined;
  Map: undefined;
  ProfileTab: undefined;
  /** Admin-only, filtered by role exactly like NAV_ITEMS' `roles` field. */
  Admin: undefined;
};

export type RootStackParamList = {
  // Auth stack — shown when logged out (web: /login, /signup).
  Login: undefined;
  Signup: undefined;

  // Authenticated app.
  Tabs: NavigatorScreenParams<TabParamList>;
  /** Web: /profile/:id — someone else's profile pushed over the tabs. */
  Profile: { id?: string };
  Unauthorized: undefined;
};
