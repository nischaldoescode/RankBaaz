import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";


// Create dynamic storage engine
const dynamicStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    if (file.fieldname === "image") {
      return {
        folder: "test-app/courses",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        transformation: [{ quality: "auto", format: "webp" }],
        resource_type: "image",
      };
    } else if (file.fieldname === "questionImages") {
      return {
        folder: "test-app/questions",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        transformation: [
          {
            width: 600,
            height: 400,
            crop: "fill",
            quality: "auto",
            format: "webp",
          },
        ],
        resource_type: "image",
      };
    } else {
      throw new Error("Invalid field name");
    }
  },
});

// File filters
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, JPG, PNG, and WebP are allowed."
      ),
      false
    );
  }
};

export const uploadCourseImage = (req, res, next) => {
  const upload = multer({
    storage: dynamicStorage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 101,
    },
  }).fields([
    { name: "image", maxCount: 1 },
    { name: "questionImages", maxCount: 100 },
  ]);

  upload(req, res, next);
};

export const handleUploadError = (error, req, res, next) => {
  console.log("Upload error occurred:", error);
  console.log("Request file:", req.file);
  console.log("Request files:", req.files);

  if (error instanceof multer.MulterError) {
    console.log("Multer error code:", error.code);
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message:
          "File too large. Maximum size: 5MB for images, 100MB for videos.",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files uploaded.",
      });
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field in upload.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "File upload error: " + error.message,
    });
  }

  if (error.message && error.message.includes("Unexpected end of form")) {
    return res.status(400).json({
      success: false,
      message:
        "File upload corrupted. Please ensure your request contains valid multipart/form-data and try again.",
    });
  }

  if (error.message && error.message.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.message && error.message.includes("Invalid video type")) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
};
