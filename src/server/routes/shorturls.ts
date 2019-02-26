import * as fastify from 'fastify';
import * as fp from 'fastify-plugin';
import * as http from 'http';
import * as uniqid from 'uniqid';

export default fp(async (server, opts, next) => {
  /**
   * GET /api/shorturls/:shortURL
   * Retrieve a redirect url for a given short url.
   */
  const getShortURLOpts = {
    schema: {
      params: {
        type: 'object',
        properties: {
          shortURL: { type: 'string' },
        },
      },
    },
  };

  const getShortURLHandler = async (
    request: fastify.FastifyRequest<http.IncomingMessage>,
    reply: fastify.FastifyReply<http.ServerResponse>
  ) => {
    try {
      const redirectURL = await server.redis.get(request.params.shortURL);

      if (!redirectURL) {
        return reply.code(404);
      }

      return reply
        .code(200)
        .header('Content-Type', 'application/json')
        .send({ redirectURL });
    } catch (err) {
      request.log.error(err);
      return reply.send(400);
    }
  };

  server.get('/api/shorturls/:shortURL', getShortURLOpts, getShortURLHandler);

  /**
   * POST /api/shorturls
   * Create a short URL for a given redirect url.
   */
  const createShortURLOpts = {
    schema: {
      body: {
        type: 'object',
        properties: {
          redirectURL: { type: 'string' },
        },
        required: ['redirectURL'],
      },
      response: {
        201: {
          type: 'null',
        },
      },
    },
  };

  const createShortURLHandler = async (
    request: fastify.FastifyRequest<http.IncomingMessage>,
    reply: fastify.FastifyReply<http.ServerResponse>
  ) => {
    try {
      const redirectURL = request.body.redirectURL;
      const shortURL = uniqid();

      await server.redis.set(shortURL, redirectURL);

      return reply
        .code(201)
        .header('Location-Id', shortURL)
        .send();
    } catch (err) {
      request.log.error(err);
      return reply.send(500);
    }
  };

  server.post('/api/shorturls', createShortURLOpts, createShortURLHandler);

  next();
});
