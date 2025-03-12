"use client";

import React, { useState, useRef, useEffect } from 'react';

interface PinInputProps {
  length: number;
  onComplete: (pin: string) => void;
  error?: boolean;
}

const PinInput: React.FC<PinInputProps> = ({ length, onComplete, error = false }) => {
  const [pin, setPin] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    
    // Only accept digits
    if (!/^\d*$/.test(value)) return;
    
    // Take only the last character if multiple were pasted
    const digit = value.slice(-1);
    
    // Update the pin array
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    
    // If a digit was entered and there's a next input, focus it
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Check if pin is complete
    if (newPin.every(d => d !== '') || (digit && index === length - 1)) {
      onComplete(newPin.join(''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (pin[index] === '' && index > 0) {
        // If current input is empty and backspace is pressed, focus previous input
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      }
    }
    
    // Handle left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Handle right arrow
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    // Only accept digits
    const digits = pastedData.replace(/\D/g, '').split('').slice(0, length);
    
    if (digits.length > 0) {
      const newPin = [...pin];
      
      // Fill as many inputs as we have digits
      digits.forEach((digit, i) => {
        if (i < length) {
          newPin[i] = digit;
        }
      });
      
      setPin(newPin);
      
      // Focus the next empty input or the last one
      const nextEmptyIndex = newPin.findIndex(d => d === '');
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[length - 1]?.focus();
      }
      
      // Check if pin is complete
      if (newPin.every(d => d !== '')) {
        onComplete(newPin.join(''));
      }
    }
  };

  return (
    <div className="flex justify-center space-x-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el: HTMLInputElement | null) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={pin[index]}
          onChange={e => handleChange(e, index)}
          onKeyDown={e => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008DC1] ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          autoComplete="off"
        />
      ))}
    </div>
  );
};

export default PinInput;
