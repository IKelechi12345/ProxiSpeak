/**
 * ProxiSpeak Shared Types & Data Contracts
 * Geospatial Proximity Audio Ecosystem
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export type FurnitureType =
  | 'desk'
  | 'meeting_table'
  | 'chair'
  | 'plant'
  | 'couch'
  | 'water_cooler'
  | 'whiteboard'
  | 'bookshelf';

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees 0, 90, 180, 270
  label?: string;
  color?: string;
}

export type ObstacleType = 'wall' | 'glass_partition' | 'door' | 'pillar';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  attenuationFactor: number; // 0.0 = transparent, 1.0 = blocks 100% sound
  label?: string;
}

export interface OfficeLayout {
  dimensions: Dimensions; // default e.g. 1600x1200
  furniture: FurnitureItem[];
  obstacles: Obstacle[];
  spawnPoint: Position;
}

export interface Office {
  _id: string;
  name: string;
  description?: string;
  ownerId: string;
  layout: OfficeLayout;
  maxUsers: number;
  activeUsersCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  userId: string;
  username: string;
  avatar: string;
  officeId: string;
  position: Position;
  direction: Direction;
  isMoving: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  lastSeen: number;
}

export interface ProximityRelationship {
  peerId: string;
  username: string;
  avatar: string;
  distance: number;
  relativeX: number; // For stereo panning (-1.0 to 1.0)
  relativeY: number;
  attenuation: number; // 0.0 to 1.0 (1.0 = full volume, 0.0 = silent)
  isObstructed: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
}

// Socket.io Real-time Event Payloads
export interface JoinOfficePayload {
  officeId: string;
  initialPosition?: Position;
}

export interface MovementPayload {
  position: Position;
  direction: Direction;
  isMoving: boolean;
  timestamp: number;
}

export interface AvatarUpdatePayload {
  userId: string;
  position: Position;
  direction: Direction;
  isMoving: boolean;
  timestamp: number;
}

export interface OfficeJoinedPayload {
  office: Office;
  localParticipant: Participant;
  participants: Participant[];
  nearbyPeerIds: string[];
}

export interface ProximityEnterPayload {
  peerId: string;
  username: string;
  avatar: string;
  distance: number;
  relativeX: number;
  relativeY: number;
  attenuation: number;
  isObstructed: boolean;
  shouldInitiateOffer: boolean; // Deterministic polite peer flag
}

export interface ProximityLeavePayload {
  peerId: string;
  reason?: 'out_of_range' | 'left_office' | 'disconnected';
}

export interface ProximityUpdatePayload {
  relationships: ProximityRelationship[];
}

// WebRTC Signaling Payloads
export interface SignalingOfferPayload {
  targetUserId: string;
  senderUserId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface SignalingAnswerPayload {
  targetUserId: string;
  senderUserId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface SignalingIceCandidatePayload {
  targetUserId: string;
  senderUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface AudioStatePayload {
  userId: string;
  isMuted: boolean;
  isSpeaking?: boolean;
}

export interface SpatialAuditReport {
  timestamp: string;
  queryCount: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
  meetsTarget: boolean; // avg & p95 < 20ms
}
