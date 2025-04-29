import { Server, ServerCredentials } from '@grpc/grpc-js';
import { CronService } from '../protos/cron';
import { HealthService } from '../protos/health';
import { ApiService } from '../protos/api';
import { addCron } from '../schedule/addCron';
import { delCron } from '../schedule/delCron';
import { check } from '../schedule/health';
import * as Api from '../schedule/api';
import Logger from '../loaders/logger';
import { promisify } from 'util';
import config from '../config';
import { metricsService } from './metrics';

class GrpcServerService {
  private server: Server;
  private static instance: GrpcServerService;

  private constructor() {
    this.server = new Server({ 'grpc.enable_http_proxy': 0 });
  }

  static getInstance(): GrpcServerService {
    if (!GrpcServerService.instance) {
      GrpcServerService.instance = new GrpcServerService();
    }
    return GrpcServerService.instance;
  }

  async initialize() {
    try {
      this.server.addService(HealthService, { check });
      this.server.addService(CronService, { addCron, delCron });
      this.server.addService(ApiService, Api);

      const grpcPort = config.grpcPort;
      const bindAsync = promisify(this.server.bindAsync).bind(this.server);
      await bindAsync(
        `0.0.0.0:${grpcPort}`,
        ServerCredentials.createInsecure(),
      );
      Logger.debug(`✌️ gRPC 服务启动成功，端口: ${grpcPort}`);
      
      // 记录 gRPC 服务启动指标
      metricsService.record('grpc_service_start', 1, { port: grpcPort.toString() });
      
      return grpcPort;
    } catch (err) {
      Logger.error('gRPC 服务启动失败:', err);
      throw err;
    }
  }

  async shutdown() {
    try {
      if (this.server) {
        await new Promise((resolve) => {
          this.server.tryShutdown(() => {
            Logger.debug('gRPC 服务已关闭');
            metricsService.record('grpc_service_stop', 1);
            resolve(null);
          });
        });
      }
    } catch (err) {
      Logger.error('关闭 gRPC 服务时出错:', err);
      throw err;
    }
  }

  getServer() {
    return this.server;
  }
}

export const grpcServerService = GrpcServerService.getInstance();
