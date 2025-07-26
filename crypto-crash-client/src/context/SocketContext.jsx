import { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext(null);

// initialize socket once
export function SocketProvider({ children }) {

  const BACKEND_URL = import.meta.env.VITE_API_BASE_URL;
  
  const [socket] = useState(() =>
    io(BACKEND_URL, { transports: ['websocket'] })
  );

  useEffect(() => {
    return () => socket.disconnect();
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}