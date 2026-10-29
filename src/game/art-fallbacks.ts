import Phaser from 'phaser';
import type { CharacterId, EnemyId } from '../shared/game-types';
import { TEXTURES } from './config';
import { CAMPAIGN_TEXTURES, enemyStepTexture } from './visual-config';

export function createArtFallbacks(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();
  const make = (key: string, width: number, height: number, draw: () => void): void => {
    if (scene.textures.exists(key)) return;
    graphics.clear();
    draw();
    graphics.generateTexture(key, width, height);
  };
  const environment = TEXTURES.environment;

  make(environment.floor, 256, 256, () => {
    graphics.fillStyle(0x101a21, 1).fillRect(0, 0, 256, 256);
    graphics.lineStyle(2, 0x24363e, 0.7).strokeRect(2, 2, 252, 252);
    graphics.lineStyle(1, 0x3d4e54, 0.35).lineBetween(8, 8, 248, 8).lineBetween(8, 8, 8, 248);
    for (const [x, y] of [[12, 12], [244, 12], [12, 244], [244, 244]]) {
      graphics.fillStyle(0x52666b, 0.6).fillCircle(x, y, 2);
    }
  });
  make(environment.bed, 220, 112, () => {
    graphics.fillStyle(0x03090d, 0.5).fillEllipse(110, 91, 195, 20);
    graphics.fillStyle(0x263d45, 1).fillRoundedRect(17, 16, 193, 76, 8);
    graphics.fillStyle(0x789497, 1).fillRect(38, 26, 154, 40);
    graphics.fillStyle(0xb0c4bd, 1).fillRoundedRect(42, 28, 37, 33, 5);
    graphics.fillStyle(0x526e75, 1).fillRect(87, 27, 103, 37);
    graphics.lineStyle(4, 0x9db6b3, 1).strokeRoundedRect(18, 17, 191, 73, 8);
    graphics.fillStyle(0x26363e, 1).fillRect(111, 26, 9, 39).fillRect(161, 26, 9, 39);
  });
  make(environment.console, 320, 124, () => {
    graphics.fillStyle(0x03090d, 0.5).fillEllipse(160, 105, 285, 20);
    graphics.fillStyle(0x263e47, 1).fillRoundedRect(17, 17, 288, 88, 9);
    graphics.fillStyle(0x47616a, 1).fillRect(22, 68, 278, 17);
    for (const x of [43, 128, 208]) {
      graphics.fillStyle(0x0b2028, 1).fillRect(x, 26, 70, 30);
      graphics.lineStyle(2, 0x57b6af, 0.8).strokeRect(x + 4, 30, 62, 21);
      graphics.lineBetween(x + 10, 44, x + 51, 35);
    }
    for (const x of [46, 68, 90, 213, 235, 257]) {
      graphics.fillStyle(0x789497, 1).fillRect(x, 65, 14, 9);
    }
  });
  make(environment.wall, 320, 112, () => {
    graphics.fillStyle(0x071116, 0.6).fillRect(6, 87, 308, 15);
    graphics.fillStyle(0x263b43, 1).fillRect(7, 9, 306, 89);
    graphics.fillStyle(0x526970, 1).fillRect(12, 16, 296, 48);
    graphics.fillStyle(0x2c4048, 1).fillRect(18, 23, 284, 35);
    graphics.lineStyle(3, 0x14262e, 1);
    for (const x of [110, 211]) graphics.lineBetween(x, 17, x, 67);
    for (const x of [29, 96, 129, 195, 227, 291]) {
      graphics.fillStyle(0x839795, 0.6).fillCircle(x, 40, 2);
    }
  });
  make(environment.vent, 128, 128, () => {
    graphics.fillStyle(0x263b43, 1).fillRoundedRect(14, 10, 100, 104, 12);
    graphics.fillStyle(0x0a161c, 1).fillCircle(64, 62, 37);
    graphics.lineStyle(3, 0x4d646b, 1).strokeCircle(64, 62, 35);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
      graphics.fillStyle(0x354e56, 1).fillTriangle(
        64, 62,
        64 + Math.cos(angle) * 30, 62 + Math.sin(angle) * 30,
        64 + Math.cos(angle + 0.7) * 28, 62 + Math.sin(angle + 0.7) * 28,
      );
    }
    graphics.fillStyle(0x668088, 1).fillCircle(64, 62, 7);
  });
  make(environment.pipe, 256, 96, () => {
    graphics.lineStyle(19, 0x071217, 0.7).lineBetween(10, 59, 246, 59);
    graphics.lineStyle(15, 0x3d555e, 1).lineBetween(10, 50, 246, 50);
    graphics.lineStyle(3, 0x718387, 0.6).lineBetween(10, 46, 246, 46);
    graphics.fillStyle(0x1d3038, 1);
    for (const x of [31, 108, 186]) graphics.fillRect(x, 35, 17, 30);
  });
  make(environment.elevator, 320, 320, () => {
    graphics.fillStyle(0x1b3038, 1).fillRoundedRect(26, 17, 268, 285, 20);
    graphics.lineStyle(4, 0x526b73, 1).strokeRoundedRect(39, 30, 242, 259, 13);
    graphics.fillStyle(0x304952, 1).fillRect(57, 51, 206, 214);
    graphics.lineStyle(4, 0x14262e, 1).lineBetween(160, 53, 160, 264).lineBetween(59, 158, 261, 158);
    graphics.lineStyle(4, 0xf5b942, 0.45).strokeRect(47, 39, 226, 242);
    graphics.fillStyle(0xf5b942, 0.55).fillTriangle(141, 120, 179, 120, 160, 95);
  });
  make(environment.relay, 160, 160, () => {
    graphics.fillStyle(0x03090d, 0.5).fillEllipse(80, 127, 112, 30);
    graphics.fillStyle(0x29454d, 1).fillRoundedRect(36, 46, 88, 91, 12);
    graphics.fillStyle(0x47616a, 1).fillRect(34, 110, 93, 21);
    graphics.fillStyle(0x123e43, 1).fillRect(55, 68, 52, 29);
    graphics.lineStyle(3, 0x69d2c2, 1).lineBetween(62, 87, 72, 77).lineBetween(72, 77, 96, 84);
    graphics.fillStyle(0x668088, 1).fillTriangle(43, 18, 118, 18, 81, 45);
    graphics.fillStyle(0xf5b942, 1).fillCircle(81, 114, 5);
  });
  make(environment.decal, 256, 128, () => {
    graphics.fillStyle(0x8d9c8f, 0.18);
    for (const x of [17, 76, 135]) graphics.fillTriangle(x, 36, x + 44, 64, x, 92);
  });

  for (const id of ['scout', 'heavy'] as const satisfies readonly CharacterId[]) {
    for (const pose of ['idle', 'a', 'b']) {
      make(`operative-${id}-legs-${pose}`, 128, 128, () => {
        const shift = pose === 'a' ? -8 : pose === 'b' ? 8 : 0;
        graphics.fillStyle(0x02090d, 0.35).fillEllipse(58, 68, 77, 63);
        graphics.fillStyle(0x071216, 1);
        graphics.fillRoundedRect(18, 31 + shift, 37, 27, 8);
        graphics.fillRoundedRect(18, 70 - shift, 37, 27, 8);
        graphics.fillStyle(id === 'scout' ? 0x23636a : 0x425158, 1);
        graphics.fillRoundedRect(25, 35 + shift, 25, 16, 6);
        graphics.fillRoundedRect(25, 74 - shift, 25, 16, 6);
      });
    }
  }

  for (const [id, color, barrel] of [
    ['rifle', 0x506870, 119], ['shotgun', 0x66777a, 110], ['launcher', 0x50666b, 121],
  ] as const) {
    make(`weapon-${id}`, 128, 64, () => {
      graphics.fillStyle(0x142830, 1).fillRoundedRect(9, 21, barrel - 9, 22, 4);
      graphics.fillStyle(color, 1).fillRect(35, 25, barrel - 42, 9);
      graphics.fillStyle(0x20353e, 1).fillTriangle(42, 38, 61, 38, 55, 55);
      graphics.fillStyle(id === 'rifle' ? 0x39e6d0 : 0xf5b942, 0.8)
        .fillRect(barrel - 11, 26, 8, 10);
    });
  }

  make('weapon-arc', 128, 64, () => {
    graphics.fillStyle(0x142830, 1).fillRoundedRect(8, 22, 87, 22, 4);
    graphics.fillStyle(0x49656e, 1).fillRect(36, 26, 51, 10);
    graphics.fillStyle(0x375760, 1).fillTriangle(81, 24, 124, 9, 113, 32);
    graphics.fillTriangle(81, 40, 124, 55, 113, 32);
    graphics.fillStyle(0x39e6d0, 1);
    for (const x of [48, 60, 72]) graphics.fillRect(x, 24, 6, 16);
    graphics.fillStyle(0xd7fff7, 1).fillRect(119, 13, 6, 4).fillRect(119, 47, 6, 4);
    graphics.fillStyle(0x20353e, 1).fillTriangle(42, 40, 61, 40, 54, 56);
  });
  make('weapon-rail', 128, 64, () => {
    graphics.fillStyle(0x142830, 1).fillRoundedRect(7, 23, 120, 15, 3);
    graphics.fillStyle(0x607983, 1).fillRect(36, 26, 53, 8);
    graphics.fillStyle(0x172d38, 1).fillTriangle(47, 22, 62, 12, 113, 22);
    graphics.fillStyle(0xd7fff7, 1).fillRect(84, 28, 43, 3);
    graphics.fillStyle(0x314e5a, 1);
    for (const x of [88, 101, 114]) graphics.fillRect(x, 20, 6, 19);
    graphics.fillStyle(0x20353e, 1).fillTriangle(42, 37, 61, 37, 54, 55);
  });
  make('weapon-flame', 128, 64, () => {
    graphics.fillStyle(0x142830, 1).fillRoundedRect(8, 23, 88, 21, 4);
    graphics.fillStyle(0xa9652d, 1).fillRoundedRect(40, 14, 31, 36, 8);
    graphics.lineStyle(2, 0xe9ac45, 1).lineBetween(50, 18, 50, 46).lineBetween(60, 18, 60, 46);
    graphics.fillStyle(0x52656a, 1).fillTriangle(78, 23, 116, 12, 116, 52);
    graphics.fillTriangle(78, 41, 116, 12, 116, 52);
    graphics.fillStyle(0x101820, 1).fillRect(116, 20, 10, 24);
    graphics.fillStyle(0xf5b942, 1).fillRect(99, 27, 10, 10);
    graphics.fillStyle(0x20353e, 1).fillTriangle(42, 40, 61, 40, 54, 56);
  });
  make('weapon-mines', 128, 64, () => {
    graphics.fillStyle(0x142830, 1).fillRoundedRect(8, 24, 107, 20, 4);
    graphics.fillStyle(0x596b6c, 1).fillRoundedRect(57, 14, 41, 36, 8);
    graphics.fillStyle(0x283f47, 1).fillRect(63, 20, 29, 24);
    graphics.fillStyle(0xd5a747, 1);
    for (const [x, y] of [[68, 22], [81, 22], [68, 35], [81, 35]]) graphics.fillRect(x, y, 6, 6);
    graphics.fillStyle(0x8a9a99, 1).fillRect(103, 28, 14, 9);
    graphics.fillStyle(0x20353e, 1).fillTriangle(42, 41, 60, 41, 53, 55);
  });

  for (const rank of ['elite', 'alpha'] as const) {
    make(CAMPAIGN_TEXTURES.enemies[rank], 128, 128, () => {
      const alpha = rank === 'alpha';
      const spikeCount = alpha ? 10 : 6;
      const armor = alpha ? 0x553143 : 0x76663d;
      graphics.fillStyle(0x190e16, 1);
      for (let index = 0; index < spikeCount; index += 1) {
        const angle = index / spikeCount * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const baseX = 60 + cos * 33;
        const baseY = 64 + sin * 33;
        const tangentX = -sin * 9;
        const tangentY = cos * 9;
        graphics.fillTriangle(
          baseX + tangentX, baseY + tangentY,
          baseX - tangentX, baseY - tangentY,
          60 + cos * (alpha ? 59 : 51), 64 + sin * (alpha ? 59 : 51),
        );
      }
      graphics.fillCircle(60, 64, alpha ? 45 : 40);
      graphics.fillStyle(armor, 1).fillCircle(60, 64, alpha ? 39 : 34);
      graphics.fillStyle(0x8e303d, 1).fillCircle(60, 64, alpha ? 32 : 28);
      graphics.fillStyle(0x190e16, 1).fillTriangle(77, 37, 124, 64, 77, 91);
      graphics.fillStyle(armor, 1).fillTriangle(84, 45, 116, 64, 84, 83);
      if (alpha) {
        graphics.fillStyle(0xe1b58e, 1);
        graphics.fillTriangle(83, 40, 116, 18, 105, 52);
        graphics.fillTriangle(83, 88, 116, 110, 105, 76);
      }
      graphics.fillStyle(alpha ? 0xfff3c4 : 0xf5b942, 1);
      graphics.fillRect(101, 55, 13, 4).fillRect(101, 69, 13, 4);
      graphics.fillStyle(0xf05a61, 1).fillTriangle(47, 50, 79, 64, 47, 78);
    });
  }

  make(CAMPAIGN_TEXTURES.effects.chain, 192, 48, () => {
    const points = [[2, 24], [27, 24], [39, 9], [55, 36], [72, 18], [89, 29], [107, 12], [124, 34], [143, 20], [158, 27], [190, 24]] as const;
    for (const [width, color, alpha] of [[10, 0x071216, 0.85], [6, 0x39e6d0, 1], [2, 0xf2fff9, 1]] as const) {
      graphics.lineStyle(width, color, alpha);
      for (let index = 1; index < points.length; index += 1) {
        graphics.lineBetween(points[index - 1][0], points[index - 1][1], points[index][0], points[index][1]);
      }
      graphics.lineBetween(72, 18, 64, 4).lineBetween(143, 20, 153, 43);
    }
  });
  make(CAMPAIGN_TEXTURES.effects.rail, 256, 32, () => {
    graphics.lineStyle(10, 0x071216, 0.8).lineBetween(2, 16, 254, 16);
    graphics.lineStyle(6, 0x39e6d0, 0.8).lineBetween(2, 16, 254, 16);
    graphics.lineStyle(2, 0xf2fff9, 1).lineBetween(2, 16, 254, 16);
    graphics.lineStyle(2, 0x82f5e5, 0.8).lineBetween(2, 8, 181, 8).lineBetween(39, 24, 254, 24);
    graphics.lineBetween(238, 8, 254, 16).lineBetween(254, 16, 238, 24);
  });
  make(CAMPAIGN_TEXTURES.effects.flame, 192, 128, () => {
    graphics.fillStyle(0x501f24, 0.9).fillTriangle(2, 64, 190, 8, 176, 64);
    graphics.fillTriangle(2, 64, 176, 64, 190, 120);
    graphics.fillStyle(0xf58b3c, 0.95).fillTriangle(3, 64, 174, 31, 155, 64);
    graphics.fillTriangle(3, 64, 155, 64, 174, 97);
    graphics.fillStyle(0xffd77a, 1).fillTriangle(3, 64, 129, 48, 112, 64);
    graphics.fillTriangle(3, 64, 112, 64, 129, 80);
    graphics.fillStyle(0xfff3c4, 1).fillTriangle(3, 64, 77, 59, 77, 69);
  });
  make(CAMPAIGN_TEXTURES.effects.mine, 64, 64, () => {
    graphics.fillStyle(0x02090d, 0.5).fillEllipse(32, 39, 56, 36);
    graphics.fillStyle(0x263b42, 1).fillRoundedRect(5, 13, 54, 40, 12);
    graphics.lineStyle(4, 0x071216, 1).strokeRoundedRect(5, 13, 54, 40, 12);
    graphics.fillStyle(0x52656a, 1).fillRoundedRect(13, 18, 38, 29, 8);
    graphics.fillStyle(0x172c34, 1).fillRect(20, 24, 24, 16);
    graphics.fillStyle(0xf5b942, 1).fillRect(26, 27, 12, 10);
    graphics.lineStyle(3, 0xf5b942, 1).lineBetween(32, 12, 32, 6).lineBetween(20, 49, 17, 55).lineBetween(44, 49, 47, 55);
  });
  make(CAMPAIGN_TEXTURES.effects.coolant, 64, 64, () => {
    graphics.fillStyle(0x071216, 1).fillRoundedRect(14, 5, 36, 54, 9);
    graphics.fillStyle(0x3c5963, 1).fillRect(5, 20, 12, 25).fillRect(47, 20, 12, 25);
    graphics.fillStyle(0x29454d, 1).fillRoundedRect(18, 9, 28, 46, 6);
    graphics.fillStyle(0x39e6d0, 1).fillRect(27, 14, 10, 36);
    graphics.lineStyle(3, 0xd7fff7, 1).lineBetween(32, 21, 32, 43);
    graphics.lineBetween(23, 26, 41, 38).lineBetween(41, 26, 23, 38);
  });
  make(CAMPAIGN_TEXTURES.effects.fuse, 64, 64, () => {
    graphics.fillStyle(0x8a9a99, 1);
    for (const [x, y] of [[5, 12], [5, 40], [47, 12], [47, 40]]) graphics.fillRect(x, y, 12, 12);
    graphics.fillStyle(0x354c55, 1).fillRoundedRect(9, 17, 46, 30, 6);
    graphics.lineStyle(3, 0x071216, 1).strokeRoundedRect(9, 17, 46, 30, 6);
    graphics.fillStyle(0xf5b942, 1).fillRect(20, 23, 24, 18);
    graphics.fillStyle(0xfff3c4, 1).fillRect(25, 26, 14, 5);
  });

  for (const [id, key] of Object.entries(CAMPAIGN_TEXTURES.decals)) {
    make(key, 256, 128, () => {
      if (id === 'medbay') {
        graphics.fillStyle(0x82f5e5, 0.13).fillRect(28, 28, 20, 60).fillRect(8, 48, 60, 20);
        graphics.fillRect(99, 29, 6, 58).fillRect(119, 29, 6, 58);
      } else if (id === 'reactor') {
        graphics.lineStyle(10, 0xf5b942, 0.14).strokeCircle(91, 64, 48);
        graphics.lineStyle(4, 0xf5b942, 0.14).lineBetween(68, 64, 114, 64).lineBetween(91, 41, 91, 87);
      } else {
        graphics.lineStyle(8, 0xa83247, 0.2);
        graphics.lineBetween(8, 103, 62, 78).lineBetween(62, 78, 111, 57).lineBetween(111, 57, 153, 25);
        graphics.lineBetween(31, 111, 73, 96).lineBetween(73, 96, 116, 79).lineBetween(116, 79, 163, 53);
      }
    });
  }

  const cloneStep = (baseKey: string, stepKey: string): void => {
    if (scene.textures.exists(stepKey)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return;
    const source = scene.textures.get(baseKey).getSourceImage() as CanvasImageSource;
    context.drawImage(source, 0, 0, 128, 128);
    scene.textures.addCanvas(stepKey, canvas);
  };
  for (const id of ['swarmer', 'skitter', 'brute'] as const satisfies readonly EnemyId[]) {
    cloneStep(TEXTURES.enemies[id], enemyStepTexture(id));
  }
  cloneStep(CAMPAIGN_TEXTURES.enemies.elite, CAMPAIGN_TEXTURES.enemies.eliteStep);
  cloneStep(CAMPAIGN_TEXTURES.enemies.alpha, CAMPAIGN_TEXTURES.enemies.alphaStep);
  graphics.destroy();
}
