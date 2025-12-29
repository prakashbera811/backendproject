import { Router } from "express";
import { registerUser } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { loginUser } from "../controllers/user.controllers.js";
import { logoutUser } from "../controllers/user.controllers.js";
import { jwtVerify } from "../middlewares/auth.middlewares.js";
import { accessAndRefreshToken } from "../controllers/user.controllers.js";
const router = Router();

//register user
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

//login user
router.route("/login").post(loginUser);

//secure route
//logout user
router.route("/logout").post(jwtVerify, logoutUser);

router.route("/accessAndRefreshToken").post(accessAndRefreshToken);

export default router;
