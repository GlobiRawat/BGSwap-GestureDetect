import React from "react";
import "./LoadingPage.css";

const LoadingPage = ({ onEnter }) => {
  return (
    <div className="loading-page">
      <div className="loading-container">
        <h1 className="loading-title">Welcome to Background Changer and Hand Gesture Detector!</h1>
        <p className="loading-description">
        Welcome to Background Changer and Hand Gesture Detector! Effortlessly replace your background and capture moments with just a thumbs-up gesture. Get started now and experience a new way to interact with your webcam! 
        </p>
        <h2 >Click 'Enter' to start!</h2>
        <button className="enter-button" onClick={onEnter}>Enter</button>
      </div>
    </div>
  );
};

export default LoadingPage;
