// Tiny structured logger: one JSON line per event so logs are easy to grep and parse.
// LOG_LEVEL=silent turns it off (used by the test suite).
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

const currentLevel = () => LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;

const write = (level, event, data = {}) => {
    if (LEVELS[level] < currentLevel()) return;
    const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...data });
    if (level === 'error' || level === 'warn') console.error(line);
    else console.log(line);
};

export const logger = {
    debug: (event, data) => write('debug', event, data),
    info: (event, data) => write('info', event, data),
    warn: (event, data) => write('warn', event, data),
    error: (event, data) => write('error', event, data),
};
