import Phaser from 'phaser';
import type { CharacterId, WeaponId } from '../shared/game-types';
import { TEXTURES } from './config';
import { OPERATIVE_VISUALS, WEAPON_VISUALS } from './visual-config';

export interface OperativeVisualState {
  x: number;
  y: number;
  aimAngle: number;
  moveX: number;
  moveY: number;
  timeMs: number;
}

export class OperativeVisual {
  private readonly container: Phaser.GameObjects.Container;
  private readonly legs: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly weaponRoot: Phaser.GameObjects.Container;
  private readonly weapon: Phaser.GameObjects.Image;
  private character: CharacterId = 'scout';
  private selectedWeapon: WeaponId = 'rifle';
  private movingFrame = false;
  private pose: 'idle' | 'a' | 'b' = 'idle';
  private nextFrameAt = 0;
  private recoilStartedAt = -1000;
  private recoilUntil = 0;
  private recoil = 0;
  private shots = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.legs = scene.add.image(0, 0, 'operative-scout-legs-idle');
    this.body = scene.add.image(0, 0, TEXTURES.characters.scout);
    this.weapon = scene.add.image(WEAPON_VISUALS.rifle.centerX, 0, WEAPON_VISUALS.rifle.texture);
    this.weaponRoot = scene.add.container(0, 0, [this.weapon]);
    this.container = scene.add.container(x, y, [this.legs, this.body, this.weaponRoot])
      .setDepth(20).setVisible(false);
    this.start('scout');
  }

  start(character: CharacterId): void {
    this.character = character;
    const size = OPERATIVE_VISUALS[character].size;
    this.legs.setTexture(`operative-${character}-legs-idle`).setDisplaySize(size, size);
    this.body.setTexture(TEXTURES.characters[character]).setDisplaySize(size, size);
    this.movingFrame = false;
    this.pose = 'idle';
    this.nextFrameAt = 0;
    this.recoilStartedAt = -1000;
    this.recoilUntil = 0;
    this.recoil = 0;
    this.shots = 0;
    this.weaponRoot.x = 0;
    this.setWeapon('rifle');
    this.clearFlash();
    this.container.setAlpha(1).setVisible(true);
  }

  setWeapon(id: WeaponId): void {
    this.selectedWeapon = id;
    const visual = WEAPON_VISUALS[id];
    this.weapon.setTexture(visual.texture).setDisplaySize(visual.width, visual.height).setX(visual.centerX);
  }

  update(state: OperativeVisualState): void {
    const definition = OPERATIVE_VISUALS[this.character];
    this.container.setPosition(state.x, state.y);
    this.body.rotation = state.aimAngle;
    this.weaponRoot.rotation = state.aimAngle;
    const moving = Math.abs(state.moveX) + Math.abs(state.moveY) > 0.01;
    if (moving) {
      this.legs.rotation = Math.atan2(state.moveY, state.moveX);
      if (state.timeMs >= this.nextFrameAt) {
        this.movingFrame = !this.movingFrame;
        this.nextFrameAt = state.timeMs + definition.frameMs;
      }
    } else {
      this.movingFrame = false;
    }
    this.pose = moving ? this.movingFrame ? 'a' : 'b' : 'idle';
    this.legs.setTexture(`operative-${this.character}-legs-${this.pose}`);

    const recoilDuration = Math.max(1, this.recoilUntil - this.recoilStartedAt);
    const progress = Phaser.Math.Clamp((state.timeMs - this.recoilStartedAt) / recoilDuration, 0, 1);
    this.recoil = Math.sin(progress * Math.PI) * WEAPON_VISUALS[this.selectedWeapon].recoil;
    this.weaponRoot.x = -this.recoil;
  }

  fire(timeMs: number): void {
    this.recoilStartedAt = timeMs;
    this.recoilUntil = timeMs + (this.selectedWeapon === 'rifle' ? 65 : 110);
    this.shots += 1;
  }

  muzzlePosition(angle: number): { x: number; y: number } {
    const distance = WEAPON_VISUALS[this.selectedWeapon].muzzle +
      OPERATIVE_VISUALS[this.character].muzzleOffset - this.recoil;
    return {
      x: this.container.x + Math.cos(angle) * distance,
      y: this.container.y + Math.sin(angle) * distance,
    };
  }

  getSnapshot() {
    const muzzle = this.muzzlePosition(this.weaponRoot.rotation);
    return {
      pose: this.pose,
      weapon: this.selectedWeapon,
      shots: this.shots,
      muzzle: { x: Math.round(muzzle.x * 100) / 100, y: Math.round(muzzle.y * 100) / 100 },
    };
  }

  flash(color: number): void {
    this.legs.setTintFill(color);
    this.body.setTintFill(color);
    this.weapon.setTintFill(color);
  }

  clearFlash(): void {
    this.legs.clearTint();
    this.body.clearTint();
    this.weapon.clearTint();
  }

  setDead(dead: boolean): void {
    this.container.setAlpha(dead ? 0.45 : 1);
    if (dead) this.flash(0x8b4357);
    else this.clearFlash();
  }

  hide(): void {
    this.container.setVisible(false);
    this.weaponRoot.x = 0;
    this.recoil = 0;
    this.movingFrame = false;
    this.pose = 'idle';
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
