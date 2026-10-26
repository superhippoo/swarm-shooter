import Phaser from 'phaser';
import type {
  CharacterDefinition,
  CharacterId,
  GameScreen,
  GameSnapshot,
  MissionPhase,
} from '../shared/game-types';
import { ProceduralAudio } from './audio';
import {
  CHARACTERS,
  COMBAT,
  LIMITS,
  MISSION,
  OBSTACLES,
  RIFLE,
  SPAWN_POINTS,
  SWARMER,
  TEXTURES,
  WORLD,
  type ObstacleDefinition,
} from './config';
import {
  advanceMission,
  consumeRound,
  createMission,
  createWeaponRuntime,
  getMissionObjective,
  isWithinRange,
  reloadProgress,
  requestReload,
  settleReload,
  type MissionRuntime,
  type WeaponRuntime,
} from './logic';
import { createGeneratedTextures } from './textures';

export interface HudData {
  health: number;
  maxHealth: number;
  magazine: number;
  reserve: number;
  reloading: boolean;
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

interface BulletSlot {
  sprite: Phaser.Physics.Arcade.Sprite;
  trail: Phaser.GameObjects.Image;
  originX: number;
  originY: number;
  active: boolean;
}

interface EnemySlot {
  id: number;
  sprite: Phaser.Physics.Arcade.Sprite;
  health: number;
  nextAttackAt: number;
  knockbackUntil: number;
  flashUntil: number;
  active: boolean;
}

interface ParticleSlot {
  image: Phaser.GameObjects.Image;
  velocityX: number;
  velocityY: number;
  remainingMs: number;
  durationMs: number;
  active: boolean;
}

interface CorpseSlot {
  image: Phaser.GameObjects.Image;
  remainingMs: number;
  bornAt: number;
  active: boolean;
}

export class SwarmScene extends Phaser.Scene {
  private readonly callbacks: SwarmSceneCallbacks;
  private readonly audio = new ProceduralAudio();
  private readonly pressedKeys = new Set<string>();
  private readonly aimPoint = new Phaser.Math.Vector2(WORLD.start.x, WORLD.start.y);
  private screen: GameScreen = 'menu';
  private character: CharacterDefinition | null = null;
  private weapon: WeaponRuntime = createWeaponRuntime(RIFLE, CHARACTERS.scout);
  private mission: MissionRuntime = createMission();
  private player!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private bulletGroup!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private crosshair!: Phaser.GameObjects.Image;
  private muzzle!: Phaser.GameObjects.Image;
  private objectiveMarker!: Phaser.GameObjects.Graphics;
  private objectiveText!: Phaser.GameObjects.Text;
  private bullets: BulletSlot[] = [];
  private enemies: EnemySlot[] = [];
  private particles: ParticleSlot[] = [];
  private corpses: CorpseSlot[] = [];
  private ready = false;
  private firing = false;
  private runId = 0;
  private tick = 0;
  private runTimeMs = 0;
  private playerHealth = 0;
  private kills = 0;
  private nextShotAt = 0;
  private nextSpawnAt = 0;
  private nextEnemyId = 1;
  private spawnCursor = 0;
  private nextPlayerDamageAt = 0;
  private playerFlashUntil = 0;
  private nextShakeAt = 0;
  private muzzleUntil = 0;
  private nextHudAt = 0;
  private notice = '';
  private noticeUntil = 0;

  constructor(callbacks: SwarmSceneCallbacks) {
    super('swarm');
    this.callbacks = callbacks;
  }

