import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import User from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";
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
    avatarPublicId: avatar.public_id,
    coverImage: coverImage?.secure_url || "",
    coverImagePublicId: coverImage?.public_id || null,
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
      $unset: { refreshTokens: 1 },
    },
    {
      new: true,
      validateBeforeSave: false,
    }
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("refreshToken", "", option)
    .clearCookie("accessToken", "", option)
    .json(new apiResponse(200, "user logged out successfully", null));
});

//access and refresh token generation function export
const accessAndRefreshToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "unauthorized access, token missing");
  }
  //verify the token
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    //check if user exists
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshTokens"
    );
    if (!user) {
      throw new apiError(401, "unauthorized access, user not found");
    }

    if (user.refreshTokens !== incomingRefreshToken) {
      throw new apiError(401, "unauthorized access, invalid refresh token");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    const option = {
      httpOnly: true,
      secure: true,
    };
    res
      .status(200)
      .cookie("refreshToken", newRefreshToken, option)
      .cookie("accessToken", accessToken, option)
      .json(
        new apiResponse(
          200,
          "new access and refresh token generated successfully",
          {
            accessToken,
            refreshToken: newRefreshToken,
          }
        )
      );
  } catch (error) {
    throw new apiError(401, "unauthorized access, invalid refresh token");
  }
});

//change password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  //validate input
  if (!oldPassword || !newPassword) {
    throw new apiError(400, "old password and new password are required");
  }
  //check database for user
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new apiError(404, "user not found");
  }
  //compare old password
  const isPasswordValid = await user.comparePassword(oldPassword);
  if (!isPasswordValid) {
    throw new apiError(400, "old password is incorrect");
  }
  //update new password
  user.password = newPassword;
  await user.save();

  res
    .status(200)
    .json(new apiResponse(200, "password changed successfully", null));
});

//get current user details
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id).select(
    "-password -refreshTokens"
  );
  if (!user) {
    throw new apiError(404, "user not found");
  }
  res
    .status(200)
    .json(
      new apiResponse(200, "current user details fetched successfully", user)
    );
});

//user profile update
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new apiError(400, "full name and email are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email?.toLowerCase(),
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshTokens");
  if (!user) {
    throw new apiError(404, "user not found");
  }

  res
    .status(200)
    .json(
      new apiResponse(200, "user account details updated successfully", user)
    );
});

//update avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new apiError(400, "avatar image is required");
  }
  //delete previous avatar from cloudinary
  const currentUser = await User.findById(req.user?._id);
  if (!currentUser) {
    throw new apiError(404, "user not found");
  }
  if (currentUser.avatarPublicId) {
    await deleteFromCloudinary(currentUser.avatarPublicId);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar || !avatar.secure_url) {
    throw new apiError(400, "avatar upload failed");
  }

  //new photo uploaded
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.secure_url,
        avatarPublicId: avatar.public_id,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshTokens");

  if (!user) {
    throw new apiError(404, "user not found for avatar update");
  }

  res
    .status(200)
    .json(new apiResponse(200, "user avatar updated successfully", user));
});

//update cover image
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new apiError(400, "cover image is required");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage || !coverImage.secure_url) {
    throw new apiError(400, "cover image upload failed");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.secure_url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshTokens");

  if (!user) {
    throw new apiError(404, "user not found for cover image update");
  }
  res
    .status(200)
    .json(new apiResponse(200, "user cover image updated successfully", user));
});

//get User Channels Subscriptions
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new apiError(400, "username is required");
  }

  const channel = User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },

      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            $if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
              then: true,
              else: false,
            },
          },
        },
      },
    },
    {
      $project: {
        userName: 1,
        fullName: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);
  if (!channel || channel.length === 0) {
    throw new apiError(404, "channel not found");
  }

  res
    .status(200)
    .json(
      new apiResponse(200, "channel profile fetched successfully", channel[0])
    );
});
//export all functions
export {
  registerUser,
  loginUser,
  logoutUser,
  accessAndRefreshToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
