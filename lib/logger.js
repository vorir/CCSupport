const winston = require('winston');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint } = format;

const logger = createLogger({
    level: 'debug',
    transports: [
        new winston.transports.Console({
            timestamp: new Date(),
            format: winston.format.combine(
                format.colorize(),
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.align(),
                format.printf(info => {
                    const { timestamp, level, message, ...extra } = info;
            
                    return `${timestamp} [${level}]: ${message} ${
                        Object.keys(extra).length ? JSON.stringify(extra, null, 2) : ''
                    }`;
                }),
              )
        }),
        new winston.transports.File({ filename: 'log' }),
    ],
    format: winston.format.printf(log=>`${new Date()} [${log.level.toUpperCase()}] - ${log.message}`),
});

module.exports = logger;