import { useEffect, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

const BASE_URL = '';

export function useSignalR(hubPath, { onReceive = {}, autoStart = true } = {}) {
  const connectionRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}${hubPath}`, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    // Register handlers
    Object.entries(onReceive).forEach(([method, handler]) => {
      connection.on(method, handler);
    });

    connectionRef.current = connection;

    if (autoStart) {
      connection
        .start()
        .then(() => setConnected(true))
        .catch((err) => console.error('SignalR connection error:', err));
    }

    return () => {
      connection.stop();
    };
  }, [hubPath]);

  const invoke = async (method, ...args) => {
    if (connectionRef.current) {
      return connectionRef.current.invoke(method, ...args);
    }
  };

  return { connection: connectionRef.current, connected, invoke };
}
