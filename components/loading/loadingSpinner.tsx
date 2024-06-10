import React from "react";

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center">
      <div className="w-6 h-6 border-4 border-t-4 border-gray-300 rounded-full animate-spin border-t-indigo-500"></div>
    </div>
  );
};

export default LoadingSpinner;
