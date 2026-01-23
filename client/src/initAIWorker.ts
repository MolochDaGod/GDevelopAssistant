/**
 * AI Worker Initialization
 * 
 * This file demonstrates how to initialize the AI Worker
 * in your application. Import and call this at app startup.
 */

import { initAIWorker } from '../lib/aiWorkerClient';

/**
 * Initialize the AI Worker with default configuration
 * 
 * Call this early in your app initialization (e.g., in main.tsx or App.tsx)
 */
export function setupAIWorker() {
  // Only enable in development by default (to save API costs)
  const isDevelopment = import.meta.env.DEV;
  
  // Or enable based on a feature flag
  const enableWorker = import.meta.env.VITE_ENABLE_AI_WORKER === 'true' || isDevelopment;

  if (!enableWorker) {
    console.info('[AI Worker] Disabled (set VITE_ENABLE_AI_WORKER=true to enable)');
    return null;
  }

  try {
    const worker = initAIWorker({
      // API endpoint for the worker
      apiEndpoint: '/api/ai-worker',
      
      // Capture console logs
      enableConsoleCapture: true,
      
      // Capture unhandled errors
      enableErrorCapture: true,
      
      // Capture application state
      enableStateCapture: true,
      
      // How often to send updates (milliseconds)
      captureInterval: 5000,
      
      // Start automatically
      autoStart: true,
    });

    console.info('[AI Worker] Initialized successfully');
    console.info('[AI Worker] Session ID:', worker.getSessionId());
    
    return worker;
  } catch (error) {
    console.error('[AI Worker] Failed to initialize:', error);
    return null;
  }
}

/**
 * Example: Custom configuration for production
 */
export function setupAIWorkerProduction() {
  return initAIWorker({
    enableConsoleCapture: false, // Disable console capture in prod
    enableErrorCapture: true,    // Keep error capture
    enableStateCapture: false,   // Disable state capture in prod
    captureInterval: 10000,      // Less frequent updates
    autoStart: true,
  });
}

/**
 * Example: Only capture errors (minimal configuration)
 */
export function setupAIWorkerErrorsOnly() {
  return initAIWorker({
    enableConsoleCapture: false,
    enableErrorCapture: true,
    enableStateCapture: false,
    autoStart: true,
  });
}
