import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configuration
const CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB per image
  MAX_TOTAL_SIZE: 15 * 1024 * 1024, // 15MB total
  MAX_IMAGES: 3,
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
} as const;

const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9\-.]/g, '')
    .replace(/\.\./g, '_')
    .substring(0, 100);
};

// Helper function to detect and process Base64 data
function processBase64Data(base64String: string) {
  let base64Data = base64String;
  let mimeType = 'image/jpeg'; // default
  
  // Handle data URL format (data:image/jpeg;base64,...)
  if (base64String.startsWith('data:')) {
    const [header, data] = base64String.split(',');
    base64Data = data;
    const mimeMatch = header.match(/data:([^;]+)/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
  }
  
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Determine file extension from mime type
  let extension = '.jpg';
  if (mimeType.includes('png')) extension = '.png';
  else if (mimeType.includes('gif')) extension = '.gif';
  else if (mimeType.includes('webp')) extension = '.webp';
  
  return { buffer, mimeType, extension, size: buffer.length };
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Base64 Image Upload ===');
    
    const formData = await request.formData();
    const email = formData.get('email') as string;
    
    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email address is required'
      }, { status: 400 });
    }

    console.log('Processing upload for:', email);

    // Collect Base64 image data
    const base64Images: string[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && typeof value === 'string') {
        base64Images.push(value);
      }
    }

    console.log(`Found ${base64Images.length} Base64 images`);

    // Validate image count
    if (base64Images.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Please select at least one image'
      });
    }

    if (base64Images.length > CONFIG.MAX_IMAGES) {
      return NextResponse.json({
        success: false,
        message: `Maximum ${CONFIG.MAX_IMAGES} images allowed. You selected ${base64Images.length}.`
      });
    }

    // Check authentication
    const authHeader = request.headers.get('authorization');
    let isAuthenticated = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      isAuthenticated = token === process.env.AUTH_SECRET;
    } else {
      const authCheckResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/check-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const authResult = await authCheckResponse.json();
      isAuthenticated = authResult.authenticated;
    }

    if (!isAuthenticated) {
      console.log('User not authenticated, sending magic link');
      
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: { 
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth-confirm` 
        }
      });

      if (error) {
        console.error('Magic link error:', error);
        return NextResponse.json({
          success: false,
          message: 'Authentication failed. Please try again.'
        });
      }

      return NextResponse.json({
        success: false,
        message: 'Authentication required. Check your email for a magic link, then run this shortcut again.',
        action: 'check_email'
      });
    }

    console.log('User authenticated, processing Base64 images');

    // Process and validate Base64 images
    const processedImages: any[] = [];
    let totalSize = 0;

    for (let i = 0; i < base64Images.length; i++) {
      try {
        const imageData = processBase64Data(base64Images[i]);
        
        if (imageData.size > CONFIG.MAX_FILE_SIZE) {
          return NextResponse.json({
            success: false,
            message: `Image ${i + 1} is too large. Maximum size is 5MB per image.`
          });
        }

        if (!CONFIG.ALLOWED_MIME_TYPES.includes(imageData.mimeType)) {
          return NextResponse.json({
            success: false,
            message: `Image ${i + 1} format not supported. Please use JPG, PNG, or WebP images.`
          });
        }

        totalSize += imageData.size;
        processedImages.push({
          buffer: imageData.buffer,
          mimeType: imageData.mimeType,
          extension: imageData.extension,
          originalSize: imageData.size,
          index: i
        });

      } catch (error) {
        return NextResponse.json({
          success: false,
          message: `Failed to process image ${i + 1}. Please ensure it's a valid image.`
        });
      }
    }

    if (totalSize > CONFIG.MAX_TOTAL_SIZE) {
      return NextResponse.json({
        success: false,
        message: 'Total file size too large. Maximum is 15MB for all images combined.'
      });
    }

    console.log('Images validated, uploading to Cloudinary');

    // Upload all images to Cloudinary
    const uploadPromises = processedImages.map(async (imageData) => {
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${imageData.index}-image${imageData.extension}`;

      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            public_id: uniqueFilename,
            folder: 'blinkshop-uploads',
            transformation: [
              { width: 2000, crop: 'limit' },
              { quality: 'auto:good' }
            ]
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary error:', error);
              reject(error);
            } else {
              console.log('Upload successful:', uniqueFilename);
              resolve({
                public_id: result?.public_id,
                secure_url: result?.secure_url,
                original_filename: `image-${imageData.index}${imageData.extension}`,
                file_size: imageData.originalSize
              });
            }
          }
        ).end(imageData.buffer);
      });
    });

    const uploadResults = await Promise.all(uploadPromises);
    const publicIds = uploadResults.map((result: any) => result.public_id);
    const imageUrls = uploadResults.map((result: any) => result.secure_url);

    console.log('All uploads successful, storing tracking data');

    // Store tracking data
    const { error: trackingError } = await supabase
      .from('image_uploads')
      .insert({
        public_ids: publicIds,
        status: 'draft',
        email: email,
        listing_id: null
      });

    if (trackingError) {
      console.error('Failed to store tracking data:', trackingError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${processedImages.length} image${processedImages.length > 1 ? 's' : ''}! Your images are ready to use.`,
      images: uploadResults,
      urls: imageUrls,
      total_files: processedImages.length
    });

  } catch (error: unknown) {
    console.error('Upload error:', error);
    return NextResponse.json({
      success: false,
      message: 'Upload failed. Please try again.'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'BlinkShop Upload API (Base64 support)',
    limits: {
      maxImages: CONFIG.MAX_IMAGES,
      maxFileSize: '5MB per image',
      maxTotalSize: '15MB total',
      allowedTypes: CONFIG.ALLOWED_MIME_TYPES
    }
  });
}