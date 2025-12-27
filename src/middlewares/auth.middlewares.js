import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { apiError } from "../utils/apiError.js";
import User from "../models/user.models.js";
export const jwtVerify = asyncHandler(async (req, res, next) => {
  try {
    //get the token from headers
    const token =
      req.cookie?.refreshToken ||
      req.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new apiError(401, "unauthorized access, token missing");
    }
    //verify the token
    const decodedToken = jwt.verify(token, ACCESS_TOKEN_SECRET);

    //check if user exists
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshTokens"
    );

    if (!user) {
      throw new apiError(401, "unauthorized access, user not found");
    }

    req.user = user;
    next();
  } catch (error) {
    new apiError(401, "unauthorized access, invalid token");
  }
});
