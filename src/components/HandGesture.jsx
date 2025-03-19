import React, { useEffect, useState, useRef } from "react";
import { Hands } from "@mediapipe/hands";
import * as cam from "@mediapipe/camera_utils";

const HandGesture = ({ webcamRef, canvasRef, onCapture }) => {
  const [countdown, setCountdown] = useState(null);
  const handsRef = useRef(null);
  const timerRef = useRef(null);
  const isCapturing = useRef(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!webcamRef?.current) return;
 
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults(onResults);
    handsRef.current = hands;

    const video = webcamRef.current;
    cameraRef.current = new cam.Camera(video, {
      onFrame: async () => {
        if (handsRef.current) {
          await handsRef.current.send({ image: video });
        }
      },
      width: 640,
      height: 480,
    });

    cameraRef.current.start();

    return () => {
      if (handsRef.current) handsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (cameraRef.current) cameraRef.current.stop();
    };
  }, [webcamRef]);

  const onResults = (results) => {
    if (!canvasRef?.current || !webcamRef?.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = webcamRef.current;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const landmarks of results.multiHandLandmarks) {
        // Draw hand landmarks and connectors
        if (window.drawLandmarks) {
          window.drawLandmarks(ctx, landmarks, { color: "red", radius: 4 });
        }
        if (window.drawConnectors) {
          window.drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS, { color: "blue", lineWidth: 2 });
        }

        // Detect thumbs up gesture
        if (detectThumbsUp(landmarks) && !isCapturing.current) {
          startCountdown();
        }
      }
    }
  };

  const detectThumbsUp = (landmarks) => {
    if (!landmarks) return false;
    
    const thumbTip = landmarks[4]; 
    const thumbBase = landmarks[2];
    const indexFingerMCP = landmarks[5];

    return thumbTip.y < indexFingerMCP.y && thumbTip.y < thumbBase.y;
  };

  const startCountdown = () => {
    if (isCapturing.current) return;
    isCapturing.current = true;
    setCountdown(3);

    let count = 3;
    timerRef.current = setInterval(() => {
      if (count > 0) {
        setCountdown(count);
        count--;
      } else {
        clearInterval(timerRef.current);
        setCountdown(null);
        captureImage();
      }
    }, 1000);
  };

  const captureImage = () => {
    if (!canvasRef.current) return;
    
    onCapture(canvasRef.current.toDataURL("image/png"));
    isCapturing.current = false;
  };

  return countdown !== null ? <h2 className="countdown">Capturing in {countdown}...</h2> : null;
};

export default HandGesture;
