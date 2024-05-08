import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String,
      required: [true, "required"],
    },
    thumbnail: {
      type: String,
      required: [true, "required"],
    },
    title: {
      type: String,
      required: [true, "required"],
    },
    description: {
      type: String,
      required: [true, "required"],
    },
    duration: {
      type: Number,
      required: [true, "required"],
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
