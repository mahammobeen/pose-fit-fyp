const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reviewType: {
      type: String,
      enum: ["PROFESSIONAL", "PLATFORM"],
      required: true,
    },

    professional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index(
  { user: 1, professional: 1 },
  {
    unique: true,
    partialFilterExpression: {
      reviewType: "PROFESSIONAL",
      professional: { $type: "objectId" },
    },
  }
);

reviewSchema.index({
  reviewType: 1,
  professional: 1,
});

reviewSchema.index({
  reviewType: 1,
  createdAt: -1,
});

const ReviewModel = mongoose.model("Review", reviewSchema);

ReviewModel.collection
  .indexes()
  .then(async (indexes) => {
    for (const idx of indexes) {
      if (idx.name === "user_1_payment_1") {
        try {
          await ReviewModel.collection.dropIndex(
            "user_1_payment_1"
          );

          console.log(
            "Dropped legacy user_1_payment_1 index."
          );
        } catch (err) {
          console.error(
            "Index cleanup error:",
            err.message
          );
        }
      }
    }

    await ReviewModel.syncIndexes();
  })
  .catch((err) => {
    console.error(
      "Review index sync error:",
      err.message
    );
  });

module.exports = ReviewModel;