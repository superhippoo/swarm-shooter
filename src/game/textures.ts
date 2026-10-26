import Phaser from 'phaser';
import { TEXTURES } from './config';

export function createGeneratedTextures(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();
  const make = (
    key: string,
    width: number,
    height: number,
    draw: () => void,
  ): void => {
    if (scene.textures.exists(key)) {
      return;
    }
    graphics.clear();
    draw();
    graphics.generateTexture(key, width, height);
  };

  make(TEXTURES.characters.scout, 52, 52, () => {
    graphics.fillStyle(0x081419, 1).fillCircle(26, 26, 19);
    graphics.lineStyle(3, 0x71f6c4, 1).strokeCircle(26, 26, 15);
    graphics.fillStyle(0x1b8072, 1).fillCircle(26, 26, 11);
    graphics.fillStyle(0xb9ffe9, 1).fillTriangle(32, 18, 40, 26, 32, 34);
    graphics.fillStyle(0x263a42, 1).fillRect(29, 22, 22, 8);
    graphics.fillStyle(0x9cb7b7, 1).fillRect(40, 24, 12, 4);
  });

  make(TEXTURES.characters.heavy, 58, 58, () => {
    graphics.fillStyle(0x131317, 1).fillCircle(29, 29, 23);
    graphics.lineStyle(4, 0xffc766, 1).strokeCircle(29, 29, 19);
    graphics.fillStyle(0x70532b, 1).fillCircle(29, 29, 15);
    graphics.fillStyle(0xffe2a3, 1).fillRect(30, 20, 11, 18);
    graphics.fillStyle(0x343238, 1).fillRect(30, 24, 26, 10);
    graphics.fillStyle(0xb8afb0, 1).fillRect(44, 27, 14, 4);
  });

  make(TEXTURES.swarmer, 42, 42, () => {
    graphics.fillStyle(0x230e1a, 1);
    graphics.fillTriangle(20, 5, 38, 21, 20, 37);
    graphics.fillTriangle(19, 8, 3, 3, 11, 18);
    graphics.fillTriangle(19, 34, 3, 39, 11, 24);
    graphics.lineStyle(3, 0xf34678, 0.85);
    graphics.lineBetween(13, 13, 2, 8);
    graphics.lineBetween(13, 29, 2, 34);
    graphics.fillStyle(0x9d214e, 1).fillTriangle(12, 10, 34, 21, 12, 32);
    graphics.fillStyle(0xffb1c7, 1).fillCircle(25, 17, 3);
    graphics.fillStyle(0xffb1c7, 1).fillCircle(25, 25, 3);
  });

  make(TEXTURES.rifleBullet, 24, 8, () => {
    graphics.fillStyle(0x71f6c4, 0.18).fillRect(0, 1, 24, 6);
    graphics.fillStyle(0x71f6c4, 0.55).fillRect(4, 2, 20, 4);
    graphics.fillStyle(0xf2fff9, 1).fillRect(12, 3, 12, 2);
  });

  make(TEXTURES.bulletTrail, 34, 6, () => {
    graphics.fillStyle(0x71f6c4, 0.04).fillRect(0, 1, 18, 4);
    graphics.fillStyle(0x71f6c4, 0.12).fillRect(12, 2, 16, 2);
    graphics.fillStyle(0xd7fff1, 0.28).fillRect(25, 2, 9, 2);
  });

  make(TEXTURES.muzzle, 42, 28, () => {
    graphics.fillStyle(0xffc766, 0.28).fillTriangle(1, 14, 39, 1, 28, 14);
    graphics.fillTriangle(1, 14, 39, 27, 28, 14);
    graphics.fillStyle(0xfff3c4, 0.95).fillTriangle(0, 14, 34, 8, 21, 14);
    graphics.fillTriangle(0, 14, 34, 20, 21, 14);
  });

  make(TEXTURES.particle, 8, 8, () => {
    graphics.fillStyle(0xffffff, 1).fillCircle(4, 4, 3);
  });

  make(TEXTURES.corpse, 52, 52, () => {
    graphics.fillStyle(0x50132d, 0.5);
    graphics.fillCircle(25, 28, 19);
    graphics.fillCircle(8, 32, 6);
    graphics.fillCircle(40, 12, 7);
    graphics.fillCircle(45, 38, 4);
    graphics.fillStyle(0x9d214e, 0.55);
    graphics.fillTriangle(13, 15, 41, 27, 15, 39);
    graphics.lineStyle(2, 0xf34678, 0.32).strokeCircle(25, 27, 12);
  });

  make(TEXTURES.crosshair, 34, 34, () => {
    graphics.lineStyle(2, 0xd8fff2, 0.9);
    graphics.strokeCircle(17, 17, 7);
    graphics.lineBetween(17, 0, 17, 9);
    graphics.lineBetween(17, 25, 17, 34);
    graphics.lineBetween(0, 17, 9, 17);
    graphics.lineBetween(25, 17, 34, 17);
    graphics.fillStyle(0xf34678, 1).fillCircle(17, 17, 1.5);
  });

  make(TEXTURES.collider, 4, 4, () => {
    graphics.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4);
  });

  graphics.destroy();
}
