import { isString } from 'lodash-es';
import { pino, type Level } from 'pino';

const { LOG_LEVEL } = process.env;

const pinoLogger = pino({
  transport: {
    target: 'pino-pretty', // pino-pretty must be included in dependencies
    options: {
      colorize: true,
    },
  },
  level: LOG_LEVEL || 'debug',
});

const PINO_LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const satisfies readonly Level[];

type LoggerAux = { name?: never; [key: string]: unknown };
type LoggerFunction = (message: string, aux?: LoggerAux) => void;
type LoggerMethods = {
  [l in Level]: LoggerFunction;
};

export class Logger implements LoggerMethods {
  constructor(readonly context: string) {
    for (const level of PINO_LOG_LEVELS) {
      this[level] = (message, aux) => pinoLogger[level]({ ...cleanAux(aux), name: this.context }, message);
    }
  }
  fatal!: LoggerFunction;
  error!: LoggerFunction;
  warn!: LoggerFunction;
  info!: LoggerFunction;
  debug!: LoggerFunction;
  trace!: LoggerFunction;
}

function cleanAux(aux: LoggerAux | undefined): LoggerAux | undefined {
  if (!aux) {
    return undefined;
  }
  const { url, ...rest } = aux;
  return {
    ...rest,
    ...cleanUrl(url),
  };
}

const queryParamsToRedact = ['token', 'secret', 'password'];

function cleanUrl(url: unknown) {
  if (isString(url)) {
    try {
      const urlObj = new URL(url);
      for (const param of queryParamsToRedact) {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '***');
        }
      }
      url = urlObj.href;
    } catch (_error) {
      // swallow
    }
  } else {
    url = undefined;
  }
  return { url };
}
