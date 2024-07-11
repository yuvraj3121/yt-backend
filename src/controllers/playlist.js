import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.js";
import { Video } from "../models/video.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  //TODO: create playlist
  if (!name || name.trim() === "")
    throw new apiError(400, "title is required!");
  if (!description || description.trim() === "")
    throw new apiError(400, "description is required!");

  const user = await User.findById(req.user?._id);

  if (!user) throw new apiError(400, "user not found");

  const findPlaylist = await Playlist.findOne({
    name,
    description,
    owner: req.user?._id,
  });

  if (findPlaylist)
    throw new apiError(
      400,
      "playlist with same name and description already exists!"
    );

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });

  if (!playlist)
    throw new apiError(500, "something went wrong while creating playlist!");

  return res
    .status(200)
    .json(new apiResponse(200, playlist, "playlist created successfully."));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  if (!userId) throw new apiError(400, "userId is missing!");
  if (!isValidObjectId(userId)) throw new apiError(400, "userId is invalid!");

  const user = await User.findById(userId);

  if (!user) throw new apiError(400, "user not found!");

  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
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
            $addFields: {
              owner: { $arrayElemAt: ["$owner", 0] },
            },
          },
        ],
      },
    },
  ]);

  if (!playlists) throw new apiError(500, "error while fetching playlists");

  return res
    .status(200)
    .json(new apiResponse(200, playlists, "playlists fetched successfully."));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  if (!playlistId) throw new apiError(400, "playlistId is missing!");
  if (!isValidObjectId(playlistId))
    throw new apiError(400, "playlistId is invalid!");

  const findPlaylist = await Playlist.findById(playlistId);
  if (!findPlaylist) throw new apiError(400, "playlist not found!");

  const playlists = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
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
            $addFields: {
              owner: { $arrayElemAt: ["$owner", 0] },
            },
          },
        ],
      },
    },
  ]);

  if (!playlists) throw new apiError(500, "error while fetching playlists");

  return res
    .status(200)
    .json(new apiResponse(200, playlists, "playlists fetched successfully."));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId) throw new apiError(400, "playlistId is missing!");
  if (!isValidObjectId(playlistId))
    throw new apiError(400, "playlistId is invalid!");

  if (!videoId) throw new apiError(400, "videoId is missing!");
  if (!isValidObjectId(videoId)) throw new apiError(400, "videoId is invalid!");

  const findPlaylist = await Playlist.findById(playlistId);
  if (!findPlaylist) throw new apiError(400, "playlist not found!");

  const findVideo = await Video.findById(videoId);
  if (!findVideo) throw new apiError(400, "video not found!");

  if (!findPlaylist.owner.equals(req.user?._id))
    throw new apiError(400, "unauthorized access!");

  const addVideo = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $push: {
        videos: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      new: true,
    }
  );

  if (!addVideo) throw new apiError(500, "error while adding video!");

  return res
    .status(200)
    .json(
      new apiResponse(200, addVideo, "video added to playlist successfully.")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
  if (!playlistId) throw new apiError(400, "playlistId is missing!");
  if (!isValidObjectId(playlistId))
    throw new apiError(400, "playlistId is invalid!");

  if (!videoId) throw new apiError(400, "videoId is missing!");
  if (!isValidObjectId(videoId)) throw new apiError(400, "videoId is invalid!");

  const findPlaylist = await Playlist.findById(playlistId);
  if (!findPlaylist) throw new apiError(400, "playlist not found!");

  const findVideo = await Video.findById(videoId);
  if (!findVideo) throw new apiError(400, "video not found!");

  if (!findPlaylist.owner.equals(req.user?._id))
    throw new apiError(400, "unauthorized access!");

  const removeVideo = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        videos: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      new: true,
    }
  );

  if (!removeVideo) throw new apiError(500, "error while removing video!");

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        removeVideo,
        "video removed from the playlist successfully."
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  if (!playlistId) throw new apiError(400, "playlistId is missing!");
  if (!isValidObjectId(playlistId))
    throw new apiError(400, "playlistId is invalid!");

  const findPlaylist = await Playlist.findById(playlistId);
  if (!findPlaylist) throw new apiError(400, "playlist not found!");

  if (!findPlaylist.owner.equals(req.user?._id))
    throw new apiError(400, "unauthorized access!");

  const playlist = await Playlist.findByIdAndDelete(playlistId);

  if (!playlist) throw new apiError(500, "error while deleting playlist!");

  return res
    .status(200)
    .json(new apiResponse(200, playlist, "playlist deleted successfully."));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist

  if (!playlistId) throw new apiError(400, "playlistId is missing!");
  if (!isValidObjectId(playlistId))
    throw new apiError(400, "playlistId is invalid!");

  const findPlaylist = await Playlist.findById(playlistId);
  if (!findPlaylist) throw new apiError(400, "playlist not found!");

  if (!findPlaylist.owner.equals(req.user?._id))
    throw new apiError(400, "unauthorized access!");

  if (!name || name.trim() === "")
    throw new apiError(400, "title is required!");
  if (!description || description.trim() === "")
    throw new apiError(400, "description is required!");

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist)
    throw new apiError(500, "something went wrong while updating playlist!");

  return res
    .status(200)
    .json(
      new apiResponse(200, updatedPlaylist, "playlist updated successfully.")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
