import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.js";
import { Like } from "../models/like.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  if (!query || query.trim() === "") throw new apiError(404, "enter query!");

  if (!isValidObjectId(userId)) throw new apiError(400, "invalid userId!");

  const videos = await Video.aggregate([
    {
      $match: {
        $or: [
          { owner: new mongoose.Types.ObjectId(userId) },
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
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
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $addFields: {
        owner: { $arrayElemAt: ["$owner", 0] },
        likes: "$likes",
        comments: "$comments",
      },
    },
    {
      $skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
    },
    {
      $limit: parseInt(limit, 10),
    },
    {
      $sort: {
        [sortBy || "createdAt"]: parseInt(sortType, 10) || 1,
      },
    },
  ]);

  if (videos.length === 0)
    throw new apiError(500, "something went wrong while fetching videos!");

  return res
    .status(200)
    .json(new apiResponse(200, videos, "videos fetched successfully."));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if (!title || title.trim() === "")
    throw new apiError(400, "title is required!");
  if (!description || description.trim() === "")
    throw new apiError(400, "description is required!");

  const user = await User.findById(req.user?._id);

  if (!user) throw new apiError(400, "user not found");

  const published = await Video.findOne({
    title,
    description,
    isPublished: true,
  });

  if (published)
    throw new apiError(
      400,
      "video with the same title and description is already published!"
    );

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath) throw new apiError(400, "videoFile is required!");
  if (!thumbnailLocalPath) throw new apiError(400, "thumbnail is required!");

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile || !videoFile.url)
    throw new apiError(500, "Failed to upload video file!");
  if (!thumbnail || !thumbnail.url)
    throw new apiError(500, "Failed to upload thumbnail!");

  const video = await Video.create({
    videoFile: videoFile?.url || "",
    thumbnail: thumbnail?.url || "",
    title,
    description,
    duration: videoFile?.duration || 0,
    isPublished: true,
    owner: req.user?._id,
  });

  if (!video)
    throw new apiError(500, "something went wrong while creating video!");

  return res
    .status(200)
    .json(new apiResponse(200, video, "video created successfully."));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) throw new apiError(400, "video Id is missing");
  if (!isValidObjectId(videoId)) throw new apiError(400, "invalid video Id");

  const findvideo = await Video.findById(videoId);

  if (!findvideo) throw new apiError(400, "video not found");

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $addFields: {
        owner: { $arrayElemAt: ["$owner", 0] },
        likes: "$likes",
        comments: "$comments",
      },
    },
  ]);

  if (video.length === 0)
    throw new apiError(500, "something went wrong while fetching video!");

  return res
    .status(200)
    .json(new apiResponse(200, video, "video fetched successfully."));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) throw new apiError(400, "video Id is missing");
  if (!isValidObjectId(videoId)) throw new apiError(400, "invalid video Id");

  const findvideo = await Video.findById(videoId);

  if (!findvideo) throw new apiError(400, "video not found");

  //TODO: update video details like title, description, thumbnail
  const { title, description } = req.body;

  if (!title || title.trim() === "")
    throw new apiError(400, "title is required!");
  if (!description || description.trim() === "")
    throw new apiError(400, "description is required!");

  const user = await User.findById(req.user?._id);

  if (!user) throw new apiError(400, "user not found");

  const thumbnailLocalPath = req.files?.path;

  if (!thumbnailLocalPath) throw new apiError(400, "thumbnail is required!");

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail || !thumbnail.url)
    throw new apiError(500, "Failed to upload thumbnail!");

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: title,
        description: description,
        thumbnail: thumbnail?.url || "",
      },
    },
    {
      new: true,
    }
  );

  if (!video)
    throw new apiError(500, "something went wrong while updating video!");

  return res
    .status(200)
    .json(new apiResponse(200, video, "video updated successfully."));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) throw new apiError(400, "video Id is missing");
  if (!isValidObjectId(videoId)) throw new apiError(400, "invalid video Id");

  const findvideo = await Video.findById(videoId);

  if (!findvideo) throw new apiError(400, "video not found");

  const user = await User.findById(req.user?._id);

  if (!user) throw new apiError(400, "user not found");

  if (findvideo?.owner?.toString() !== req.user?._id?.toString())
    throw new apiError(401, "Unauthorized Request");

  await Comment.deleteMany({ video: videoId });
  await Like.deleteMany({ video: videoId });

  const videoFilePublicId = findvideo.videoFile.split("/").pop().split(".")[0];
  const thumbnailPublicId = findvideo.thumbnail.split("/").pop().split(".")[0];

  await deleteFromCloudinary(videoFilePublicId);
  await deleteFromCloudinary(thumbnailPublicId);

  const deletedVideo = await Video.findByIdAndDelete(videoId);

  if (!deletedVideo)
    throw new apiError(500, "something went wrong while deleting video!");

  return res.status(200).json(200, deletedVideo, "video deleted successfully.");
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) throw new apiError(400, "video Id is missing");
  if (!isValidObjectId(videoId)) throw new apiError(400, "invalid video Id");

  const findvideo = await Video.findById(videoId);

  if (!findvideo) throw new apiError(400, "video not found");

  const togglePublish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !findvideo.isPublished,
      },
    },
    {
      new: true,
    }
  );

  if (!togglePublish)
    throw new apiError(500, "something went wrong while updating!");

  return res
    .status(200)
    .json(new apiResponse(200, togglePublish, "video updated successfully."));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
