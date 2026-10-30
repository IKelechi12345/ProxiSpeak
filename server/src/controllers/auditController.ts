import { Request, Response } from 'express';
import { proximityEngine } from '../services/proximity/proximityEngine';
import { Participant } from '@proxispeak/shared';

export async function getSpatialAudit(req: Request, res: Response): Promise<void> {
  const report = proximityEngine.getAuditReport();
  res.status(200).json({
    success: true,
    message: 'Spatial engine latency audit report retrieved',
    data: report,
  });
}

/**
 * Executes a live benchmark with N simulated participants to measure actual spatial query performance under realistic multi-user load.
 */
export async function runSpatialBenchmark(req: Request, res: Response): Promise<void> {
  const simulatedOfficeId = 'benchmark_office_audit';
  const userCount = parseInt((req.query.users as string) || '50', 10);
  const iterations = parseInt((req.query.iterations as string) || '100', 10);

  // Initialize simulated participants across a 1800x1200 office
  const simulatedParticipants: Participant[] = [];
  for (let i = 0; i < userCount; i++) {
    simulatedParticipants.push({
      userId: `bench_user_${i}`,
      username: `Agent ${i + 1}`,
      avatar: `avatar-${(i % 6) + 1}`,
      officeId: simulatedOfficeId,
      position: {
        x: 100 + (i * 28) % 1500,
        y: 100 + (Math.floor(i / 10) * 150) % 900,
      },
      direction: 'down',
      isMoving: true,
      isMuted: false,
      isSpeaking: false,
      lastSeen: Date.now(),
    });
  }

  const times: number[] = [];

  // Run movement and proximity cycles
  for (let iter = 0; iter < iterations; iter++) {
    const pIndex = iter % userCount;
    const p = simulatedParticipants[pIndex];
    // Small realistic movement step (+/- 5px)
    p.position.x = Math.max(50, Math.min(1650, p.position.x + (Math.random() * 10 - 5)));
    p.position.y = Math.max(50, Math.min(1050, p.position.y + (Math.random() * 10 - 5)));

    const t0 = performance.now();
    proximityEngine.updateParticipant(simulatedOfficeId, p);
    const t1 = performance.now();
    times.push(t1 - t0);
  }

  // Cleanup benchmark office
  for (const p of simulatedParticipants) {
    proximityEngine.removeParticipant(simulatedOfficeId, p.userId);
  }

  times.sort((a, b) => a - b);
  const total = times.reduce((s, v) => s + v, 0);
  const avgMs = total / times.length;
  const p95Ms = times[Math.floor(times.length * 0.95)];
  const maxMs = times[times.length - 1];

  res.status(200).json({
    success: true,
    message: `Spatial benchmark completed with ${userCount} users over ${iterations} updates`,
    data: {
      testedUserCount: userCount,
      totalUpdates: iterations,
      avgLatencyMs: Math.round(avgMs * 1000) / 1000,
      p95LatencyMs: Math.round(p95Ms * 1000) / 1000,
      maxLatencyMs: Math.round(maxMs * 1000) / 1000,
      meetsTarget: avgMs < 20 && p95Ms < 20,
      targetRequirement: '< 20ms spatial query execution',
    },
  });
}

export async function getSystemHealth(req: Request, res: Response): Promise<void> {
  const memoryUsage = process.memoryUsage();
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
    },
  });
}
