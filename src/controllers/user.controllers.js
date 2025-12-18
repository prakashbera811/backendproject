import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import User from "../models/user.models.js"
import {uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
  //get data from frontend
  const { userName, fullName, email, password } = req.body;
  console.log(req.body);
  //validate the data
  if (
    [userName, fullName, email, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new apiError(400, "all field are required");
  }

  //check if user already exists : username or email
  const existedUser = User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existedUser) {
    throw new apiError(409, "username email already exist");
  }

  //check for image and avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  console.log(avatarLocalPath);
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new apiError(400, "avatar is required");
  }
//upload cloudinary

const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverImage =await uploadOnCloudinary(coverImageLocalPath)

if(!avatar){
throw new apiError(400,"avatar is required")
}

const user = User.create({
    userName,
    avatar : avatar.url,
    coverImage : coverImage?.url || "",
    email,
    password,
    userName : userName.toLowerCase()
})

const createdUser = User.findById(user._id).select(
    "-password -refreshTokens"
)
if(!createdUser){
    throw new apiError(500,"something went wrong while registering the user")
}

res.Status(201).json(
 new apiResponse(200,"user register successfully",createdUser)
)



});



export { registerUser };
