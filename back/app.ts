import 'reflect-metadata';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet'; // We need this in order to use @Decorators
import config from './config';
import Logger from './loaders/logger';
import { monitoringMiddleware } from './middlewares/monitoring';
import { grpcServerService } from './services/grpc';
import { httpServerService } from './services/http';
import { metricsService } from './services/metrics';

async function startServer() {
  const app = express();

  await require('./loaders/db').default();

  app.use(helmet());
  app.use(cors(config.cors));

  app.use(compression());
  app.use(monitoringMiddleware);

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    handler: (req, res) => {
      metricsService.record('rate_limit_exceeded', 1, { path: req.path });
      res.status(429).json({
        code: 429,
        message: '请求过于频繁，请稍后再试',
      });
    },
  });
  app.use(limiter);

  await grpcServerService.initialize();

  await require('./loaders/app').default({ app });

  const server = await httpServerService.initialize(app, config.port);
  process.send?.('ready');

  const shutdown = async () => {
    Logger.info('正在关闭服务...');
    try {
      await Promise.all([
        grpcServerService.shutdown(),
        httpServerService.shutdown(),
      ]);
      process.exit(0);
    } catch (err) {
      Logger.error('关闭服务时出错:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await require('./loaders/server').default({ server });
}

startServer().catch((err) => {
  Logger.error('服务启动失败:', err);
  process.exit(1);
});
