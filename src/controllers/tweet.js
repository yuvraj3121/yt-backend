import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.js";
import { User } from "../models/user.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (content?.trim() === "") throw new apiError(400, "Content is required.");

  const user = await User.findById(req.user?._id);

  if (!user) throw new apiError(404, "User not found.");

  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  if (!tweet)
    throw new apiError(500, "Something went wrong while creating tweet");

  return res
    .status(201)
    .json(new apiResponse(200, tweet, "Tweet created successfully."));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userid } = req.params;

  if (!userid) {
    throw new apiError(400, "userId is missing!");
  }

  if (!isValidObjectId(userid)) {
    throw new apiError(400, "Invalid userId.");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userid),
      },
    },
    {
      $group: {
        _id: "$owner",
        tweets: { $push: "$content" },
      },
    },
    {
      $project: {
        _id: 0,
        tweets: 1,
      },
    },
  ]);

  if (tweets.length === 0) {
    throw new apiError(404, "user has no tweets.");
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        201,
        tweets[0].tweets,
        "user tweets fetched successfully."
      )
    );
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!content) throw new apiError(400, "Content is required!");

  if (!isValidObjectId(tweetId)) throw new apiError(400, "Invalid tweet ID.");

  const tweet = await Tweet.findOneAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );

  if (!tweet)
    throw new apiError(404, "Tweet not found or not authorized to update.");

  return res
    .status(200)
    .json(new apiResponse(200, tweet, "Tweet updated successfully."));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) throw new apiError(400, "Invalid tweet ID.");

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) throw new apiError(404, "tweet not found!");

  const deletedTweet = await Tweet.findOneAndDelete(tweetId);

  if (!deletedTweet)
    throw new apiError(404, "Tweet not found or not authorized to delete.");

  return res
    .status(200)
    .json(new apiResponse(200, deletedTweet, "Tweet deleted successfully."));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
