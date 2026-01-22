const upload = async (file) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    console.error("VITE_CLOUDINARY_CLOUD_NAME is not set!");
    throw new Error("Cloudinary configuration missing");
  }
  
  // Check file size (limit to 10MB for images, 50MB for videos)
  const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size: ${file.type.startsWith('video/') ? '50MB' : '10MB'}`);
  }
  
  // Determine resource type based on file type
  const isVideo = file.type.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';
  
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
        type: resourceType,
        format: data.format,
        duration: data.duration || null
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
