import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import User from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //get data from frontend
  const { userName, fullName, email, password } = req.body;
  console.log(req.body);
  //validate the data
  if (
    [userName, fullName, email, password].some(
      (field) => !field || field?.trim() === ""
    )
  ) {
    throw new apiError(400, "all field are required");
  }

  //check if user already exists : username or email
  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existedUser) {
    throw new apiError(409, "username email already exist");
  }

  //check for image and avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  console.log(avatarLocalPath);
  //  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if(req.files && req.files.coverImage && req.files.coverImage[0]){
  coverImageLocalPath = req.files.coverImage[0].path
  }
  if (!avatarLocalPath) {
    throw new apiError(400, "avatar1 is required");
  }
  console.log("req files", req.files);

  //upload cloudinary

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatar || !avatar.secure_url) {
    throw new apiError(400, "avatar upload failed");
  }
  // console.log("cover image", coverImage);
  // console.log("avatar", avatar);

  //create user
  const user = await User.create({
    fullName,
    avatar: avatar.secure_url,
    coverImage: coverImage?.secure_url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });
  //remove password and refresh token
  const createdUser = await User.findById(user._id).select(
    "-password -refreshTokens"
  );
  if (!createdUser) {
    throw new apiError(500, "something went wrong while registering the user");
  }

  res
    .status(201)
    .json(new apiResponse(200, "user register successfully", createdUser));
});

export { registerUser };
