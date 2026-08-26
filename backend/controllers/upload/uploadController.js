
const {
  uploadPhoto,
  uploadDocument,
} = require("../../middleware/uploadMiddleware");
const uploadPhotoHandler = (req, res) => {
  uploadPhoto.single("photo")(req, res, (err) => {
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

    const host = req.get("host");
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/photos/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      message: "Photo uploaded successfully",
      fileUrl,
      filename: req.file.filename,
    });
  });
};

const uploadDocumentHandler = (req, res) => {
  uploadDocument.single("document")(req, res, (err) => {
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

    const host = req.get("host");
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/documents/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      fileUrl,
      originalName: req.file.originalname,
      filename: req.file.filename,
    });
  });
};

module.exports = {
  uploadPhotoHandler,
  uploadDocumentHandler,
};