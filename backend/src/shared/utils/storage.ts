import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
const path = require('path');

export const storage = (destination) => ({
  storage: diskStorage({
    destination: `./assets/uploads/${destination}`,
    filename: (req, file, cb) => {
      const filename =
        path.parse(file.originalname).name.replace(/\s/g, '') + uuidv4();
      const extension = path.parse(file.originalname).ext;
      cb(null, `${filename}${extension}`);
    },
  }),
});
