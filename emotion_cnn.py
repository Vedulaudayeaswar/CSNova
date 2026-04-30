import base64
import binascii
import logging
from pathlib import Path
from threading import Lock
from typing import Any

import cv2
import numpy as np
from tensorflow.keras.models import load_model

logger = logging.getLogger(__name__)

EMOTION_LABELS = ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral"]
MODEL_CANDIDATES = [
    Path("emotion_cnn_fer2013.h5"),
    Path("senti_analy") / "emotion_cnn_fer2013.h5",
]


class EmotionCNNDetector:
    _instance = None
    _lock = Lock()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return

        self.model = None
        self.face_cascade = None
        self.labels = EMOTION_LABELS
        self._load_resources()
        self._initialized = True

    def _load_resources(self):
        model_path = self._resolve_model_path()
        logger.info("Loading CNN emotion model from %s", model_path)
        self.model = load_model(model_path, compile=False)

        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        if self.face_cascade.empty():
            raise RuntimeError("Failed to load Haar cascade for face detection")

    def _resolve_model_path(self) -> Path:
        for candidate in MODEL_CANDIDATES:
            if candidate.exists():
                return candidate
        raise FileNotFoundError(
            "Could not find emotion_cnn_fer2013.h5 in the project root or senti_analy/"
        )

    def _decode_image(self, image_data: str) -> np.ndarray:
        if not image_data:
            raise ValueError("No image data provided")

        if "," in image_data:
            image_data = image_data.split(",", 1)[1]

        try:
            image_bytes = base64.b64decode(image_data)
        except (ValueError, binascii.Error) as exc:
            raise ValueError("Invalid base64 image data") from exc

        buffer = np.frombuffer(image_bytes, dtype=np.uint8)
        frame = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Unable to decode the uploaded image")

        return frame

    def _largest_face(self, gray_frame: np.ndarray):
        faces = self.face_cascade.detectMultiScale(
            gray_frame,
            scaleFactor=1.05,
            minNeighbors=4,
            minSize=(30, 30),
        )
        if len(faces) == 0:
            return None
        return max(faces, key=lambda face: face[2] * face[3])

    def _detect_face_box(self, gray_frame: np.ndarray):
        candidates = [gray_frame]

        equalized = cv2.equalizeHist(gray_frame)
        if not np.array_equal(equalized, gray_frame):
            candidates.append(equalized)

        scaled = cv2.resize(gray_frame, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_LINEAR)
        candidates.append(scaled)

        for candidate in candidates:
            face_box = self._largest_face(candidate)
            if face_box is not None:
                if candidate is scaled:
                    x, y, width, height = [int(value / 1.5) for value in face_box]
                    return x, y, width, height
                return tuple(int(value) for value in face_box)

        return None

    def _predict_emotion(self, face_gray: np.ndarray) -> dict[str, Any]:
        face_resized = cv2.resize(face_gray, (48, 48), interpolation=cv2.INTER_AREA)
        face_normalized = face_resized.astype("float32") / 255.0
        face_input = np.expand_dims(np.expand_dims(face_normalized, axis=-1), axis=0)

        predictions = self.model.predict(face_input, verbose=0)[0]
        dominant_index = int(np.argmax(predictions))
        dominant_label = self.labels[dominant_index]

        emotion_scores = {
            label.lower(): round(float(score) * 100.0, 2)
            for label, score in zip(self.labels, predictions)
        }
        stressed_score = round(
            emotion_scores.get("angry", 0.0)
            + emotion_scores.get("fear", 0.0)
            + emotion_scores.get("disgust", 0.0),
            2,
        )

        result = {
            "success": True,
            "face_detected": True,
            "faceDetected": True,
            "emotion": dominant_label,
            "dominantEmotion": dominant_label,
            "confidence": round(float(predictions[dominant_index]) * 100.0, 2),
            "emotion_scores": emotion_scores,
            "emotionScores": emotion_scores,
            "happy": emotion_scores.get("happy", 0.0),
            "sad": emotion_scores.get("sad", 0.0),
            "stressed": stressed_score,
            "neutral": emotion_scores.get("neutral", 0.0),
            "all_emotions": emotion_scores,
            "allEmotions": emotion_scores,
        }
        return result

    def analyze_image_data(self, image_data: str) -> dict[str, Any]:
        frame = self._decode_image(image_data)
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        face_box = self._detect_face_box(gray_frame)

        if face_box is None:
            return {
                "success": True,
                "face_detected": False,
                "faceDetected": False,
                "emotion": "Neutral",
                "dominantEmotion": "Neutral",
                "confidence": 0.0,
                "emotion_scores": {
                    "angry": 0.0,
                    "disgust": 0.0,
                    "fear": 0.0,
                    "happy": 0.0,
                    "sad": 0.0,
                    "surprise": 0.0,
                    "neutral": 0.0,
                },
                "emotionScores": {
                    "angry": 0.0,
                    "disgust": 0.0,
                    "fear": 0.0,
                    "happy": 0.0,
                    "sad": 0.0,
                    "surprise": 0.0,
                    "neutral": 0.0,
                },
                "happy": 0.0,
                "sad": 0.0,
                "stressed": 0.0,
                "neutral": 0.0,
                "message": "No face detected in the frame",
            }

        x, y, width, height = [int(value) for value in face_box]
        face_gray = gray_frame[y : y + height, x : x + width]
        prediction = self._predict_emotion(face_gray)
        prediction["face_box"] = {
            "x": x,
            "y": y,
            "width": width,
            "height": height,
        }
        return prediction


def get_emotion_cnn_detector() -> EmotionCNNDetector:
    return EmotionCNNDetector()
