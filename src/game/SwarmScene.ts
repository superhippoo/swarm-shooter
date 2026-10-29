import Phaser from 'phaser';
import type {
  CharacterDefinition,
  CharacterId,
  EnemyId,
  GameScreen,
  GameSnapshot,
  MissionPhase,
  WeaponId,
  WeaponSnapshot,
} from '../shared/game-types';
import { ProceduralAudio } from './audio';
import {
  CHARACTERS,
  COMBAT,
  ENEMIES,
  LIMITS,
  MISSION,
  OBSTACLES,
  SPAWN_POINTS,
  SUPPLIES,
  TEXTURES,
  WAVES,
  WEAPONS,
  WEAPON_ORDER,
  WORLD,
  type SupplyDefinition,
  type WaveDefinition,
  type WavePhase,
} from './config';
import {
  actualReloadMs,
  advanceMission,
  applySupply,
  canFireWeapon,
  cancelReload,
  consumeRound,
  createEmergencyRuntime,
  createMission,
  createWeaponCollection,
  distanceBetween,
  explosionDamage,
  getMissionObjective,
  isDefenseZoneActive,
  isWithinRange,
  massScale,
  reloadProgress,
  requestReload,
  selectAutoAimTarget,
  segmentCircleTime,
  segmentRectangleTime,
  settleReload,
  totalAmmo,
  updateEmergency,
  type EmergencyRuntime,
  type MissionRuntime,
  type WeaponCollection,
} from './logic';
import { SpatialHash } from './spatial';
import { createGeneratedTextures, preloadGameAssets } from './textures';
import { createArtFallbacks } from './art-fallbacks';
import { createFacility } from './facility';
import { OperativeVisual } from './operative-visual';
import { ENEMY_ANIMATION, enemyStepTexture } from './visual-config';

export interface HudData {
  health: number;
  maxHealth: number;
  weapons: WeaponSnapshot[];
  selectedWeapon: WeaponId;
  reloadRatio: number;
  missionLabel: string;
  missionProgress: number;
  missionTarget: number;
  missionPhase: MissionPhase;
  kills: number;
  notice: string;
}

export interface SwarmSceneCallbacks {
  onReady: () => void;
  onScreen: (screen: GameScreen) => void;
  onHud: (data: HudData) => void;
}

type EnemyState = 'inactive' | 'spawning' | 'active';

interface BulletSlot {
  image: Phaser.GameObjects.Image;
  trail: Phaser.GameObjects.Image;
  active: boolean;
  weaponId: WeaponId;
  shotId: number;
  velocityX: number;
  velocityY: number;
  remainingMs: number;
  candidates: EnemySlot[];
}

interface EnemySlot {
  id: number;
  type: EnemyId;
  state: EnemyState;
  sprite: Phaser.GameObjects.Sprite;
  warning: Phaser.GameObjects.Image;
  health: number;
  activateAt: number;
  nextAttackAt: number;
  nextAiAt: number;
  nextStrafeAt: number;
  strafeSign: number;
  flashUntil: number;
  moveX: number;
  moveY: number;
  knockX: number;
  knockY: number;
  lastKnockbackEvent: number;
  candidates: EnemySlot[];
}

interface ParticleSlot {
  image: Phaser.GameObjects.Image;
  active: boolean;
  kind: 'spark' | 'ring';
  velocityX: number;
  velocityY: number;
  remainingMs: number;
  durationMs: number;
  targetScale: number;
}

interface CorpseSlot {
  image: Phaser.GameObjects.Image;
  active: boolean;
  remainingMs: number;
  bornAt: number;
}

interface SupplySlot {
  definition: SupplyDefinition;
  image: Phaser.GameObjects.Image;
  unlocked: boolean;
  active: boolean;
}

interface SpawnRequest {
  type: EnemyId;
  phase: WavePhase;
  direction: 'forward' | 'rear' | null;
}

interface BulletCollision {
  time: number;
  enemy: EnemySlot | null;
}

export class SwarmScene extends Phaser.Scene {
  private readonly callbacks: SwarmSceneCallbacks;
  private readonly audio = new ProceduralAudio();
  private readonly pressedKeys = new Set<string>();
  private readonly aimPoint = new Phaser.Math.Vector2(WORLD.start.x, WORLD.start.y);
  private readonly touchMove = new Phaser.Math.Vector2();
  private readonly lastAimDirection = new Phaser.Math.Vector2(1, 0);
  private touchControlsEnabled = false;
  private autoAimTargetId: number | null = null;
  private readonly enemyHash = new SpatialHash<EnemySlot>(COMBAT.spatialCellSize);
  private readonly contactCandidates: EnemySlot[] = [];
  private screen: GameScreen = 'menu';
  private character: CharacterDefinition | null = null;
  private weapons: WeaponCollection = createWeaponCollection(CHARACTERS.scout);
  private selectedWeapon: WeaponId = 'rifle';
  private nextShotAt: Record<WeaponId, number> = { rifle: 0, shotgun: 0, launcher: 0 };
  private mission: MissionRuntime = createMission();
  private emergency: EmergencyRuntime = createEmergencyRuntime();
  private player!: Phaser.GameObjects.Sprite;
  private playerVisual!: OperativeVisual;
  private crosshair!: Phaser.GameObjects.Image;
  private muzzle!: Phaser.GameObjects.Image;
  private objectiveMarker!: Phaser.GameObjects.Graphics;
  private objectiveText!: Phaser.GameObjects.Text;
  private objectiveArrow!: Phaser.GameObjects.Image;
  private objectiveDistance!: Phaser.GameObjects.Text;
  private bullets: BulletSlot[] = [];
  private enemies: EnemySlot[] = [];
  private particles: ParticleSlot[] = [];
  private corpses: CorpseSlot[] = [];
  private supplies: SupplySlot[] = [];
  private spawnQueue: SpawnRequest[] = [];
  private triggeredWaves = new Set<string>();
  private ready = false;
  private firingHeld = false;
  private triggerPressed = false;
  private shakeEnabled = true;
  private runId = 0;
  private tick = 0;
  private runTimeMs = 0;
  private playerHealth = 0;
  private kills = 0;
  private nextEnemyId = 1;
  private nextShotId = 1;
  private nextSpawnEmissionAt = 0;
  private randomSeed = 1;
  private nextPlayerDamageAt = 0;
  private playerFlashUntil = 0;
  private muzzleUntil = 0;
  private nextHudAt = 0;
  private nextObjectiveAt = 0;
  private objectiveLabel = '';
  private notice = '';
  private noticeUntil = 0;
  private shakeUntil = 0;
  private shakeIntensity = 0;
  private readonly playerRadius = 16;

  constructor(callbacks: SwarmSceneCallbacks) {
    super('swarm');
    this.callbacks = callbacks;
  }

  preload(): void {
    preloadGameAssets(this);
  }

  create(): void {
    createGeneratedTextures(this);
    createArtFallbacks(this);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBackgroundColor(0x080d12);
    this.drawFacility();
    this.createPools();
    this.createPlayer();
    this.crosshair = this.add.image(WORLD.start.x, WORLD.start.y, TEXTURES.crosshair)
      .setDisplaySize(38, 38).setDepth(100).setVisible(false);
    this.muzzle = this.add.image(0, 0, TEXTURES.muzzle)
      .setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(30).setVisible(false);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.input.on(Phaser.Input.Events.GAME_OUT, this.handlePointerUp, this);
    this.input.mouse?.disableContextMenu();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.ready = true;
    this.updateObjectiveMarker();
    this.callbacks.onReady();
    this.callbacks.onScreen(this.screen);
  }

