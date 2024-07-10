import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) throw new apiError(400, "channelId is missing!");

  if (!isValidObjectId(channelId))
    throw new apiError(400, "invalid channelId!");

  const channel = await User.findById(channelId);

  if (!channel) throw new apiError(400, "channel not found!");

  const subscribed = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (!subscribed) {
    const subscribe = await Subscription.create({
      subscriber: req.user?._id,
      channel: channelId,
    });

    if (!subscribe)
      throw new apiError(
        500,
        "something went wrong while subscribing the channel!"
      );

    return res
      .status(200)
      .json(
        new apiResponse(200, subscribe, "channel subscribed successfully.")
      );
  }

  const unsubscribe = await Subscription.findOneAndDelete({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (!unsubscribe)
    throw new apiError(
      500,
      "something went wrong while unsubscribing the channel!"
    );

  return res
    .status(200)
    .json(
      new apiResponse(200, unsubscribe, "channel unsubscribe successfully.")
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) throw new apiError(400, "channelId is missing!");

  if (!isValidObjectId(channelId))
    throw new apiError(400, "invalid channelId!");

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
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
      $project: {
        _id: 0,
        subscribers: { $arrayElemAt: ["$subscribers", 0] },
      },
    },
  ]);

  if (subscribers.length === 0)
    throw new apiError(500, "channel has no subscribers!");

  return res
    .status(200)
    .json(
      new apiResponse(200, subscribers, "subscribers fetched successfully.")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId) throw new apiError(400, "subscriberId is missing!");

  if (!isValidObjectId(subscriberId))
    throw new apiError(400, "invalid subscriberId!");

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannels",
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
      $project: {
        _id: 0,
        subscribedChannels: { $arrayElemAt: ["$subscribedChannels", 0] },
      },
    },
  ]);

  if (subscribedChannels.length === 0)
    throw new apiError(500, "No subscribed channels found!");

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        subscribedChannels,
        "Subscribed channels fetched successfully."
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
