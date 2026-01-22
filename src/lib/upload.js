const upload = async (file) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    console.error("VITE_CLOUDINARY_CLOUD_NAME is not set!");
    throw new Error("Cloudinary configuration missing");
  }
  
  // Determine file type and size limits
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  const isDocument = !isVideo && !isImage;
  
  // Set size limits based on file type
  let maxSize;
  if (isVideo) {
    maxSize = 100 * 1024 * 1024; // 100MB for videos
  } else if (isImage) {
    maxSize = 10 * 1024 * 1024; // 10MB for images
  } else {
    // Different limits for different document types
    const extension = file.name.toLowerCase().split('.').pop();
    const largeFileTypes = ['zip', 'rar', '7z', 'tar', 'gz', 'exe', 'msi', 'dmg', 'iso'];
    
    if (largeFileTypes.includes(extension)) {
      maxSize = 100 * 1024 * 1024; // 100MB for archives and executables
    } else {
      maxSize = 50 * 1024 * 1024; // 50MB for other documents
    }
  }
  
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    throw new Error(`File too large. Maximum size: ${maxSizeMB}MB`);
  }
  
  // Determine resource type for Cloudinary
  let resourceType;
  if (isVideo) {
    resourceType = 'video';
  } else if (isImage) {
    resourceType = 'image';
  } else {
    resourceType = 'raw'; // For documents and other files
  }
  
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  console.log("Uploading to:", url);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "chat_app");

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log("Cloudinary response:", data);
    
    if (data.secure_url) {
      return {
        url: data.secure_url,
        type: isDocument ? 'document' : resourceType,
        format: data.format || '',
        duration: data.duration || null,
        fileName: file.name || 'unknown',
        fileSize: file.size || 0
      };
    } else {
      throw new Error(data.error?.message || "Upload failed");
    }
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    throw err;
  }
};

export default upload;
