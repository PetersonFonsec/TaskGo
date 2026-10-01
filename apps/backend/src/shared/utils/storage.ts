import { diskStorage } from 'multer';
import path from 'path';
import { randomUUID } from 'node:crypto';

export const storage = (destination) => ({
  storage: diskStorage({
    destination: `./assets/uploads/${destination}`,
    filename: (req, file, cb) => {
      const filename =
        path.parse(file.originalname).name.replace(/\s/g, '') + randomUUID();
      const extension = path.parse(file.originalname).ext;
      cb(null, `${filename}${extension}`);
    },
  }),
});
