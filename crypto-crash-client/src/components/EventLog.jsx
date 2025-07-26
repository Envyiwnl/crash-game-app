import React from 'react';

export default function EventLog({ events }) {
  return (
    <div className="bg-gray-100 p-2 h-40 overflow-y-auto text-sm font-nunito mt-2">
      {events.map((e, i) => (
        <div key={i}>
          [{new Date(e.ts).toLocaleTimeString()}] {e.msg}
        </div>
      ))}
    </div>
  );
}