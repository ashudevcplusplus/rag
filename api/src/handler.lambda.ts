import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';
import { createApp } from './server';
import { database } from './config/database';
import { logger } from './utils/logger';

// Initialize Express app once (Lambda container reuse)
let cachedApp: ReturnType<typeof serverlessExpress>;
let isDatabaseConnected = false;

async function getApp() {
  if (!cachedApp) {
    // Connect to MongoDB if not already connected
    if (!isDatabaseConnected) {
      try {
        await database.connect();
        isDatabaseConnected = true;
        logger.info('MongoDB connection established in Lambda');
      } catch (error) {
        logger.error('Failed to connect to MongoDB in Lambda', { error });
        // Continue anyway - connection will be retried on next invocation
      }
    }

    const app = createApp();
    cachedApp = serverlessExpress({ app });
  }
  return cachedApp;
}

/**
 * Lambda handler for API Gateway
 * Converts API Gateway events to Express requests
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Enable Lambda response streaming for better performance
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const app = await getApp();
    return app(event, context);
  } catch (error) {
    logger.error('Lambda handler error', { error });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
