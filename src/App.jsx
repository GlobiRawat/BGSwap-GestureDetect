import React, { useRef, useEffect, useState } from "react";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as cam from "@mediapipe/camera_utils";
import { Hands } from "@mediapipe/hands";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";
import Webcam from "react-webcam";
import bg1 from "./assets/bg1.jpeg";
import bg2 from "./assets/bg2.jpeg";
import bg3 from "./assets/bg3.jpeg";
import LoadingPage from "./components/LoadingPage"; // Import LoadingPage component
import Navbar from './components/Navbar/navbar';
import "./App.css";

const App = () => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const [imageSegmenter, setImageSegmenter] = useState(null);
    const [selectedBg, setSelectedBg] = useState(bg1);
    const [capturedImage, setCapturedImage] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const handsRef = useRef(null);
    const timerRef = useRef(null);
    const cameraRef = useRef(null);
    const isCapturing = useRef(false);
    const backgroundImageRef = useRef(new Image());
    const isDrawing = useRef(true);
    const isWebcamVisible = useRef(true);
    const isCountingDown = useRef(false);
    const isCaptureAllowed = useRef(false);
    const lastProcessedFrame = useRef(null); // Store the last processed frame during countdown
    const [isCameraStarted, setIsCameraStarted] = useState(false);
    const [setIsLoading] = useState(true);  // State for loading page
    const [isAppReady, setIsAppReady] = useState(false);  // State to control when the app is ready

    useEffect(() => {
        backgroundImageRef.current.src = selectedBg;

        const loadModels = async () => {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
            );
            const segmenter = await ImageSegmenter.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite",
                    delegate: "GPU",
                },
                runningMode: "VIDEO",
                outputCategoryMask: true,
            });
            setImageSegmenter(segmenter);
            setIsLoading(false);  // Stop loading once models are ready
        };
        loadModels();

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
    }, [selectedBg]);

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    
            if (webcamRef.current) {
                webcamRef.current.srcObject = stream;
            }
    
            if (webcamRef.current && webcamRef.current.video) {
                cameraRef.current = new cam.Camera(webcamRef.current.video, {
                    onFrame: async () => {
                        if (imageSegmenter && !isCapturing.current && isWebcamVisible.current) {
                            await processFrame();
                        }
                        if (handsRef.current) await handsRef.current.send({ image: webcamRef.current.video });
                    },
                    width: 640,
                    height: 480,
                });
    
                cameraRef.current.start();
                setIsCameraStarted(true);
            }
        } catch (error) {
            console.error("Error accessing webcam: ", error);
        }
    };
    

    const processFrame = async () => {
        if (!webcamRef.current || !webcamRef.current.video || !imageSegmenter || !canvasRef.current) return;
        const video = webcamRef.current.video;
        if (video.readyState !== 4) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const segmentation = await imageSegmenter.segmentForVideo(video, performance.now());
        if (!segmentation.categoryMask) return;

        const mask = segmentation.categoryMask.getAsUint8Array();
        segmentation.categoryMask.close();

        if (isDrawing.current) {
            const bgImage = backgroundImageRef.current;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
            drawSegmentedPerson(ctx, video, mask);
        }
    };

    const drawSegmentedPerson = (ctx, video, mask) => {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = ctx.canvas.width;
        tempCanvas.height = ctx.canvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < mask.length; i++) {
            if (mask[i] === 0) {
                data[i * 4 + 3] = 0; // Remove background
            }
        }

        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);

        // Store the last processed frame to be captured after the countdown
        if (isCountingDown.current) {
            lastProcessedFrame.current = tempCanvas.toDataURL("image/png");
        }
    };

    const detectThumbsUp = (landmarks) => {
        if (!landmarks) return false;
        const thumbTip = landmarks[4];
        const thumbBase = landmarks[2];
        const indexFingerMCP = landmarks[5];
        return thumbTip.y < indexFingerMCP.y && thumbTip.y < thumbBase.y;
    };

    const onResults = (results) => {
        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                if (detectThumbsUp(landmarks) && !isCapturing.current && !isCountingDown.current) {
                    startCountdown(); // Start countdown when thumbs-up detected
                }
            }
        }
    };

    const startCountdown = () => {
        if (isCountingDown.current || isCapturing.current) return;
        isCountingDown.current = true;

        let count = 3;
        setCountdown(count);
        timerRef.current = setInterval(() => {
            if (count > 0) {
                setCountdown(count);
                count--;
            } else {
                clearInterval(timerRef.current);
                setCountdown(null);
                isCaptureAllowed.current = true;
                captureImage(); // Capture image after countdown
            }
        }, 1000);
    };

    const captureImage = () => {
        if (!isCaptureAllowed.current || !canvasRef.current) return;
    
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const videoCanvas = canvasRef.current;
    
        canvas.width = videoCanvas.width;
        canvas.height = videoCanvas.height;
    
        // Draw background first
        ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
        
        // Draw the segmented person
        ctx.drawImage(videoCanvas, 0, 0);
        
        setCapturedImage(canvas.toDataURL("image/png"));
        isCapturing.current = true;
        isCaptureAllowed.current = false;
        isCountingDown.current = false;
        isWebcamVisible.current = false;
        isDrawing.current = false;
    };
    

    const resetCapture = () => {
        setCapturedImage(null);
        isCapturing.current = false;
        isDrawing.current = true;
        isWebcamVisible.current = true;
        isCaptureAllowed.current=false;
        isCountingDown.current=false;
        lastProcessedFrame.current = null; // Clear last frame after reset
    };

    const downloadImage = () => {
      if (!capturedImage) return;
      
      const link = document.createElement("a");
      link.href = capturedImage;
      link.download = "captured_image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleEnter = () => {
        setIsAppReady(true); // Show the app content
    };
    
    return (
    <>
        {isAppReady && <Navbar />}

        {!isAppReady ? (
            <LoadingPage onEnter={handleEnter} />
        ) : (
            <div className="container">
                <div className="bg-selector">
                    <img src={bg1} alt="Background 1" className="bg-thumbnail" onClick={() => setSelectedBg(bg1)} />
                    <img src={bg2} alt="Background 2" className="bg-thumbnail" onClick={() => setSelectedBg(bg2)} />
                    <img src={bg3} alt="Background 3" className="bg-thumbnail" onClick={() => setSelectedBg(bg3)} />
                </div>

                <div className="webcam-container" style={{ display: isCameraStarted ? "block" : "none" }}>
                    <Webcam ref={webcamRef} className="webcam" />
                    <canvas ref={canvasRef} className="canvas" />
                    {countdown !== null && <div className="countdown">{countdown}</div>}
                </div>

                {!isCameraStarted && (
                    <div className="start-button-container">
                        <button onClick={startWebcam} className="start-button">Start Camera</button>
                    </div>
                )}

                {capturedImage && (
                    <div className="captured-buttons">
                        <button onClick={resetCapture}>Retake</button>
                        <button onClick={() => {
    const link = document.createElement("a");
    link.href = capturedImage;
    link.download = "captured_image_with_bg.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}}>
    Download
</button>

                    </div>
                )}
            </div>
        )}
    </>
);
};
export default App;
