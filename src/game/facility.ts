import Phaser from 'phaser';
import { CAMPAIGN_LAYOUTS, type CampaignLayout } from './campaign';
import { TEXTURES, WORLD, type ObstacleDefinition } from './config';

type FacilityLayer = Phaser.GameObjects.Container;

export interface FacilityHandle {
  destroy: () => void;
}

function place(
  layer: FacilityLayer,
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number,
  rotation = 0,
): Phaser.GameObjects.Image {
  const image = layer.scene.add.image(x, y, key).setDisplaySize(width, height).setRotation(rotation).setDepth(depth);
  layer.add(image);
  return image;
}

function drawObstacle(layer: FacilityLayer, obstacle: ObstacleDefinition): void {
  if (obstacle.kind === 'bed') {
    place(layer, TEXTURES.environment.bed, obstacle.x, obstacle.y - 3,
      obstacle.width + 16, obstacle.height + 40, 2);
  } else if (obstacle.kind === 'console') {
    place(layer, TEXTURES.environment.console, obstacle.x, obstacle.y - 1,
      obstacle.width + 32, obstacle.height + 36, 2);
  } else {
    const vertical = obstacle.height > obstacle.width;
    place(layer, TEXTURES.environment.wall, obstacle.x, obstacle.y,
      (vertical ? obstacle.height : obstacle.width) + 4,
      (vertical ? obstacle.width : obstacle.height) + 10,
      2, vertical ? Math.PI / 2 : 0);
  }
}

function drawDeckDetails(layer: FacilityLayer, layout: CampaignLayout): void {
  const paint = layer.scene.add.graphics().setDepth(-17);
  layer.add(paint);
  paint.lineStyle(2, 0x7a9995, 0.11);
  paint.strokeRect(85, 1080, 550, 402);
  paint.lineStyle(3, layout.tint, 0.11);
  paint.strokeRect(98, 1093, 524, 376);
  paint.lineStyle(3, layout.tint, 0.16);
  paint.strokeRect(1690, 572, 420, 452);
  paint.lineStyle(1, 0x78918f, 0.13);
  for (const [x, y, radius] of [[1900, 800, 250], [240, 240, 170], [1130, 1250, 150]]) {
    paint.strokeCircle(x, y, radius);
    paint.strokeCircle(x, y, radius - 8);
  }
  paint.fillStyle(layout.tint, 0.025);
  paint.fillEllipse(350, 1280, 700, 470);
  paint.fillEllipse(1900, 800, 680, 670);
  paint.lineStyle(2, 0x6e8884, 0.13);
  paint.beginPath();
  paint.moveTo(600, 1310);
  paint.lineTo(740, 1310);
  paint.lineTo(740, 980);
  paint.lineTo(1520, 980);
  paint.lineTo(1520, 800);
  paint.lineTo(1750, 800);
  paint.strokePath();
  paint.fillStyle(0x718b86, 0.13);
  for (const [x, y] of [[102, 1110], [586, 1445], [1720, 596], [2074, 1000]]) {
    paint.fillRect(x, y, 22, 4);
    paint.fillRect(x + 9, y - 9, 4, 22);
  }

  const vents: Array<[number, number, number]> = [
    [760, 1450, 0], [1050, 860, 0.12], [1460, 1310, -0.08],
    [1770, 390, 0], [2150, 1000, 0.08], [520, 690, 0], [1000, 310, 0],
  ];
  for (const [x, y, rotation] of vents) {
    place(layer, TEXTURES.environment.vent, x, y, 72, 72, -15, rotation);
  }
  const conduits: Array<[number, number, number, number]> = [
    [1120, 1450, 290, 0], [1460, 940, 250, Math.PI / 2],
    [1740, 790, 230, 0], [2150, 560, 200, Math.PI / 2],
    [790, 360, 210, 0], [450, 820, 190, Math.PI / 2],
  ];
  for (const [x, y, width, rotation] of conduits) {
    place(layer, TEXTURES.environment.pipe, x, y, width, 38, -16, rotation).setAlpha(0.75);
  }
  const markings: Array<[number, number, number]> = [
    [755, 1320, 0], [1520, 800, 0], [420, 535, -Math.PI / 2], [1180, 460, Math.PI],
  ];
  for (const [x, y, rotation] of markings) {
    place(layer, TEXTURES.environment.decal, x, y, 190, 95, -15, rotation);
  }
}

