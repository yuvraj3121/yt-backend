import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const channelStats = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "AllVideos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "video",
              as: "likes",
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
              likesCount: {
                $size: "$likes",
              },
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        totalVideo: { $size: "$AllVideos" },
        totalVideoViews: { $sum: "$AllVideos.views" },
        totalLikes: { $sum: "$AllVideos.likesCount" },
        totalSubscriber: { $size: "$subscribers" },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        totalLikes: 1,
        totalSubscriber: 1,
        totalVideo: 1,
        totalVideoViews: 1,
      },
    },
  ]);

  if (!channelStats?.length) {
    throw new apiError(
      500,
      "Channel does't exists or error while fetching channel details!"
    );
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        channelStats[0],
        "User channelStats fetched successfully."
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const userId = req.user?._id;

  if (!userId) {
    throw new apiError(400, "User ID is missing!");
  }

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullname: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
        likesCount: {
          $size: "$likes",
        },
      },
    },
  ]);

  if (!videos) {
    throw new apiError(500, "error while fetching all videos!");
  }

  return res
    .status(200)
    .json(new apiResponse(200, videos, "all videos fetched successfully."));
});

export { getChannelStats, getChannelVideos };
