import { NextRequest, NextResponse } from 'next/server';
import { TelemetryStreamSimulator, TelemetryScenario } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scenario = (searchParams.get('scenario') || 'hypertensive_surge') as TelemetryScenario;
  const mode = searchParams.get('mode') || 'poll'; // 'poll' or 'sse'
  const count = Math.min(25, Math.max(1, parseInt(searchParams.get('count') || '1', 10)));

  const sim = new TelemetryStreamSimulator(scenario);

  if (mode === 'poll') {
    // Return a batch of readings for polling or chart initialization
    const readings = [];
    for (let i = 0; i < count; i++) {
      readings.push(sim.nextTick());
    }
    return NextResponse.json({
      scenario,
      count: readings.length,
      readings
    });
  }

  // SSE Streaming Mode
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let ticksSent = 0;
      const interval = setInterval(() => {
        ticksSent++;
        const reading = sim.nextTick();
        const data = `data: ${JSON.stringify(reading)}\n\n`;
        controller.enqueue(encoder.encode(data));

        if (ticksSent >= 60) { // Stream for up to 60 ticks per connection
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
