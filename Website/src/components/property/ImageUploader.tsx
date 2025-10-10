"use client";

import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload, X, Image as ImageIcon, Loader2, CheckCircle,
  AlertCircle, Eye, Maximize2
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

interface UploadedImage {
  id: string;
  url: string;
  publicId: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  propertyId?: string;
  maxImages?: number;
  maxSizeMB?: number;
}

export function ImageUploader({
  images,
  onImagesChange,
  propertyId,
  maxImages = 20,
  maxSizeMB = 10
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(`${file.name}: Invalid file type. Only JPEG, PNG, and WEBP are allowed.`);
      return false;
    }

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    if (file.size > maxSize) {
      toast.error(`${file.name}: File size exceeds ${maxSizeMB}MB limit.`);
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File): Promise<UploadedImage | null> => {
    try {
      const result = await apiClient.uploadImage(file, {
        category: 'property',
        propertyId: propertyId
      });

      if (result.success) {
        return {
          id: result.data.publicId,
          url: result.data.url,
          publicId: result.data.publicId,
          width: result.data.width,
          height: result.data.height,
          size: result.data.size,
          format: result.data.format
        };
      }
      return null;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
      return null;
    }
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed max images
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed. You can add ${maxImages - images.length} more.`);
      return;
    }

    // Validate all files first
    const validFiles = Array.from(files).filter(validateFile);
    if (validFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedImages: UploadedImage[] = [];
      let completed = 0;

      // Upload files one by one or in batches
      if (validFiles.length <= 5) {
        // Upload one by one for small batches
        for (const file of validFiles) {
          const result = await uploadFile(file);
          if (result) {
            uploadedImages.push(result);
          }
          completed++;
          setUploadProgress((completed / validFiles.length) * 100);
        }
      } else {
        // Use bulk upload API for larger batches
        try {
          const result = await apiClient.uploadMultipleImages(validFiles, {
            category: 'property',
            propertyId: propertyId
          });

          if (result.success && result.data.uploaded) {
            uploadedImages.push(...result.data.uploaded.map((img: any) => ({
              id: img.publicId,
              url: img.url,
              publicId: img.publicId,
              width: img.width,
              height: img.height,
              size: img.size,
              format: img.format
            })));
          }
          setUploadProgress(100);
        } catch (error) {
          // Fallback to one-by-one upload
          for (const file of validFiles) {
            const result = await uploadFile(file);
            if (result) {
              uploadedImages.push(result);
            }
            completed++;
            setUploadProgress((completed / validFiles.length) * 100);
          }
        }
      }

      if (uploadedImages.length > 0) {
        onImagesChange([...images, ...uploadedImages]);
        toast.success(`${uploadedImages.length} image(s) uploaded successfully!`);
      }
    } catch (error) {
      toast.error('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [images, maxImages, propertyId, onImagesChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const removeImage = async (image: UploadedImage) => {
    try {
      // Optimistically remove from UI
      onImagesChange(images.filter(img => img.id !== image.id));

      // Delete from Cloudinary
      await apiClient.deleteUploadedFile(image.publicId, 'image');
      toast.success('Image removed');
    } catch (error) {
      toast.error('Failed to remove image');
      // Revert on error
      onImagesChange([...images, image]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg transition-all ${dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            disabled={uploading || images.length >= maxImages}
          />

          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
              <div>
                <p className="text-sm font-medium mb-2">Uploading images...</p>
                <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">{Math.round(uploadProgress)}%</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold mb-2">
                Upload Property Images
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop images here, or click to browse
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center items-center mb-4">
                <Badge variant="outline" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  JPEG, PNG, WEBP
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Max {maxSizeMB}MB per image
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Up to {maxImages} images
                </Badge>
              </div>

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= maxImages}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Choose Images
              </Button>

              {images.length >= maxImages && (
                <p className="text-sm text-amber-600 mt-4 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Maximum {maxImages} images reached
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">
              Uploaded Images ({images.length}/{maxImages})
            </h4>
            {images.length > 0 && (
              <Badge variant="secondary">
                Total: {formatFileSize(images.reduce((acc, img) => acc + img.size, 0))}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <Card key={image.id} className="group relative overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={image.url}
                    alt={`Property image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreviewImage(image.url)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeImage(image)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Image number badge */}
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-black/70 text-white">
                      {index + 1}
                    </Badge>
                  </div>

                  {/* Primary image indicator */}
                  {index === 0 && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-blue-600 text-white">
                        Primary
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Image info */}
                <div className="p-2 bg-white border-t">
                  <p className="text-xs text-muted-foreground truncate">
                    {image.width} × {image.height} • {formatFileSize(image.size)}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4 flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            The first image will be used as the primary image for your property listing
          </p>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-4 right-4 z-10"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-4 h-4" />
            </Button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
