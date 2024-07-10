import mongoose from "mongoose";
import { Comment } from "../models/comment.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId) throw new apiError(404, "videoId is missing!");

  if (!mongoose.Types.ObjectId.isValid(videoId))
    throw new apiError(404, "videoId is invalid!");

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "commentedBy",
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
        commentedBy: {
          $arrayElemAt: ["$commentedBy", 0],
        },
      },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: parseInt(limit, 10),
    },
  ]);

  if (!comments)
    throw new apiError(500, "something went wrong while fetching comments!");

  const totalComments = await Comment.countDocuments({ video: videoId });

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { comments, totalComments },
        "Comments fetched successfully."
      )
    );
});

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.params;

  if (content?.trim() == "") throw new apiError(404, "content is required!");
  if (!videoId) throw new apiError(404, "videoId is missing!");

  if (!mongoose.Types.ObjectId.isValid(videoId))
    throw new apiError(404, "videoId is invalid!");

  const user = await User.findById(req.user?._id);

  if (!user) throw new apiError(404, "user not found!");

  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user._id,
  });

  if (!comment)
    throw new apiError(500, "something went wrong while adding comment!");

  return res
    .status(201)
    .json(new apiResponse(201, comment, "comment added successfully."));
});

const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { commentId } = req.params;

  if (!content || content?.trim() == "")
    throw new apiError(400, "content is required!");
  if (!commentId) throw new apiError(404, "comment is missing!");

  if (!mongoose.Types.ObjectId.isValid(commentId))
    throw new apiError(400, "commentId is invalid!");

  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );

  if (!comment)
    throw new apiError(500, "something went wrong while updating comment!");

  return res
    .status(201)
    .json(new apiResponse(201, comment, "comment updated successfully."));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) throw new apiError(404, "comment is missing!");

  if (!mongoose.Types.ObjectId.isValid(commentId))
    throw new apiError(400, "commentId is invalid!");

  const deletedComment = await Comment.findByIdAndDelete(commentId);

  if (!deletedComment)
    throw new apiError(500, "something went wrong while deleting comment!");

  return res
    .status(200)
    .json(
      new apiResponse(200, deletedComment, "comment deleted successfully.")
    );
});

export { getVideoComments, addComment, updateComment, deleteComment };
