import multer from "multer";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const storage = multer.memoryStorage();

const uploadFile = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_TYPES.has(file.mimetype)) return cb(new Error("Only JPEG, PNG, or WebP images are allowed"));
    cb(null, true);
  },
}).single("file");

export default uploadFile;
