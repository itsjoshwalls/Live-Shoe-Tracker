/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
import { AppProps } from 'next/app';
import '../styles/globals.css';
import { AuthProvider } from '../components/AuthProvider';
import { EnvGate } from '../components/EnvGate';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <EnvGate>
        <Component {...pageProps} />
      </EnvGate>
    </AuthProvider>
  );
}

export default MyApp;