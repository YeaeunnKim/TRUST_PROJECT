import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import React, { useEffect } from "react";
import { View } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/src/context/auth-context";
import { DayRecordsProvider } from "@/src/context/day-records-context";
import { ProfileProvider } from "@/src/context/profile-context";
import { TimelineProvider } from "@/src/context/timeline-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: "#f8f0eb" }} />;
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <DayRecordsProvider>
          <TimelineProvider>
            <ProfileProvider>
              <AuthGate>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen
                    name="(modals)/learn"
                    options={{ presentation: "transparentModal" }}
                  />
                  <Stack.Screen
                    name="(modals)/learn-notepad"
                    options={{ presentation: "transparentModal", headerShown: false }}
                  />
                </Stack>
              </AuthGate>
              <StatusBar style="auto" />
            </ProfileProvider>
          </TimelineProvider>
        </DayRecordsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
