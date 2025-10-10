import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Type definitions
interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  duration?: number;
  error?: string;
}

interface DeleteResult {
  success: boolean;
  result?: string;
  error?: string;
}

interface FileInfo {
  success: boolean;
  info?: any;
  error?: string;
}

interface UploadOptions {
  folder?: string;
  width?: number;
  height?: number;
  crop?: string;
  tags?: string[];
  resource_type?: string;
  transformation?: any[];
}

/**
 * Upload image to Cloudinary
 * @param file - File buffer or base64 string
 * @param options - Upload options
 * @returns Cloudinary response
 */
export const uploadImage = async (
  file: Buffer | string,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  try {
    const defaultOptions = {
      resource_type: 'image' as const,
      folder: options.folder || 'student-nest/images',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: options.width || 800, height: options.height || 600, crop: 'limit' }
      ],
      tags: options.tags || ['student-nest'],
    };

    const uploadOptions: any = { ...defaultOptions, ...options };

    // Convert Buffer to base64 data URI for Cloudinary
    let uploadData: string = file as string;
    if (Buffer.isBuffer(file)) {
      uploadData = `data:image/jpeg;base64,${file.toString('base64')}`;
    }

    const result: UploadApiResponse = await cloudinary.uploader.upload(uploadData, uploadOptions);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
    };
  } catch (error: any) {
    console.error('Cloudinary image upload error:', error);
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
};

/**
 * Upload video to Cloudinary
 * @param file - File buffer or base64 string
 * @param options - Upload options
 * @returns Cloudinary response
 */
export const uploadVideo = async (
  file: Buffer | string,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  try {
    const defaultOptions = {
      resource_type: 'video' as const,
      folder: options.folder || 'student-nest/videos',
      transformation: [
        { quality: 'auto' },
        { width: options.width || 1280, height: options.height || 720, crop: 'limit' }
      ],
      tags: options.tags || ['student-nest'],
    };

    const uploadOptions: any = { ...defaultOptions, ...options };

    const result: UploadApiResponse = await cloudinary.uploader.upload(file as string, uploadOptions);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      duration: result.duration,
      size: result.bytes,
    };
  } catch (error: any) {
    console.error('Cloudinary video upload error:', error);
    return {
      success: false,
      error: error.message || 'Video upload failed',
    };
  }
};

/**
 * Upload room property image
 * @param file - File buffer or base64 string
 * @param propertyId - Property ID for folder organization
 * @returns Cloudinary response
 */
export const uploadPropertyImage = async (
  file: Buffer | string,
  propertyId: string
): Promise<UploadResult> => {
  return uploadImage(file, {
    folder: `student-nest/properties/${propertyId}`,
    width: 1200,
    height: 800,
    crop: 'fill',
    tags: ['property', 'student-nest'],
  });
};

/**
 * Upload room property video
 * @param file - File buffer or base64 string
 * @param propertyId - Property ID for folder organization
 * @returns Cloudinary response
 */
export const uploadPropertyVideo = async (
  file: Buffer | string,
  propertyId: string
): Promise<UploadResult> => {
  return uploadVideo(file, {
    folder: `student-nest/properties/${propertyId}/videos`,
    width: 1920,
    height: 1080,
    crop: 'limit',
    tags: ['property-video', 'student-nest'],
  });
};

/**
 * Delete file from Cloudinary
 * @param publicId - Cloudinary public ID
 * @param resourceType - 'image' or 'video'
 * @returns Deletion result
 */
export const deleteFile = async (
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<DeleteResult> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    return {
      success: result.result === 'ok',
      result: result.result,
    };
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message || 'Delete failed',
    };
  }
};

/**
 * Generate optimized URL with transformations
 * @param publicId - Cloudinary public ID
 * @param transformations - Transformation options
 * @returns Optimized URL
 */
export const generateOptimizedUrl = (
  publicId: string,
  transformations: Record<string, any> = {}
): string => {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    ...transformations,
  });
};

/**
 * Get file info from Cloudinary
 * @param publicId - Cloudinary public ID
 * @param resourceType - 'image' or 'video'
 * @returns File information
 */
export const getFileInfo = async (
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<FileInfo> => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });

    return {
      success: true,
      info: result,
    };
  } catch (error: any) {
    console.error('Cloudinary get file info error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get file info',
    };
  }
};

export default cloudinary;
