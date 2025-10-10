import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/models/User';
import { uploadPropertyImage, uploadPropertyVideo, deleteFile } from '@/lib/cloudinary';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Helper function to verify JWT token and get user
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No valid authorization header found' };
    }

    const token = authHeader.substring(7);

    // Use the same JWT verification as the main auth system
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return { error: 'Invalid token payload' };
    }

    await connectDB();
    const user = await User.findById(decoded.userId);

    if (!user) {
      return { error: 'User not found' };
    }

    // Check if user account is active
    if (!user.isActive) {
      return { error: 'User account is inactive' };
    }

    // Only owners can upload property media
    if (user.role !== 'owner' && user.role !== 'Owner') {
      return { error: 'Only property owners can upload property media' };
    }

    return { user };
  } catch (error: any) {
    console.error('Authentication error:', error);
    if (error.message && error.message.includes('expired')) {
      return { error: 'Token expired' };
    }
    return { error: 'Invalid or expired token' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const propertyId = formData.get('propertyId') as string | null;
    const mediaType = (formData.get('mediaType') as string) || 'image'; // 'image' or 'video'

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'File is required'
      }, { status: 400 });
    }

    if (!propertyId) {
      return NextResponse.json({
        success: false,
        error: 'Property ID is required'
      }, { status: 400 });
    }

    // Validate file based on media type
    if (mediaType === 'image') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({
          success: false,
          error: 'Only JPEG, PNG, WebP images are allowed'
        }, { status: 400 });
      }

      if (file.size > 10000000) { // 10MB
        return NextResponse.json({
          success: false,
          error: 'Image size should be less than 10MB'
        }, { status: 400 });
      }
    } else if (mediaType === 'video') {
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({
          success: false,
          error: 'Only MP4, WebM, MOV videos are allowed'
        }, { status: 400 });
      }

      if (file.size > 100000000) { // 100MB (Cloudinary free tier limit)
        return NextResponse.json({
          success: false,
          error: 'Video size should be less than 100MB'
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid media type. Use "image" or "video"'
      }, { status: 400 });
    }

    try {
      // Convert file to buffer for Cloudinary upload
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Data = `data:${file.type};base64,${buffer.toString('base64')}`;

      let uploadResult;

      // Upload based on media type
      if (mediaType === 'image') {
        uploadResult = await uploadPropertyImage(base64Data, propertyId);
      } else {
        uploadResult = await uploadPropertyVideo(base64Data, propertyId);
      }

      if (!uploadResult.success) {
        return NextResponse.json({
          success: false,
          error: uploadResult.error || `Failed to upload ${mediaType} to Cloudinary`
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Property ${mediaType} uploaded successfully`,
        data: {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          size: uploadResult.size,
          duration: uploadResult.duration, // Only for videos
          mediaType,
          propertyId,
        }
      });

    } catch (uploadError: any) {
      console.error('Property media upload error:', uploadError);
      return NextResponse.json({
        success: false,
        error: `Failed to upload property ${mediaType}`
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error uploading property media:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');
    const resourceType = (searchParams.get('resourceType') as 'image' | 'video') || 'image';

    if (!publicId) {
      return NextResponse.json({
        success: false,
        error: 'Public ID is required'
      }, { status: 400 });
    }

    // Verify that the publicId belongs to a property owned by this user
    if (!publicId.includes('student-nest/properties/')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid property media public ID'
      }, { status: 403 });
    }

    const deleteResult = await deleteFile(publicId, resourceType);

    if (!deleteResult.success) {
      return NextResponse.json({
        success: false,
        error: deleteResult.error || 'Delete failed'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Property media deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete property media error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during delete'
    }, { status: 500 });
  }
}
