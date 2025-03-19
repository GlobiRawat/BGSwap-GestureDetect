
import React from "react";
import bg1 from "../assets/bg1.jpeg";
import bg2 from "../assets/bg2.jpeg";
import bg3 from "../assets/bg3.jpeg";

const BackgroundSelector = ({ onSelect }) => {
  const backgrounds = [bg1, bg2, bg3];

  return (
    <div className="bg-selector">
      <h3>Select Background</h3>
      {backgrounds.map((bg, index) => (
        <img
          key={index}
          src={bg}
          alt={`Background ${index + 1}`}
          className="bg-thumbnail"
          onClick={() => onSelect(bg)}
          style={{
            cursor: "pointer",
            width: "100px",
            height: "60px",
            margin: "5px",
            border: "2px solid black",
          }}
        />
      ))}
    </div>
  );
};

export default BackgroundSelector;