const {
  uploadPhoto,
  uploadDocument,
} = require("../../middleware/uploadMiddleware");

const cloudinary = require("../../config/cloudinary");

const uploadToCloudinary = (buffer, folder, resourceType) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(buffer);
  });
};

const uploadPhotoHandler = (req, res) => {
  uploadPhoto.single("photo")(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Failed to upload photo",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No photo file provided",
        });
      }

      const result = await uploadToCloudinary(
        req.file.buffer,
        "posefit/professional-photos",
        "image"
      );

      return res.status(200).json({
        success: true,
        message: "Photo uploaded successfully",
        fileUrl: result.secure_url,
        filename: result.public_id,
      });
    } catch (error) {
      console.error("Cloudinary photo upload error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to upload photo",
      });
    }
  });
};

const uploadDocumentHandler = (req, res) => {
  uploadDocument.single("document")(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Failed to upload document",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No document file provided",
        });
      }

      const resourceType =
        req.file.mimetype === "application/pdf" ? "raw" : "image";

      const result = await uploadToCloudinary(
        req.file.buffer,
        "posefit/professional-documents",
        resourceType
      );

      return res.status(200).json({
        success: true,
        message: "Document uploaded successfully",
        fileUrl: result.secure_url,
        originalName: req.file.originalname,
        filename: result.public_id,
      });
    } catch (error) {
      console.error("Cloudinary document upload error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to upload document",
      });
    }
  });
};

module.exports = {
  uploadPhotoHandler,
  uploadDocumentHandler,
};