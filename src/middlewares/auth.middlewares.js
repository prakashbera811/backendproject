import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { apiError } from "../utils/apiError.js";
import User from "../models/user.models.js";
export const jwtVerify = asyncHandler(async (req, res, next) => {
  
    //get the token from headers
    const token =
      req.cookies?.accessToken ||
      req.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new apiError(401, "unauthorized access, token missing");
    }
    //verify the token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    //check if user exists
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshTokens"
    );

    if (!user) {
      throw new apiError(401, "unauthorized access, user not found");
    }

    req.user = user;
    next();
 
});
