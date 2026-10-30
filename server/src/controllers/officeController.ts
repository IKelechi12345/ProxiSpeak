import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Office } from '../models/Office';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { createDefaultOfficeLayout } from '../services/persistence/officeService';
import { proximityEngine } from '../services/proximity/proximityEngine';

export const createOfficeSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(500).optional().default(''),
  maxUsers: z.number().min(2).max(200).optional().default(50),
  layout: z
    .object({
      dimensions: z.object({
        width: z.number().min(800).max(4000),
        height: z.number().min(600).max(4000),
      }),
      furniture: z.array(z.any()),
      obstacles: z.array(z.any()),
      spawnPoint: z.object({
        x: z.number(),
        y: z.number(),
      }),
    })
    .optional(),
});

export const updateOfficeSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).optional(),
  maxUsers: z.number().min(2).max(200).optional(),
  layout: z
    .object({
      dimensions: z.object({
        width: z.number().min(800).max(4000),
        height: z.number().min(600).max(4000),
      }),
      furniture: z.array(z.any()),
      obstacles: z.array(z.any()),
      spawnPoint: z.object({
        x: z.number(),
        y: z.number(),
      }),
    })
    .optional(),
});

export async function listOffices(req: Request, res: Response): Promise<void> {
  const offices = await Office.find().sort({ createdAt: -1 }).populate('ownerId', 'username email');

  // Sync active user counts from real-time proximity engine
  const formattedOffices = offices.map((off) => {
    const activeParticipants = proximityEngine.getParticipantsInOffice(off._id.toString());
    return {
      _id: off._id.toString(),
      name: off.name,
      description: off.description,
      ownerId: (off.ownerId as any)?._id?.toString() || off.ownerId.toString(),
      ownerName: (off.ownerId as any)?.username || 'Admin',
      layout: off.layout,
      maxUsers: off.maxUsers,
      activeUsersCount: activeParticipants.length,
      createdAt: off.createdAt.toISOString(),
      updatedAt: off.updatedAt.toISOString(),
    };
  });

  res.status(200).json({
    success: true,
    message: 'Offices retrieved successfully',
    data: formattedOffices,
  });
}

export async function createOffice(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { name, description, maxUsers, layout } = req.body;
  const officeLayout = layout || createDefaultOfficeLayout();

  const office = new Office({
    name,
    description: description || 'Virtual collaboration workspace powered by ProxiSpeak spatial audio.',
    ownerId: new mongoose.Types.ObjectId(req.user.id),
    maxUsers: maxUsers || 50,
    layout: officeLayout,
  });

  await office.save();

  // Load obstacles into proximity engine
  proximityEngine.setOfficeObstacles(office._id.toString(), office.layout.obstacles);

  res.status(201).json({
    success: true,
    message: 'Office created successfully',
    data: office,
  });
}

export async function getOfficeById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid office ID format' });
    return;
  }

  const office = await Office.findById(id).populate('ownerId', 'username email');
  if (!office) {
    res.status(404).json({ success: false, message: 'Office not found' });
    return;
  }

  const activeParticipants = proximityEngine.getParticipantsInOffice(office._id.toString());

  res.status(200).json({
    success: true,
    message: 'Office retrieved successfully',
    data: {
      ...office.toObject(),
      activeUsersCount: activeParticipants.length,
      activeParticipants,
    },
  });
}

export async function updateOffice(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid office ID format' });
    return;
  }

  const office = await Office.findById(id);
  if (!office) {
    res.status(404).json({ success: false, message: 'Office not found' });
    return;
  }

  // Authorization check: Only the owner can update the office layout
  if (office.ownerId.toString() !== req.user.id) {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Only the office owner can modify the office layout',
    });
    return;
  }

  const { name, description, maxUsers, layout } = req.body;
  if (name) office.name = name;
  if (description !== undefined) office.description = description;
  if (maxUsers) office.maxUsers = maxUsers;
  if (layout) {
    office.layout = layout;
    // Update live obstacle geometry in proximity engine
    proximityEngine.setOfficeObstacles(office._id.toString(), layout.obstacles || []);
  }

  await office.save();

  res.status(200).json({
    success: true,
    message: 'Office updated successfully',
    data: office,
  });
}

export async function deleteOffice(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid office ID format' });
    return;
  }

  const office = await Office.findById(id);
  if (!office) {
    res.status(404).json({ success: false, message: 'Office not found' });
    return;
  }

  if (office.ownerId.toString() !== req.user.id) {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Only the office owner can delete this office',
    });
    return;
  }

  await Office.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Office deleted successfully',
  });
}

export async function seedDefaultOffices(req: AuthenticatedRequest, res: Response): Promise<void> {
  const count = await Office.countDocuments();
  if (count > 0) {
    const existing = await Office.findOne();
    res.status(200).json({
      success: true,
      message: 'Office already exists',
      data: existing,
    });
    return;
  }

  const defaultOwnerId = req.user ? req.user.id : new mongoose.Types.ObjectId();
  const office = new Office({
    name: 'ProxiSpeak Headquarters & Open Campus',
    description: 'Flagship virtual workspace featuring open workstations, executive boardroom, acoustic glass sprint rooms, and coffee breakout lounge.',
    ownerId: defaultOwnerId,
    maxUsers: 75,
    layout: createDefaultOfficeLayout(),
  });

  await office.save();
  proximityEngine.setOfficeObstacles(office._id.toString(), office.layout.obstacles);

  res.status(201).json({
    success: true,
    message: 'Default office seeded successfully',
    data: office,
  });
}