  startRun(characterId: CharacterId): void {
    if (!this.ready) return;
    this.audio.unlock();
    this.resetPools();
    this.character = CHARACTERS[characterId];
    this.weapons = createWeaponCollection(this.character);
    this.selectedWeapon = 'rifle';
    this.nextShotAt = { rifle: 0, shotgun: 0, launcher: 0 };
    this.mission = createMission();
    this.emergency = createEmergencyRuntime();
    this.runId += 1;
    this.randomSeed = (this.runId * 2_654_435_761) >>> 0;
    this.tick = 0;
    this.runTimeMs = 0;
    this.playerHealth = this.character.maxHealth;
    this.kills = 0;
    this.nextEnemyId = 1;
    this.nextShotId = 1;
    this.nextSpawnEmissionAt = 0;
    this.nextPlayerDamageAt = 0;
    this.playerFlashUntil = 0;
    this.muzzleUntil = 0;
    this.nextHudAt = 0;
    this.nextObjectiveAt = 0;
    this.objectiveLabel = '';
    this.shakeUntil = 0;
    this.shakeIntensity = 0;
    this.pressedKeys.clear();
    this.resetTouchInput();
    this.firingHeld = false;
    this.triggerPressed = false;
    this.lastAimDirection.set(1, 0);
    this.player.setPosition(WORLD.start.x, WORLD.start.y).setRotation(0).setAlpha(0).clearTint()
      .setActive(true).setVisible(false);
    this.playerVisual.start(characterId);
    this.cameras.main.stopFollow();
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(150, 100);
    this.cameras.main.centerOn(WORLD.start.x, WORLD.start.y);
    this.crosshair.setVisible(true);
    this.screen = 'playing';
    this.setNotice(`검은 이슬 — ${this.character.name}, 중계기를 깨우세요`, 2800);
    this.processWaveTriggers();
    this.processSpawnQueue();
    this.updateSupplies();
    this.updateObjectiveMarker();
    this.callbacks.onScreen(this.screen);
    this.emitHud();
  }

  restartRun(): void {
    if (this.character) this.startRun(this.character.id);
  }

  returnToMenu(): void {
    if (!this.ready) return;
    this.resetPools();
    this.pressedKeys.clear();
    this.resetTouchInput();
    this.firingHeld = false;
    this.triggerPressed = false;
    this.character = null;
    this.playerHealth = 0;
    this.player.setPosition(WORLD.start.x, WORLD.start.y).setActive(false).setVisible(false);
    this.playerVisual.hide();
    this.cameras.main.stopFollow();
    this.crosshair.setVisible(false);
    this.objectiveArrow.setVisible(false);
    this.objectiveDistance.setVisible(false);
    this.screen = 'menu';
    this.mission = createMission();
    this.audio.pause();
    this.updateObjectiveMarker();
    this.callbacks.onScreen(this.screen);
  }

  pauseRun(): void {
    if (this.screen !== 'playing') return;
    this.screen = 'paused';
    this.firingHeld = false;
    this.triggerPressed = false;
    this.pressedKeys.clear();
    this.resetTouchInput();
    this.crosshair.setVisible(false);
    this.cameras.main.shakeEffect.reset();
    this.audio.pause();
    this.callbacks.onScreen(this.screen);
    this.emitHud();
  }

  resumeRun(): void {
    if (this.screen !== 'paused') return;
    this.audio.unlock();
    this.screen = 'playing';
    this.crosshair.setVisible(true);
    this.callbacks.onScreen(this.screen);
  }

  setTouchControlsEnabled(enabled: boolean): void {
    if (this.touchControlsEnabled === enabled) return;
    this.touchControlsEnabled = enabled;
    this.pressedKeys.clear();
    this.resetTouchInput();
    this.firingHeld = false;
    this.triggerPressed = false;
    if (this.ready && this.character) {
      this.lastAimDirection.set(Math.cos(this.player.rotation), Math.sin(this.player.rotation));
      this.updateAim();
    }
  }

  setMoveVector(x: number, y: number): void {
    if (!this.touchControlsEnabled || this.screen !== 'playing' || !Number.isFinite(x) || !Number.isFinite(y)) {
      this.touchMove.set(0, 0);
      return;
    }
    const length = Math.hypot(x, y);
    this.touchMove.set(length > 1 ? x / length : x, length > 1 ? y / length : y);
  }

  private resetTouchInput(): void {
    this.touchMove.set(0, 0);
    this.autoAimTargetId = null;
  }

  setKey(code: string, pressed: boolean): void {
    if (pressed && this.screen === 'playing') this.pressedKeys.add(code);
    else this.pressedKeys.delete(code);
  }

  setFiring(firing: boolean): void {
    if (firing && this.screen === 'playing') {
      this.firingHeld = true;
      this.triggerPressed = true;
    } else if (!firing) {
      this.firingHeld = false;
    }
  }

  setTouchFiring(firing: boolean): void {
    if (!firing) {
      this.firingHeld = false;
      this.triggerPressed = false;
      return;
    }
    if (!this.touchControlsEnabled || this.screen !== 'playing') return;
    this.audio.unlock();
    this.setFiring(true);
    this.updateAim();
    this.updateWeapon();
    this.emitHud();
  }

  selectWeapon(id: WeaponId): void {
    if (this.screen !== 'playing' || id === this.selectedWeapon) return;
    this.weapons[this.selectedWeapon] = cancelReload(this.weapons[this.selectedWeapon]);
    this.selectedWeapon = id;
    this.playerVisual.setWeapon(id);
    this.triggerPressed = false;
    this.emitHud();
  }

  cycleWeapon(direction: number): void {
    const current = WEAPON_ORDER.indexOf(this.selectedWeapon);
    const next = (current + (direction > 0 ? 1 : -1) + WEAPON_ORDER.length) % WEAPON_ORDER.length;
    this.selectWeapon(WEAPON_ORDER[next]);
  }

  setShakeEnabled(enabled: boolean): void {
    this.shakeEnabled = enabled;
    if (!enabled) {
      this.cameras.main.shakeEffect.reset();
      this.shakeUntil = 0;
      this.shakeIntensity = 0;
    }
  }

  reloadWeapon(): void {
    if (this.screen !== 'playing' || !this.character) return;
    const definition = WEAPONS[this.selectedWeapon];
    const duration = actualReloadMs(definition, this.character);
    const updated = requestReload(
      this.weapons[this.selectedWeapon],
      definition.magazineSize,
      this.runTimeMs,
      duration,
    );
    if (updated !== this.weapons[this.selectedWeapon]) {
      this.weapons[this.selectedWeapon] = updated;
      this.audio.playReload();
      this.setNotice(`${definition.name} · 재장전`, Math.min(duration, 1100));
      this.emitHud();
    }
  }

