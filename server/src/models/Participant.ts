import mongoose, { Document, Schema } from 'mongoose';

export interface IParticipant extends Document {
  userId: mongoose.Types.ObjectId;
  officeId: mongoose.Types.ObjectId;
  position: [number, number]; // [x, y] on Cartesian plane
  avatar: string;
  onlineStatus: boolean;
  lastSeen: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    officeId: {
      type: Schema.Types.ObjectId,
      ref: 'Office',
      required: true,
      index: true,
    },
    position: {
      type: [Number], // [x, y]
      required: true,
    },
    avatar: {
      type: String,
      default: 'avatar-1',
    },
    onlineStatus: {
      type: Boolean,
      default: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Planar 2D geospatial index for MongoDB spatial queries ($near, $geoWithin on 2D Cartesian plane)
ParticipantSchema.index({ position: '2d', officeId: 1 });

export const Participant = mongoose.model<IParticipant>('Participant', ParticipantSchema);
