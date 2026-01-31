import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = `uploads/user_${req.user}`;

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    cb(null, userDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Only images allowed"), false);
  } else {
    cb(null, true);
  }
};

const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 12 * 1024 * 1024 }, 
});

export default uploadImage;