  getSnapshot(): GameSnapshot {
    const inRun = this.screen !== 'menu' && this.character !== null;
    const observer = this.ready ? this.player : WORLD.start;
    const objective = getMissionObjective(this.mission, observer);
    const objectiveScreen = this.ready
      ? this.worldToScreen(objective.worldX, objective.worldY)
      : { x: 0, y: 0 };
    const activeEnemies = this.enemies.filter((enemy) => enemy.state === 'active');
    const reportedEnemies = activeEnemies;
    const fps = this.ready ? this.game.loop.actualFps : 0;
    return {
      screen: this.screen,
      characterId: this.character?.id ?? null,
      tick: this.tick,
      runId: this.runId,
      input: {
        mode: this.touchControlsEnabled ? 'touch' : 'desktop',
        moveX: this.round(this.touchMove.x),
        moveY: this.round(this.touchMove.y),
        firing: inRun && this.firingHeld,
        autoAimTargetId: inRun && this.touchControlsEnabled ? this.autoAimTargetId : null,
      },
      player: {
        x: this.round(this.player?.x ?? WORLD.start.x),
        y: this.round(this.player?.y ?? WORLD.start.y),
        health: inRun ? Math.max(0, Math.ceil(this.playerHealth)) : 0,
        maxHealth: this.character?.maxHealth ?? 0,
      },
      selectedWeapon: inRun ? this.selectedWeapon : null,
      visual: inRun ? this.playerVisual.getSnapshot() : {
        pose: 'idle', weapon: null, shots: 0, muzzle: { x: WORLD.start.x, y: WORLD.start.y },
      },
      weapons: inRun ? WEAPON_ORDER.map((id) => ({
        id,
        magazine: this.weapons[id].magazine,
        reserve: this.weapons[id].reserve,
        reloading: this.weapons[id].reloading,
      })) : [],
      mission: {
        phase: inRun ? this.mission.phase : null,
        label: inRun ? objective.label : '작전 캐릭터 선택',
        progress: inRun ? objective.progress : 0,
        target: inRun ? objective.target : 0,
        worldX: objective.worldX,
        worldY: objective.worldY,
        screenX: this.round(objectiveScreen.x),
        screenY: this.round(objectiveScreen.y),
      },
      enemies: reportedEnemies.map((enemy) => {
        const screen = this.worldToScreen(enemy.sprite.x, enemy.sprite.y);
        return {
          id: enemy.id,
          type: enemy.type,
          x: this.round(enemy.sprite.x),
          y: this.round(enemy.sprite.y),
          screenX: this.round(screen.x),
          screenY: this.round(screen.y),
          health: Math.max(0, Math.ceil(enemy.health)),
        };
      }),
      performance: {
        fps: Number.isFinite(fps) ? Math.round(fps * 10) / 10 : 0,
        activeEnemies: activeEnemies.length,
        activeProjectiles: this.bullets.filter((bullet) => bullet.active).length,
        activeParticles: this.particles.filter((particle) => particle.active).length,
      },
    };
  }

  update(_time: number, delta: number): void {
    if (!this.ready || this.screen !== 'playing' || !this.character) return;
    const deltaMs = Math.min(50, Math.max(0, delta));
    this.runTimeMs += deltaMs;
    this.tick += 1;
    for (const id of WEAPON_ORDER) {
      this.weapons[id] = settleReload(this.weapons[id], WEAPONS[id].magazineSize, this.runTimeMs);
    }
    this.updatePlayer();
    const previousPhase = this.mission.phase;
    this.mission = advanceMission(this.mission, this.player, deltaMs);
    if (this.mission.phase !== previousPhase) this.handleMissionTransition(previousPhase);
    if (this.screen !== 'playing') return;
    this.activateSpawnedEnemies();
    this.processWaveTriggers();
    this.processSpawnQueue();
    this.updateEnemies(deltaMs);
    this.rebuildEnemyHash();
    this.updateWeapon();
    this.updateBullets(deltaMs);
    this.handlePlayerContacts();
    if (this.screen !== 'playing') return;
    this.updateSupplies();
    this.updateEmergencyAmmo(deltaMs);
    this.updateParticles(deltaMs);
    this.updateCorpses(deltaMs);
    this.updateTransientEffects();
    if (this.runTimeMs >= this.nextObjectiveAt) {
      this.updateObjectiveMarker();
      this.nextObjectiveAt = this.runTimeMs + 80;
    }
    if (this.runTimeMs >= this.nextHudAt) {
      this.emitHud();
      this.nextHudAt = this.runTimeMs + 80;
    }
  }

  private createPlayer(): void {
    this.player = this.add.sprite(WORLD.start.x, WORLD.start.y, TEXTURES.characters.scout)
      .setActive(false).setVisible(false);
    this.playerVisual = new OperativeVisual(this, WORLD.start.x, WORLD.start.y);
    this.playerVisual.hide();
  }

  private createPools(): void {
    for (let index = 0; index < LIMITS.projectiles; index += 1) {
      const image = this.add.image(-100, -100, TEXTURES.projectiles.rifle)
        .setDepth(14).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      const trail = this.add.image(-100, -100, TEXTURES.bulletTrail)
        .setDepth(13).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      this.bullets.push({
        image, trail, active: false, weaponId: 'rifle', shotId: 0,
        velocityX: 0, velocityY: 0, remainingMs: 0, candidates: [],
      });
    }
    for (let index = 0; index < LIMITS.enemies; index += 1) {
      const sprite = this.add.sprite(-100, -100, TEXTURES.enemies.swarmer)
        .setDepth(12).setVisible(false);
      const warning = this.add.image(-100, -100, TEXTURES.spawnWarning)
        .setDepth(11).setVisible(false);
      this.enemies.push({
        id: 0, type: 'swarmer', state: 'inactive', sprite, warning, health: 0,
        activateAt: 0, nextAttackAt: 0, nextAiAt: 0, nextStrafeAt: 0,
        strafeSign: index % 2 === 0 ? 1 : -1, flashUntil: 0,
        moveX: 0, moveY: 0, knockX: 0, knockY: 0,
        lastKnockbackEvent: -1, candidates: [],
      });
    }
    for (let index = 0; index < LIMITS.particles; index += 1) {
      const image = this.add.image(-100, -100, TEXTURES.particle)
        .setDepth(25).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      this.particles.push({
        image, active: false, kind: 'spark', velocityX: 0, velocityY: 0,
        remainingMs: 0, durationMs: 0, targetScale: 1,
      });
    }
    for (let index = 0; index < LIMITS.corpses; index += 1) {
      const image = this.add.image(-100, -100, TEXTURES.corpse).setDepth(1).setVisible(false);
      this.corpses.push({ image, active: false, remainingMs: 0, bornAt: 0 });
    }
    for (const definition of SUPPLIES) {
      const image = this.add.image(definition.x, definition.y, TEXTURES.supply)
        .setDepth(5).setVisible(false);
      this.supplies.push({ definition, image, unlocked: false, active: false });
    }
  }

