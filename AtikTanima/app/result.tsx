import React from "react";
import { View, Image, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function ResultScreen() {
  const { resultImage } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analiz Tamamlandı!</Text>

      {/* GÜNCELLENMİŞ RESİM GÖSTERİMİ */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: resultImage as string }}
          style={styles.resultImage}
          resizeMode="contain"
        />
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Yeni Fotoğraf Çek</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20, color: "#333" },
  imageContainer: {
    width: "100%",
    aspectRatio: 1, // Kare alan ayır
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0", // Resim yüklenmezse gri görünsün
    borderRadius: 10,
    overflow: "hidden",
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#f4511e",
    borderRadius: 8,
    width: "80%",
    alignItems: "center",
  },
  backButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
