
import React, { useRef, useEffect, useState } from "react";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";
import "../components/bgr.css"; // Import the CSS file

const BackgroundRemover = ({ selectedBg, webcamRef }) => {
  const canvasRef = useRef(null);
  const [imageSegmenter, setImageSegmenter] = useState(null);

  useEffect(() => {
    const loadSegmentationModel = async () => {
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
    };

    loadSegmentationModel();
  }, []);

  const processFrame = async () => {
    if (!webcamRef.current || !imageSegmenter || !canvasRef.current) return;

    const video = webcamRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get segmentation mask
    const segmentation = await imageSegmenter.segmentForVideo(video, performance.now());

    if (segmentation.categoryMask) {
      const mask = segmentation.categoryMask.getAsUint8Array();
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < mask.length; i++) {
        if (mask[i] === 0) {
          data[i * 4 + 3] = 0; // Make background transparent
        }
      }

      ctx.putImageData(imageData, 0, 0);
      segmentation.categoryMask.close();
    }

    requestAnimationFrame(processFrame);
  };

  useEffect(() => {
    if (webcamRef.current && imageSegmenter) {
      const video = webcamRef.current;
      video.addEventListener("loadeddata", processFrame);
      return () => video.removeEventListener("loadeddata", processFrame);
    }
  }, [imageSegmenter]);

  return (
    <div className="container">
      {/* Background Image */}
      {selectedBg && <img src={selectedBg} alt="Selected Background" className="background" />}

      {/* Processed Canvas */}
      <canvas ref={canvasRef} className="canvas" />
    </div>
  );
};

export default BackgroundRemover;