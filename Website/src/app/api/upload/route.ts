/**
 * Cloudinary Upload API Endpoint
 * Handles image and video uploads for property listings
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadImage, uploadVideo, uploadPropertyImage, uploadPropertyVideo, deleteFile } from '@/lib/cloudinary';
import { verifyAccessToken } from '@/lib/utils/jwt';
import User from '@/lib/models/User';
import connectDB from '@/lib/db/connection';

// Maximum file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

interface UploadRequest {
  file: string; // base64 encoded file
  type: 'image' | 'video';
  category?: 'property' | 'profile' | 'document';
  propertyId?: string;
  mimeType?: string;
  filename?: string;
}

async function verifyUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'No token provided', status: 401 };
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return { error: 'Invalid token', status: 401 };
    }

    await connectDB();
    const user = await User.findById(decoded.userId);
    if (!user) {
      return { error: 'User not found', status: 404 };
    }

    return { userId: decoded.userId, user, role: user.role };
  } catch (error) {
    return { error: 'Authentication failed', status: 401 };
  }
}

// POST: Upload image or video
export async function POST(request: NextRequest) {
  try {
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { userId, role } = verification;

    // Parse request body
    const body: UploadRequest = await request.json();
    const { file, type, category = 'property', propertyId, mimeType, filename } = body;

    // Validation
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File is required' },
        { status: 400 }
      );
    }

    if (!type || !['image', 'video'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be "image" or "video"' },
        { status: 400 }
      );
    }

    // Validate file type
    if (type === 'image' && mimeType && !ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: `Invalid image type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (type === 'video' && mimeType && !ALLOWED_VIDEO_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: `Invalid video type. Allowed types: ${ALLOWED_VIDEO_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Check file size (approximate from base64)
    const base64Data = file.includes(',') ? file.split(',')[1] : file;
    const sizeInBytes = (base64Data.length * 3) / 4;

    if (type === 'image' && sizeInBytes > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Image size exceeds maximum limit of ${MAX_IMAGE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (type === 'video' && sizeInBytes > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { success: false, error: `Video size exceeds maximum limit of ${MAX_VIDEO_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    let uploadResult;

    if (category === 'property' && propertyId) {
      // Property-specific upload (better organization)
      if (type === 'image') {
        uploadResult = await uploadPropertyImage(file, propertyId);
      } else {
        uploadResult = await uploadPropertyVideo(file, propertyId);
      }
    } else {
      // General upload
      const folder = category === 'profile'
        ? 'student-nest/profiles'
        : category === 'document'
        ? 'student-nest/documents'
        : 'student-nest/general';

      if (type === 'image') {
        uploadResult = await uploadImage(file, {
          folder,
          tags: [category, `user-${userId}`]
        });
      } else {
        uploadResult = await uploadVideo(file, {
          folder,
          tags: [category, `user-${userId}`]
        });
      }
    }

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || 'Upload failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        size: uploadResult.size,
        duration: uploadResult.duration,
        filename: filename || 'uploaded-file',
      },
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`,
    });

  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// DELETE: Delete uploaded file
export async function DELETE(request: NextRequest) {
  try {
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');
    const resourceType = (searchParams.get('type') || 'image') as 'image' | 'video';

    if (!publicId) {
      return NextResponse.json(
        { success: false, error: 'Public ID is required' },
        { status: 400 }
      );
    }

    const deleteResult = await deleteFile(publicId, resourceType);

    if (!deleteResult.success) {
      return NextResponse.json(
        { success: false, error: deleteResult.error || 'Delete failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      result: deleteResult.result,
    });

  } catch (error: any) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

// POST: Upload multiple files
export async function PUT(request: NextRequest) {
  try {
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { userId } = verification;
    const body = await request.json();
    const { files, type, category = 'property', propertyId } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Files array is required' },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 files allowed per upload' },
        { status: 400 }
      );
    }

    const uploadPromises = files.map(async (file: any) => {
      if (category === 'property' && propertyId) {
        if (type === 'image') {
          return uploadPropertyImage(file, propertyId);
        } else {
          return uploadPropertyVideo(file, propertyId);
        }
      } else {
        const folder = category === 'profile'
          ? 'student-nest/profiles'
          : category === 'document'
          ? 'student-nest/documents'
          : 'student-nest/general';

        if (type === 'image') {
          return uploadImage(file, { folder, tags: [category, `user-${userId}`] });
        } else {
          return uploadVideo(file, { folder, tags: [category, `user-${userId}`] });
        }
      }
    });

    const results = await Promise.all(uploadPromises);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return NextResponse.json({
      success: failed.length === 0,
      data: {
        uploaded: successful.map(r => ({
          url: r.url,
          publicId: r.publicId,
          width: r.width,
          height: r.height,
          format: r.format,
        })),
        failed: failed.map(r => ({ error: r.error })),
        count: {
          total: files.length,
          successful: successful.length,
          failed: failed.length,
        },
      },
      message: `${successful.length} of ${files.length} files uploaded successfully`,
    });

  } catch (error: any) {
    console.error('Bulk upload API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}
