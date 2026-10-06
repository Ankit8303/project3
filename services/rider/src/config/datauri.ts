import path from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const getBuffer = (file: { originalname: string; buffer: Buffer }) => {
  const extName = path.extname(file.originalname).toLowerCase();
  const mimeType = MIME_TYPES[extName];

  if (!mimeType) {
    throw new Error("Unsupported image type");
  }

  return {
    content: `data:${mimeType};base64,${file.buffer.toString("base64")}`,
  };
};

export default getBuffer;
