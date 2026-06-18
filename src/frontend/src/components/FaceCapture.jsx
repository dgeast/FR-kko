import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { getAllFaceData, getUser } from '../db/localDatabase';

function FaceCapture({ onSuccess, onBack }) {
  const webcamRef = useRef(null);
  const [recognizing, setRecognizing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(process.env.PUBLIC_URL + '/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri(process.env.PUBLIC_URL + '/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri(process.env.PUBLIC_URL + '/models');
        setModelsLoaded(true);
      } catch (err) {
        setError('AI 모델 로딩 실패: ' + err.message);
      }
    };
    loadModels();
  }, []);

  const capture = async () => {
    if (!webcamRef.current) return;
    if (!modelsLoaded) {
      setError('AI 모델이 아직 로딩되지 않았습니다.');
      return;
    }

    setRecognizing(true);
    setError('');
    setResult(null);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      
      const img = new Image();
      img.src = imageSrc;
      await new Promise(resolve => img.onload = resolve);

      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setError('얼굴을 인식하지 못했습니다. 정면을 바라보고 다시 시도해주세요.');
        setRecognizing(false);
        return;
      }

      // 로컬 DB에서 저장된 얼굴 데이터 불러오기
      const allFaceData = await getAllFaceData();
      if (allFaceData.length === 0) {
        setError('등록된 사용자 얼굴이 없습니다. 먼저 사용자를 등록하세요.');
        setRecognizing(false);
        return;
      }

      // 얼굴 매칭 (유클리드 거리 계산)
      const currentDescriptor = new Float32Array(detection.descriptor);
      let bestMatch = null;
      let minDistance = 0.6; // 0.6 이하를 일치로 간주

      for (const fd of allFaceData) {
        const knownDescriptor = new Float32Array(fd.descriptor);
        const distance = faceapi.euclideanDistance(currentDescriptor, knownDescriptor);
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = fd;
        }
      }

      if (bestMatch) {
        const confidence = 1 - minDistance;
        const user = await getUser(bestMatch.userId);
        const userName = user ? user.name : '알 수 없음';
        
        setResult({
          count: 1,
          faces: [{ name: userName, confidence: confidence }]
        });

        alert(`인식되었습니다: ${userName} (신뢰도: ${(confidence * 100).toFixed(1)}%)`);
        onSuccess(bestMatch.userId, userName);
      } else {
        setError('일치하는 얼굴이 없습니다. 등록되지 않은 사용자입니다.');
      }
    } catch (err) {
      setError('인식 실패: ' + err.message);
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
