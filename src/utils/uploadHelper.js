import { supabase } from "../supabaseClient";

export const uploadImageToBucket = async (file, bucketName) => {
  try {
    if (!file) return null;
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error(`Error uploading to ${bucketName}:`, error.message);
    throw error;
  }
};
