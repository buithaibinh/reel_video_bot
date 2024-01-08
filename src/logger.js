import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import util from 'util';

const combineMessageAndSplat = () => ({
  transform(info) {
    const { [Symbol.for('splat')]: args = [], message } = info;
    // eslint-disable-next-line no-param-reassign
    info.message = util.format(message, ...args);
    return info;
  },
});

const transport = new DailyRotateFile({
  filename: 'application-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  dirname: './logs',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'debug',
});

const options = (label) => ({
  level: 'debug',
  format: winston.format.combine(
    winston.format.label({ label: label }),
    winston.format.timestamp(),
    combineMessageAndSplat(),
    winston.format.printf((info) => {
      const { level, message, label, timestamp } = info;
      return `${timestamp} [${label}] ${level}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console(), transport],
});

const createLogger = (label) => {
  return winston.createLogger(options(label));
};

const logger = createLogger('main');

// in case we need to create multiple loggers
export { createLogger };

export default logger;
