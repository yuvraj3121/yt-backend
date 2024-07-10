import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.js";
import { Comment } from "../models/comment.js";
import { Tweet } from "../models/tweet.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleLike = async (Model, modelName, Id, userId) => {
  if (!Id) throw new apiError(404, `${modelName}Id is missing!`);

  if (!isValidObjectId(Id)) throw new apiError(404, `invalid ${modelName}Id!`);

  const model = await Model.findById(Id);

  if (!model) throw new apiError(404, `${modelName} not found!`);

  const liked = await Like.findOne({ [modelName]: Id, likedBy: userId });

  if (!liked) {
    const like = await Like.create({
      [modelName]: Id,
      likedBy: userId,
    });

    if (!like)
      throw new apiError(
        500,
        `something went wrong while liking the ${modelName}!`
      );

    return { response: like, msg: `${modelName} Liked successfully` };
  }

  const dislike = await Like.findOneAndDelete({
    _id: liked._id,
  });

  if (!dislike)
    throw new apiError(
      500,
      `something went wrong while disliking the ${modelName}!`
    );

  return { response: dislike, msg: `${modelName} disliked successfully` };
};

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { response, msg } = await toggleLike(
    Video,
    "video",
    videoId,
    req.user?._id
  );

  return res.status(200).json(new apiResponse(200, response, msg));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const { response, msg } = await toggleLike(
    Comment,
    "comment",
    commentId,
    req.user?._id
  );

  return res.status(200).json(new apiResponse(200, response, msg));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const { response, msg } = await toggleLike(
    Tweet,
    "tweet",
    tweetId,
    req.user?._id
  );

  return res.status(200).json(new apiResponse(200, response, msg));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  if (!req.user?._id) throw new apiError(404, "user not found!!");

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
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
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $arrayElemAt: ["$owner", 0],
              },
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: "likedBy",
        likedlikedVideos: { $push: "$likedVideos" },
      },
    },
    {
      $project: {
        _id: 0,
        likedVideos: { $arrayElemAt: ["$likedVideos", 0] },
      },
    },
  ]);

  if (likedVideos.length === 0)
    throw new apiError(500, "No liked videos found.");

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        likedVideos[0],
        "All liked videos fetehed successfully."
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