  private updatePlayer(): void {
    if (!this.character) return;
    this.updateAim();
    let horizontal = this.touchControlsEnabled ? this.touchMove.x : 0;
    let vertical = this.touchControlsEnabled ? this.touchMove.y : 0;
    if (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft')) horizontal -= 1;
    if (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight')) horizontal += 1;
    if (this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp')) vertical -= 1;
    if (this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown')) vertical += 1;
    const length = Math.hypot(horizontal, vertical);
    const normalizer = length > 1 ? length : 1;
    const speed = this.character.speed * this.lastDeltaSeconds;
    this.moveCircle(this.player, this.playerRadius, horizontal / normalizer * speed, vertical / normalizer * speed);
    this.playerVisual.update({
      x: this.player.x,
      y: this.player.y,
      aimAngle: this.player.rotation,
      moveX: horizontal / normalizer,
      moveY: vertical / normalizer,
      timeMs: this.runTimeMs,
    });
    if (this.playerFlashUntil > 0 && this.runTimeMs >= this.playerFlashUntil) {
      this.playerVisual.clearFlash();
      this.playerFlashUntil = 0;
    }
  }

  private updateAim(): void {
    if (this.touchControlsEnabled) {
      const candidates = this.enemies
        .filter((enemy) => enemy.state === 'active' &&
          this.isWorldVisible(enemy.sprite.x, enemy.sprite.y, ENEMIES[enemy.type].radius))
        .map((enemy) => ({ id: enemy.id, x: enemy.sprite.x, y: enemy.sprite.y }));
      const target = selectAutoAimTarget(this.player, candidates, OBSTACLES);
      this.autoAimTargetId = target?.id ?? null;
      if (target) {
        const dx = target.x - this.player.x;
        const dy = target.y - this.player.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0.001) this.lastAimDirection.set(dx / distance, dy / distance);
      }
      const aimDistance = target ? distanceBetween(this.player, target) : 220;
      this.aimPoint.set(
        this.player.x + this.lastAimDirection.x * aimDistance,
        this.player.y + this.lastAimDirection.y * aimDistance,
      );
    } else {
      this.autoAimTargetId = null;
      const pointer = this.input.activePointer;
      this.cameras.main.getWorldPoint(pointer.x, pointer.y, this.aimPoint);
    }
    this.crosshair.setPosition(this.aimPoint.x, this.aimPoint.y);
    this.player.setRotation(this.touchControlsEnabled
      ? Math.atan2(this.lastAimDirection.y, this.lastAimDirection.x)
      : Phaser.Math.Angle.Between(this.player.x, this.player.y, this.aimPoint.x, this.aimPoint.y));
  }

  private get lastDeltaSeconds(): number {
    return Math.min(50, Math.max(0, this.game.loop.delta)) / 1000;
  }

  private updateWeapon(): void {
    const pressed = this.triggerPressed;
    this.triggerPressed = false;
    const id = this.selectedWeapon;
    const definition = WEAPONS[id];
    const state = this.weapons[id];
    const trigger = definition.automatic ? this.firingHeld : pressed;
    if (trigger && state.magazine <= 0 && !state.reloading) this.reloadWeapon();
    const freeSlots = this.bullets.reduce((count, bullet) => count + (!bullet.active ? 1 : 0), 0);
    if (!canFireWeapon(
      state, definition, this.runTimeMs, this.nextShotAt[id],
      this.firingHeld, pressed, freeSlots,
    )) return;
    const slots = this.bullets.filter((bullet) => !bullet.active).slice(0, definition.pellets);
    const ammunition = consumeRound(state);
    if (!ammunition || slots.length !== definition.pellets) return;
    this.weapons[id] = ammunition;
    this.nextShotAt[id] = this.runTimeMs + definition.fireIntervalMs;
    const shotId = this.nextShotId;
    this.nextShotId += 1;
    this.playerVisual.fire(this.runTimeMs);
    for (let index = 0; index < slots.length; index += 1) {
      let offset: number;
      if (id === 'shotgun') {
        const base = ((index + 0.5) / definition.pellets - 0.5) * definition.spreadRadians;
        const jitter = (this.random() - 0.5) * (definition.spreadRadians / definition.pellets) * 0.5;
        offset = base + jitter;
      } else {
        offset = (this.random() - 0.5) * definition.spreadRadians;
      }
      this.spawnBullet(slots[index], id, this.player.rotation + offset, shotId);
    }
    const muzzle = this.playerVisual.muzzlePosition(this.player.rotation);
    this.muzzle.setPosition(muzzle.x, muzzle.y)
      .setRotation(this.player.rotation)
      .setScale(id === 'rifle' ? 0.72 : id === 'shotgun' ? 1.2 : 1.45)
      .setTint(id === 'rifle' ? 0x82f5e5 : 0xf5b942).setVisible(true);
    this.muzzleUntil = this.runTimeMs + (id === 'rifle' ? 42 : id === 'shotgun' ? 72 : 90);
    this.audio.playShot(id);
    this.requestShake(id === 'rifle' ? 45 : 90, definition.shake);
  }

  private spawnBullet(slot: BulletSlot, id: WeaponId, angle: number, shotId: number): void {
    const definition = WEAPONS[id];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const muzzle = this.playerVisual.muzzlePosition(angle);
    const x = muzzle.x;
    const y = muzzle.y;
    slot.active = true;
    slot.weaponId = id;
    slot.shotId = shotId;
    slot.velocityX = cos * definition.projectileSpeed;
    slot.velocityY = sin * definition.projectileSpeed;
    slot.remainingMs = definition.range / definition.projectileSpeed * 1000;
    slot.image.setTexture(TEXTURES.projectiles[id]).setPosition(x, y).setRotation(angle)
      .setScale(id === 'shotgun' ? 0.8 : 1).setVisible(true);
    slot.trail.setPosition(x - cos * 20, y - sin * 20).setRotation(angle)
      .setTint(id === 'rifle' ? 0x39e6d0 : id === 'shotgun' ? 0xf5b942 : 0xff5d64)
      .setScale(id === 'launcher' ? 1.4 : 1).setAlpha(0.85).setVisible(true);
  }

  private updateBullets(deltaMs: number): void {
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      const stepMs = Math.min(deltaMs, bullet.remainingMs);
      const seconds = stepMs / 1000;
      bullet.remainingMs -= stepMs;
      const startX = bullet.image.x;
      const startY = bullet.image.y;
      const endX = startX + bullet.velocityX * seconds;
      const endY = startY + bullet.velocityY * seconds;
      const collision = this.findBulletCollision(bullet, startX, startY, endX, endY);
      if (collision) {
        const x = startX + (endX - startX) * collision.time;
        const y = startY + (endY - startY) * collision.time;
        if (bullet.weaponId === 'launcher') {
          this.explode(x, y, bullet.shotId, collision.enemy);
        } else if (collision.enemy) {
          const definition = WEAPONS[bullet.weaponId];
          this.applyDamage(
            collision.enemy, definition.damage, bullet.image.rotation,
            definition.knockback, bullet.shotId, bullet.weaponId === 'shotgun',
          );
        } else {
          this.spawnParticles(x, y, 0xf5b942, 2, 60);
        }
        this.deactivateBullet(bullet);
        continue;
      }
      bullet.image.setPosition(endX, endY);
      bullet.trail.setPosition(
        endX - Math.cos(bullet.image.rotation) * 22,
        endY - Math.sin(bullet.image.rotation) * 22,
      );
      if (bullet.remainingMs <= 0) {
        if (bullet.weaponId === 'launcher') this.explode(endX, endY, bullet.shotId, null);
        this.deactivateBullet(bullet);
        continue;
      }
      const visible = this.isWorldVisible(endX, endY, 80);
      bullet.image.setVisible(visible);
      bullet.trail.setVisible(visible);
    }
  }

  private findBulletCollision(
    bullet: BulletSlot,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): BulletCollision | null {
    const padding = 38;
    const candidates = this.enemyHash.query(
      Math.min(startX, endX) - padding, Math.min(startY, endY) - padding,
      Math.max(startX, endX) + padding, Math.max(startY, endY) + padding,
      bullet.candidates,
    );
    let closest = Number.POSITIVE_INFINITY;
    let directEnemy: EnemySlot | null = null;
    for (const enemy of candidates) {
      if (enemy.state !== 'active') continue;
      const radius = ENEMIES[enemy.type].radius + (bullet.weaponId === 'launcher' ? 6 : 3);
      const time = segmentCircleTime(startX, startY, endX, endY, enemy.sprite.x, enemy.sprite.y, radius);
      if (time !== null && time < closest) {
        closest = time;
        directEnemy = enemy;
      }
    }
    const projectileRadius = bullet.weaponId === 'launcher' ? 6 : 2;
    for (const obstacle of OBSTACLES) {
      const time = segmentRectangleTime(
        startX, startY, endX, endY,
        obstacle.x - obstacle.width / 2 - projectileRadius,
        obstacle.y - obstacle.height / 2 - projectileRadius,
        obstacle.x + obstacle.width / 2 + projectileRadius,
        obstacle.y + obstacle.height / 2 + projectileRadius,
      );
      if (time !== null && time < closest) {
        closest = time;
        directEnemy = null;
      }
    }
    const exit = this.worldExitTime(startX, startY, endX, endY);
    if (exit !== null && exit < closest) {
      closest = exit;
      directEnemy = null;
    }
    return Number.isFinite(closest) ? { time: closest, enemy: directEnemy } : null;
  }

  private worldExitTime(startX: number, startY: number, endX: number, endY: number): number | null {
    let closest = Number.POSITIVE_INFINITY;
    if (endX < 0 && endX !== startX) closest = Math.min(closest, -startX / (endX - startX));
    if (endX > WORLD.width && endX !== startX) closest = Math.min(closest, (WORLD.width - startX) / (endX - startX));
    if (endY < 0 && endY !== startY) closest = Math.min(closest, -startY / (endY - startY));
    if (endY > WORLD.height && endY !== startY) closest = Math.min(closest, (WORLD.height - startY) / (endY - startY));
    return Number.isFinite(closest) && closest >= 0 && closest <= 1 ? closest : null;
  }

  private explode(x: number, y: number, shotId: number, directEnemy: EnemySlot | null): void {
    const definition = WEAPONS.launcher;
    const radius = definition.explosionRadius ?? 0;
    const candidates = this.enemyHash.query(x - radius, y - radius, x + radius, y + radius, this.contactCandidates);
    let applied = 0;
    for (const enemy of candidates) {
      if (enemy.state !== 'active') continue;
      const distance = distanceBetween({ x, y }, enemy.sprite);
      const damage = explosionDamage(definition.damage, distance, radius, enemy === directEnemy);
      if (damage <= 0) continue;
      const angle = distance > 0.001
        ? Phaser.Math.Angle.Between(x, y, enemy.sprite.x, enemy.sprite.y)
        : Phaser.Math.Angle.Between(this.player.x, this.player.y, x, y);
      this.applyDamage(enemy, damage, angle, definition.knockback, shotId, true);
      applied += 1;
    }
    this.spawnExplosionRing(x, y, radius);
    this.spawnParticles(x, y, 0xf5b942, 22, 260);
    this.audio.playExplosion();
    this.requestShake(140, definition.shake);
    if (applied > 0) this.spawnParticles(x, y, 0xffffff, 5, 120);
  }

  private applyDamage(
    enemy: EnemySlot,
    damage: number,
    angle: number,
    knockback: number,
    eventId: number,
    oncePerEvent: boolean,
  ): void {
    if (enemy.state !== 'active' || damage <= 0) return;
    enemy.health -= damage;
    enemy.flashUntil = this.runTimeMs + 65;
    enemy.sprite.setTintFill(0xffffff);
    this.spawnParticles(enemy.sprite.x, enemy.sprite.y, 0xff5d64, 3, 135);
    if (!oncePerEvent || enemy.lastKnockbackEvent !== eventId) {
      const scale = massScale(ENEMIES[enemy.type].radius);
      enemy.knockX += Math.cos(angle) * knockback * scale;
      enemy.knockY += Math.sin(angle) * knockback * scale;
      const magnitude = Math.hypot(enemy.knockX, enemy.knockY);
      if (magnitude > 300) {
        enemy.knockX = enemy.knockX / magnitude * 300;
        enemy.knockY = enemy.knockY / magnitude * 300;
      }
      enemy.lastKnockbackEvent = eventId;
    }
    if (enemy.health <= 0) this.killEnemy(enemy);
    else this.audio.playHit();
  }

  private killEnemy(enemy: EnemySlot): void {
    const x = enemy.sprite.x;
    const y = enemy.sprite.y;
    enemy.state = 'inactive';
    enemy.sprite.setVisible(false);
    enemy.warning.setVisible(false);
    this.spawnCorpse(x, y);
    this.spawnParticles(x, y, 0xff5d64, enemy.type === 'brute' ? 18 : 9, 190);
    this.kills += 1;
    this.audio.playEnemyDeath();
  }

  private activateSpawnedEnemies(): void {
    for (const enemy of this.enemies) {
      if (enemy.state !== 'spawning') continue;
      enemy.warning.setRotation(enemy.warning.rotation + 0.08);
      enemy.warning.setAlpha(0.45 + Math.sin(this.runTimeMs / 45) * 0.25);
      if (this.runTimeMs < enemy.activateAt) continue;
      enemy.state = 'active';
      enemy.warning.setVisible(false);
      enemy.sprite.setAlpha(1).clearTint().setVisible(true);
      enemy.nextAttackAt = this.runTimeMs + 300;
      enemy.nextAiAt = this.runTimeMs + enemy.id % 10 * 10;
      enemy.nextStrafeAt = this.runTimeMs + 400 + enemy.id % 4 * 90;
    }
  }

  private updateEnemies(deltaMs: number): void {
    const seconds = deltaMs / 1000;
    const knockDecay = Math.exp(-10 * seconds);
    for (const enemy of this.enemies) {
      if (enemy.state !== 'active') continue;
      const definition = ENEMIES[enemy.type];
      if (enemy.flashUntil > 0 && this.runTimeMs >= enemy.flashUntil) {
        enemy.sprite.clearTint();
        enemy.flashUntil = 0;
      }
      if (this.runTimeMs >= enemy.nextAiAt) this.updateEnemyDirection(enemy);
      enemy.knockX *= knockDecay;
      enemy.knockY *= knockDecay;
      this.moveCircle(
        enemy.sprite, definition.radius,
        (enemy.moveX + enemy.knockX) * seconds,
        (enemy.moveY + enemy.knockY) * seconds,
      );
      if (Math.abs(enemy.moveX) + Math.abs(enemy.moveY) > 1) {
        enemy.sprite.setRotation(Math.atan2(enemy.moveY, enemy.moveX));
        const animation = ENEMY_ANIMATION[enemy.type];
        const frame = Math.floor((this.runTimeMs + enemy.id * 37) / animation.frameMs) % 2;
        const texture = frame === 0 ? TEXTURES.enemies[enemy.type] : enemyStepTexture(enemy.type);
        if (enemy.sprite.texture.key !== texture) {
          enemy.sprite.setTexture(texture).setDisplaySize(animation.size, animation.size);
        }
      }
      enemy.sprite.setVisible(this.isWorldVisible(enemy.sprite.x, enemy.sprite.y, 100));
    }
  }

  private updateEnemyDirection(enemy: EnemySlot): void {
    const definition = ENEMIES[enemy.type];
    let angle = Phaser.Math.Angle.Between(
      enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y,
    );
    if (enemy.type === 'skitter') {
      if (this.runTimeMs >= enemy.nextStrafeAt) {
        enemy.strafeSign *= -1;
        enemy.nextStrafeAt = this.runTimeMs + 430 + enemy.id % 4 * 70;
      }
      angle += enemy.strafeSign * 0.72;
    }
    let moveAngle = angle;
    for (const offset of [0, 0.55, -0.55, 1.1, -1.1]) {
      const candidate = angle + offset;
      const x = enemy.sprite.x + Math.cos(candidate) * 54;
      const y = enemy.sprite.y + Math.sin(candidate) * 54;
      if (!this.isBlocked(x, y, definition.radius + 2)) {
        moveAngle = candidate;
        break;
      }
    }
    let separationX = 0;
    let separationY = 0;
    const nearby = this.enemyHash.query(
      enemy.sprite.x - 70, enemy.sprite.y - 70,
      enemy.sprite.x + 70, enemy.sprite.y + 70,
      enemy.candidates,
    );
    for (const other of nearby) {
      if (other === enemy || other.state !== 'active') continue;
      const dx = enemy.sprite.x - other.sprite.x;
      const dy = enemy.sprite.y - other.sprite.y;
      const distance = Math.hypot(dx, dy);
      const desired = definition.radius + ENEMIES[other.type].radius + 6;
      if (distance > 0.01 && distance < desired) {
        separationX += dx / distance * (1 - distance / desired);
        separationY += dy / distance * (1 - distance / desired);
      }
    }
    let moveX = Math.cos(moveAngle) + separationX * 0.85;
    let moveY = Math.sin(moveAngle) + separationY * 0.85;
    const magnitude = Math.hypot(moveX, moveY) || 1;
    moveX = moveX / magnitude * definition.speed;
    moveY = moveY / magnitude * definition.speed;
    enemy.moveX = moveX;
    enemy.moveY = moveY;
    enemy.nextAiAt = this.runTimeMs + COMBAT.aiIntervalMs;
  }

  private rebuildEnemyHash(): void {
    this.enemyHash.clear();
    for (const enemy of this.enemies) {
      if (enemy.state === 'active') this.enemyHash.insert(enemy, enemy.sprite.x, enemy.sprite.y);
    }
  }

  private handlePlayerContacts(): void {
    if (!this.character || this.runTimeMs < this.nextPlayerDamageAt) return;
    const candidates = this.enemyHash.query(
      this.player.x - 50, this.player.y - 50,
      this.player.x + 50, this.player.y + 50,
      this.contactCandidates,
    );
    for (const enemy of candidates) {
      if (enemy.state !== 'active' || this.runTimeMs < enemy.nextAttackAt) continue;
      const definition = ENEMIES[enemy.type];
      if (!isWithinRange(this.player, enemy.sprite, this.playerRadius + definition.radius)) continue;
      enemy.nextAttackAt = this.runTimeMs + COMBAT.enemyContactCooldownMs;
      this.nextPlayerDamageAt = this.runTimeMs + COMBAT.playerInvulnerabilityMs;
      this.playerHealth = Math.max(0, this.playerHealth - definition.contactDamage);
      this.playerFlashUntil = this.runTimeMs + 100;
      this.playerVisual.flash(0xff5d64);
      this.spawnParticles(this.player.x, this.player.y, 0xff5d64, 6, 105);
      this.audio.playHit();
      if (this.playerHealth <= 0) this.endRun('dead');
      this.emitHud();
      break;
    }
  }

  private processWaveTriggers(): void {
    if (!this.character || this.mission.phase === 'complete') return;
    const phase = this.mission.phase;
    for (const wave of WAVES) {
      if (wave.phase !== phase || this.triggeredWaves.has(wave.id)) continue;
      const triggered = phase === 'infiltrate'
        ? this.player.x >= wave.at
        : this.mission.elapsedMs >= wave.at;
      if (!triggered) continue;
      this.triggeredWaves.add(wave.id);
      this.queueWave(wave);
    }
  }

  private queueWave(wave: WaveDefinition): void {
    const types: EnemyId[] = [];
    for (const id of ['swarmer', 'skitter', 'brute'] as const) {
      for (let count = 0; count < wave.counts[id]; count += 1) types.push(id);
    }
    for (let index = types.length - 1; index > 0; index -= 1) {
      const target = Math.floor(this.random() * (index + 1));
      [types[index], types[target]] = [types[target], types[index]];
    }
    const direction = wave.phase !== 'extract'
      ? null
      : wave.id === 'X-2' ? 'rear' : 'forward';
    for (const type of types) {
      if (this.spawnQueue.length >= LIMITS.spawnQueue) break;
      this.spawnQueue.push({ type, phase: wave.phase, direction });
    }
  }

  private processSpawnQueue(): void {
    if (this.mission.phase === 'complete' || this.spawnQueue.length === 0) return;
    if (this.mission.phase === 'defend' && !isDefenseZoneActive(this.player)) return;
    const clock = this.mission.phase === 'infiltrate' ? this.runTimeMs : this.mission.elapsedMs;
    if (clock < this.nextSpawnEmissionAt) return;
    if (this.enemyBudgetCount() >= LIMITS.enemies) {
      this.nextSpawnEmissionAt = clock + COMBAT.spawnEmissionMs;
      return;
    }
    const request = this.spawnQueue[0];
    const slot = this.enemies.find((enemy) => enemy.state === 'inactive');
    const point = slot ? this.findSpawnPoint(request) : null;
    if (!slot || !point) {
      this.nextSpawnEmissionAt = clock + COMBAT.spawnEmissionMs;
      return;
    }
    this.spawnQueue.shift();
    const definition = ENEMIES[request.type];
    slot.id = this.nextEnemyId;
    this.nextEnemyId += 1;
    slot.type = request.type;
    slot.state = 'spawning';
    slot.health = definition.maxHealth;
    slot.activateAt = this.runTimeMs + COMBAT.spawnWarningMs;
    slot.nextAttackAt = Number.POSITIVE_INFINITY;
    slot.flashUntil = 0;
    slot.moveX = 0;
    slot.moveY = 0;
    slot.knockX = 0;
    slot.knockY = 0;
    slot.lastKnockbackEvent = -1;
    const size = ENEMY_ANIMATION[request.type].size;
    slot.sprite.setTexture(TEXTURES.enemies[request.type]).setDisplaySize(size, size)
      .setPosition(point.x, point.y).setVisible(false);
    slot.warning.setPosition(point.x, point.y).setScale(definition.radius / 13).setVisible(true);
    this.nextSpawnEmissionAt = clock + COMBAT.spawnEmissionMs;
  }

  private findSpawnPoint(request: SpawnRequest): { x: number; y: number } | null {
    let fallback: { x: number; y: number } | null = null;
    let fallbackDistance = -1;
    const radius = ENEMIES[request.type].radius + 3;
    const forward = Phaser.Math.Angle.Between(
      this.player.x, this.player.y, WORLD.extraction.x, WORLD.extraction.y,
    );
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const ring = 520 + this.random() * 200;
      const base = request.direction
        ? forward + (request.direction === 'rear' ? Math.PI : 0) + (this.random() - 0.5) * Math.PI / 3
        : this.random() * Math.PI * 2;
      const x = this.player.x + Math.cos(base) * ring;
      const y = this.player.y + Math.sin(base) * ring;
      if (!this.validSpawn(x, y, radius)) continue;
      const cameraDistance = distanceBetween({ x, y }, this.cameras.main.midPoint);
      if (!this.isWorldVisible(x, y, 64)) return { x, y };
      if (cameraDistance > fallbackDistance) {
        fallback = { x, y };
        fallbackDistance = cameraDistance;
      }
    }
    for (const point of SPAWN_POINTS) {
      if (!this.validSpawn(point.x, point.y, radius)) continue;
      const cameraDistance = distanceBetween(point, this.cameras.main.midPoint);
      if (cameraDistance > fallbackDistance) {
        fallback = point;
        fallbackDistance = cameraDistance;
      }
    }
    return fallback;
  }

  private validSpawn(x: number, y: number, radius: number): boolean {
    return x >= 48 && y >= 48 && x <= WORLD.width - 48 && y <= WORLD.height - 48 &&
      distanceBetween({ x, y }, this.player) >= 360 &&
      distanceBetween({ x, y }, WORLD.infiltration) >= 48 + radius &&
      !this.isBlocked(x, y, radius);
  }

  private enemyBudgetCount(): number {
    return this.enemies.reduce((count, enemy) => count + (enemy.state !== 'inactive' ? 1 : 0), 0);
  }

  private updateSupplies(): void {
    if (!this.character) return;
    for (const supply of this.supplies) {
      if (!supply.unlocked) {
        const available = supply.definition.availability === 'start' ||
          (supply.definition.availability === 'defend' && this.mission.phase !== 'infiltrate') ||
          (supply.definition.availability === 'defendHalf' &&
            (this.mission.phase === 'extract' || this.mission.phase === 'complete' ||
              (this.mission.phase === 'defend' && this.mission.elapsedMs >= MISSION.defenseDurationMs / 2))) ||
          (supply.definition.availability === 'extract' &&
            (this.mission.phase === 'extract' || this.mission.phase === 'complete'));
        if (available) {
          supply.unlocked = true;
          supply.active = true;
          supply.image.setVisible(true).setAlpha(1);
        }
      }
      if (!supply.active) continue;
      supply.image.setRotation(Math.sin(this.runTimeMs / 700) * 0.06);
      if (!isWithinRange(this.player, supply.definition, COMBAT.supplyPickupRadius)) continue;
      const update = applySupply(this.weapons, this.playerHealth, this.character);
      if (!update.used) continue;
      this.weapons = update.weapons;
      this.playerHealth = update.health;
      supply.active = false;
      supply.image.setVisible(false);
      this.spawnParticles(supply.definition.x, supply.definition.y, 0x39e6d0, 12, 120);
      this.audio.playSupply();
      this.setNotice('보급 획득 · HP +45 · 세 무기 예비 탄약', 2200);
      this.emitHud();
    }
  }

  private updateEmergencyAmmo(deltaMs: number): void {
    if (!this.character) return;
    const update = updateEmergency(this.emergency, totalAmmo(this.weapons), this.runTimeMs, deltaMs);
    this.emergency = update.state;
    if (!update.grant) return;
    this.weapons[this.selectedWeapon] = cancelReload(this.weapons[this.selectedWeapon]);
    this.weapons.rifle = {
      ...this.weapons.rifle,
      reserve: this.weapons.rifle.reserve + COMBAT.emergencyRifleAmmo,
    };
    this.selectedWeapon = 'rifle';
    this.playerVisual.setWeapon('rifle');
    this.triggerPressed = false;
    this.setNotice(`비상 탄약 +${COMBAT.emergencyRifleAmmo}`, 2400);
    this.audio.playSupply();
    if (this.weapons.rifle.magazine === 0) this.reloadWeapon();
    this.emitHud();
  }

  private handleMissionTransition(previous: MissionPhase): void {
    this.spawnQueue.length = 0;
    this.nextSpawnEmissionAt = 0;
    if (this.mission.phase === 'defend') {
      this.setNotice('중계기 가동 — 방어 구역 안에서 25초', 3200);
      this.audio.playMission();
    } else if (this.mission.phase === 'extract') {
      this.setNotice('신호 전송 완료 — 북서 승강기로 탈출', 3200);
      this.audio.playMission();
    } else if (this.mission.phase === 'complete' && previous === 'extract') {
      this.audio.playMission();
      this.endRun('victory');
    }
  }

  private endRun(screen: 'dead' | 'victory'): void {
    this.screen = screen;
    this.firingHeld = false;
    this.triggerPressed = false;
    this.pressedKeys.clear();
    this.resetTouchInput();
    this.crosshair.setVisible(false);
    this.muzzle.setVisible(false);
    this.objectiveArrow.setVisible(false);
    this.objectiveDistance.setVisible(false);
    this.cameras.main.shakeEffect.reset();
    if (screen === 'dead') {
      this.playerVisual.setDead(true);
      this.spawnCorpse(this.player.x, this.player.y);
    }
    this.callbacks.onScreen(this.screen);
    this.emitHud();
  }

  private updateParticles(deltaMs: number): void {
    const seconds = deltaMs / 1000;
    const drag = Math.pow(0.035, seconds);
    for (const particle of this.particles) {
      if (!particle.active) continue;
      particle.remainingMs -= deltaMs;
      if (particle.remainingMs <= 0) {
        particle.active = false;
        particle.image.setVisible(false);
        continue;
      }
      if (!this.isWorldVisible(particle.image.x, particle.image.y, 140)) {
        particle.image.setVisible(false);
        continue;
      }
      particle.image.setVisible(true);
      const progress = 1 - particle.remainingMs / particle.durationMs;
      if (particle.kind === 'ring') {
        particle.image.setScale(0.08 + particle.targetScale * progress).setAlpha(1 - progress);
      } else {
        particle.image.x += particle.velocityX * seconds;
        particle.image.y += particle.velocityY * seconds;
        particle.velocityX *= drag;
        particle.velocityY *= drag;
        particle.image.setAlpha(1 - progress);
      }
    }
  }

  private updateCorpses(deltaMs: number): void {
    for (const corpse of this.corpses) {
      if (!corpse.active) continue;
      corpse.remainingMs -= deltaMs;
      if (corpse.remainingMs <= 0) {
        corpse.active = false;
        corpse.image.setVisible(false);
        continue;
      }
      corpse.image.setVisible(this.isWorldVisible(corpse.image.x, corpse.image.y, 80));
      if (corpse.remainingMs < 2500) corpse.image.setAlpha(corpse.remainingMs / 2500);
    }
  }

  private updateTransientEffects(): void {
    if (this.muzzle.visible && this.runTimeMs >= this.muzzleUntil) this.muzzle.setVisible(false);
  }

  private spawnParticles(x: number, y: number, color: number, count: number, speed: number): void {
    for (let index = 0; index < count; index += 1) {
      const particle = this.particles.find((slot) => !slot.active);
      if (!particle) return;
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random() * 0.65);
      const duration = 150 + Math.random() * 210;
      particle.active = true;
      particle.kind = 'spark';
      particle.remainingMs = duration;
      particle.durationMs = duration;
      particle.velocityX = Math.cos(angle) * velocity;
      particle.velocityY = Math.sin(angle) * velocity;
      particle.image.setTexture(TEXTURES.particle).setPosition(x, y).setTint(color)
        .setScale(0.45 + Math.random() * 0.8).setAlpha(1).setVisible(true);
    }
  }

