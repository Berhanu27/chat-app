const upload = async (file) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    console.error("VITE_CLOUDINARY_CLOUD_NAME is not set!");
    return null;
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
      console.error("Upload failed:", data.error?.message || data);
      return null;
    }
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return null;
  }
};

export default upload;
