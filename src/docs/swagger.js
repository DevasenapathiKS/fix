import swaggerJsdoc from 'swagger-jsdoc';

const successResponse = (dataSchema = { type: 'object' }) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Success' },
    data: dataSchema
  }
});

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: 'Validation failed' },
    errors: {
      type: 'array',
      description: 'Optional field-level errors',
      items: {
        type: 'object',
        properties: {
          msg: { type: 'string' },
          param: { type: 'string' }
        }
      }
    }
  }
};

const swaggerDefinition = {
  openapi: '3.1.0',
  info: {
    title: 'Fixzep Service Platform API',
    version: '1.0.0',
    description:
      'REST API for the Fixzep field-service management platform. All authenticated endpoints require a JWT issued via the **/auth/login** endpoint.',
    contact: {
      name: 'Fixzep Platform Team',
      email: 'support@fixzep.com'
    }
  },
  servers: [
    { url: 'http://localhost:4000/api', description: 'Local development' },
    { url: 'https://api.fixzep.com/api', description: 'Production (sample)' }
  ],
  tags: [
    { name: 'Auth', description: 'Authentication & session endpoints' },
    { name: 'Orders', description: 'Customer orders and scheduling' },
    { name: 'Admin', description: 'Admin-only management APIs' },
    { name: 'Technicians', description: 'Technician-facing jobcard APIs' },
    { name: 'Payments', description: 'Payment collection & webhook events' }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      SuccessResponse: successResponse(),
      ErrorResponse: errorResponse,
      LoginPayload: {
        type: 'object',
        required: ['email', 'password', 'role'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@fixzep.com' },
          password: { type: 'string', example: 'secret123' },
          role: { type: 'string', enum: ['admin', 'technician'], example: 'admin' }
        }
      },
      LoginResult: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT token' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string', enum: ['admin', 'technician'] }
            }
          }
        }
      },
      OrderCustomer: {
        type: 'object',
        required: ['name', 'phone', 'addressLine1', 'city', 'state', 'postalCode'],
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
          addressLine1: { type: 'string' },
          addressLine2: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string' }
        }
      },
      OrderRequest: {
        type: 'object',
        required: [
          'customer',
          'serviceCategory',
          'serviceItem',
          'scheduledAt',
          'timeWindowStart',
          'timeWindowEnd'
        ],
        properties: {
          customer: { $ref: '#/components/schemas/OrderCustomer' },
          serviceCategory: { type: 'string', description: 'ServiceCategory ObjectId' },
          serviceItem: { type: 'string', description: 'ServiceItem ObjectId' },
          scheduledAt: { type: 'string', format: 'date-time' },
          timeWindowStart: { type: 'string', format: 'date-time' },
          timeWindowEnd: { type: 'string', format: 'date-time' },
          notes: { type: 'string' }
        }
      },
      Order: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              'new',
              'pending_assignment',
              'assigned',
              'in_progress',
              'completed',
              'cancelled',
              'rescheduled'
            ]
          },
          customer: { $ref: '#/components/schemas/OrderCustomer' },
          serviceCategory: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' }
            }
          },
          serviceItem: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' }
            }
          },
          scheduledAt: { type: 'string', format: 'date-time' },
          timeWindowStart: { type: 'string', format: 'date-time' },
          timeWindowEnd: { type: 'string', format: 'date-time' },
          assignedTechnician: {
            type: 'object',
            nullable: true,
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      },
      OrderFilters: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          fromDate: { type: 'string', format: 'date-time' },
          toDate: { type: 'string', format: 'date-time' }
        }
      },
      AssignTechnicianPayload: {
        type: 'object',
        required: ['technicianId'],
        properties: {
          technicianId: { type: 'string', description: 'Technician user ObjectId' }
        }
      },
      ReschedulePayload: {
        type: 'object',
        required: ['newStart', 'newEnd'],
        properties: {
          newStart: { type: 'string', format: 'date-time' },
          newEnd: { type: 'string', format: 'date-time' }
        }
      },
      ServiceCategory: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          isActive: { type: 'boolean' }
        }
      },
      ServiceItem: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          category: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          basePrice: { type: 'number', format: 'float' }
        }
      },
      SparePart: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          sku: { type: 'string' },
          unitPrice: { type: 'number', format: 'float' }
        }
      },
      TimeSlotTemplate: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          label: { type: 'string' },
          dayOfWeek: { type: 'integer', minimum: 0, maximum: 6 },
          startTime: { type: 'string', example: '09:00' },
          endTime: { type: 'string', example: '18:00' },
          intervalMinutes: { type: 'integer', minimum: 15 },
          capacity: { type: 'integer', minimum: 1 },
          isActive: { type: 'boolean' }
        }
      },
      UserPayload: {
        type: 'object',
        required: ['name', 'email', 'phone', 'password', 'role'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          password: { type: 'string', format: 'password' },
          role: { type: 'string', enum: ['admin', 'technician'] },
          serviceItems: {
            type: 'array',
            items: { type: 'string' }
          },
          serviceCategories: {
            type: 'array',
            items: { type: 'string' }
          },
          skills: {
            type: 'array',
            items: { type: 'string' }
          },
          experienceYears: { type: 'number', format: 'float' }
        }
      },
      AvailabilityEntry: {
        type: 'object',
        required: ['dayOfWeek', 'startTime', 'endTime'],
        properties: {
          dayOfWeek: { type: 'integer', minimum: 0, maximum: 6 },
          startTime: { type: 'string', example: '09:00' },
          endTime: { type: 'string', example: '18:00' },
          isAvailable: { type: 'boolean' }
        }
      },
      AvailabilityPayload: {
        type: 'object',
        required: ['entries'],
        properties: {
          entries: {
            type: 'array',
            items: { $ref: '#/components/schemas/AvailabilityEntry' }
          }
        }
      },
      TechnicianLocationPayload: {
        type: 'object',
        required: ['lat', 'lng'],
        properties: {
          lat: { type: 'number', format: 'float' },
          lng: { type: 'number', format: 'float' }
        }
      },
      ExtraWorkPayload: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['description', 'amount'],
              properties: {
                description: { type: 'string' },
                amount: { type: 'number', format: 'float' }
              }
            }
          }
        }
      },
      SparePartsUsagePayload: {
        type: 'object',
        required: ['parts'],
        properties: {
          parts: {
            type: 'array',
            items: {
              type: 'object',
              required: ['part', 'quantity', 'unitPrice'],
              properties: {
                part: { type: 'string', description: 'SparePart ObjectId' },
                quantity: { type: 'number', format: 'float' },
                unitPrice: { type: 'number', format: 'float' }
              }
            }
          }
        }
      },
      EstimatePayload: {
        type: 'object',
        required: ['estimateAmount'],
        properties: {
          estimateAmount: { type: 'number', format: 'float' }
        }
      },
      PaymentPayload: {
        type: 'object',
        required: ['orderId', 'jobCardId', 'method', 'amount'],
        properties: {
          orderId: { type: 'string' },
          jobCardId: { type: 'string' },
          method: { type: 'string', enum: ['cash', 'upi'] },
          amount: { type: 'number', format: 'float' },
          transactionRef: { type: 'string' }
        }
      },
      PaymentWebhookPayload: {
        type: 'object',
        description: 'Provider-specific payload forwarded to the webhook',
        additionalProperties: true
      },
      TechnicianJobCardSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: {
            type: 'string',
            enum: ['open', 'checked_in', 'completed', 'locked', 'follow_up', 'unpaid', 'partially_paid']
          },
          estimateAmount: { type: 'number', format: 'float', nullable: true },
          finalAmount: { type: 'number', format: 'float', nullable: true },
          order: { $ref: '#/components/schemas/Order' },
          lastCheckInAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      TechnicianJobCardDetail: {
        type: 'object',
        properties: {
          order: { $ref: '#/components/schemas/Order' },
          jobCard: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              estimateAmount: { type: 'number', format: 'float', nullable: true },
              additionalCharges: { type: 'number', format: 'float', nullable: true },
              finalAmount: { type: 'number', format: 'float', nullable: true },
              checkIns: { type: 'array', items: { type: 'object' } },
              extraWork: { type: 'array', items: { type: 'object' } },
              sparePartsUsed: { type: 'array', items: { type: 'object' } },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          },
          payments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                method: { type: 'string' },
                amount: { type: 'number', format: 'float' },
                status: { type: 'string' },
                transactionRef: { type: 'string' },
                paidAt: { type: 'string', format: 'date-time', nullable: true },
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      },
      TechnicianNotification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          event: { type: 'string' },
          payload: { type: 'object', additionalProperties: true },
          readAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate admin or technician user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginPayload' }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: successResponse({ $ref: '#/components/schemas/LoginResult' })
              }
            }
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': { schema: errorResponse }
            }
          }
        }
      }
    },
    '/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create a customer order (public channel)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OrderRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Order created',
            content: {
              'application/json': {
                schema: successResponse({ $ref: '#/components/schemas/Order' })
              }
            }
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: errorResponse } } }
        }
      },
      get: {
        tags: ['Orders'],
        summary: 'List orders (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'status', schema: { type: 'string' }, description: 'Filter by status' },
          { in: 'query', name: 'fromDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'toDate', schema: { type: 'string', format: 'date-time' } }
        ],
        responses: {
          200: {
            description: 'Orders list',
            content: {
              'application/json': {
                schema: successResponse({ type: 'array', items: { $ref: '#/components/schemas/Order' } })
              }
            }
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: errorResponse } } }
        }
      }
    },
    '/orders/{orderId}': {
      get: {
        tags: ['Orders'],
        summary: 'Fetch a single order (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'orderId', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Order details',
            content: {
              'application/json': { schema: successResponse({ $ref: '#/components/schemas/Order' }) }
            }
          },
          404: { description: 'Not found', content: { 'application/json': { schema: errorResponse } } }
        }
      }
    },
    '/orders/{orderId}/reschedule': {
      post: {
        tags: ['Orders'],
        summary: 'Reschedule an order time slot',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'orderId', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ReschedulePayload' } }
          }
        },
        responses: {
          200: {
            description: 'Updated order returned',
            content: {
              'application/json': { schema: successResponse({ $ref: '#/components/schemas/Order' }) }
            }
          }
        }
      }
    },
    '/admin/orders': {
      get: {
        tags: ['Admin'],
        summary: 'List orders with admin projections',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'status', schema: { type: 'string' } },
          { in: 'query', name: 'fromDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'toDate', schema: { type: 'string', format: 'date-time' } }
        ],
        responses: {
          200: {
            description: 'Orders feed for dashboards',
            content: {
              'application/json': {
                schema: successResponse({ type: 'array', items: { $ref: '#/components/schemas/Order' } })
              }
            }
          }
        }
      }
    },
    '/admin/orders/{orderId}/assign': {
      post: {
        tags: ['Admin'],
        summary: 'Assign a technician to an order',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'orderId', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AssignTechnicianPayload' } }
          }
        },
        responses: {
          200: {
            description: 'Order assignment updated',
            content: {
              'application/json': { schema: successResponse({ $ref: '#/components/schemas/Order' }) }
            }
          }
        }
      }
    },
    '/admin/technicians/{technicianId}/availability': {
      get: {
        tags: ['Admin'],
        summary: 'View technician recurring availability',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'technicianId', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Weekly availability entries',
            content: {
              'application/json': {
                schema: successResponse({ type: 'array', items: { $ref: '#/components/schemas/AvailabilityEntry' } })
              }
            }
          }
        }
      }
    },
    '/admin/categories': {
      get: {
        tags: ['Admin'],
        summary: 'List service categories',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Categories list',
            content: {
              'application/json': {
                schema: successResponse({ type: 'array', items: { $ref: '#/components/schemas/ServiceCategory' } })
              }
            }
          }
        }
      },
      post: {
        tags: ['Admin'],
        summary: 'Create or update a service category',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ServiceCategory' } }
          }
        },
        responses: {
          200: {
            description: 'Category upserted',
            content: { 'application/json': { schema: successResponse({ $ref: '#/components/schemas/ServiceCategory' }) } }
          }
        }
      }
    },
    '/admin/service-items': {
      get: {
        tags: ['Admin'],
        summary: 'List service catalog items',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'query', name: 'categoryId', schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Service items',
            content: {
              'application/json': {
                schema: successResponse({ type: 'array', items: { $ref: '#/components/schemas/ServiceItem' } })
              }
            }
          }
        }
      },
      post: {
        tags: ['Admin'],
        summary: 'Create or update a service item',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ServiceItem' } }
          }
        },
        responses: {
          200: {
            description: 'Service item upserted',
            content: { 'application/json': { schema: successResponse({ $ref: '#/components/schemas/ServiceItem' }) } }
          }
        }
      }
    },
    '/admin/spare-parts': {
      get: {
        tags: ['Admin'],
        summary: 'List spare parts catalog',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Spare parts',
            content: {
              'application/json': {
                schema: successResponse({ type: 'array', items: { $ref: '#/components/schemas/SparePart' } })
              }
            }
          }
        }
      },
      post: {
        tags: ['Admin'],
        summary: 'Create or update a spare part',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SparePart' } }
          }
        },
        responses: {
          200: {
            description: 'Spare part upserted',
            content: { 'application/json': { schema: successResponse({ $ref: '#/components/schemas/SparePart' }) } }
          }
        }
      }
    },
    '/admin/time-slots': {
      get: {
        tags: ['Admin'],
        summary: 'List configured time slot templates',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'All time slots',
            content: {
              'application/json': {
                schema: successResponse({ type: 'array', items: { $ref: '#/components/schemas/TimeSlotTemplate' } })
              }
            }
          }
        }
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a new time slot template',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/TimeSlotTemplate' },
                  {
                    required: ['dayOfWeek', 'startTime', 'endTime']
                  }
                ]
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Time slot created',
            content: { 'application/json': { schema: successResponse({ $ref: '#/components/schemas/TimeSlotTemplate' }) } }
          }
        }
      }
    },
    '/admin/time-slots/{timeSlotId}': {
      put: {
        tags: ['Admin'],
        summary: 'Update an existing time slot template',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'timeSlotId', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeSlotTemplate' } } }
        },
        responses: {
          200: {
            description: 'Updated time slot',
            content: { 'application/json': { schema: successResponse({ $ref: '#/components/schemas/TimeSlotTemplate' }) } }
          },
          404: { description: 'Not found', content: { 'application/json': { schema: errorResponse } } }
        }
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a time slot template',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'timeSlotId', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Time slot deleted', content: { 'application/json': { schema: successResponse() } } },
          404: { description: 'Not found', content: { 'application/json': { schema: errorResponse } } }
        }
      }
    },
    '/admin/users': {
      post: {
        tags: ['Admin'],
        summary: 'Create a new admin or technician user',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UserPayload' } }
          }
        },
        responses: {
          201: {
            description: 'User created',
            content: { 'application/json': { schema: successResponse({ $ref: '#/components/schemas/UserPayload' }) } }
          }
        }
      }
    },
    '/technician/availability': {
      post: {
        tags: ['Technicians'],
        summary: 'Save weekly availability template',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AvailabilityPayload' } } }
        },
        responses: {
          200: {
            description: 'Availability saved',
            content: { 'application/json': { schema: successResponse({ type: 'array', items: { $ref: '#/components/schemas/AvailabilityEntry' } }) } }
          }
        }
      },
      get: {
        tags: ['Technicians'],
        summary: 'Get your saved availability',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Availability entries',
            content: { 'application/json': { schema: successResponse({ type: 'array', items: { $ref: '#/components/schemas/AvailabilityEntry' } }) } }
          }
        }
      }
    },
    '/technician/jobcards': {
      get: {
        tags: ['Technicians'],
        summary: 'List job cards assigned to the authenticated technician',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'status',
            required: false,
            schema: { type: 'string' },
            description: 'Optional job status filter'
          }
        ],
        responses: {
          200: {
            description: 'Job card summaries',
            content: {
              'application/json': {
                schema: successResponse({ type: 'array', items: { $ref: '#/components/schemas/TechnicianJobCardSummary' } })
              }
            }
          }
        }
      }
    },
    '/technician/jobcards/{jobCardId}': {
      get: {
        tags: ['Technicians'],
        summary: 'Fetch detailed job card payload',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'jobCardId', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Job card detail',
            content: {
              'application/json': { schema: successResponse({ $ref: '#/components/schemas/TechnicianJobCardDetail' }) }
            }
          },
          404: { description: 'Job card not found or not assigned', content: { 'application/json': { schema: errorResponse } } }
        }
      }
    },
    '/technician/jobcards/{jobCardId}/check-in': {
      post: {
        tags: ['Technicians'],
        summary: 'Technician check-in at job location',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'jobCardId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TechnicianLocationPayload' } } } },
        responses: {
          200: { description: 'Check-in recorded', content: { 'application/json': { schema: successResponse() } } }
        }
      }
    },
    '/technician/jobcards/{jobCardId}/extra-work': {
      post: {
        tags: ['Technicians'],
        summary: 'Submit additional billable work',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'jobCardId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ExtraWorkPayload' } } } },
        responses: {
          200: { description: 'Extra work added', content: { 'application/json': { schema: successResponse() } } }
        }
      }
    },
    '/technician/jobcards/{jobCardId}/spare-parts': {
      post: {
        tags: ['Technicians'],
        summary: 'Log spare part usage',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'jobCardId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SparePartsUsagePayload' } } } },
        responses: {
          200: { description: 'Spare parts recorded', content: { 'application/json': { schema: successResponse() } } }
        }
      }
    },
    '/technician/jobcards/{jobCardId}/estimate': {
      post: {
        tags: ['Technicians'],
        summary: 'Update order estimate',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'jobCardId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EstimatePayload' } } } },
        responses: {
          200: { description: 'Estimate updated', content: { 'application/json': { schema: successResponse() } } }
        }
      }
    },
    '/technician/jobcards/{jobCardId}/complete': {
      post: {
        tags: ['Technicians'],
        summary: 'Mark job as completed',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'jobCardId', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Job completed', content: { 'application/json': { schema: successResponse() } } }
        }
      }
    },
    '/technician/notifications': {
      get: {
        tags: ['Technicians'],
        summary: 'List in-app notifications for technician',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'unreadOnly',
            schema: { type: 'boolean' },
            required: false,
            description: 'If true, return only unread notifications'
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100 },
            required: false
          }
        ],
        responses: {
          200: {
            description: 'Notification list',
            content: {
              'application/json': {
                schema: successResponse({ type: 'array', items: { $ref: '#/components/schemas/TechnicianNotification' } })
              }
            }
          }
        }
      }
    },
    '/technician/notifications/{notificationId}/read': {
      post: {
        tags: ['Technicians'],
        summary: 'Mark a notification as read',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'notificationId', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Notification updated',
            content: { 'application/json': { schema: successResponse({ $ref: '#/components/schemas/TechnicianNotification' }) } }
          },
          404: { description: 'Notification not found', content: { 'application/json': { schema: errorResponse } } }
        }
      }
    },
    '/technician/spare-parts': {
      get: {
        tags: ['Technicians'],
        summary: 'List active spare parts for reference',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Spare parts list',
            content: {
              'application/json': {
                schema: successResponse({ type: 'array', items: { $ref: '#/components/schemas/SparePart' } })
              }
            }
          }
        }
      }
    },
    '/payments': {
      post: {
        tags: ['Payments'],
        summary: 'Record a payment against a job card',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentPayload' } } } },
        responses: {
          201: {
            description: 'Payment captured',
            content: { 'application/json': { schema: successResponse({ type: 'object', properties: { status: { type: 'string', example: 'success' } } }) } }
          }
        }
      }
    },
    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Provider webhook callback (no auth)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentWebhookPayload' } } }
        },
        responses: {
          200: { description: 'Acknowledged', content: { 'application/json': { schema: successResponse() } } }
        }
      }
    }
  }
};

const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: []
});

export default swaggerSpec;
