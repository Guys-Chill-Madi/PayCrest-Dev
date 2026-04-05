// Module: Slider
import React, { useEffect, useRef, useState } from "react";
import "../styles/slider.css";

const Slider: React.FC = () => {
  const images = [
    new URL("../../../../styles/i1.png", import.meta.url).href,
    new URL("../../../../styles/i2.png", import.meta.url).href,
    new URL("../../../../styles/i3.png", import.meta.url).href,
    new URL("../../../../styles/i4.png", import.meta.url).href,
  ];
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAutoPlay = () => {
    stopAutoPlay();
    intervalRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 2200);
  };

  const stopAutoPlay = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const goTo = (i: number) => {
    setIndex(i);
    startAutoPlay();
  };

  return (
    <div
      className="slider"
      onMouseEnter={() => stopAutoPlay()}
      onMouseLeave={() => startAutoPlay()}
    >
      <div className="slides" style={{ transform: `translateX(-${index * 100}%)` }}>
        {images.map((src, i) => (
          <div className="slide" key={i}>
            <img src={src} alt={`Slide ${i + 1}`} />
          </div>
        ))}
      </div>

      <div className="dots">
        {images.map((_, i) => (
          <button
            key={i}
            className={`dot ${i === index ? "active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Slider;


