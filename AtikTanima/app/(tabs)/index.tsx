import React, { useState } from "react";
import {
  View,
  Button,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Fotoğraf Seçme Fonksiyonu
  const pickImage = async (mode: "camera" | "gallery") => {
    // İzin İste
    const permissionResult =
      mode === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.status !== "granted") {
      Alert.alert("İzin Gerekli", "Devam etmek için izin vermelisiniz.");
      return;
    }

    // Kamera veya Galeri Aç
    const result =
      mode === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, // Kırpmaya izin ver
            aspect: [1, 1], // Kare olsun
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };
  /*
  // MOCK ANALİZ (Backend gelene kadar bunu kullan)
  const handleAnalyzeMock = async () => {
    if (!imageUri) return;
    setIsLoading(true);

    // Sahte bekleme süresi (Backend'e gidiyormuş gibi)
    setTimeout(() => {
      setIsLoading(false);
      
      // MOCK DATA: Backend'in çizip gönderdiği resim (Örnek bir link)
      // Gerçekte buraya Base64 string gelecek.
      const mockResultImage = "https://i.imgur.com/CzXTtJV.jpg"; // Kedili bir örnek resim

      // Sonuç sayfasına git
      router.push({
        pathname: "/result",
        params: { resultImage: mockResultImage }
      });
    }, 2000);
  }; */
  /*
  // GERÇEK API FONKSİYONU
  const handleAnalyzeReal = async () => {
    if (!imageUri) return;
    setIsLoading(true);

    try {
      // 1. Form Data Hazırla
      const formData = new FormData();
      formData.append("image", {
        uri: imageUri,
        type: "image/jpeg",
        name: "test.jpg",
      } as any);

      // 2. İsteği Gönder (ARKADAŞININ IP'SİNE DİKKAT ET)
      // Telefonun ve bilgisayar aynı Wi-Fi'da olmalı!
      const response = await fetch("http://172.23.25.207:8000/api/predict", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = await response.json();

      if (data.success) {
        // 3. Sonuç Sayfasına Git (Gelen Base64 resmi parametre olarak at)
        router.push({
          pathname: "/result",
          params: { resultImage: data.result_image },
        });
      } else {
        alert("Hata: Backend işlemi başarısız.");
      }
    } catch (error) {
      console.error(error);
      alert(
        "Bağlantı Hatası! IP adresini ve sunucunun çalıştığını kontrol et."
      );
    } finally {
      setIsLoading(false);
    }
  };
*/
  // GERÇEK API FONKSİYONU (WEB + MOBİL UYUMLU)
  const handleAnalyzeReal = async () => {
    if (!imageUri) return;
    setIsLoading(true);

    try {
      const formData = new FormData();

      // --- KRİTİK DÜZELTME BURASI ---
      if (Platform.OS === "web") {
        // Web (Chrome) için: URI'yi Blob formatına çevirmeliyiz
        const res = await fetch(imageUri);
        const blob = await res.blob();
        formData.append("image", blob, "upload.jpg");
      } else {
        // Mobil (iOS/Android) için: Standart yöntem
        formData.append("image", {
          uri: imageUri,
          type: "image/jpeg",
          name: "upload.jpg",
        } as any);
      }
      // -----------------------------

      // IP Adresin (172.23.25.207) doğruydu, aynen kalsın.
      const response = await fetch("http://192.168.1.33:8000/api/predict", {
        method: "POST",
        body: formData,
        // Web'de 'Content-Type' header'ını MANUEL EKLEMEK GEREKMEZ, tarayıcı halleder.
        // O yüzden header kısmını siliyoruz veya sadece mobilde ekliyoruz.
        headers:
          Platform.OS === "web"
            ? {}
            : {
                "Content-Type": "multipart/form-data",
              },
      });

      // Backend'den JSON yerine hata mesajı dönerse yakalamak için:
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sunucu Hatası (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        router.push({
          pathname: "/result",
          params: { resultImage: data.result_image },
        });
      } else {
        alert("Hata: " + (data.error || "Bilinmeyen hata"));
      }
    } catch (error: any) {
      console.error("Detaylı Hata:", error);
      alert("İşlem Başarısız: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={{ color: "#888" }}>Fotoğraf Yok</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => pickImage("camera")}
        >
          <Text style={styles.buttonText}>📷 Fotoğraf Çek</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => pickImage("gallery")}
        >
          <Text style={styles.buttonText}>🖼 Galeriden Seç</Text>
        </TouchableOpacity>
      </View>

      {imageUri && !isLoading && (
        <TouchableOpacity
          style={[styles.button, styles.analyzeButton]}
          onPress={handleAnalyzeReal}
        >
          <Text style={styles.buttonText}>🚀 ANALİZ ET</Text>
        </TouchableOpacity>
      )}

      {isLoading && (
        <ActivityIndicator
          size="large"
          color="#f4511e"
          style={{ marginTop: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  previewImage: { width: 300, height: 300, borderRadius: 10, marginBottom: 20 },
  placeholder: {
    width: 300,
    height: 300,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRow: { flexDirection: "row", gap: 10, marginBottom: 15 },
  button: { backgroundColor: "#2196F3", padding: 15, borderRadius: 8 },
  analyzeButton: {
    backgroundColor: "#4CAF50",
    width: "100%",
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold" },
});
