import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

function FaceCapture({ onSuccess, onBack, backendUrl }) {
  const webcamRef = useRef(null);
  const [recognizing, setRecognizing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const capture = async () => {
    if (!webcamRef.current) return;

    setRecognizing(true);
    setError('');
    setResult(null);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      
      // Base64 to Blob
      const res = await fetch(imageSrc);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append('file', blob, 'face.jpg');

      const response = await axios.post(`${backendUrl}/api/face/recognize`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data);

      if (response.data.recognized && response.data.faces.length > 0) {
        const face = response.data.faces[0];
        if (face.confidence > 0.6) {
          alert(`인식되었습니다: ${face.name} (신뢰도: ${(face.confidence * 100).toFixed(1)}%)`);
          onSuccess(face.user_id, face.name);
        } else {
          setError('신뢰도가 낮습니다. 다시 시도해주세요.');
        }
      } else {
        setError('얼굴을 인식하지 못했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || '인식 실패: ' + err.message);
    } finally {
      setRecognizing(false);
    }
  };

  return (
    <div className="card">
      <h2>🔍 얼굴 인식</h2>

      {error && <div className="error">{error}</div>}

      <div className="webcam-container">
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={400}
          height={300}
          style={{ borderRadius: '10px' }}
        />
      </div>

      {result && (
        <div className="success">
          <p>인식 결과: {result.count}개 얼굴 감지됨</p>
          {result.faces.map((face, idx) => (
            <p key={idx}>
              {face.name} - 신뢰도: {(face.confidence * 100).toFixed(1)}%
            </p>
          ))}
        </div>
      )}

      <div className="button-group">
        <button
          className={`btn btn-primary ${recognizing ? 'disabled' : ''}`}
          onClick={capture}
          disabled={recognizing}
        >
          {recognizing ? '인식 중...' : '📸 촬영 및 인식'}
        </button>
        <button
          className="btn btn-back"
          onClick={onBack}
          disabled={recognizing}
        >
          뒤로
        </button>
      </div>
    </div>
  );
}

export default FaceCapture;
