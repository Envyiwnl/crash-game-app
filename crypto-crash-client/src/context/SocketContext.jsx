import { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext(null);

// initialize socket once
export function SocketProvider({ children }) {
  
  const [socket] = useState(() =>
    io('http://localhost:3000', { transports: ['websocket'] })
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