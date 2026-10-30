import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useOfficeStore } from '../../stores/officeStore';
import { useAudioStore } from '../../stores/audioStore';
import { socketService } from '../../services/socketService';
import { checkCollision } from '../../../../server/src/utils/geometry';
import { FurnitureItem, Obstacle, Position } from '@proxispeak/shared';

const AVATAR_RADIUS = 18;
const BASE_SPEED = 3.6; // pixels per frame at 60fps
const SPRINT_MULTIPLIER = 1.6;

interface InterpolatedAvatar {
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  direction: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
}

export const OfficeCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Store references for render loop without triggering React re-renders
  const { currentOffice, localParticipant, participants, nearbyPeers, setLocalPosition } = useOfficeStore();
  const { isMuted, isSpeaking, peersSpeaking } = useAudioStore();

  const [mouseTarget, setMouseTarget] = useState<Position | null>(null);

  // Keyboard active keys set
  const activeKeys = useRef<Set<string>>(new Set());

  // Local position tracked directly in mutable ref for 60fps loop
  const localPos = useRef<Position>({
    x: localParticipant?.position.x || 750,
    y: localParticipant?.position.y || 540,
  });

  const localDirection = useRef<'up' | 'down' | 'left' | 'right'>('down');
  const isCurrentlyMoving = useRef<boolean>(false);
  const lastEmittedTime = useRef<number>(0);

  // Remote avatars smooth interpolation records
  const remoteAvatars = useRef<Map<string, InterpolatedAvatar>>(new Map());

  // Synchronize local pos from store on initial load
  useEffect(() => {
    if (localParticipant?.position) {
      localPos.current = { ...localParticipant.position };
    }
  }, [localParticipant?.userId]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) {
        activeKeys.current.add(key);
        setMouseTarget(null); // Cancel mouse movement if keyboard is used
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      activeKeys.current.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main 60 FPS RequestAnimationFrame Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // 1. Update Canvas Dimensions to match container
      const container = containerRef.current;
      if (container && (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight)) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }

      const office = currentOffice;
      const officeDim = office?.layout?.dimensions || { width: 1700, height: 1100 };
      const obstacles = office?.layout?.obstacles || [];
      const furniture = office?.layout?.furniture || [];

      // 2. Compute Movement Delta
      let moveX = 0;
      let moveY = 0;
      const keys = activeKeys.current;
      const isSprinting = keys.has('shift');
      const speed = BASE_SPEED * (isSprinting ? SPRINT_MULTIPLIER : 1);

      if (keys.has('w') || keys.has('arrowup')) {
        moveY -= 1;
        localDirection.current = 'up';
      }
      if (keys.has('s') || keys.has('arrowdown')) {
        moveY += 1;
        localDirection.current = 'down';
      }
      if (keys.has('a') || keys.has('arrowleft')) {
        moveX -= 1;
        localDirection.current = 'left';
      }
      if (keys.has('d') || keys.has('arrowright')) {
        moveX += 1;
        localDirection.current = 'right';
      }

      // Mouse click-to-move handling
      if (mouseTarget && moveX === 0 && moveY === 0) {
        const dx = mouseTarget.x - localPos.current.x;
        const dy = mouseTarget.y - localPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          moveX = dx / dist;
          moveY = dy / dist;
          if (Math.abs(dx) > Math.abs(dy)) {
            localDirection.current = dx > 0 ? 'right' : 'left';
          } else {
            localDirection.current = dy > 0 ? 'down' : 'up';
          }
        } else {
          setMouseTarget(null);
        }
      }

      // Normalize diagonal speed
      if (moveX !== 0 && moveY !== 0) {
        moveX *= Math.SQRT1_2;
        moveY *= Math.SQRT1_2;
      }

      const hasMovement = moveX !== 0 || moveY !== 0;
      isCurrentlyMoving.current = hasMovement;

      if (hasMovement) {
        const newX = localPos.current.x + moveX * speed;
        const newY = localPos.current.y + moveY * speed;

        // Collision Check (boundaries, walls, solid furniture)
        const targetPos: Position = { x: newX, y: newY };
        const collided = checkCollision(targetPos, AVATAR_RADIUS, officeDim, obstacles, furniture);

        if (!collided) {
          localPos.current = targetPos;
        } else {
          // Slide along X or Y axis if partial collision
          const trySlideX: Position = { x: newX, y: localPos.current.y };
          const trySlideY: Position = { x: localPos.current.x, y: newY };
          if (!checkCollision(trySlideX, AVATAR_RADIUS, officeDim, obstacles, furniture)) {
            localPos.current = trySlideX;
          } else if (!checkCollision(trySlideY, AVATAR_RADIUS, officeDim, obstacles, furniture)) {
            localPos.current = trySlideY;
          }
        }

        // Throttle movement network updates to ~30-40ms intervals
        const now = performance.now();
        if (now - lastEmittedTime.current > 35) {
          lastEmittedTime.current = now;
          socketService.sendMovement({
            position: { ...localPos.current },
            direction: localDirection.current,
            isMoving: true,
            timestamp: Date.now(),
          });
          setLocalPosition(localPos.current.x, localPos.current.y);
        }
      } else if (lastEmittedTime.current !== 0 && !hasMovement) {
        // Send final stopped update
        lastEmittedTime.current = 0;
        socketService.sendMovement({
          position: { ...localPos.current },
          direction: localDirection.current,
          isMoving: false,
          timestamp: Date.now(),
        });
        setLocalPosition(localPos.current.x, localPos.current.y);
      }

      // 3. Camera Transform (Centers on local avatar)
      const viewWidth = canvas.width;
      const viewHeight = canvas.height;
      const cameraX = Math.round(viewWidth / 2 - localPos.current.x);
      const cameraY = Math.round(viewHeight / 2 - localPos.current.y);

      ctx.save();
      // Clear background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      // Apply Camera Translation
      ctx.translate(cameraX, cameraY);

      // 4. Render Office Canvas Elements
      renderOfficeFloor(ctx, officeDim);
      renderZones(ctx);
      renderFurniture(ctx, furniture);
      renderObstacles(ctx, obstacles);
      renderProximityBridges(ctx, localPos.current, nearbyPeers, participants);
      renderRemoteAvatars(ctx, participants, remoteAvatars.current, peersSpeaking);
      renderLocalAvatar(ctx, localPos.current, localParticipant?.username || 'You', isMuted, isSpeaking, localDirection.current);

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentOffice, localParticipant, participants, nearbyPeers, isMuted, isSpeaking, peersSpeaking]);

  // Handle canvas click to move
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickScreenX = e.clientX - rect.left;
    const clickScreenY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const cameraX = Math.round(canvas.width / 2 - localPos.current.x);
    const cameraY = Math.round(canvas.height / 2 - localPos.current.y);
    const worldX = clickScreenX - cameraX;
    const worldY = clickScreenY - cameraY;

    setMouseTarget({ x: worldX, y: worldY });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden cursor-crosshair">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="block w-full h-full"
      />
    </div>
  );
};

