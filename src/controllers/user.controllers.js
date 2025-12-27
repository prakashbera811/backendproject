import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import User from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

//function to generate access and refresh token
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshTokens = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(500, "token generation failed");
  }
};

//register user
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
  if (req.files && req.files.coverImage && req.files.coverImage[0]) {
    coverImageLocalPath = req.files.coverImage[0].path;
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

//login user
const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  //find the user
  //password check
  //access and refresh token
  //send cookie
  const { email, userName, password } = req.body;
  //validate the data
  if (!(email || userName) || !password) {
    throw new apiError(400, "all field are required");
  }
  //check if user exists
  const user = await User.findOne({
    $or: [{ email }, { userName }],
  });
  if (!user) {
    throw new apiError(404, "user not found, invalid credentials");
  }
  //compare password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new apiError(404, "user not found, invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedUser = await User.findById(user._id).select(
    "-password -refreshTokens"
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .cookie("refreshToken", refreshToken, option)
    .cookie("accessToken", accessToken, option)
    .json(
      new apiResponse(200, "user logged in successfully", {
        user: loggedUser,
        accessToken,
        refreshToken,
      })
    );
});

//logout user
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshTokens: undefined },
    },
    {
      new: true,
      validateBeforeSave: false,
    }
  );

  const option = {
    httpOnly: true,
    secure: true,
    expires: new Date(0),
  };

  res
    .status(200)
    .cookie("refreshToken", "", option)
    .cookie("accessToken", "", option)
    .json(new apiResponse(200, "user logged out successfully", null));
});

export { registerUser, loginUser };