  private spawnExplosionRing(x: number, y: number, radius: number): void {
    const particle = this.particles.find((slot) => !slot.active);
    if (!particle) return;
    particle.active = true;
    particle.kind = 'ring';
    particle.remainingMs = 240;
    particle.durationMs = 240;
    particle.targetScale = radius * 2 / 256;
    particle.velocityX = 0;
    particle.velocityY = 0;
    particle.image.setTexture(TEXTURES.explosion).setPosition(x, y).clearTint()
      .setScale(0.08).setAlpha(1).setVisible(true);
  }

  private spawnCorpse(x: number, y: number): void {
    const corpse = this.corpses.find((slot) => !slot.active) ??
      this.corpses.reduce((oldest, slot) => slot.bornAt < oldest.bornAt ? slot : oldest);
    corpse.active = true;
    corpse.remainingMs = 20_000;
    corpse.bornAt = this.runTimeMs;
    corpse.image.setPosition(x, y).setRotation(Math.random() * Math.PI * 2)
      .setScale(0.75 + Math.random() * 0.45).setAlpha(0.72).setVisible(true);
  }

  private deactivateBullet(bullet: BulletSlot): void {
    bullet.active = false;
    bullet.image.setVisible(false);
    bullet.trail.setVisible(false);
  }

  private resetPools(): void {
    for (const bullet of this.bullets) this.deactivateBullet(bullet);
    for (const enemy of this.enemies) {
      enemy.state = 'inactive';
      enemy.sprite.setVisible(false);
      enemy.warning.setVisible(false);
    }
    for (const particle of this.particles) {
      particle.active = false;
      particle.image.setVisible(false);
    }
    for (const corpse of this.corpses) {
      corpse.active = false;
      corpse.image.setVisible(false);
    }
    for (const supply of this.supplies) {
      supply.active = false;
      supply.unlocked = false;
      supply.image.setVisible(false);
    }
    this.spawnQueue.length = 0;
    this.triggeredWaves.clear();
    this.enemyHash.clear();
    this.muzzle?.setVisible(false);
    this.cameras.main.shakeEffect.reset();
  }