// --------------------------------------------------------------------------
// CANVAS RENDERING SUBROUTINES
// --------------------------------------------------------------------------

function renderOfficeFloor(ctx: CanvasRenderingContext2D, dimensions: { width: number; height: number }) {
  const { width, height } = dimensions;

  // Main Office Floor Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // Subtle Floor Tile Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  const tileSize = 60;

  ctx.beginPath();
  for (let x = 0; x <= width; x += tileSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += tileSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // Outer Office Perimeter Boundary
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(56, 189, 248, 0.3)';
  ctx.shadowBlur = 12;
  ctx.strokeRect(0, 0, width, height);
  ctx.shadowBlur = 0;
}

function renderZones(ctx: CanvasRenderingContext2D) {
  // Executive Boardroom Zone (Top Right)
  ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
  ctx.fillRect(1120, 80, 480, 400);

  // Glass Conference Room Zone (Bottom Right)
  ctx.fillStyle = 'rgba(15, 118, 110, 0.12)';
  ctx.fillRect(1120, 580, 480, 360);

  // Lounge & Breakout Area (Bottom Left)
  ctx.fillStyle = 'rgba(71, 85, 105, 0.18)';
  ctx.fillRect(100, 680, 420, 340);

  // Zone Labels
  ctx.font = '600 12px Inter, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('EXECUTIVE BOARDROOM (SOUNDPROOF)', 1140, 115);
  ctx.fillText('SPRINT ROOM (ACOUSTIC GLASS)', 1140, 615);
  ctx.fillText('BREAKOUT LOUNGE & CAFE', 130, 705);
  ctx.fillText('OPEN COLLABORATION WORKSPACE', 240, 130);
}

function renderObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[]) {
  for (const obs of obstacles) {
    ctx.save();
    if (obs.type === 'wall') {
      // Soundproof Solid Wall
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

      // Soundproof icon/label
      if (obs.width > 80 || obs.height > 80) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px Inter, sans-serif';
        const labelX = obs.x + (obs.width > obs.height ? obs.width / 2 - 25 : 2);
        const labelY = obs.y + (obs.height > obs.width ? obs.height / 2 : 11);
        ctx.fillText('🔇 WALL', labelX, labelY);
      }
    } else {
      // Acoustic Glass Partition (Semi-transparent with cyan tint)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }
    ctx.restore();
  }
}

