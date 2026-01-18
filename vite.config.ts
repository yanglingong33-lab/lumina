
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Safely get the API key from possible variables
  const apiKey = env.API_KEY || env.OPEN_API_KEY || env.BOYI || 'sk-vkQ5Q2K7Ap8BkQujcjVeFE9xMRrQbJaIR0vo8pP7Jj5aqpR4';
  
  return {
    plugins: [react()],
    define: {
      // This ensures process.env.API_KEY is replaced by the actual string value during build
      'process.env.API_KEY': JSON.stringify(apiKey),
    }
  };
});
