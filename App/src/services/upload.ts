import { config } from '@/src/config';

const cloudinaryUrl = config.cloudinary.uploadUrl;
const cloudName = config.cloudinary.cloudName;
const uploadPreset = config.cloudinary.uploadPreset;

export async function uploadImage(imageUri: string) {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);
    formData.append('upload_preset', uploadPreset);
    formData.append('cloud_name', cloudName);

    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Image upload failed:', error);
    throw new Error('Failed to upload image');
  }
}