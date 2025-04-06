import { Handler } from '@netlify/functions';
import { randomBytes } from 'crypto';

// In-memory storage (will reset on function cold starts)
// In production, you'd want to use a proper database
let urls = new Map<string, { originalUrl: string; userId: string }>();

const generateShortCode = () => {
  return randomBytes(4).toString('hex');
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '2592000',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
};

export const handler: Handler = async (event) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Check if this is a redirect request (shortcode in path)
    const path = event.path.replace('/.netlify/functions/urls/', '');
    if (path && path.length > 0 && event.httpMethod === 'GET' && !event.queryStringParameters?.userId) {
      const urlData = urls.get(path);
      if (urlData) {
        return {
          statusCode: 302,
          headers: {
            'Location': urlData.originalUrl,
            ...corsHeaders
          },
          body: JSON.stringify({ redirect: urlData.originalUrl })
        };
      }
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'URL not found' })
      };
    }

    switch (event.httpMethod) {
      case 'POST': {
        let body;
        try {
          body = JSON.parse(event.body || '{}');
        } catch (e) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid JSON in request body' })
          };
        }

        const { url, userId } = body;
        
        if (!url || !userId) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'URL and userId are required' })
          };
        }

        try {
          // Validate URL
          new URL(url);
        } catch (e) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid URL format' })
          };
        }

        const shortCode = generateShortCode();
        urls.set(shortCode, { originalUrl: url, userId });

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ 
            shortCode,
            shortUrl: `${event.headers.host}/.netlify/functions/urls/${shortCode}`
          })
        };
      }

      case 'GET': {
        const userId = event.queryStringParameters?.userId;
        
        if (!userId) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'userId is required' })
          };
        }

        const userUrls = Array.from(urls.entries())
          .filter(([_, data]) => data.userId === userId)
          .map(([shortCode, data]) => ({
            shortCode,
            originalUrl: data.originalUrl,
            shortUrl: `${event.headers.host}/.netlify/functions/urls/${shortCode}`
          }));

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ urls: userUrls })
        };
      }

      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Error in function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};