  private moveCircle(
    gameObject: Phaser.GameObjects.Sprite,
    radius: number,
    deltaX: number,
    deltaY: number,
  ): void {
    const x = Phaser.Math.Clamp(gameObject.x + deltaX, radius + 8, WORLD.width - radius - 8);
    if (!this.isBlocked(x, gameObject.y, radius)) gameObject.x = x;
    const y = Phaser.Math.Clamp(gameObject.y + deltaY, radius + 8, WORLD.height - radius - 8);
    if (!this.isBlocked(gameObject.x, y, radius)) gameObject.y = y;
  }

  private isBlocked(x: number, y: number, padding: number): boolean {
    if (x - padding < 8 || y - padding < 8 || x + padding > WORLD.width - 8 || y + padding > WORLD.height - 8) {
      return true;
    }
    return OBSTACLES.some((obstacle) =>
      x + padding > obstacle.x - obstacle.width / 2 &&
      x - padding < obstacle.x + obstacle.width / 2 &&
      y + padding > obstacle.y - obstacle.height / 2 &&
      y - padding < obstacle.y + obstacle.height / 2,
    );
  }

  private isWorldVisible(x: number, y: number, margin: number): boolean {
    const view = this.cameras.main.worldView;
    return x >= view.x - margin && y >= view.y - margin &&
      x <= view.right + margin && y <= view.bottom + margin;
  }

