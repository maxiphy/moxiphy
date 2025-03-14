"use client";

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PinInput from './ui/PinInput';
import Logo from './ui/Logo';

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handlePinComplete = async (pin: string) => {
    // Don't attempt login if already in progress
    if (isLoading) return;
    
    const success = await login(pin);
    
    if (!success) {
      setError(true);
      setAttempts(prev => prev + 1);
      
      // Clear error state after 1 second
      setTimeout(() => {
        setError(false);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Team Access
        </h1>
        
        <p className="text-center text-gray-500 mb-8">
          Enter the 6-digit PIN to access <b>moxiphy</b>
        </p>
        
        <PinInput 
          length={6} 
          onComplete={handlePinComplete} 
          error={error}
          disabled={isLoading}
        />
        
        {error && (
          <p className="mt-4 text-center text-red-500">
            Incorrect PIN. Please try again.
          </p>
        )}
        
        {attempts >= 3 && (
          <p className="mt-4 text-center text-gray-500 text-sm">
            Hint: Contact your administrator for the PIN
          </p>
        )}
        
        <p className="mt-8 text-center text-gray-400 text-xs">
          © {new Date().getFullYear()} Maxiphy Solutions SARL
        </p>
      </div>
    </div>
  );
};

export default Login;
