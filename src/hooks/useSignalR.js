import { useEffect, useRef, useState } from 'react';
import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr';
import { getOrRefreshToken, API_ORIGIN } from '../api/axiosClient';

const BASE_URL = API_ORIGIN;

export function useSignalR(hubPath, { onReceive = {}, autoStart = true } = {}) {
  const connectionRef = useRef(null);
  const registeredHandlersRef = useRef({});
  const retryTimerRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    if (connectionRef.current) return;

    const cancelled = { current: false };
    let startPromise = null;

    const connection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}${hubPath}`, {
        accessTokenFactory: () => getOrRefreshToken(),
        withCredentials: true,
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Error)
      .build();

    const scheduleRetry = () => {
      if (!autoStart || cancelled.current) return;
      if (retryTimerRef.current) return;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        setReconnectAttempt((n) => n + 1);
        tryStart();
      }, 3000);
    };

    connection.onclose(() => {
      setConnected(false);
      setStatus('disconnected');
      scheduleRetry();
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

    const tryStart = async () => {
      if (cancelled.current || connection.state !== 'Disconnected') return;
      try {
        setStatus('connecting');
        startPromise = connection.start();
        await startPromise;
        if (cancelled.current) {
          await connection.stop().catch(() => {});
          return;
        }
        setConnected(true);
        setStatus('connected');
        setReconnectAttempt(0);
      } catch (err) {
        if (!cancelled.current) {
          setConnected(false);
          setStatus('disconnected');
          scheduleRetry();
        }
      } finally {
        startPromise = null;
      }
    };

    if (autoStart) tryStart();

    const handleTokenSet = () => {
      const active = connectionRef.current;
      if (!active) return;
      // Access token yenilendiğinde hub baglantisini zorunlu yenile.
      if (active.state === 'Connected') {
        active
          .stop()
          .catch(() => {})
          .finally(() => {
            tryStart();
          });
        return;
      }
      if (active.state === 'Disconnected') tryStart();
    };
    window.addEventListener('accessTokenSet', handleTokenSet);

    return () => {
      cancelled.current = true;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      window.removeEventListener('accessTokenSet', handleTokenSet);
      Object.entries(registeredHandlersRef.current).forEach(([method, handler]) => {
        connection.off(method, handler);
      });
      connectionRef.current = null;
      Promise.resolve(startPromise)
        .catch(() => {})
        .finally(() => connection.stop().catch(() => {}));
    };
  }, [autoStart, hubPath]);

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
    const connection = connectionRef.current;
    if (!connection || connection.state !== 'Disconnected') return;
    try {
      setStatus('connecting');
      await connection.start();
      setConnected(true);
      setStatus('connected');
    } catch {
      setConnected(false);
      setStatus('disconnected');
    }
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
