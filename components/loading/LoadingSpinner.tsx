import React from "react";

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center">
      <div className="w-6 h-6 border-4 border-stroke-200 rounded-full animate-spin border-t-brand-500"></div>
    </div>
  );
};

export default LoadingSpinner;