  private requestShake(duration: number, intensity: number): void {
    if (!this.shakeEnabled) return;
    const remaining = Math.max(0, this.shakeUntil - this.runTimeMs);
    const effective = Math.min(0.006, Math.max(remaining > 0 ? this.shakeIntensity : 0, intensity));
    const effectiveDuration = Math.max(duration, remaining);
    if (this.cameras.main.shakeEffect.isRunning && effectiveDuration <= remaining && effective <= this.shakeIntensity) {
      return;
    }
    this.cameras.main.shake(effectiveDuration, effective);
    this.shakeUntil = this.runTimeMs + effectiveDuration;
    this.shakeIntensity = effective;
  }

  private drawFacility(): void {
    createFacility(this);
    this.objectiveMarker = this.add.graphics().setDepth(3);
    this.objectiveText = this.add.text(0, 0, '', {
      color: '#f5b942', fontFamily: 'monospace', fontSize: '17px', fontStyle: 'bold',
      backgroundColor: '#101820', padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(4);
    this.objectiveArrow = this.add.image(0, 0, TEXTURES.objectiveArrow)
      .setScrollFactor(0).setDepth(110).setVisible(false);
    this.objectiveDistance = this.add.text(0, 0, '', {
      color: '#f5b942', fontFamily: 'monospace', fontSize: '11px',
      backgroundColor: '#101820', padding: { x: 4, y: 3 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(110).setVisible(false);
  }

  private updateObjectiveMarker(): void {
    const objective = getMissionObjective(this.mission, this.ready ? this.player : WORLD.start);
    const color = this.mission.phase === 'complete' ? 0x39e6d0 : 0xf5b942;
    const pulse = 0.68 + Math.sin(this.runTimeMs / 240) * 0.16;
    const x = objective.worldX;
    const y = objective.worldY;
    this.objectiveMarker.clear();
    this.objectiveMarker.lineStyle(3, color, pulse);
    if (this.mission.phase === 'defend') {
      this.objectiveMarker.strokeCircle(x, y, MISSION.defenseZoneRadius);
      this.objectiveMarker.lineStyle(1, color, 0.25).strokeCircle(x, y, MISSION.defenseZoneRadius - 8);
    }
    this.objectiveMarker.lineStyle(3, color, pulse);
    this.objectiveMarker.beginPath();
    this.objectiveMarker.moveTo(x, y - 48);
    this.objectiveMarker.lineTo(x + 48, y);
    this.objectiveMarker.lineTo(x, y + 48);
    this.objectiveMarker.lineTo(x - 48, y);
    this.objectiveMarker.closePath();
    this.objectiveMarker.strokePath();
    const labels: Record<MissionPhase, string> = {
      infiltrate: '01 // 중계기',
      defend: `02 // 방어 ${Math.max(0, Math.ceil((MISSION.defenseDurationMs - this.mission.elapsedMs) / 1000))}`,
      extract: '03 // 승강기',
      complete: '임무 완료',
    };
    const label = labels[this.mission.phase];
    if (label !== this.objectiveLabel) {
      this.objectiveLabel = label;
      this.objectiveText.setText(label);
    }
    this.objectiveText.setPosition(x, y - 76);
    const screen = this.worldToScreen(x, y);
    const margin = 42;
    const offscreen = screen.x < margin || screen.y < margin ||
      screen.x > this.cameras.main.width - margin || screen.y > this.cameras.main.height - margin;
    const showArrow = offscreen && this.screen === 'playing';
    this.objectiveArrow.setVisible(showArrow);
    this.objectiveDistance.setVisible(showArrow);
    if (showArrow) {
      const centerX = this.cameras.main.width / 2;
      const centerY = this.cameras.main.height / 2;
      const arrowX = Phaser.Math.Clamp(screen.x, margin, this.cameras.main.width - margin);
      const arrowY = Phaser.Math.Clamp(screen.y, margin, this.cameras.main.height - margin);
      this.objectiveArrow.setPosition(arrowX, arrowY)
        .setRotation(Phaser.Math.Angle.Between(centerX, centerY, screen.x, screen.y));
      this.objectiveDistance.setText(`${Math.round(distanceBetween(this.player, { x, y }))}px`)
        .setPosition(arrowX, Phaser.Math.Clamp(arrowY + 30, 20, this.cameras.main.height - 20));
    }
  }

  private emitHud(): void {
    if (!this.character || this.screen === 'menu') return;
    const objective = getMissionObjective(this.mission, this.player);
    const selected = WEAPONS[this.selectedWeapon];
    this.callbacks.onHud({
      health: Math.max(0, Math.ceil(this.playerHealth)),
      maxHealth: this.character.maxHealth,
      weapons: WEAPON_ORDER.map((id) => ({
        id,
        magazine: this.weapons[id].magazine,
        reserve: this.weapons[id].reserve,
        reloading: this.weapons[id].reloading,
      })),
      selectedWeapon: this.selectedWeapon,
      reloadRatio: reloadProgress(
        this.weapons[this.selectedWeapon], this.runTimeMs,
        actualReloadMs(selected, this.character),
      ),
      missionLabel: objective.label,
      missionProgress: objective.progress,
      missionTarget: objective.target,
      missionPhase: this.mission.phase,
      kills: this.kills,
      notice: this.runTimeMs < this.noticeUntil ? this.notice : '',
    });
  }

  private setNotice(notice: string, durationMs: number): void {
    this.notice = notice;
    this.noticeUntil = this.runTimeMs + durationMs;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.touchControlsEnabled && pointer.leftButtonDown() && this.screen === 'playing') {
      this.audio.unlock();
      this.setFiring(true);
      this.updateAim();
      this.updateWeapon();
      this.emitHud();
    }
  }

  private handlePointerUp(): void {
    if (!this.touchControlsEnabled) this.setFiring(false);
  }

  private worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const camera = this.cameras.main;
    return {
      x: (worldX - camera.scrollX) * camera.zoom + camera.x,
      y: (worldY - camera.scrollY) * camera.zoom + camera.y,
    };
  }

  private random(): number {
    this.randomSeed = (this.randomSeed * 1_664_525 + 1_013_904_223) >>> 0;
    return this.randomSeed / 4_294_967_296;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private shutdown(): void {
    this.ready = false;
    this.firingHeld = false;
    this.triggerPressed = false;
    this.pressedKeys.clear();
    this.resetTouchInput();
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.input.off(Phaser.Input.Events.GAME_OUT, this.handlePointerUp, this);
    this.playerVisual.destroy();
    this.audio.close();
  }
}
