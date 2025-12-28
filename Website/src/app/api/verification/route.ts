import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/db/connection';
import User from '../../../lib/models/User';
import Owner from '../../../lib/models/Owner';
import { verifyAccessToken } from '../../../lib/utils/jwt';
import { uploadImage } from '../../../lib/cloudinary';

// Helper function to verify JWT token
async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const decoded = await verifyAccessToken(token);

  if (!decoded || !decoded.userId) {
    throw new Error('Invalid token');
  }

  return decoded;
}

// POST: Submit verification documents
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    
    const body = await request.json();
    const { documents } = body;

    if (!documents || !documents.aadhaar || !documents.pan || !documents.propertyDocs || !documents.photo) {
      return NextResponse.json({
        success: false,
        error: 'All documents are required (aadhaar, pan, propertyDocs, photo)'
      }, { status: 400 });
    }

    // Get user
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Check if user is an owner
    if (user.role !== 'owner' && user.role !== 'Owner') {
      return NextResponse.json({
        success: false,
        error: 'Only owners can submit verification documents'
      }, { status: 403 });
    }

    // Upload documents to Cloudinary
    const uploadedDocs: Array<{ type: string; url: string; uploadedAt: Date }> = [];
    const docTypes = ['aadhaar', 'pan', 'propertyDocs', 'photo'];

    for (const docType of docTypes) {
      if (documents[docType]) {
        try {
          const result = await uploadImage(documents[docType], {
            folder: `verification/${decoded.userId}`,
            tags: [docType, 'verification']
          });
          
          if (result.success && result.url) {
            uploadedDocs.push({
              type: docType,
              url: result.url,
              uploadedAt: new Date()
            });
          }
        } catch (uploadError) {
          console.error(`Failed to upload ${docType}:`, uploadError);
        }
      }
    }

    // Update Owner document
    const owner = await Owner.findOne({ user: decoded.userId });
    
    if (owner) {
      owner.verification = {
        ...owner.verification,
        status: 'in-review',
        verificationDocuments: uploadedDocs
      };
      await owner.save();
    } else {
      // Create owner profile if not exists
      const newOwner = new Owner({
        user: decoded.userId,
        verification: {
          status: 'in-review',
          verificationDocuments: uploadedDocs,
          digilockerLinked: false
        }
      });
      await newOwner.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Verification documents submitted successfully. Your documents will be reviewed within 24-48 hours.',
      data: {
        status: 'in-review',
        documentsCount: uploadedDocs.length
      }
    });

  } catch (error: any) {
    console.error('Error submitting verification:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to submit verification documents'
    }, { status: 500 });
  }
}

// GET: Get user verification status
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);

    // Get user
    const user = await User.findById(decoded.userId).select(
      'isEmailVerified isPhoneVerified isIdentityVerified email phone role'
    );

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Calculate verification status
    const emailVerified = user.isEmailVerified || false;
    const phoneVerified = user.isPhoneVerified || false;
    const identityVerified = (user as any).isIdentityVerified || false;

    const allVerified = emailVerified && phoneVerified && identityVerified;
    const partiallyVerified = emailVerified || phoneVerified || identityVerified;

    let verificationStatus = 'not-verified';
    if (allVerified) {
      verificationStatus = 'verified';
    } else if (partiallyVerified) {
      verificationStatus = 'partially-verified';
    }

    return NextResponse.json({
      success: true,
      data: {
        status: verificationStatus,
        email: {
          value: user.email,
          verified: emailVerified
        },
        phone: {
          value: user.phone,
          verified: phoneVerified
        },
        identity: {
          verified: identityVerified
        },
        completionPercentage: Math.round(
          ((emailVerified ? 1 : 0) + (phoneVerified ? 1 : 0) + (identityVerified ? 1 : 0)) / 3 * 100
        )
      }
    });

  } catch (error: any) {
    console.error('Error getting verification status:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get verification status'
    }, { status: 500 });
  }
}
