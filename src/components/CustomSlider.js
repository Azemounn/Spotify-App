import React from 'react';
import PropTypes from 'prop-types';
import './CustomSlider.css';

const CustomSlider = ({ currentTime, duration, onTimeChange }) => {
  const handleChange = (e) => {
    onTimeChange(Number(e.target.value));
  };

  return (
    <div className="custom-slider">
      <input
        type="range"
        min="0"
        max={duration}
        value={currentTime}
        onChange={handleChange}
        className="slider"
      />
    </div>
  );
};

CustomSlider.propTypes = {
  currentTime: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired,
  onTimeChange: PropTypes.func.isRequired,
};

export default CustomSlider;
