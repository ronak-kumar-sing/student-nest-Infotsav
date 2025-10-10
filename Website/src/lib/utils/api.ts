import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message
    },
    { status }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  status: number = 400,
  errors?: Record<string, string[]>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      errors
    },
    { status }
  );
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  status: number = 200
): NextResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore
      }
    },
    { status }
  );
}

/**
 * Handle API errors and return appropriate response
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);

  if (error instanceof Error) {
    // Mongoose validation error
    if ('name' in error && error.name === 'ValidationError') {
      return errorResponse('Validation failed', 400);
    }

    // JWT errors
    if (error.message.includes('jwt')) {
      return errorResponse('Invalid or expired token', 401);
    }

    // Database connection error
    if (error.message.includes('connect')) {
      return errorResponse('Database connection failed', 500);
    }

    return errorResponse(error.message, 500);
  }

  return errorResponse('An unexpected error occurred', 500);
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[]
): { isValid: boolean; missing?: string[] } {
  const missing = requiredFields.filter(field => !body[field]);

  if (missing.length > 0) {
    return { isValid: false, missing };
  }

  return { isValid: true };
}

/**
 * Parse pagination params from URL
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
