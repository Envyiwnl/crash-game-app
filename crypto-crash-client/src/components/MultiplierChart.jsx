import { useRef, useEffect } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import 'chartjs-adapter-date-fns';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  annotationPlugin
);

export default function MultiplierChart({ data, crashPoint }) {
  const canvasRef = useRef();

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Multiplier',
          data: data.map(d => ({ x: d.t, y: d.x })),
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 0
        }]
      },
      options: {
        scales: {
          x: { type: 'time', time: { unit: 'second' } },
          y: { beginAtZero: true }
        },
        plugins: {
          annotation: {
            annotations: crashPoint != null ? {
              crashLine: {
                type: 'line',
                yMin: crashPoint,
                yMax: crashPoint,
                borderColor: 'red',
                borderDash: [6, 4],
                label: {
                  content: `Crash @ ${crashPoint}×`,
                  enabled: true,
                  position: 'end'
                }
              }
            } : {}
          }
        }
      }
    });
    return () => chart.destroy();
  }, [data, crashPoint]);

  return <canvas ref={canvasRef} className="w-full h-54" />;
}