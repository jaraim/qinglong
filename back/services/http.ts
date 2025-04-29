import express from 'express';
import Logger from '../loaders/logger';
import { metricsService } from './metrics';

class HttpServerService {
  private server: any;
  private static instance: HttpServerService;

  private constructor() {}

  static getInstance(): HttpServerService {
    if (!HttpServerService.instance) {
      HttpServerService.instance = new HttpServerService();
    }
    return HttpServerService.instance;
  }

  async initialize(expressApp: express.Express, port: number) {
    try {
      return new Promise((resolve, reject) => {
        this.server = expressApp.listen(port, '0.0.0.0', () => {
          Logger.debug(`✌️ HTTP 服务启动成功，端口: ${port}`);
          metricsService.record('http_service_start', 1, { port: port.toString() });
          resolve(this.server);
        });

        this.server.on('error', (err: Error) => {
          Logger.error('HTTP 服务启动失败:', err);
          reject(err);
        });
      });
    } catch (err) {
      Logger.error('HTTP 服务启动失败:', err);
      throw err;
    }
  }

  async shutdown() {
    try {
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(() => {
            Logger.debug('HTTP 服务已关闭');
            metricsService.record('http_service_stop', 1);
            resolve(null);
          });
        });
      }
    } catch (err) {
      Logger.error('关闭 HTTP 服务时出错:', err);
      throw err;
    }
  }

  getServer() {
    return this.server;
  }
}

export const httpServerService = HttpServerService.getInstance(); 