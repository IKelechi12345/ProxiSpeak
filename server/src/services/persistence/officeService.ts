import { OfficeLayout, FurnitureItem, Obstacle, MeetingZone } from '@proxispeak/shared';

export function createDefaultOfficeLayout(): OfficeLayout {
  const furniture: FurnitureItem[] = [
    // Open Workspace - Cluster 1 (Left)
    { id: 'desk-1', type: 'desk', x: 220, y: 180, width: 140, height: 70, label: 'Workstation 1', color: '#1e293b' },
    { id: 'chair-1', type: 'chair', x: 275, y: 140, width: 30, height: 30, rotation: 180, label: 'Chair 1' },
    { id: 'desk-2', type: 'desk', x: 380, y: 180, width: 140, height: 70, label: 'Workstation 2', color: '#1e293b' },
    { id: 'chair-2', type: 'chair', x: 435, y: 140, width: 30, height: 30, rotation: 180, label: 'Chair 2' },
    { id: 'desk-3', type: 'desk', x: 220, y: 270, width: 140, height: 70, label: 'Workstation 3', color: '#1e293b' },
    { id: 'chair-3', type: 'chair', x: 275, y: 350, width: 30, height: 30, rotation: 0, label: 'Chair 3' },
    { id: 'desk-4', type: 'desk', x: 380, y: 270, width: 140, height: 70, label: 'Workstation 4', color: '#1e293b' },
    { id: 'chair-4', type: 'chair', x: 435, y: 350, width: 30, height: 30, rotation: 0, label: 'Chair 4' },

    // Open Workspace - Cluster 2 (Right of aisle)
    { id: 'desk-5', type: 'desk', x: 620, y: 180, width: 140, height: 70, label: 'Workstation 5', color: '#1e293b' },
    { id: 'chair-5', type: 'chair', x: 675, y: 140, width: 30, height: 30, rotation: 180, label: 'Chair 5' },
    { id: 'desk-6', type: 'desk', x: 780, y: 180, width: 140, height: 70, label: 'Workstation 6', color: '#1e293b' },
    { id: 'chair-6', type: 'chair', x: 835, y: 140, width: 30, height: 30, rotation: 180, label: 'Chair 6' },
    { id: 'desk-7', type: 'desk', x: 620, y: 270, width: 140, height: 70, label: 'Workstation 7', color: '#1e293b' },
    { id: 'chair-7', type: 'chair', x: 675, y: 350, width: 30, height: 30, rotation: 0, label: 'Chair 7' },
    { id: 'desk-8', type: 'desk', x: 780, y: 270, width: 140, height: 70, label: 'Workstation 8', color: '#1e293b' },
    { id: 'chair-8', type: 'chair', x: 835, y: 350, width: 30, height: 30, rotation: 0, label: 'Chair 8' },

    // Executive Boardroom (Top Right)
    { id: 'conf-table-1', type: 'meeting_table', x: 1220, y: 200, width: 260, height: 110, label: 'Executive Table', color: '#334155' },
    { id: 'conf-chair-1', type: 'chair', x: 1250, y: 160, width: 30, height: 30, rotation: 180 },
    { id: 'conf-chair-2', type: 'chair', x: 1330, y: 160, width: 30, height: 30, rotation: 180 },
    { id: 'conf-chair-3', type: 'chair', x: 1410, y: 160, width: 30, height: 30, rotation: 180 },
    { id: 'conf-chair-4', type: 'chair', x: 1250, y: 320, width: 30, height: 30, rotation: 0 },
    { id: 'conf-chair-5', type: 'chair', x: 1330, y: 320, width: 30, height: 30, rotation: 0 },
    { id: 'conf-chair-6', type: 'chair', x: 1410, y: 320, width: 30, height: 30, rotation: 0 },
    { id: 'boardroom-whiteboard', type: 'whiteboard', x: 1170, y: 130, width: 100, height: 16, label: 'Strategy Board' },

    // Glass Conference Room (Bottom Right)
    { id: 'glass-table', type: 'meeting_table', x: 1240, y: 680, width: 220, height: 100, label: 'Sprint Room', color: '#0f766e' },
    { id: 'glass-chair-1', type: 'chair', x: 1280, y: 640, width: 30, height: 30, rotation: 180 },
    { id: 'glass-chair-2', type: 'chair', x: 1380, y: 640, width: 30, height: 30, rotation: 180 },
    { id: 'glass-chair-3', type: 'chair', x: 1280, y: 790, width: 30, height: 30, rotation: 0 },
    { id: 'glass-chair-4', type: 'chair', x: 1380, y: 790, width: 30, height: 30, rotation: 0 },

    // Breakout & Lounge Cafe Area (Bottom Left)
    { id: 'couch-1', type: 'couch', x: 220, y: 720, width: 160, height: 60, label: 'Lounge Sofa', color: '#475569' },
    { id: 'couch-2', type: 'couch', x: 220, y: 840, width: 160, height: 60, label: 'Lounge Sofa', color: '#475569' },
    { id: 'water-cooler-1', type: 'water_cooler', x: 420, y: 720, width: 40, height: 40, label: 'Water Cooler' },
    { id: 'bookshelf-1', type: 'bookshelf', x: 130, y: 720, width: 30, height: 180, label: 'Library' },

    // Decorative Plants
    { id: 'plant-1', type: 'plant', x: 140, y: 140, width: 40, height: 40, label: 'Fiddle Leaf Fig' },
    { id: 'plant-2', type: 'plant', x: 980, y: 140, width: 40, height: 40, label: 'Monstera' },
    { id: 'plant-3', type: 'plant', x: 140, y: 640, width: 40, height: 40, label: 'Snake Plant' },
    { id: 'plant-4', type: 'plant', x: 1040, y: 880, width: 40, height: 40, label: 'Palm' },
  ];

  const obstacles: Obstacle[] = [
    // Soundproof Executive Boardroom Walls (attenuationFactor: 1.0 = Blocks 100% of sound)
    { id: 'wall-boardroom-left', type: 'wall', x: 1120, y: 80, width: 16, height: 380, attenuationFactor: 1.0, label: 'Soundproof Wall' },
    { id: 'wall-boardroom-bottom-left', type: 'wall', x: 1120, y: 460, width: 160, height: 16, attenuationFactor: 1.0, label: 'Soundproof Wall' },
    // Doorway opening between x: 1280 and 1360
    { id: 'wall-boardroom-bottom-right', type: 'wall', x: 1360, y: 460, width: 220, height: 16, attenuationFactor: 1.0, label: 'Soundproof Wall' },

    // Glass Conference Room Partitions (attenuationFactor: 0.65 = Muffles sound by 65%)
    { id: 'glass-wall-top', type: 'glass_partition', x: 1120, y: 580, width: 200, height: 14, attenuationFactor: 0.65, label: 'Acoustic Glass Wall' },
    // Doorway between 1320 and 1400
    { id: 'glass-wall-top-right', type: 'glass_partition', x: 1400, y: 580, width: 180, height: 14, attenuationFactor: 0.65, label: 'Acoustic Glass Wall' },
    { id: 'glass-wall-left', type: 'glass_partition', x: 1120, y: 580, width: 14, height: 340, attenuationFactor: 0.65, label: 'Acoustic Glass Wall' },
    { id: 'glass-wall-bottom', type: 'glass_partition', x: 1120, y: 920, width: 460, height: 14, attenuationFactor: 0.65, label: 'Acoustic Glass Wall' },

    // Central Privacy Partition (attenuationFactor: 0.5)
    { id: 'partition-center', type: 'glass_partition', x: 550, y: 640, width: 14, height: 260, attenuationFactor: 0.5, label: 'Acoustic Divider' },
  ];

  const zones: MeetingZone[] = [
    {
      id: 'zone-boardroom',
      name: 'Executive Boardroom',
      type: 'conference',
      bounds: { x: 1130, y: 80, width: 460, height: 390 },
      color: '#3b82f6',
      isPrivate: true,
    },
    {
      id: 'zone-sprint',
      name: 'Glass Sprint Room',
      type: 'breakout',
      bounds: { x: 1130, y: 590, width: 460, height: 340 },
      color: '#06b6d4',
      isPrivate: true,
    },
    {
      id: 'zone-lounge',
      name: 'Coffee & Breakout Lounge',
      type: 'lounge',
      bounds: { x: 110, y: 650, width: 420, height: 320 },
      color: '#f59e0b',
      isPrivate: false,
    },
    {
      id: 'zone-workstations',
      name: 'Engineering Open Workspace',
      type: 'focus',
      bounds: { x: 180, y: 120, width: 780, height: 360 },
      color: '#10b981',
      isPrivate: false,
    },
  ];

  return {
    dimensions: {
      width: 1700,
      height: 1100,
    },
    furniture,
    obstacles,
    zones,
    spawnPoint: {
      x: 750,
      y: 540,
    },
  };
}
