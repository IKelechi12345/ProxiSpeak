import mongoose, { Document, Schema } from 'mongoose';
import { OfficeLayout, FurnitureItem, Obstacle } from '@proxispeak/shared';

export interface IOffice extends Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  layout: OfficeLayout;
  maxUsers: number;
  activeUsersCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const FurnitureSchema = new Schema<FurnitureItem>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['desk', 'meeting_table', 'chair', 'plant', 'couch', 'water_cooler', 'whiteboard', 'bookshelf'],
    },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    rotation: { type: Number, default: 0 },
    label: { type: String },
    color: { type: String },
  },
  { _id: false }
);

const ObstacleSchema = new Schema<Obstacle>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['wall', 'glass_partition', 'door', 'pillar'],
    },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    attenuationFactor: { type: Number, required: true, min: 0, max: 1 },
    label: { type: String },
  },
  { _id: false }
);

const OfficeSchema = new Schema<IOffice>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    maxUsers: {
      type: Number,
      default: 50,
      min: 2,
      max: 200,
    },
    activeUsersCount: {
      type: Number,
      default: 0,
    },
    layout: {
      dimensions: {
        width: { type: Number, default: 1800 },
        height: { type: Number, default: 1200 },
      },
      furniture: [FurnitureSchema],
      obstacles: [ObstacleSchema],
      spawnPoint: {
        x: { type: Number, default: 900 },
        y: { type: Number, default: 600 },
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Office = mongoose.model<IOffice>('Office', OfficeSchema);