  create(): void {
    createGeneratedTextures(this);
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBackgroundColor(0x070c10);
    this.drawFacility();
    this.createPools();
    this.createPlayer();
    this.createColliders();

    this.crosshair = this.add
      .image(WORLD.start.x, WORLD.start.y, TEXTURES.crosshair)
      .setDepth(100)
      .setVisible(false);
    this.muzzle = this.add
      .image(0, 0, TEXTURES.muzzle)
      .setOrigin(0, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(30)
      .setVisible(false);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.input.on(Phaser.Input.Events.GAME_OUT, this.handlePointerUp, this);
    this.input.mouse?.disableContextMenu();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    this.ready = true;
    this.physics.world.pause();
    this.updateObjectiveMarker();
    this.callbacks.onReady();
    this.callbacks.onScreen(this.screen);
  }

  startRun(characterId: CharacterId): void {
    if (!this.ready) {
      return;
    }
    this.audio.unlock();
    this.resetPools();
    this.character = CHARACTERS[characterId];
    this.weapon = createWeaponRuntime(RIFLE, this.character);
    this.mission = createMission();
    this.runId += 1;
    this.tick = 0;
    this.runTimeMs = 0;
    this.playerHealth = this.character.maxHealth;
    this.kills = 0;
    this.nextShotAt = 0;
    this.nextSpawnAt = COMBAT.spawnIntervalMs;
    this.nextEnemyId = 1;
    this.spawnCursor = 0;
    this.nextPlayerDamageAt = 0;
    this.playerFlashUntil = 0;
    this.nextShakeAt = 0;
    this.muzzleUntil = 0;
    this.nextHudAt = 0;
    this.pressedKeys.clear();
    this.firing = false;

    this.player
      .setTexture(TEXTURES.characters[characterId])
      .setPosition(WORLD.start.x, WORLD.start.y)
      .setRotation(0)
      .setAlpha(1)
      .clearTint()
      .setActive(true)
      .setVisible(true);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.enable = true;
    playerBody.setCircle(15, this.player.width / 2 - 15, this.player.height / 2 - 15);
    playerBody.reset(WORLD.start.x, WORLD.start.y);
    playerBody.setCollideWorldBounds(true);

    this.cameras.main.stopFollow();
    this.cameras.main.startFollow(this.player, true, 0.11, 0.11);
    this.cameras.main.setDeadzone(150, 100);
    this.cameras.main.centerOn(WORLD.start.x, WORLD.start.y);
    this.crosshair.setVisible(true);
    this.screen = 'playing';
    this.physics.world.resume();
    for (let index = 0; index < COMBAT.initialEnemies; index += 1) {
      this.spawnEnemy(true);
    }
    this.setNotice(`${this.character.name} 투입 — 제어실 확보`, 2600);
    this.updateObjectiveMarker();
    this.callbacks.onScreen(this.screen);
    this.emitHud();
  }

  restartRun(): void {
    if (this.character) {
      this.startRun(this.character.id);
    }
  }

  returnToMenu(): void {
    if (!this.ready) {
      return;
    }
    this.resetPools();
    this.pressedKeys.clear();
    this.firing = false;
    this.character = null;
    this.playerHealth = 0;
    this.player.setPosition(WORLD.start.x, WORLD.start.y).setActive(false).setVisible(false);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.cameras.main.stopFollow();
    this.crosshair.setVisible(false);
    this.muzzle.setVisible(false);
    this.screen = 'menu';
    this.mission = createMission();
    this.physics.world.pause();
    this.updateObjectiveMarker();
    this.callbacks.onScreen(this.screen);
  }

  pauseRun(): void {
    if (this.screen !== 'playing') {
      return;
    }
    this.screen = 'paused';
    this.firing = false;
    this.pressedKeys.clear();
    this.crosshair.setVisible(false);
    this.physics.world.pause();
    this.callbacks.onScreen(this.screen);
    this.emitHud();
  }

  resumeRun(): void {
    if (this.screen !== 'paused') {
      return;
    }
    this.audio.unlock();
    this.screen = 'playing';
    this.crosshair.setVisible(true);
    this.physics.world.resume();
    this.callbacks.onScreen(this.screen);
  }

  setKey(code: string, pressed: boolean): void {
    if (pressed && this.screen === 'playing') {
      this.pressedKeys.add(code);
    } else {
      this.pressedKeys.delete(code);
    }
  }

  setFiring(firing: boolean): void {
    this.firing = firing && this.screen === 'playing';
  }

  reloadWeapon(): void {
    if (this.screen !== 'playing' || !this.character) {
      return;
    }
    const updated = requestReload(
      this.weapon,
      RIFLE.magazineSize,
      this.runTimeMs,
      this.reloadDurationMs(),
    );
    if (updated !== this.weapon) {
      this.weapon = updated;
      this.audio.playReload();
      this.setNotice('탄창 교체 중', this.reloadDurationMs());
      this.emitHud();
    }
  }

  getSnapshot(): GameSnapshot {
    const inRun = this.screen !== 'menu' && this.character !== null;
    const objective = getMissionObjective(this.mission);
    const objectiveScreen = this.ready
      ? this.worldToScreen(objective.worldX, objective.worldY)
      : { x: 0, y: 0 };
    const activeEnemies = this.enemies.filter((enemy) => enemy.active);
    const fps = this.ready ? this.game.loop.actualFps : 0;
    return {
      screen: this.screen,
      characterId: this.character?.id ?? null,
      tick: this.tick,
      runId: this.runId,
      player: {
        x: this.round(this.player?.x ?? WORLD.start.x),
        y: this.round(this.player?.y ?? WORLD.start.y),
        health: inRun ? Math.max(0, Math.ceil(this.playerHealth)) : 0,
        maxHealth: this.character?.maxHealth ?? 0,
      },
      selectedWeapon: inRun ? RIFLE.id : null,
      weapons: inRun
        ? [
            {
              id: RIFLE.id,
              magazine: this.weapon.magazine,
              reserve: this.weapon.reserve,
              reloading: this.weapon.reloading,
            },
          ]
        : [],
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
      enemies: activeEnemies.map((enemy) => {
        const screen = this.worldToScreen(enemy.sprite.x, enemy.sprite.y);
        return {
          id: enemy.id,
          type: SWARMER.id,
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
        activeParticles:
          this.particles.filter((particle) => particle.active).length +
          (this.muzzle?.visible ? 1 : 0),
      },
    };
  }

  update(_time: number, delta: number): void {
    if (!this.ready || this.screen !== 'playing' || !this.character) {
      return;
    }
    const deltaMs = Math.min(50, Math.max(0, delta));
    this.runTimeMs += deltaMs;
    this.tick += 1;
    this.weapon = settleReload(this.weapon, RIFLE.magazineSize, this.runTimeMs);

    this.updatePlayer();
    this.updateWeapon();
    this.updateEnemies();
    this.updateBullets();
    this.updateParticles(deltaMs);
    this.updateCorpses(deltaMs);
    this.updateTransientEffects();

    if (this.runTimeMs >= this.nextSpawnAt) {
      this.spawnEnemy(false);
      const interval = this.mission.phase === 'defend'
        ? COMBAT.defendSpawnIntervalMs
        : COMBAT.spawnIntervalMs;
      this.nextSpawnAt = this.runTimeMs + interval;
    }

    const previousPhase = this.mission.phase;
    this.mission = advanceMission(this.mission, this.player, deltaMs);
    if (this.mission.phase !== previousPhase) {
      this.handleMissionTransition(previousPhase);
    }
    this.updateObjectiveMarker();
    if (this.runTimeMs >= this.nextHudAt) {
      this.emitHud();
      this.nextHudAt = this.runTimeMs + 80;
    }
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(
      WORLD.start.x,
      WORLD.start.y,
      TEXTURES.characters.scout,
    );
    this.player.setDepth(20).setActive(false).setVisible(false);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    body.setMaxVelocity(500, 500);
  }

  private createPools(): void {
    this.bulletGroup = this.physics.add.group();
    for (let index = 0; index < LIMITS.projectiles; index += 1) {
      const sprite = this.physics.add.sprite(-100, -100, TEXTURES.rifleBullet);
      sprite.setData('poolIndex', index).setDepth(14).setActive(false).setVisible(false);
      sprite.setBlendMode(Phaser.BlendModes.ADD);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.enable = false;
      body.setSize(18, 5);
      const trail = this.add
        .image(-100, -100, TEXTURES.bulletTrail)
        .setDepth(13)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false);
      this.bulletGroup.add(sprite);
      this.bullets.push({ sprite, trail, originX: 0, originY: 0, active: false });
    }

    this.enemyGroup = this.physics.add.group();
    for (let index = 0; index < LIMITS.enemies; index += 1) {
      const sprite = this.physics.add.sprite(-100, -100, TEXTURES.swarmer);
      sprite.setData('poolIndex', index).setDepth(12).setActive(false).setVisible(false);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.enable = false;
      body.setCircle(SWARMER.radius, sprite.width / 2 - SWARMER.radius, sprite.height / 2 - SWARMER.radius);
      body.setCollideWorldBounds(true);
      this.enemyGroup.add(sprite);
      this.enemies.push({
        id: 0,
        sprite,
        health: 0,
        nextAttackAt: 0,
        knockbackUntil: 0,
        flashUntil: 0,
        active: false,
      });
    }

    for (let index = 0; index < LIMITS.particles; index += 1) {
      const image = this.add
        .image(-100, -100, TEXTURES.particle)
        .setDepth(25)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false);
      this.particles.push({
        image,
        velocityX: 0,
        velocityY: 0,
        remainingMs: 0,
        durationMs: 0,
        active: false,
      });
    }

    for (let index = 0; index < LIMITS.corpses; index += 1) {
      const image = this.add
        .image(-100, -100, TEXTURES.corpse)
        .setDepth(1)
        .setVisible(false);
      this.corpses.push({ image, remainingMs: 0, bornAt: 0, active: false });
    }
  }

  private createColliders(): void {
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemyGroup, this.obstacles);
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);
    this.physics.add.overlap(
      this.bulletGroup,
      this.enemyGroup,
      (bulletObject, enemyObject) => {
        const bulletSprite = bulletObject as Phaser.Physics.Arcade.Sprite;
        const enemySprite = enemyObject as Phaser.Physics.Arcade.Sprite;
        const bullet = this.bullets[Number(bulletSprite.getData('poolIndex'))];
        const enemy = this.enemies[Number(enemySprite.getData('poolIndex'))];
        if (bullet?.active && enemy?.active) {
          this.hitEnemy(bullet, enemy);
        }
      },
    );
    this.physics.add.collider(this.bulletGroup, this.obstacles, (bulletObject) => {
      const sprite = bulletObject as Phaser.Physics.Arcade.Sprite;
      const bullet = this.bullets[Number(sprite.getData('poolIndex'))];
      if (bullet) {
        this.spawnParticles(sprite.x, sprite.y, 0xffc766, 2, 55);
        this.deactivateBullet(bullet);
      }
    });
    this.physics.add.overlap(this.player, this.enemyGroup, (_playerObject, enemyObject) => {
      const sprite = enemyObject as Phaser.Physics.Arcade.Sprite;
      const enemy = this.enemies[Number(sprite.getData('poolIndex'))];
      if (enemy?.active) {
        this.handleContactDamage(enemy);
      }
    });
  }

