import { Server } from 'socket.io';
import { AuthenticatedSocket } from './socketAuth';
import { Office } from '../models/Office';
import { proximityEngine } from '../services/proximity/proximityEngine';
import { checkCollision } from '../utils/geometry';
import {
  Participant,
  MovementPayload,
  SignalingOfferPayload,
  SignalingAnswerPayload,
  SignalingIceCandidatePayload,
  AudioStatePayload,
} from '@proxispeak/shared';
import { logger } from '../utils/logger';

// Maps userId to socketId for direct targeted signaling
const userSocketMap = new Map<string, string>();
const socketUserMap = new Map<string, string>();

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect();
      return;
    }

    userSocketMap.set(user.id, socket.id);
    socketUserMap.set(socket.id, user.id);
    logger.info(`User connected: ${user.username} (${user.id}) on socket ${socket.id}`);

    /**
     * office:join
     */
    socket.on('office:join', async (data: { officeId: string; initialPosition?: { x: number; y: number } }, callback?: (res: any) => void) => {
      try {
        const { officeId, initialPosition } = data;
        const office = await Office.findById(officeId);
        if (!office) {
          if (callback) callback({ success: false, message: 'Office does not exist' });
          return;
        }

        // Leave existing office room if any
        if (socket.data.officeId && socket.data.officeId !== officeId) {
          handleLeaveOffice(socket, io);
        }

        // Cache office obstacles in proximity engine
        proximityEngine.setOfficeObstacles(officeId, office.layout.obstacles || []);

        const spawnPos = initialPosition || office.layout.spawnPoint || { x: 750, y: 540 };

        const participant: Participant = {
          userId: user.id,
          username: user.username,
          avatar: user.avatar,
          officeId,
          position: spawnPos,
          direction: 'down',
          isMoving: false,
          isMuted: false,
          isSpeaking: false,
          lastSeen: Date.now(),
        };

        socket.data.officeId = officeId;
        socket.data.lastPosition = spawnPos;
        socket.data.lastMoveTimestamp = Date.now();

        // Join Socket.io room
        const roomName = `office:${officeId}`;
        socket.join(roomName);

        // Update proximity engine
        const diff = proximityEngine.updateParticipant(officeId, participant);
        const allParticipants = proximityEngine.getParticipantsInOffice(officeId);

        // Broadcast to existing office members that a user joined
        socket.to(roomName).emit('user:joined', participant);

        // Notify entered proximity peers
        for (const entered of diff.enteredPeers) {
          const remoteSocketId = userSocketMap.get(entered.peer.userId);
          if (remoteSocketId) {
            // Send enter event to remote peer
            io.to(remoteSocketId).emit('proximity:enter', {
              peerId: user.id,
              username: user.username,
              avatar: user.avatar,
              distance: entered.distance,
              relativeX: -entered.relativeX, // Inverted perspective for peer
              relativeY: -entered.relativeY,
              attenuation: entered.attenuation,
              isObstructed: entered.isObstructed,
              shouldInitiateOffer: !entered.shouldInitiateOffer,
            });

            // Send enter event to local user
            socket.emit('proximity:enter', {
              peerId: entered.peer.userId,
              username: entered.peer.username,
              avatar: entered.peer.avatar,
              distance: entered.distance,
              relativeX: entered.relativeX,
              relativeY: entered.relativeY,
              attenuation: entered.attenuation,
              isObstructed: entered.isObstructed,
              shouldInitiateOffer: entered.shouldInitiateOffer,
            });
          }
        }

        const nearbyPeerIds = diff.currentRelationships.map((r) => r.peerId);

        const responsePayload = {
          office: {
            _id: office._id.toString(),
            name: office.name,
            description: office.description,
            ownerId: office.ownerId.toString(),
            layout: office.layout,
            maxUsers: office.maxUsers,
            activeUsersCount: allParticipants.length,
            createdAt: office.createdAt.toISOString(),
            updatedAt: office.updatedAt.toISOString(),
          },
          localParticipant: participant,
          participants: allParticipants,
          nearbyPeerIds,
        };

        socket.emit('office:joined', responsePayload);
        if (callback) callback({ success: true, data: responsePayload });

        logger.info(`User ${user.username} joined office ${office.name} (${officeId}). Participants: ${allParticipants.length}`);
      } catch (err: any) {
        logger.error(`Error in office:join: ${err.message}`);
        if (callback) callback({ success: false, message: err.message });
      }
    });

    /**
     * avatar:move - Real-time Movement & Server-Authoritative Validation
     */
    socket.on('avatar:move', async (payload: MovementPayload) => {
      const officeId = socket.data.officeId;
      if (!officeId) return;

      const { position, direction, isMoving, timestamp } = payload;
      if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        return;
      }

      // Movement Speed & Sanity Check (Max speed 300px/s or 50px per update)
      const lastPos = socket.data.lastPosition;
      if (lastPos) {
        const dx = position.x - lastPos.x;
        const dy = position.y - lastPos.y;
        const stepDist = Math.sqrt(dx * dx + dy * dy);
        // Teleportation protection: reject updates exceeding 80px in a single tick
        if (stepDist > 80) {
          logger.warn(`Rejected invalid leap/teleport by user ${user.username}: ${stepDist}px`);
          return;
        }
      }

      const participant: Participant = {
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        officeId,
        position,
        direction: direction || 'down',
        isMoving: !!isMoving,
        isMuted: false,
        isSpeaking: false,
        lastSeen: Date.now(),
      };

      socket.data.lastPosition = position;
      socket.data.lastMoveTimestamp = timestamp || Date.now();

      // Update position in the spatial proximity engine
      const diff = proximityEngine.updateParticipant(officeId, participant);

      // Broadcast new position to other participants in this office
      socket.to(`office:${officeId}`).emit('avatar:update', {
        userId: user.id,
        position,
        direction: participant.direction,
        isMoving: participant.isMoving,
        timestamp: Date.now(),
      });

      // Handle newly entered proximity peers
      for (const entered of diff.enteredPeers) {
        const remoteSocketId = userSocketMap.get(entered.peer.userId);
        if (remoteSocketId) {
          // Tell remote peer that local user entered
          io.to(remoteSocketId).emit('proximity:enter', {
            peerId: user.id,
            username: user.username,
            avatar: user.avatar,
            distance: entered.distance,
            relativeX: -entered.relativeX,
            relativeY: -entered.relativeY,
            attenuation: entered.attenuation,
            isObstructed: entered.isObstructed,
            shouldInitiateOffer: !entered.shouldInitiateOffer,
          });

          // Tell local user that remote peer entered
          socket.emit('proximity:enter', {
            peerId: entered.peer.userId,
            username: entered.peer.username,
            avatar: entered.peer.avatar,
            distance: entered.distance,
            relativeX: entered.relativeX,
            relativeY: entered.relativeY,
            attenuation: entered.attenuation,
            isObstructed: entered.isObstructed,
            shouldInitiateOffer: entered.shouldInitiateOffer,
          });
        }
      }

      // Handle exited proximity peers
      for (const leftPeerId of diff.leftPeerIds) {
        const remoteSocketId = userSocketMap.get(leftPeerId);
        if (remoteSocketId) {
          io.to(remoteSocketId).emit('proximity:leave', {
            peerId: user.id,
            reason: 'out_of_range',
          });
        }
        socket.emit('proximity:leave', {
          peerId: leftPeerId,
          reason: 'out_of_range',
        });
      }

      // Send continuous distance and stereo panning updates to local user
      if (diff.currentRelationships.length > 0) {
        socket.emit('proximity:update', {
          relationships: diff.currentRelationships,
        });
      }
    });

    /**
     * audio:mute and audio:speaking
     */
    socket.on('audio:mute', (data: { isMuted: boolean }) => {
      const officeId = socket.data.officeId;
      if (!officeId) return;

      const p = proximityEngine.getParticipant(officeId, user.id);
      if (p) p.isMuted = data.isMuted;

      socket.to(`office:${officeId}`).emit('audio:state', {
        userId: user.id,
        isMuted: data.isMuted,
      });
    });

    socket.on('audio:speaking', (data: { isSpeaking: boolean }) => {
      const officeId = socket.data.officeId;
      if (!officeId) return;

      const p = proximityEngine.getParticipant(officeId, user.id);
      if (p) p.isSpeaking = data.isSpeaking;

      socket.to(`office:${officeId}`).emit('audio:state', {
        userId: user.id,
        isMuted: p ? p.isMuted : false,
        isSpeaking: data.isSpeaking,
      });
    });

    /**
     * WebRTC Signaling: offer, answer, ice-candidate
     * Targeted direct messaging between authorized peers in the same office.
     */
    socket.on('webrtc:offer', (payload: SignalingOfferPayload) => {
      const targetSocketId = userSocketMap.get(payload.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:offer', {
          senderUserId: user.id,
          targetUserId: payload.targetUserId,
          sdp: payload.sdp,
        });
      }
    });

    socket.on('webrtc:answer', (payload: SignalingAnswerPayload) => {
      const targetSocketId = userSocketMap.get(payload.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:answer', {
          senderUserId: user.id,
          targetUserId: payload.targetUserId,
          sdp: payload.sdp,
        });
      }
    });

    socket.on('webrtc:ice-candidate', (payload: SignalingIceCandidatePayload) => {
      const targetSocketId = userSocketMap.get(payload.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:ice-candidate', {
          senderUserId: user.id,
          targetUserId: payload.targetUserId,
          candidate: payload.candidate,
        });
      }
    });

    /**
     * office:leave
     */
    socket.on('office:leave', () => {
      handleLeaveOffice(socket, io);
    });

    /**
     * disconnect
     */
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${user.username} (${user.id})`);
      handleLeaveOffice(socket, io);
      userSocketMap.delete(user.id);
      socketUserMap.delete(socket.id);
    });
  });
}

function handleLeaveOffice(socket: AuthenticatedSocket, io: Server): void {
  const officeId = socket.data.officeId;
  const user = socket.data.user;
  if (!officeId || !user) return;

  const roomName = `office:${officeId}`;
  socket.leave(roomName);

  const { leftPeerIds } = proximityEngine.removeParticipant(officeId, user.id);

  // Notify previously connected peers that user left proximity
  for (const peerId of leftPeerIds) {
    const remoteSocketId = userSocketMap.get(peerId);
    if (remoteSocketId) {
      io.to(remoteSocketId).emit('proximity:leave', {
        peerId: user.id,
        reason: 'left_office',
      });
    }
  }

  // Notify office members
  io.to(roomName).emit('user:left', { userId: user.id });

  socket.data.officeId = undefined;
  logger.info(`User ${user.username} left office ${officeId}`);
}
