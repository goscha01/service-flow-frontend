import React from 'react';

const Card = ({ 
  children, 
  className = "", 
  padding = "p-6",
  shadow = "shadow-sm",
  border = "border border-gray-200",
  rounded = "rounded-lg",
  background = "bg-white",
  hover = false
}) => {
  const baseClasses = `${background} ${border} ${rounded} ${shadow} ${padding}`;
  const hoverClasses = hover ? "hover:shadow-md transition-shadow duration-200" : "";
  const combinedClasses = `${baseClasses} ${hoverClasses} ${className}`.trim();

  return (
    <div className={combinedClasses}>
      {children}
    </div>
  );
};

export default Card;
