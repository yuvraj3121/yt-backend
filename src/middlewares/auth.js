import { apiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { User } from "../models/user";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new apiError(401, "Unauthorized request!");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new apiError(401, "invaild accesstoken!");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new apiError(401, error?.message || "invaild accesstoken!");
  }
});