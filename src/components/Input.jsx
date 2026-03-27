import React from 'react';

const Input = ({ 
  label,
  error,
  size = "md",
  className = "",
  ...props 
}) => {
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base"
  };
  
  const baseClasses = "w-full border border-[var(--sf-border-light)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)] transition-colors duration-200";
  const errorClasses = error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "";
  const combinedClasses = `${baseClasses} ${sizes[size]} ${errorClasses} ${className}`.trim();
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">
          {label}
        </label>
      )}
      <input
        className={combinedClasses}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
