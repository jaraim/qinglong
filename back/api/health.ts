import { Router } from 'express';
import Logger from '../loaders/logger';
import { getMetrics } from '../middlewares/monitoring';
import { healthService } from '../services/health';
import { metricsService } from '../services/metrics';
const route = Router();

export default (app: Router) => {
  app.use('/', route);

  route.get('/health', async (req, res) => {
    try {
      const health = await healthService.check();
      res.status(200).send({
        code: 200,
        data: {
          ...health,
          metrics: getMetrics(),
          performance: metricsService.getMetrics(),
        },
      });
    } catch (err: any) {
      Logger.error('Health check failed:', err);
      res.status(500).send({
        code: 500,
        message: 'Health check failed',
        error: err.message,
      });
    }
  });
};
