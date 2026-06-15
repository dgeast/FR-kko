import cv2
import face_recognition
import numpy as np
import logging
from typing import List, Tuple, Optional
from config import FACE_THRESHOLD

logger = logging.getLogger(__name__)

class FaceEngine:
    def __init__(self, threshold: float = FACE_THRESHOLD):
        self.threshold = threshold
        self.known_encodings = {}  # {user_id: [encodings]}
        self.known_names = {}  # {user_id: name}
    
    def detect_faces(self, image: np.ndarray) -> List[Tuple]:
        """이미지에서 얼굴 감지 (top, right, bottom, left)"""
        try:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            faces = face_recognition.face_locations(rgb_image, model="hog")
            logger.info(f"Detected {len(faces)} face(s)")
            return faces
        except Exception as e:
            logger.error(f"Face detection error: {e}")
            return []
    
    def encode_face(self, image: np.ndarray, face_location: Tuple) -> Optional[np.ndarray]:
        """얼굴을 128D 벡터로 인코딩"""
        try:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            encodings = face_recognition.face_encodings(rgb_image, [face_location])
            return encodings[0] if encodings else None
        except Exception as e:
            logger.error(f"Face encoding error: {e}")
            return None
    
    def add_user_face(self, user_id: str, user_name: str, face_encoding: np.ndarray):
        """사용자 얼굴 추가"""
        if user_id not in self.known_encodings:
            self.known_encodings[user_id] = []
            self.known_names[user_id] = user_name
        self.known_encodings[user_id].append(face_encoding)
        logger.info(f"Added face for user: {user_name}")
    
    def recognize_face(self, face_encoding: np.ndarray) -> Tuple[str, float]:
        """얼굴 인식 (user_id, confidence 반환)"""
        best_match_name = "Unknown"
        best_match_id = None
        best_confidence = 0.0
        
        for user_id, encodings in self.known_encodings.items():
            for known_encoding in encodings:
                distance = face_recognition.face_distance([known_encoding], face_encoding)[0]
                confidence = 1 - distance
                
                if confidence > best_confidence and confidence >= (1 - self.threshold):
                    best_confidence = confidence
                    best_match_id = user_id
                    best_match_name = self.known_names[user_id]
        
        return best_match_id, best_match_name, best_confidence
    
    def recognize_faces_in_image(self, image: np.ndarray) -> List[dict]:
        """이미지의 모든 얼굴 인식"""
        face_locations = self.detect_faces(image)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        face_encodings = []
        for face_location in face_locations:
            encoding = face_recognition.face_encodings(rgb_image, [face_location])
            if encoding:
                face_encodings.append(encoding[0])
        
        results = []
        for face_encoding, face_location in zip(face_encodings, face_locations):
            user_id, name, confidence = self.recognize_face(face_encoding)
            results.append({
                "user_id": user_id,
                "name": name,
                "confidence": float(confidence),
                "location": face_location,
                "encoding": face_encoding.tobytes()
            })
        
        return results
