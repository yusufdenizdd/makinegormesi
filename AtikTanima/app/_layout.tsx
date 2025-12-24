import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#f4511e" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      {/* Ana Ekran Ayarı */}
      <Stack.Screen name="(tabs)" options={{ title: "Atık Tanıma Sistemi" }} />
      {/* Sonuç Ekranı Ayarı */}
      <Stack.Screen
        name="result"
        options={{ title: "Analiz Sonucu", presentation: "modal" }}
      />
    </Stack>
  );
}
