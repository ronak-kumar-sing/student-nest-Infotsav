import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Student from '@/lib/models/Student';
import Owner from '@/lib/models/Owner';
import { verifyAccessToken } from '@/lib/utils/jwt';
import { writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Helper function to verify JWT token and get user
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No valid authorization header found' };
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return { error: 'Invalid token or unauthorized access' };
    }

    await connectDB();

    // Check if user is student or owner
    let user = null;
    let userType = '';

    if (decoded.role?.toLowerCase() === 'student') {
      user = await Student.findById(decoded.userId);
      userType = 'student';
    } else if (decoded.role?.toLowerCase() === 'owner') {
      user = await Owner.findById(decoded.userId);
      userType = 'owner';
    }

    if (!user) {
      return { error: 'User not found' };
    }

    return { user, userType };
  } catch (error: any) {
    console.error('Authentication error:', error);
    return { error: 'Invalid or expired token' };
  }
}

// POST /api/profile/upload-avatar - Upload profile photo
export async function POST(request: NextRequest) {
  try {
    const { user, userType, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('profilePhoto') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, JPG, and WEBP are allowed.'
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${crypto.randomUUID()}.${fileExtension}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

    try {
      const fs = require('fs');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
    } catch (err) {
      console.error('Error creating uploads directory:', err);
    }

    // Save file
    const filePath = path.join(uploadsDir, uniqueFilename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    // Update user profile with new photo URL
    const photoUrl = `/uploads/avatars/${uniqueFilename}`;

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    if (userType === 'student') {
      user.profilePhoto = photoUrl;
      // avatar field might not exist in schema
      if ('avatar' in user) {
        (user as any).avatar = photoUrl;
      }
    } else {
      user.profilePhoto = photoUrl;
      // avatar field might not exist in schema
      if ('avatar' in user) {
        (user as any).avatar = photoUrl;
      }
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        photoUrl
      }
    });

  } catch (error: any) {
    console.error('Upload avatar error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload profile photo'
    }, { status: 500 });
  }
}
