import cv2
import numpy as np
from tensorflow.keras.models import load_model

# -----------------------------
# Load trained CNN model
# -----------------------------
model = load_model("emotion_cnn_fer2013.h5")

# Emotion labels (FER-2013 order)
emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']

# -----------------------------
# Load face detector
# -----------------------------
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

# -----------------------------
# Start webcam
# -----------------------------
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Webcam not accessible")
    exit()

print("🎥 Observation started")
print("👉 Press 'q' to stop and get FINAL SENTIMENT")

# Store emotion probabilities over time
emotion_probabilities = []

while True:
    ret, frame = cap.read()
    if not ret:
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.3,
        minNeighbors=5
    )

    for (x, y, w, h) in faces:
        # Draw face box
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

        # Preprocess face
        face = gray[y:y+h, x:x+w]
        face = cv2.resize(face, (48, 48))
        face = face / 255.0
        face = np.reshape(face, (1, 48, 48, 1))

        # Predict probabilities
        probs = model.predict(face, verbose=0)[0]
        emotion_probabilities.append(probs)

        # Display current dominant emotion (optional)
        current_emotion = emotion_labels[np.argmax(probs)]
        cv2.putText(
            frame,
            f"Observing: {current_emotion}",
            (x, y - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 0, 0),
            2
        )

    cv2.imshow("Temporal Sentiment Observation", frame)

    # Press 'q' to stop observation
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# -----------------------------
# Stop webcam
# -----------------------------
cap.release()
cv2.destroyAllWindows()

# -----------------------------
# FINAL SENTIMENT COMPUTATION
# -----------------------------
if len(emotion_probabilities) == 0:
    print("❌ No face detected during session")
    exit()

# Average probabilities over time
avg_probabilities = np.mean(emotion_probabilities, axis=0)

final_emotion_index = np.argmax(avg_probabilities)
final_emotion = emotion_labels[final_emotion_index]
final_confidence = avg_probabilities[final_emotion_index] * 100

# -----------------------------
# Display FINAL result
# -----------------------------
print("\n==============================")
print("✅ FINAL SENTIMENT RESULT")
print("==============================")
print(f"Sentiment: {final_emotion}")
print(f"Confidence: {final_confidence:.2f}%")
print("==============================")