function drawOuterWalls(layer: FacilityLayer): void {
  for (let x = 160; x < WORLD.width; x += 320) {
    place(layer, TEXTURES.environment.wall, x, -17, 322, 64, 3);
    place(layer, TEXTURES.environment.wall, x, WORLD.height + 17, 322, 64, 3);
  }
  for (let y = 160; y < WORLD.height; y += 320) {
    place(layer, TEXTURES.environment.wall, -17, y, 322, 64, 3, Math.PI / 2);
    place(layer, TEXTURES.environment.wall, WORLD.width + 17, y, 322, 64, 3, Math.PI / 2);
  }
}

function label(layer: FacilityLayer, x: number, y: number, text: string, color = '#78928f'): void {
  const object = layer.scene.add.text(x, y, text, {
    color, fontFamily: 'monospace', fontSize: '13px', letterSpacing: 2,
  }).setOrigin(0.5).setDepth(-2);
  layer.add(object);
}

export function createFacility(
  scene: Phaser.Scene,
  layout: CampaignLayout = CAMPAIGN_LAYOUTS.medbay,
): FacilityHandle {
  const layer = scene.add.container(0, 0);
  const floor = scene.add.tileSprite(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, TEXTURES.environment.floor);
  floor.setTint(layout.id === 'medbay' ? 0xffffff : layout.id === 'reactor' ? 0xd8c9a6 : 0xd3aeb8);
  layer.add(floor);
  const zones = scene.add.graphics();
  layer.add(zones);
  zones.fillStyle(layout.tint, 0.055).fillRect(64, 1060, 604, 448);
  zones.fillStyle(0x11262f, 0.3).fillRect(714, 990, 830, 490);
  zones.fillStyle(layout.tint, 0.045).fillRect(1620, 510, 580, 580);
  zones.fillStyle(0x203237, 0.2).fillRect(70, 70, 520, 520);
  drawDeckDetails(layer, layout);
  for (const obstacle of layout.obstacles) drawObstacle(layer, obstacle);
  drawOuterWalls(layer);
  place(layer, TEXTURES.environment.elevator, WORLD.extraction.x, WORLD.extraction.y, 260, 260, -3);
  place(layer, TEXTURES.environment.wall, WORLD.extraction.x, -2, 206, 66, 3);
  place(layer, TEXTURES.environment.relay, WORLD.infiltration.x, WORLD.infiltration.y - 6, 106, 106, 4);
  label(layer, 350, 1055, `${layout.name} // 07`);
  label(layer, 350, 400, 'CARGO LIFT // NW');
  label(layer, 1200, 1525, layout.id === 'hive' ? 'NEST // 04' : 'PURIFICATION // 04');
  label(layer, 2070, 675, layout.id === 'reactor' ? 'REACTOR CONTROL' : 'RELAY CONTROL', '#bda365');

  const chunks: Phaser.GameObjects.RenderTexture[] = [];
  for (let x = 0; x < WORLD.width; x += 800) {
    for (let y = 0; y < WORLD.height; y += 800) {
      const chunk = scene.add.renderTexture(x, y, 800, 800).setOrigin(0).setDepth(-20);
      chunk.draw(layer, -x, -y);
      chunks.push(chunk);
    }
  }
  layer.destroy(true);
  return {
    destroy: () => {
      for (const chunk of chunks) chunk.destroy();
      chunks.length = 0;
    },
  };
}
