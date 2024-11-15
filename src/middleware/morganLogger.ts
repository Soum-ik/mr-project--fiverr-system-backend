import colors from 'colors';
import morgan from 'morgan';

colors.enable();

// Custom tokens
morgan.token('pid', () => colors.blue(`PID: ${process.pid}`));
morgan.token('status', (req, res) => {
    const status = res.statusCode;
    const color =
        status >= 500 ? colors.red :
            status >= 400 ? colors.yellow :
                status >= 300 ? colors.cyan : colors.green;
    return color(status.toString());
});
morgan.token('client-info', req => colors.yellow(req.headers['user-agent'] || 'unknown client'));
morgan.token('method', req => colors.magenta(req.method as string));
morgan.token('url', req => colors.cyan(req.url as string));
morgan.token('local-time', () => {
    const now = new Date();
    return colors.gray(`${now.toLocaleTimeString()} - ${now.toLocaleDateString()}`);
});
morgan.token('time-since-request', (req) => {
    const requestTime = new Date(req.headers['date'] || new Date()).getTime();
    const currentTime = Date.now();
    const timeDiff = currentTime - requestTime;
    return colors.gray(`${timeDiff} ms ago`);
});

const morganLogger = morgan(
    ':pid :method :url :status :res[content-length] - :response-time ms :client-info :local-time :time-since-request',
);

export default morganLogger;