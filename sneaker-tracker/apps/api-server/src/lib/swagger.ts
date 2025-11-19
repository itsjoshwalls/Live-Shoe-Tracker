import { Express, Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sneaker Tracker ML API',
      version: '1.0.0',
      description: 'ML-powered API for sneaker market analysis and predictions',
      contact: {
        name: 'API Support',
        email: 'support@sneakertracker.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        PricePrediction: {
          type: 'object',
          properties: {
            predictedPrice: {
              type: 'number',
              description: 'Predicted price in USD'
            },
            confidence: {
              type: 'number',
              description: 'Confidence score between 0 and 1'
            },
            factors: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Factors influencing the prediction'
            },
            priceRange: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' }
              }
            },
            seasonalityImpact: {
              type: 'number',
              description: 'Impact of seasonality on price'
            }
          }
        },
        MarketAnalysis: {
          type: 'object',
          properties: {
            trend: {
              type: 'string',
              enum: ['increasing', 'decreasing', 'stable']
            },
            confidence: {
              type: 'number'
            },
            impactFactors: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            competitorAnalysis: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  competitor: { type: 'string' },
                  marketShare: { type: 'number' },
                  trend: { type: 'string' }
                }
              }
            }
          }
        },
        SeasonalityAnalysis: {
          type: 'object',
          properties: {
            seasonalPattern: {
              type: 'string',
              enum: ['high', 'medium', 'low']
            },
            peakMonths: {
              type: 'array',
              items: { type: 'string' }
            },
            expectedDemandShift: {
              type: 'number'
            },
            confidenceScore: {
              type: 'number'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string'
            },
            code: {
              type: 'string'
            },
            details: {
              type: 'object'
            }
          }
        }
      },
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  // Swagger documentation endpoint
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  
  // OpenAPI specification endpoint
  app.get('/api-spec', (_req: Request, res: Response) => {
    res.json(specs);
  });
}