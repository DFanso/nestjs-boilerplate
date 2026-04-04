import { Logger, INestApplication } from '@nestjs/common';
import morgan = require('morgan');

export function useRequestLogging(app: INestApplication) {
  const logger = new Logger('Request');
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.log(message.replace('\n', '')),
      },
    }),
  );
}
