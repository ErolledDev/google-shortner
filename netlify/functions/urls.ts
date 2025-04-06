import { Handler } from '@netlify/functions';
import { randomBytes } from 'crypto';

// In-memory storage (will reset on function cold starts)
// In production, you'd want to use a proper database
let urls = new Map<string, { originalUrl: string; userId: string }>();

const generateShortCode = () => {
  return randomBytes(4).toString('hex');
};

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    switch (event.httpMethod) {
      case 'POST': {
        const { url, userId } = JSON.parse(event.body || '{}');
        
        if (!url || !userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'URL and userId are required' }),
          };
        }

        const shortCode = generateShortCode();
        urls.set(shortCode, { originalUrl: url, userId });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ shortCode }),
        };
      }

      case 'GET': {
        const userId = event.queryStringParameters?.userId;
        
        if (!userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'userId is required' }),
          };
        }

        const userUrls = Array.from(urls.entries())
          .filter(([_, data]) => data.userId === userId)
          .map(([shortCode, data]) => ({
            shortCode,
            originalUrl: data.originalUrl,
          }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ urls: userUrls }),
        };
      }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};