from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import tensorflow as tf
import base64

app = Flask(__name__)
CORS(app)

# --- AYARLAR ---
MODEL_PATH = "modelim.tflite"
CONFIDENCE_THRESHOLD = 0.40
NMS_THRESHOLD = 0.45


def get_display_info(class_id):
    if class_id == 0:
        return "CAM", (0, 255, 0)
    elif class_id == 1:
        return "KAGIT", (255, 0, 0)
    elif class_id == 2:
        return "METAL", (192, 192, 192)
    elif class_id == 3:
        return "ORGANIK", (42, 42, 165)
    elif class_id == 4:
        return "PLASTIK", (0, 255, 255)
    else:
        return f"TANIMSIZ ({class_id})", (0, 0, 255)


print("Model yukleniyor...")
try:
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    input_shape = input_details[0]["shape"]
    print("Model basariyla yuklendi.")
except Exception as e:
    print(f"MODEL YUKLEME HATASI: {e}")


@app.route("/api/predict", methods=["POST"])
def predict():
    try:
        if "image" not in request.files:
            return jsonify({"success": False, "error": "Resim yok"}), 400

        file = request.files["image"]
        npimg = np.frombuffer(file.read(), np.uint8)
        original_img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        h_orig, w_orig, _ = original_img.shape

        # Model Hazırlığı
        rgb_img = cv2.cvtColor(original_img, cv2.COLOR_BGR2RGB)
        target_width = input_shape[1]
        target_height = input_shape[2]
        resized_img = cv2.resize(rgb_img, (target_width, target_height))

        input_data = np.expand_dims(resized_img, axis=0).astype(np.float32) / 255.0

        # Tahmin
        interpreter.set_tensor(input_details[0]["index"], input_data)
        interpreter.invoke()
        output_data = interpreter.get_tensor(output_details[0]["index"])[0]
        output_data = output_data.transpose()

        # Listeler
        boxes = []
        confidences = []
        class_ids = []

        # 1. ADIM: Eşik Geçenleri Topla
        for row in output_data:
            classes_scores = row[4:]
            class_id = np.argmax(classes_scores)
            score = classes_scores[class_id]

            if score > CONFIDENCE_THRESHOLD:
                x_center, y_center, w, h = row[0:4]

                if x_center < 1.0:
                    x_center *= target_width
                    y_center *= target_height
                    w *= target_width
                    h *= target_height

                x_factor = w_orig / target_width
                y_factor = h_orig / target_height

                x_min = int((x_center - w / 2) * x_factor)
                y_min = int((y_center - h / 2) * y_factor)
                w_pixel = int(w * x_factor)
                h_pixel = int(h * y_factor)

                boxes.append([x_min, y_min, w_pixel, h_pixel])
                confidences.append(float(score))
                class_ids.append(class_id)

        # 2. ADIM: NMS Uygula
        if len(boxes) > 0:
            indices = cv2.dnn.NMSBoxes(
                boxes, confidences, CONFIDENCE_THRESHOLD, NMS_THRESHOLD
            )

            # --- HATA DÜZELTME KISMI ---
            # Indices'i her zaman düz bir listeye çeviriyoruz.
            # Böylece [[1], [2]] gelse de [1, 2] gelse de hata vermez.
            if len(indices) > 0:
                indices = np.array(indices).flatten().tolist()

                for index in indices:
                    box = boxes[index]
                    x_min, y_min, w, h = box[0], box[1], box[2], box[3]

                    x_max = x_min + w
                    y_max = y_min + h

                    x_min = max(0, x_min)
                    y_min = max(0, y_min)
                    x_max = min(w_orig, x_max)
                    y_max = min(h_orig, y_max)

                    class_id = class_ids[index]
                    score = confidences[index]
                    label_name, color = get_display_info(class_id)

                    # Çizim
                    box_thickness = 2
                    cv2.rectangle(
                        original_img,
                        (x_min, y_min),
                        (x_max, y_max),
                        color,
                        box_thickness,
                    )

                    label_text = f"{label_name} %{int(score*100)}"
                    font_scale = min(w_orig, h_orig) / 1000.0
                    font_scale = max(font_scale, 0.6)
                    font_thickness = max(int(font_scale * 2), 2)

                    (text_w, text_h), _ = cv2.getTextSize(
                        label_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness
                    )

                    text_x = x_min
                    text_y = y_min - 10
                    padding = 5

                    if text_y < text_h:
                        text_y = y_min + text_h + 10

                    # Siyah Arka Plan (Okunabilirlik için)
                    cv2.rectangle(
                        original_img,
                        (text_x - 2, text_y - text_h - padding),
                        (text_x + text_w + 2, text_y + padding),
                        (0, 0, 0),
                        -1,
                    )

                    # Beyaz Yazı
                    cv2.putText(
                        original_img,
                        label_text,
                        (text_x, text_y),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        font_scale,
                        (255, 255, 255),
                        font_thickness,
                    )

                    print(f"TESPIT: {label_name} - %{int(score*100)}")

        _, buffer = cv2.imencode(".jpg", original_img)
        jpg_as_text = base64.b64encode(buffer).decode("utf-8")

        return jsonify(
            {"success": True, "result_image": f"data:image/jpeg;base64,{jpg_as_text}"}
        )

    except Exception as e:
        print(f"HATA: {e}")
        # Hata detayını terminale yazdır, ama telefona basit dön
        import traceback

        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