  private updatePlayer(): void {
    if (!this.character) {
      return;
    }
    const pointer = this.input.activePointer;
    this.cameras.main.getWorldPoint(pointer.x, pointer.y, this.aimPoint);
    this.crosshair.setPosition(this.aimPoint.x, this.aimPoint.y);
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      this.aimPoint.x,
      this.aimPoint.y,
    );
    this.player.setRotation(angle);

    let horizontal = 0;
    let vertical = 0;
    if (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft')) horizontal -= 1;
    if (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight')) horizontal += 1;
    if (this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp')) vertical -= 1;
    if (this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown')) vertical += 1;
    const length = Math.hypot(horizontal, vertical) || 1;
    this.player.setVelocity(
      (horizontal / length) * this.character.speed,
      (vertical / length) * this.character.speed,
    );
    if (this.playerFlashUntil > 0 && this.runTimeMs >= this.playerFlashUntil) {
      this.player.clearTint();
      this.playerFlashUntil = 0;
    }
  }

  private updateWeapon(): void {
    if (!this.firing || this.runTimeMs < this.nextShotAt || this.weapon.reloading) {
      return;
    }
    if (this.weapon.magazine <= 0) {
      this.reloadWeapon();
      this.nextShotAt = this.runTimeMs + 150;
      return;
    }
    const bullet = this.bullets.find((slot) => !slot.active);
    if (!bullet) {
      return;
    }
    const ammunition = consumeRound(this.weapon);
    if (!ammunition) {
      return;
    }
    this.weapon = ammunition;
    this.nextShotAt = this.runTimeMs + RIFLE.fireIntervalMs;
    const angle = this.player.rotation + (Math.random() - 0.5) * RIFLE.spreadRadians;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const startX = this.player.x + cos * 34;
    const startY = this.player.y + sin * 34;
    bullet.active = true;
    bullet.originX = startX;
    bullet.originY = startY;
    bullet.sprite
      .setPosition(startX, startY)
      .setRotation(angle)
      .setActive(true)
      .setVisible(true);
    const body = bullet.sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(startX, startY);
    bullet.sprite.setVelocity(cos * RIFLE.projectileSpeed, sin * RIFLE.projectileSpeed);
    bullet.trail
      .setPosition(startX - cos * 22, startY - sin * 22)
      .setRotation(angle)
      .setAlpha(1)
      .setVisible(true);
    this.muzzle
      .setPosition(startX, startY)
      .setRotation(angle)
      .setVisible(true);
    this.muzzleUntil = this.runTimeMs + 48;
    this.audio.playShot();
    if (this.runTimeMs >= this.nextShakeAt) {
      this.cameras.main.shake(36, RIFLE.shake);
      this.nextShakeAt = this.runTimeMs + 65;
    }
    if (this.weapon.magazine === 0) {
      this.reloadWeapon();
    }
  }

  private updateBullets(): void {
    for (const bullet of this.bullets) {
      if (!bullet.active) {
        continue;
      }
      if (!isWithinRange(
        { x: bullet.originX, y: bullet.originY },
        bullet.sprite,
        RIFLE.range,
      )) {
        this.deactivateBullet(bullet);
        continue;
      }
      const angle = bullet.sprite.rotation;
      bullet.trail.setPosition(
        bullet.sprite.x - Math.cos(angle) * 24,
        bullet.sprite.y - Math.sin(angle) * 24,
      );
    }
  }

  private updateEnemies(): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) {
        continue;
      }
      if (enemy.flashUntil > 0 && this.runTimeMs >= enemy.flashUntil) {
        enemy.sprite.clearTint();
        enemy.flashUntil = 0;
      }
      if (this.runTimeMs < enemy.knockbackUntil) {
        continue;
      }
      const distance = Phaser.Math.Distance.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        this.player.x,
        this.player.y,
      );
      if (distance <= SWARMER.radius + 20) {
        enemy.sprite.setVelocity(0, 0);
        continue;
      }
      const directAngle = Phaser.Math.Angle.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        this.player.x,
        this.player.y,
      );
      let moveAngle = directAngle;
      for (const offset of [0, 0.55, -0.55, 1.1, -1.1]) {
        const candidateAngle = directAngle + offset;
        const candidateX = enemy.sprite.x + Math.cos(candidateAngle) * 58;
        const candidateY = enemy.sprite.y + Math.sin(candidateAngle) * 58;
        if (!this.isBlocked(candidateX, candidateY, SWARMER.radius + 3)) {
          moveAngle = candidateAngle;
          break;
        }
      }
      const speed = SWARMER.speed * (this.mission.phase === 'defend' ? 1.12 : 1);
      enemy.sprite.setVelocity(Math.cos(moveAngle) * speed, Math.sin(moveAngle) * speed);
      enemy.sprite.setRotation(directAngle);
    }
  }

  private updateParticles(deltaMs: number): void {
    const seconds = deltaMs / 1000;
    const drag = Math.pow(0.035, seconds);
    for (const particle of this.particles) {
      if (!particle.active) {
        continue;
      }
      particle.remainingMs -= deltaMs;
      if (particle.remainingMs <= 0) {
        particle.active = false;
        particle.image.setVisible(false);
        continue;
      }
      particle.image.x += particle.velocityX * seconds;
      particle.image.y += particle.velocityY * seconds;
      particle.velocityX *= drag;
      particle.velocityY *= drag;
      particle.image.setAlpha(particle.remainingMs / particle.durationMs);
    }
  }

  private updateCorpses(deltaMs: number): void {
    for (const corpse of this.corpses) {
      if (!corpse.active) {
        continue;
      }
      corpse.remainingMs -= deltaMs;
      if (corpse.remainingMs <= 0) {
        corpse.active = false;
        corpse.image.setVisible(false);
      } else if (corpse.remainingMs < 2500) {
        corpse.image.setAlpha(corpse.remainingMs / 2500);
      }
    }
  }

  private updateTransientEffects(): void {
    if (this.muzzle.visible && this.runTimeMs >= this.muzzleUntil) {
      this.muzzle.setVisible(false);
    }
  }

  private spawnEnemy(initial: boolean): void {
    if (!this.character || this.activeEnemyCount() >= LIMITS.activeEnemies) {
      return;
    }
    const slot = this.enemies.find((enemy) => !enemy.active);
    if (!slot) {
      return;
    }
    let spawnPoint: { x: number; y: number } | null = null;
    for (let offset = 0; offset < SPAWN_POINTS.length; offset += 1) {
      const index = (this.spawnCursor + offset) % SPAWN_POINTS.length;
      const point = SPAWN_POINTS[index];
      const minimumDistance = initial ? 300 : 420;
      if (
        Phaser.Math.Distance.Between(point.x, point.y, this.player.x, this.player.y) >= minimumDistance &&
        !this.isBlocked(point.x, point.y, SWARMER.radius + 5)
      ) {
        spawnPoint = point;
        this.spawnCursor = (index + 1) % SPAWN_POINTS.length;
        break;
      }
    }
    if (!spawnPoint) {
      return;
    }
    slot.id = this.nextEnemyId;
    this.nextEnemyId += 1;
    slot.health = SWARMER.maxHealth;
    slot.nextAttackAt = this.runTimeMs + 450;
    slot.knockbackUntil = 0;
    slot.flashUntil = 0;
    slot.active = true;
    slot.sprite
      .setPosition(spawnPoint.x, spawnPoint.y)
      .setAlpha(1)
      .clearTint()
      .setActive(true)
      .setVisible(true);
    const body = slot.sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(spawnPoint.x, spawnPoint.y);
  }

  private hitEnemy(bullet: BulletSlot, enemy: EnemySlot): void {
    const hitX = bullet.sprite.x;
    const hitY = bullet.sprite.y;
    const angle = bullet.sprite.rotation;
    this.deactivateBullet(bullet);
    enemy.health -= RIFLE.damage;
    enemy.flashUntil = this.runTimeMs + 65;
    enemy.knockbackUntil = this.runTimeMs + 95;
    enemy.sprite.setTintFill(0xffffff);
    enemy.sprite.setVelocity(Math.cos(angle) * RIFLE.knockback, Math.sin(angle) * RIFLE.knockback);
    this.spawnParticles(hitX, hitY, 0xf34678, 5, 145);
    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    } else {
      this.audio.playHit();
    }
  }

  private killEnemy(enemy: EnemySlot): void {
    const x = enemy.sprite.x;
    const y = enemy.sprite.y;
    enemy.active = false;
    enemy.sprite.setActive(false).setVisible(false);
    (enemy.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    this.spawnCorpse(x, y);
    this.spawnParticles(x, y, 0xf34678, 10, 190);
    this.kills += 1;
    this.audio.playEnemyDeath();
  }

  private handleContactDamage(enemy: EnemySlot): void {
    if (
      this.screen !== 'playing' ||
      this.runTimeMs < enemy.nextAttackAt ||
      this.runTimeMs < this.nextPlayerDamageAt
    ) {
      return;
    }
    enemy.nextAttackAt = this.runTimeMs + COMBAT.enemyContactCooldownMs;
    this.nextPlayerDamageAt = this.runTimeMs + COMBAT.playerInvulnerabilityMs;
    this.playerHealth = Math.max(0, this.playerHealth - SWARMER.contactDamage);
    this.playerFlashUntil = this.runTimeMs + 100;
    this.player.setTintFill(0xff6b83);
    this.spawnParticles(this.player.x, this.player.y, 0xffc766, 5, 100);
    this.cameras.main.shake(85, 0.0025);
    this.audio.playHit();
    if (this.playerHealth <= 0) {
      this.endRun('dead');
    }
    this.emitHud();
  }

  private endRun(screen: 'dead' | 'victory'): void {
    this.screen = screen;
    this.firing = false;
    this.pressedKeys.clear();
    this.player.setVelocity(0, 0);
    this.crosshair.setVisible(false);
    this.muzzle.setVisible(false);
    if (screen === 'dead') {
      this.player.setAlpha(0.45).setTint(0x8b4357);
      this.spawnCorpse(this.player.x, this.player.y);
    }
    this.physics.world.pause();
    this.callbacks.onScreen(this.screen);
    this.emitHud();
  }

  private handleMissionTransition(previous: MissionPhase): void {
    if (this.mission.phase === 'defend') {
      this.setNotice('업로드 시작 — 20초간 방어', 3000);
      this.nextSpawnAt = this.runTimeMs;
      this.audio.playMission();
      for (let index = 0; index < 3; index += 1) {
        this.spawnEnemy(false);
      }
    } else if (this.mission.phase === 'extract') {
      this.setNotice('업로드 완료 — 북서쪽 탈출구로 이동', 3500);
      this.audio.playMission();
    } else if (this.mission.phase === 'complete' && previous === 'extract') {
      this.audio.playMission();
      this.endRun('victory');
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.leftButtonDown() && this.screen === 'playing') {
      this.audio.unlock();
      this.firing = true;
    }
  }

  private handlePointerUp(): void {
    this.firing = false;
  }

  private deactivateBullet(bullet: BulletSlot): void {
    bullet.active = false;
    bullet.sprite.setActive(false).setVisible(false);
    bullet.trail.setVisible(false);
    const body = bullet.sprite.body as Phaser.Physics.Arcade.Body;
    body.stop();
    body.enable = false;
  }

  private spawnParticles(
    x: number,
    y: number,
    color: number,
    count: number,
    speed: number,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const particle = this.particles.find((slot) => !slot.active);
      if (!particle) {
        return;
      }
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random() * 0.65);
      const duration = 160 + Math.random() * 190;
      particle.active = true;
      particle.remainingMs = duration;
      particle.durationMs = duration;
      particle.velocityX = Math.cos(angle) * velocity;
      particle.velocityY = Math.sin(angle) * velocity;
      particle.image
        .setPosition(x, y)
        .setTint(color)
        .setScale(0.45 + Math.random() * 0.8)
        .setAlpha(1)
        .setVisible(true);
    }
  }

  private spawnCorpse(x: number, y: number): void {
    const corpse = this.corpses.find((slot) => !slot.active) ??
      this.corpses.reduce((oldest, slot) => slot.bornAt < oldest.bornAt ? slot : oldest);
    corpse.active = true;
    corpse.remainingMs = 20_000;
    corpse.bornAt = this.runTimeMs;
    corpse.image
      .setPosition(x, y)
      .setRotation(Math.random() * Math.PI * 2)
      .setScale(0.75 + Math.random() * 0.45)
      .setAlpha(0.72)
      .setVisible(true);
  }

  private resetPools(): void {
    for (const bullet of this.bullets) {
      this.deactivateBullet(bullet);
    }
    for (const enemy of this.enemies) {
      enemy.active = false;
      enemy.sprite.setActive(false).setVisible(false);
      (enemy.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    }
    for (const particle of this.particles) {
      particle.active = false;
      particle.image.setVisible(false);
    }
    for (const corpse of this.corpses) {
      corpse.active = false;
      corpse.image.setVisible(false);
    }
  }

  private drawFacility(): void {
    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x0b1519)
      .setDepth(-20);
    const floor = this.add.graphics().setDepth(-19);
    floor.fillStyle(0x102126, 1).fillRect(45, 45, 650, 650);
    floor.fillStyle(0x111d22, 1).fillRect(70, 1050, 610, 475);
    floor.fillStyle(0x151e24, 1).fillRect(1700, 560, 450, 480);
    floor.lineStyle(1, 0x294047, 0.34);
    for (let x = 0; x <= WORLD.width; x += 80) {
      floor.lineBetween(x, 0, x, WORLD.height);
    }
    for (let y = 0; y <= WORLD.height; y += 80) {
      floor.lineBetween(0, y, WORLD.width, y);
    }
    floor.lineStyle(10, 0x29434a, 1).strokeRect(5, 5, WORLD.width - 10, WORLD.height - 10);
    floor.lineStyle(2, 0x71f6c4, 0.28).strokeRect(18, 18, WORLD.width - 36, WORLD.height - 36);
    floor.fillStyle(0x71f6c4, 0.14).fillRect(70, 80, 340, 12);
    floor.fillStyle(0xf34678, 0.16).fillRect(1800, 1510, 450, 10);

    this.obstacles = this.physics.add.staticGroup();
    for (const obstacle of OBSTACLES) {
      const collider = this.obstacles.create(
        obstacle.x,
        obstacle.y,
        TEXTURES.collider,
      ) as Phaser.Physics.Arcade.Image;
      collider.setDisplaySize(obstacle.width, obstacle.height).setVisible(false);
      collider.refreshBody();
      this.drawObstacle(obstacle);
    }

    this.add.text(240, 1070, 'MED BAY // 04', {
      color: '#71f6c4',
      fontFamily: 'monospace',
      fontSize: '18px',
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(2);
    this.add.text(240, 145, 'EXTRACTION // NW', {
      color: '#8ba9ad',
      fontFamily: 'monospace',
      fontSize: '16px',
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(2);
    this.add.text(1210, 1530, 'BIOCONTAINMENT LEVEL 0', {
      color: '#4e6b70',
      fontFamily: 'monospace',
      fontSize: '18px',
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(2);
    this.add.text(2090, 700, 'CONTROL', {
      color: '#f34678',
      fontFamily: 'monospace',
      fontSize: '16px',
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(2);

    this.objectiveMarker = this.add.graphics().setDepth(3);
    this.objectiveText = this.add.text(0, 0, '', {
      color: '#ffffff',
      fontFamily: 'monospace',
      fontSize: '17px',
      fontStyle: 'bold',
      backgroundColor: '#081014',
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(4);
  }

  private drawObstacle(obstacle: ObstacleDefinition): void {
    const graphics = this.add.graphics().setDepth(2);
    const left = obstacle.x - obstacle.width / 2;
    const top = obstacle.y - obstacle.height / 2;
    const colors = {
      bed: { fill: 0x263a42, edge: 0x54747a },
      wall: { fill: 0x243238, edge: 0x4c6064 },
      console: { fill: 0x1d3035, edge: 0x3e6568 },
      reactor: { fill: 0x35182a, edge: 0xf34678 },
    } as const;
    const color = colors[obstacle.kind];
    graphics.fillStyle(color.fill, 1).fillRect(left, top, obstacle.width, obstacle.height);
    graphics.lineStyle(3, color.edge, 0.85).strokeRect(left, top, obstacle.width, obstacle.height);
    if (obstacle.kind === 'bed') {
      graphics.fillStyle(0x789497, 0.65).fillRect(left + 12, top + 12, 42, obstacle.height - 24);
      graphics.lineStyle(2, 0x9bb9b9, 0.35);
      graphics.lineBetween(left + 66, top + 10, left + 66, top + obstacle.height - 10);
    } else if (obstacle.kind === 'console') {
      graphics.fillStyle(0x71f6c4, 0.42);
      for (let x = left + 16; x < left + obstacle.width - 12; x += 34) {
        graphics.fillRect(x, top + 14, 19, 7);
      }
    } else if (obstacle.kind === 'reactor') {
      graphics.lineStyle(3, 0xffc766, 0.8).strokeCircle(obstacle.x, obstacle.y, 23);
      graphics.fillStyle(0xf34678, 0.7).fillCircle(obstacle.x, obstacle.y, 9);
    }
  }

  private updateObjectiveMarker(): void {
    const objective = getMissionObjective(this.mission);
    const colors: Record<MissionPhase, number> = {
      infiltrate: 0x71f6c4,
      defend: 0xf34678,
      extract: 0xffc766,
      complete: 0x71f6c4,
    };
    const labels: Record<MissionPhase, string> = {
      infiltrate: '01 // 침투',
      defend: `02 // 방어 ${Math.max(0, Math.ceil((MISSION.defenseDurationMs - this.mission.elapsedMs) / 1000))}`,
      extract: '03 // 탈출',
      complete: '작전 완료',
    };
    const pulse = 0.65 + Math.sin(this.runTimeMs / 180) * 0.2;
    const radius = this.mission.phase === 'defend' ? 116 : 72;
    this.objectiveMarker.clear();
    this.objectiveMarker.lineStyle(3, colors[this.mission.phase], pulse);
    this.objectiveMarker.strokeCircle(objective.worldX, objective.worldY, radius);
    this.objectiveMarker.lineStyle(1, colors[this.mission.phase], pulse * 0.65);
    this.objectiveMarker.strokeCircle(objective.worldX, objective.worldY, radius + 12);
    this.objectiveMarker.lineBetween(
      objective.worldX - 10,
      objective.worldY,
      objective.worldX + 10,
      objective.worldY,
    );
    this.objectiveMarker.lineBetween(
      objective.worldX,
      objective.worldY - 10,
      objective.worldX,
      objective.worldY + 10,
    );
    this.objectiveText
      .setText(labels[this.mission.phase])
      .setPosition(objective.worldX, objective.worldY - radius - 34);
  }

  private emitHud(): void {
    if (!this.character || this.screen === 'menu') {
      return;
    }
    const objective = getMissionObjective(this.mission);
    this.callbacks.onHud({
      health: Math.max(0, Math.ceil(this.playerHealth)),
      maxHealth: this.character.maxHealth,
      magazine: this.weapon.magazine,
      reserve: this.weapon.reserve,
      reloading: this.weapon.reloading,
      reloadRatio: reloadProgress(this.weapon, this.runTimeMs, this.reloadDurationMs()),
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

  private reloadDurationMs(): number {
    return RIFLE.reloadMs * (this.character?.reloadMultiplier ?? 1);
  }

  private activeEnemyCount(): number {
    return this.enemies.reduce((count, enemy) => count + (enemy.active ? 1 : 0), 0);
  }

  private isBlocked(x: number, y: number, padding: number): boolean {
    if (
      x - padding < 20 ||
      y - padding < 20 ||
      x + padding > WORLD.width - 20 ||
      y + padding > WORLD.height - 20
    ) {
      return true;
    }
    return OBSTACLES.some((obstacle) =>
      x + padding > obstacle.x - obstacle.width / 2 &&
      x - padding < obstacle.x + obstacle.width / 2 &&
      y + padding > obstacle.y - obstacle.height / 2 &&
      y - padding < obstacle.y + obstacle.height / 2,
    );
  }

  private worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const camera = this.cameras.main;
    return {
      x: (worldX - camera.scrollX) * camera.zoom + camera.x,
      y: (worldY - camera.scrollY) * camera.zoom + camera.y,
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private shutdown(): void {
    this.ready = false;
    this.firing = false;
    this.pressedKeys.clear();
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.input.off(Phaser.Input.Events.GAME_OUT, this.handlePointerUp, this);
    this.audio.close();
  }
}
