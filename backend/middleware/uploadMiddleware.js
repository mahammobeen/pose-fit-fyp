const multer = require("multer");
const path = require("path");
const fs = require("fs");


// Ensure upload directories exist
const photosDir = path.join(__dirname, "../uploads/photos");
const docsDir = path.join(__dirname, "../uploads/documents");

[photosDir, docsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configurations
const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, photosDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const docStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, docsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanOriginal = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueName = `doc-${Date.now()}-${cleanOriginal}${ext}`;
    cb(null, uniqueName);
  },
});

// File filters
const photoFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid image format. Allowed formats: PNG, JPG, JPEG, WEBP"), false);
  }
};

const docFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid document format. Allowed formats: PDF, JPG, JPEG, PNG, WEBP"), false);
  }
};

const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: photoFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const uploadDocument = multer({
  storage: docStorage,
  fileFilter: docFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = {
  uploadPhoto,
  uploadDocument,
};