function renderFurniture(ctx: CanvasRenderingContext2D, furniture: FurnitureItem[]) {
  for (const item of furniture) {
    ctx.save();

    switch (item.type) {
      case 'desk': {
        // Desk Body
        ctx.fillStyle = item.color || '#1e293b';
        ctx.beginPath();
        ctx.roundRect(item.x, item.y, item.width, item.height, 6);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Dual Monitors on Desk
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(item.x + item.width / 2 - 40, item.y + 10, 36, 10);
        ctx.fillRect(item.x + item.width / 2 + 4, item.y + 10, 36, 10);

        // Monitor Blue Screen Glow
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(item.x + item.width / 2 - 38, item.y + 18, 32, 2);
        ctx.fillRect(item.x + item.width / 2 + 6, item.y + 18, 32, 2);

        // Keyboard & Mouse
        ctx.fillStyle = '#334155';
        ctx.fillRect(item.x + item.width / 2 - 22, item.y + 36, 32, 14);
        ctx.fillRect(item.x + item.width / 2 + 18, item.y + 38, 8, 10);
        break;
      }

      case 'meeting_table': {
        // Conference Table
        ctx.fillStyle = item.color || '#334155';
        ctx.beginPath();
        ctx.roundRect(item.x, item.y, item.width, item.height, 12);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center Media Port Cable Hatch
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(item.x + item.width / 2 - 30, item.y + item.height / 2 - 8, 60, 16);
        break;
      }

      case 'chair': {
        // Ergonomic Swivel Chair
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      case 'couch': {
        // Lounge Couch
        ctx.fillStyle = item.color || '#334155';
        ctx.beginPath();
        ctx.roundRect(item.x, item.y, item.width, item.height, 10);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }

      case 'plant': {
        // Decorative Office Plant Pot
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // Green Leaves Cluster
        ctx.fillStyle = '#10b981';
        const cx = item.x + item.width / 2;
        const cy = item.y + item.height / 2;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
          const leafX = cx + Math.cos(angle) * 11;
          const leafY = cy + Math.sin(angle) * 11;
          ctx.beginPath();
          ctx.arc(leafX, leafY, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'water_cooler': {
        // Water Cooler
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(item.x, item.y, item.width, item.height, 4);
        ctx.fill();
        // Cyan Water Jug
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(item.x + item.width / 2, item.y + item.height / 2, 12, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'whiteboard': {
        // Whiteboard
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(item.x, item.y, item.width, item.height);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x, item.y, item.width, item.height);
        break;
      }

      default:
        ctx.fillStyle = '#334155';
        ctx.fillRect(item.x, item.y, item.width, item.height);
    }

    ctx.restore();
  }
}

function renderProximityBridges(
  ctx: CanvasRenderingContext2D,
  localPos: Position,
  nearbyPeers: Map<string, any>,
  participants: Map<string, any>
) {
  for (const rel of nearbyPeers.values()) {
    const peer = participants.get(rel.peerId);
    if (!peer) continue;

    ctx.save();
    // Line connecting users in proximity range
    ctx.beginPath();
    ctx.moveTo(localPos.x, localPos.y);
    ctx.lineTo(peer.position.x, peer.position.y);

    if (rel.isObstructed) {
      // Sound is muffled by wall/partition! Orange dashed ray
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
    } else {
      // Clean open spatial audio path! Cyan/emerald connection
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2.5;
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Proximity Distance & Volume Metric Tag midway
    const midX = (localPos.x + peer.position.x) / 2;
    const midY = (localPos.y + peer.position.y) / 2;
    const volPercent = Math.round(rel.attenuation * 100);

    const tagText = rel.isObstructed
      ? `${Math.round(rel.distance)}px • ${volPercent}% (MUFFLED)`
      : `${Math.round(rel.distance)}px • ${volPercent}% vol`;

    ctx.font = '600 10px Inter, sans-serif';
    const textWidth = ctx.measureText(tagText).width;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(midX - textWidth / 2 - 8, midY - 11, textWidth + 16, 20, 6);
    ctx.fill();
    ctx.strokeStyle = rel.isObstructed ? '#f97316' : '#38bdf8';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = rel.isObstructed ? '#fed7aa' : '#bae6fd';
    ctx.fillText(tagText, midX - textWidth / 2, midY + 3);

    ctx.restore();
  }
}

function renderRemoteAvatars(
  ctx: CanvasRenderingContext2D,
  participants: Map<string, any>,
  remoteInterpolations: Map<string, InterpolatedAvatar>,
  peersSpeaking: Record<string, boolean>
) {
  for (const [userId, participant] of participants.entries()) {
    // Interpolate remote position smoothly
    let interp = remoteInterpolations.get(userId);
    if (!interp) {
      interp = {
        currentX: participant.position.x,
        currentY: participant.position.y,
        targetX: participant.position.x,
        targetY: participant.position.y,
        direction: participant.direction || 'down',
        isMoving: participant.isMoving || false,
      };
      remoteInterpolations.set(userId, interp);
    } else {
      interp.targetX = participant.position.x;
      interp.targetY = participant.position.y;
      interp.direction = participant.direction;
      interp.isMoving = participant.isMoving;
    }

    // Lerp factor
    interp.currentX += (interp.targetX - interp.currentX) * 0.28;
    interp.currentY += (interp.targetY - interp.currentY) * 0.28;

    const x = interp.currentX;
    const y = interp.currentY;
    const isSpeaking = !!peersSpeaking[userId];

    ctx.save();

    // Voice speaking soundwave ripple
    if (isSpeaking) {
      ctx.beginPath();
      ctx.arc(x, y, AVATAR_RADIUS + 9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Avatar Circle
    ctx.beginPath();
    ctx.arc(x, y, AVATAR_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#6366f1'; // Indigo for remote colleagues
    ctx.fill();
    ctx.strokeStyle = isSpeaking ? '#34d399' : '#e0e7ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Direction Gaze Pointer
    renderDirectionGaze(ctx, x, y, interp.direction);

    // Avatar Initial
    ctx.font = '700 13px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(participant.username.charAt(0).toUpperCase(), x, y + 4.5);

    // Name Tag
    renderNameTag(ctx, x, y - AVATAR_RADIUS - 8, participant.username, false, participant.isMuted);

    ctx.restore();
  }
}

function renderLocalAvatar(
  ctx: CanvasRenderingContext2D,
  pos: Position,
  username: string,
  isMuted: boolean,
  isSpeaking: boolean,
  direction: 'up' | 'down' | 'left' | 'right'
) {
  const x = pos.x;
  const y = pos.y;

  ctx.save();

  // Proximity Audio Range Halo Rings (100px proximity radius)
  ctx.beginPath();
  ctx.arc(x, y, 100, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Hysteresis Exit Ring (120px)
  ctx.beginPath();
  ctx.arc(x, y, 120, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Voice Wave Ripple if Speaking
  if (isSpeaking) {
    ctx.beginPath();
    ctx.arc(x, y, AVATAR_RADIUS + 10, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Local Avatar Body
  ctx.beginPath();
  ctx.arc(x, y, AVATAR_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#0284c7'; // Sky-600 for local user
  ctx.fill();
  ctx.strokeStyle = isSpeaking ? '#34d399' : '#38bdf8';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Direction Gaze Pointer
  renderDirectionGaze(ctx, x, y, direction);

  // Avatar Initial
  ctx.font = '700 13px Inter, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(username.charAt(0).toUpperCase(), x, y + 4.5);

  // Name Tag
  renderNameTag(ctx, x, y - AVATAR_RADIUS - 8, `${username} (You)`, true, isMuted);

  ctx.restore();
}

function renderDirectionGaze(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 'up' | 'down' | 'left' | 'right'
) {
  let gazeX = x;
  let gazeY = y;
  switch (direction) {
    case 'up': gazeY -= AVATAR_RADIUS - 3; break;
    case 'down': gazeY += AVATAR_RADIUS - 3; break;
    case 'left': gazeX -= AVATAR_RADIUS - 3; break;
    case 'right': gazeX += AVATAR_RADIUS - 3; break;
  }
  ctx.beginPath();
  ctx.arc(gazeX, gazeY, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function renderNameTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  isLocal: boolean,
  isMuted?: boolean
) {
  ctx.font = '600 11px Inter, sans-serif';
  const nameWidth = ctx.measureText(name).width;
  const padding = 16;
  const tagWidth = nameWidth + padding + (isMuted ? 14 : 0);

  ctx.fillStyle = isLocal ? 'rgba(3, 105, 161, 0.9)' : 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.roundRect(x - tagWidth / 2, y - 9, tagWidth, 18, 5);
  ctx.fill();
  ctx.strokeStyle = isLocal ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.fillText(name, isMuted ? x - 6 : x, y + 4);

  if (isMuted) {
    ctx.fillText('🔇', x + nameWidth / 2 + 2, y + 4);
  }
}
