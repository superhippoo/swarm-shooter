import Phaser from 'phaser';
import { TEXTURES } from './config';
import { CAMPAIGN_TEXTURES, enemyStepTexture, WEAPON_VISUALS } from './visual-config';

export function gameAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${path.replace(/^\/+/, '')}`;
}

export function preloadGameAssets(scene: Phaser.Scene): void {
  for (const id of ['scout', 'heavy'] as const) {
    scene.load.svg(TEXTURES.characters[id], gameAssetUrl(`assets/characters/${id}.svg`));
    for (const pose of ['idle', 'a', 'b']) {
      scene.load.svg(`operative-${id}-legs-${pose}`, gameAssetUrl(`assets/characters/${id}-legs-${pose}.svg`));
    }
  }
  for (const id of ['swarmer', 'skitter', 'brute'] as const) {
    scene.load.svg(TEXTURES.enemies[id], gameAssetUrl(`assets/enemies/${id}.svg`));
    scene.load.svg(enemyStepTexture(id), gameAssetUrl(`assets/enemies/${id}-step.svg`));
  }
  for (const [id, visual] of Object.entries(WEAPON_VISUALS)) {
    scene.load.svg(visual.texture, gameAssetUrl(`assets/weapons/${id}.svg`));
  }
  for (const [rank, key, stepKey] of [
    ['elite', CAMPAIGN_TEXTURES.enemies.elite, CAMPAIGN_TEXTURES.enemies.eliteStep],
    ['alpha', CAMPAIGN_TEXTURES.enemies.alpha, CAMPAIGN_TEXTURES.enemies.alphaStep],
  ] as const) {
    scene.load.svg(key, gameAssetUrl(`assets/enemies/brute-${rank}.svg`));
    scene.load.svg(stepKey, gameAssetUrl(`assets/enemies/brute-${rank}-step.svg`));
  }
  for (const [id, key] of Object.entries(CAMPAIGN_TEXTURES.effects)) {
    scene.load.svg(key, gameAssetUrl(`assets/effects/${id}.svg`));
  }
  for (const [id, key] of Object.entries(CAMPAIGN_TEXTURES.decals)) {
    scene.load.svg(key, gameAssetUrl(`assets/environment/decal-${id}.svg`));
  }
  for (const [id, key] of Object.entries(TEXTURES.environment)) {
    scene.load.svg(key, gameAssetUrl(`assets/environment/${id}.svg`));
  }
  scene.load.svg(TEXTURES.crosshair, gameAssetUrl('assets/ui/crosshair.svg'));
}

export function createGeneratedTextures(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();
  const make = (key: string, width: number, height: number, draw: () => void): void => {
    if (scene.textures.exists(key)) return;
    graphics.clear();
    draw();
    graphics.generateTexture(key, width, height);
  };

  make(TEXTURES.characters.scout, 52, 52, () => {
    graphics.fillStyle(0x071216, 1).fillCircle(25, 26, 18);
    graphics.lineStyle(3, 0x39e6d0, 1).strokeCircle(25, 26, 15);
    graphics.fillStyle(0x1b8f8a, 1).fillCircle(25, 26, 11);
    graphics.fillStyle(0xf5b942, 1).fillTriangle(29, 20, 37, 26, 29, 32);
    graphics.fillStyle(0x263a42, 1).fillRect(28, 23, 23, 7);
    graphics.fillStyle(0x82f5e5, 1).fillRect(42, 25, 10, 3);
  });
  make(TEXTURES.characters.heavy, 58, 58, () => {
    graphics.fillStyle(0x071216, 1).fillCircle(27, 29, 23);
    graphics.lineStyle(4, 0xf5b942, 1).strokeCircle(27, 29, 19);
    graphics.fillStyle(0xa9652d, 1).fillCircle(27, 29, 15);
    graphics.fillStyle(0x39e6d0, 1).fillRect(29, 22, 9, 14);
    graphics.fillStyle(0x343238, 1).fillRect(29, 24, 27, 10);
    graphics.fillStyle(0xffd77a, 1).fillRect(45, 27, 12, 4);
  });
  make(TEXTURES.enemies.swarmer, 42, 42, () => {
    graphics.fillStyle(0x190e16, 1).fillTriangle(20, 4, 40, 21, 20, 38);
    graphics.fillStyle(0xa83247, 1).fillTriangle(10, 10, 35, 21, 10, 32);
    graphics.fillStyle(0xf05a61, 1).fillTriangle(22, 13, 37, 21, 22, 29);
    graphics.fillStyle(0xffc857, 1).fillCircle(28, 18, 2);
  });
  make(TEXTURES.enemies.skitter, 52, 52, () => {
    graphics.lineStyle(4, 0xa83247, 1);
    graphics.lineBetween(19, 20, 3, 7);
    graphics.lineBetween(19, 26, 1, 26);
    graphics.lineBetween(19, 32, 3, 45);
    graphics.lineBetween(29, 20, 36, 5);
    graphics.lineBetween(29, 32, 36, 47);
    graphics.fillStyle(0x190e16, 1).fillTriangle(12, 15, 49, 26, 12, 37);
    graphics.fillStyle(0xf15c65, 1).fillTriangle(16, 19, 43, 26, 16, 33);
    graphics.fillStyle(0xffc857, 1).fillCircle(34, 24, 2);
  });
  make(TEXTURES.enemies.brute, 84, 84, () => {
    graphics.fillStyle(0x190e16, 1).fillCircle(40, 42, 38);
    graphics.lineStyle(5, 0x73243a, 1).strokeCircle(40, 42, 31);
    graphics.fillStyle(0x8e303d, 1).fillCircle(40, 42, 26);
    graphics.fillStyle(0xb63a44, 1).fillTriangle(22, 19, 77, 42, 22, 65);
    graphics.fillStyle(0xf05a61, 1).fillTriangle(42, 27, 74, 42, 42, 57);
    graphics.fillStyle(0xffc857, 1).fillRect(51, 35, 8, 4);
  });
  make(TEXTURES.projectiles.rifle, 24, 8, () => {
    graphics.fillStyle(0x39e6d0, 0.2).fillRect(0, 1, 24, 6);
    graphics.fillStyle(0x39e6d0, 0.65).fillRect(4, 2, 20, 4);
    graphics.fillStyle(0xf2fff9, 1).fillRect(12, 3, 12, 2);
  });
  make(TEXTURES.projectiles.shotgun, 14, 8, () => {
    graphics.fillStyle(0xf5b942, 0.25).fillCircle(7, 4, 4);
    graphics.fillStyle(0xfff3c4, 1).fillCircle(8, 4, 2);
  });
  make(TEXTURES.projectiles.launcher, 24, 14, () => {
    graphics.fillStyle(0x8e303d, 0.4).fillCircle(10, 7, 7);
    graphics.fillStyle(0xf5b942, 0.9).fillCircle(12, 7, 5);
    graphics.fillStyle(0xffffff, 1).fillCircle(15, 7, 2);
  });
  make(TEXTURES.bulletTrail, 34, 6, () => {
    graphics.fillStyle(0xffffff, 0.04).fillRect(0, 1, 18, 4);
    graphics.fillStyle(0xffffff, 0.14).fillRect(12, 2, 16, 2);
    graphics.fillStyle(0xffffff, 0.35).fillRect(25, 2, 9, 2);
  });
  make(TEXTURES.muzzle, 48, 30, () => {
    graphics.fillStyle(0xf5b942, 0.3).fillTriangle(1, 15, 46, 1, 30, 15);
    graphics.fillTriangle(1, 15, 46, 29, 30, 15);
    graphics.fillStyle(0xfff3c4, 0.95).fillTriangle(0, 15, 37, 9, 23, 15);
    graphics.fillTriangle(0, 15, 37, 21, 23, 15);
  });
  make(TEXTURES.particle, 8, 8, () => {
    graphics.fillStyle(0xffffff, 1).fillCircle(4, 4, 3);
  });
  make(TEXTURES.explosion, 256, 256, () => {
    graphics.lineStyle(8, 0xf5b942, 0.9).strokeCircle(128, 128, 114);
    graphics.lineStyle(3, 0xffffff, 0.75).strokeCircle(128, 128, 92);
    graphics.fillStyle(0xff5d64, 0.12).fillCircle(128, 128, 108);
  });
  make(TEXTURES.corpse, 52, 52, () => {
    graphics.fillStyle(0x50132d, 0.5).fillCircle(25, 28, 19);
    graphics.fillCircle(8, 32, 6).fillCircle(40, 12, 7).fillCircle(45, 38, 4);
    graphics.fillStyle(0xa83247, 0.55).fillTriangle(13, 15, 41, 27, 15, 39);
  });
  make(TEXTURES.crosshair, 64, 64, () => {
    graphics.lineStyle(3, 0x39e6d0, 0.95);
    graphics.strokeCircle(32, 32, 13);
    graphics.lineBetween(32, 3, 32, 19);
    graphics.lineBetween(32, 45, 32, 61);
    graphics.lineBetween(3, 32, 19, 32);
    graphics.lineBetween(45, 32, 61, 32);
    graphics.fillStyle(0xf5b942, 1).fillCircle(32, 32, 2);
  });
  make(TEXTURES.supply, 42, 42, () => {
    graphics.fillStyle(0x101820, 1).fillRect(2, 2, 38, 38);
    graphics.lineStyle(3, 0xf5b942, 1).strokeRect(3, 3, 36, 36);
    graphics.fillStyle(0xf5b942, 1).fillRect(17, 9, 8, 24).fillRect(9, 17, 24, 8);
    graphics.fillStyle(0x071216, 1).fillRect(19, 11, 4, 20).fillRect(11, 19, 20, 4);
  });
  make(TEXTURES.spawnWarning, 64, 64, () => {
    graphics.lineStyle(3, 0xff5d64, 0.9).strokeCircle(32, 32, 25);
    graphics.lineStyle(2, 0xf5b942, 0.8).strokeCircle(32, 32, 13);
    graphics.fillStyle(0xff5d64, 0.7).fillTriangle(32, 14, 43, 34, 21, 34);
    graphics.fillStyle(0x101820, 1).fillRect(30, 22, 4, 7);
  });
  make(TEXTURES.objectiveArrow, 40, 40, () => {
    graphics.fillStyle(0x101820, 0.95).fillTriangle(2, 5, 38, 20, 2, 35);
    graphics.lineStyle(3, 0xf5b942, 1).strokeTriangle(4, 7, 36, 20, 4, 33);
    graphics.fillStyle(0xf5b942, 0.75).fillTriangle(10, 12, 31, 20, 10, 28);
  });
  make(TEXTURES.collider, 4, 4, () => {
    graphics.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4);
  });
  graphics.destroy();
}
