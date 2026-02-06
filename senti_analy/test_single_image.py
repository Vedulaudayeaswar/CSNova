import cv2
import numpy as np
from tensorflow.keras.models import load_model

# -----------------------------
# Load trained model
# -----------------------------
model = load_model("emotion_cnn_fer2013.h5")

# Emotion labels (FER-2013)
emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']

# -----------------------------
# Image path (CHANGE THIS)
# -----------------------------
image_path = "D:/sentiment_analysis/test/angry/PrivateTest_2328297.jpg"

# Read image
image = cv2.imread(image_path)
if image is None:
    print("❌ Image not found")
    exit()

# Convert to grayscale
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

# Resize directly (NO face detection)
face = cv2.resize(gray, (48, 48))
face = face / 255.0
face = np.reshape(face, (1, 48, 48, 1))

# Predict emotion
prediction = model.predict(face, verbose=0)
emotion_index = np.argmax(prediction)
emotion = emotion_labels[emotion_index]
confidence = prediction[0][emotion_index] * 100

# Print result
print(f"Predicted Emotion: {emotion}")
print(f"Confidence: {confidence:.2f}%")

# Show image with result
cv2.putText(
    image,
    f"{emotion} ({confidence:.1f}%)",
    (10, 40),
    cv2.FONT_HERSHEY_SIMPLEX,
    1,
    (0, 255, 0),
    2
)

cv2.imshow("Emotion Prediction", image)
cv2.waitKey(0)
cv2.destroyAllWindows()
