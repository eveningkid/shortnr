import * as config from 'config';
import * as fastify from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

import fastifyConfig from './config';
import shorturlsRoutes from './routes/shorturls';
import statusRoutes from './routes/status';

const isProduction = process.env.NODE_ENV === 'production';

const server = fastify({
  logger: {
    level: 'error',
    prettyPrint: true,
  },
  bodyLimit: 5 * 1048576,
  https: {
    key: fs.readFileSync(
      isProduction
        ? config.get('server.https.key')
        : path.join(
            __dirname,
            `../../docker/certs/${config.get('server.https.key')}`
          )
    ),
    cert: fs.readFileSync(
      isProduction
        ? config.get('server.https.cert')
        : path.join(
            __dirname,
            `../../docker/certs/${config.get('server.https.cert')}`
          )
    ),
  },
});

// tslint:disable-next-line:no-var-requires
server.register(require('fastify-helmet'));
// tslint:disable-next-line:no-var-requires
server.register(require('fastify-redis'), { host: config.get('redis.host') });

server.register(fastifyConfig, config);
server.register(statusRoutes);
server.register(shorturlsRoutes);

if (!isProduction) {
  // tslint:disable-next-line:no-var-requires
  server.register(require('fastify-blipp'));
}

if (isProduction) {
  // tslint:disable-next-line:no-var-requires
  server.use(require('serve-static')(path.join(__dirname, '../public')));
}

const host = config.get('server.host') as string;
const port = config.get('server.port') as number;

const start = async () => {
  try {
    await server.listen(port, host);

    if (!isProduction) {
      server.blipp();
    }

    // tslint:disable-next-line:no-console
    console.log(`Server listening on https://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  // tslint:disable-next-line:no-console
  console.log('Stopping server');

  await server.close(() => {
    // tslint:disable-next-line:no-console
    console.log('Server succesfully stopped');
    process.exit(0);
  });
});

start();
