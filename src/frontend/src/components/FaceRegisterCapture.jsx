import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { v4 as uuidv4 } from 'uuid';
import { saveFaceData } from '../db/localDatabase';

function FaceRegisterCapture({ userId, userName, onSuccess, onBack }) {
  const webcamRef = useRef(null);
  const [registering, setRegistering] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
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

  const captureAndRegister = async () => {
    if (!webcamRef.current) return;
    if (!modelsLoaded) {
      setError('AI 모델이 아직 로딩되지 않았습니다. 잠시만 기다려주세요.');
      return;
    }

    setRegistering(true);
    setError('');

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      
      // Base64 to Image Element
      const img = new Image();
      img.src = imageSrc;
      await new Promise(resolve => img.onload = resolve);

      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        throw new Error("얼굴을 찾을 수 없습니다. 정면을 바라보세요.");
      }

      const faceData = {
        faceId: uuidv4(),
        userId: userId,
        descriptor: Array.from(detection.descriptor) // Float32Array to Array for IndexedDB
      };

      await saveFaceData(faceData);
      
      alert(`${userName}님의 얼굴이 오프라인으로 성공적으로 등록되었습니다!`);
      onSuccess(userId, userName);
    } catch (err) {
      setError('등록 실패: ' + err.message);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="card">
      <h2>📸 얼굴 등록 ({userName})</h2>
      <p>정면을 바라보고 밝은 곳에서 촬영해주세요.</p>

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

      <div className="button-group">
        <button
          className={`btn btn-primary ${registering ? 'disabled' : ''}`}
          onClick={captureAndRegister}
          disabled={registering}
        >
          {registering ? '등록 중...' : '📸 사진 촬영 및 등록'}
        </button>
        <button
          className="btn btn-back"
          onClick={onBack}
          disabled={registering}
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}

export default FaceRegisterCapture;
