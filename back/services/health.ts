import Logger from '../loaders/logger';
import { metricsService } from './metrics';
import { grpcServerService } from './grpc';
import { httpServerService } from './http';

interface HealthStatus {
  status: 'ok' | 'error';
  services: {
    http: boolean;
    grpc: boolean;
  };
  metrics: {
    uptime: number;
    memory: {
      used: number;
      total: number;
    };
    requests: {
      total: number;
      active: number;
    };
  };
}

class HealthService {
  private static instance: HealthService;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
  }

  static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  async check(): Promise<HealthStatus> {
    const status: HealthStatus = {
      status: 'ok',
      services: {
        http: true,
        grpc: true,
      },
      metrics: {
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
        requests: {
          total: metricsService.getMetrics('http_requests')?.count || 0,
          active: 0,
        },
      },
    };

    try {
      const httpServer = httpServerService.getServer();
      if (!httpServer) {
        status.services.http = false;
        status.status = 'error';
      }
    } catch (err) {
      status.services.http = false;
      status.status = 'error';
      Logger.error('HTTP server check failed:', err);
    }

    try {
      const grpcServer = grpcServerService.getServer();
      if (!grpcServer) {
        status.services.grpc = false;
        status.status = 'error';
      }
    } catch (err) {
      status.services.grpc = false;
      status.status = 'error';
      Logger.error('gRPC server check failed:', err);
    }

    return status;
  }
}

export const healthService = HealthService.getInstance();
