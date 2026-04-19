import { useCallback, useEffect, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export function useSignalR(hubPath, { onReceive = {}, autoStart = true } = {}) {
  const connectionRef = useRef(null);
  const handlersRef = useRef(onReceive);
  const registeredHandlersRef = useRef({});
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  handlersRef.current = onReceive;

  const startConnection = useCallback(async (connection) => {
    if (!connection || connection.state === 'Connected') return;

    let attempts = 0;
    while (attempts < 5) {
      try {
        setStatus('connecting');
        await connection.start();
        setConnected(true);
        setStatus('connected');
        setReconnectAttempt(0);
        return;
      } catch {
        attempts += 1;
        setReconnectAttempt(attempts);
        setStatus('reconnecting');
        const waitMs = Math.min(1000 * attempts, 4000);
        await new Promise((resolve) => {
          setTimeout(resolve, waitMs);
        });
      }
    }

    setConnected(false);
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}${hubPath}`, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.onclose(() => {
      setConnected(false);
      setStatus('disconnected');
    });

    connection.onreconnecting(() => {
      setConnected(false);
      setStatus('reconnecting');
    });

    connection.onreconnected(() => {
      setConnected(true);
      setStatus('connected');
      setReconnectAttempt(0);
    });

    connectionRef.current = connection;

    if (autoStart) {
      startConnection(connection);
    }

    return () => {
      Object.entries(registeredHandlersRef.current).forEach(([method, handler]) => {
        connection.off(method, handler);
      });
      connection.stop();
    };
  }, [autoStart, hubPath, startConnection]);

  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection) return;

    Object.entries(registeredHandlersRef.current).forEach(([method, handler]) => {
      connection.off(method, handler);
    });

    const next = {};
    Object.entries(onReceive).forEach(([method, handler]) => {
      connection.on(method, handler);
      next[method] = handler;
    });

    registeredHandlersRef.current = next;
  }, [onReceive]);

  const invoke = async (method, ...args) => {
    if (connectionRef.current) {
      return connectionRef.current.invoke(method, ...args);
    }
    return undefined;
  };

  const reconnect = async () => {
    await startConnection(connectionRef.current);
  };

  return {
    connection: connectionRef.current,
    connected,
    status,
    reconnectAttempt,
    invoke,
    reconnect,
  };
}
