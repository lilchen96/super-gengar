class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
    // 游戏基础状态变量
    this.backgrounds = []; // 背景层数组，用于视差滚动效果
    this.segments = []; // 地图段落数组，存储所有生成的地图段
    this.currentSegmentX = 0; // 当前地图段落的X坐标，用于确定新段落生成位置

    this.playerDirection = 1; // 玩家朝向(1右/-1左)，影响贴图和移动

    // 移动速度配置
    this.normalSpeed = 300; // 普通移动速度（像素/秒）
    this.boostedSpeed = 450; // 提升后的移动速度（像素/秒）

    // 跳跃相关配置
    this.normalJumpVelocity = -400; // 普通跳跃速度（负值表示向上）
    this.boostedJumpVelocity = -500; // 提升后的跳跃速度
    this.secondJumpMultiplier = 0.875; // 二段跳的高度倍率，用于调整二段
    this.jumpCount = 0; // 跳跃次数计数，用于限制二段跳

    // 游戏对象引用 - 这些对象在游戏创建时初始化
    this.player = null; // 玩家精灵对象
    this.platforms = null; // 平台物理组，包含所有可碰撞平台
    this.coins = null; // 金币组，包含所有可收集金币
    this.bullets = null; // 子弹组，包含所有发射的子弹
    this.monsters = null; // 怪物组，包含所有敌人

    // UI相关配置

    // 相机控制参数
    this.targetCameraX = 0; // 相机目标X位置，用于平滑跟随
    this.smoothSpeed = 0.15; // 相机平滑移动速度（0-1）
    this.previousCameraX = 0; // 上一帧相机X位置，用于计算移动
    this.cameraVelocityX = 0; // 相机X轴速度，用于平滑移动

    // 游戏机制参数
    this.maxFallSpeed = 600; // 最大下落速度（像素/秒）

    // 能力持续时间
    this.shootingAbilityDuration = 20 * 1000; // 射击能力持续时间（毫秒）
    this.speedAbilityDuration = 20 * 1000; // 速度提升持续时间（毫秒）

    // 射击系统配置
    this.shootCooldown = 200; // 射击冷却时间（毫秒）
    this.canShoot = true; // 是否可以射击，用于控制射击频率

    this._score = 0;
    this._shootingAbilityTime = 0;
    this._speedAbilityTime = 0;
  }

  set score(value) {
    this._score = value;
    this.game.events.emit("onScoreChange", this._score);
  }

  get score() {
    return this._score;
  }

  set shootingAbilityTime(value) {
    this._shootingAbilityTime = value;
    this.game.events.emit(
      "onShootingAbilityTimeChange",
      this._shootingAbilityTime
    );

    if (this._shootingAbilityTimer) {
      clearInterval(this._shootingAbilityTimer);
    }
    if (this.hasShootingAbility) {
      this._shootingAbilityTimer = setInterval(() => {
        this.shootingAbilityTime -= 1000;
        if (this.shootingAbilityTime <= 0) {
          clearInterval(this._shootingAbilityTimer);
        }
      }, 1000);
    }
  }

  get shootingAbilityTime() {
    return this._shootingAbilityTime;
  }

  get hasShootingAbility() {
    return this._shootingAbilityTime > 0;
  }

  set speedAbilityTime(value) {
    this._speedAbilityTime = value;
    this.game.events.emit("onSpeedAbilityTimeChange", this._speedAbilityTime);
    if (!this.hasSpeedAbility) {
      // 停止速度特效;
      if (this.speedEmitter) {
        this.speedEmitter.stop();
        this.speedEmitter.on = false;
      }
    }
    if (this._speedAbilityTimer) {
      clearInterval(this._speedAbilityTimer);
    }
    if (this.hasSpeedAbility) {
      this._speedAbilityTimer = setInterval(() => {
        this.speedAbilityTime -= 1000;
        if (this.speedAbilityTime <= 0) {
          clearInterval(this._speedAbilityTimer);
        }
      }, 1000);
    }
  }

  get speedAbilityTime() {
    return this._speedAbilityTime;
  }

  get hasSpeedAbility() {
    return this._speedAbilityTime > 0;
  }

  preload() {
    // 预加载所有游戏资源
    // 角色精灵
    this.load.image("gengar", "assets/gengar.png"); // 玩家精灵

    // 游戏物品和道具
    this.load.svg("coin", "assets/coin.svg"); // 金币收集物
    this.load.image("speed_ability", "assets/tm-electric.png"); // 速度提升道具
    this.load.image("shooting_ability", "assets/tm-dark.png"); // 射击能力道具
    this.load.svg("brick", "assets/brick.svg"); // 平台砖块
    this.load.svg("bullet", "assets/bullet.svg"); // 子弹
    this.load.svg("gun", "assets/gun.svg"); // 枪械武器

    // 特效和背景
    this.load.image("speedParticle", "assets/speed_particle.svg"); // 速度特效粒子
    this.load.svg("game_background", "assets/game_background.svg"); // 游戏背景图

    // 怪物资源
    this.load.image("monster_1", "assets/monster_1.png"); // 怪物1
    this.load.image("monster_2", "assets/monster_2.png"); // 怪物2
  }

  create() {
    // 游戏窗口计算
    this.gameWidth = this.scale.width; // 游戏窗口宽度
    this.gameHeight = this.scale.height; // 游戏窗口高度
    this.groundY = this.gameHeight - 32; // 地面高度（距离顶部的像素数）

    // 初始化游戏状态
    this.score = 0; // 重置分数
    this.gameOver = false; // 重置游戏结束状态
    this.jumpCount = 0; // 重置跳跃计数

    // 重置场景数组
    this.backgrounds = []; // 清空背景数组
    this.segments = []; // 清空地图段落数组
    this.currentSegmentX = 0; // 重置当前段落位置

    // 重置能力状态
    this.shootingAbilityTime = 0;
    this.speedAbilityTime = 0;

    this.playerDirection = 1; // 设置初始朝向为右

    // 创建游戏主体内容
    this.createGame();

    // 记录玩家初始位置
    this.lastPlayerX = this.player ? this.player.x : 0;

    // 创建特效系统
    this.setupParticleSystem();

    // 创建武器系统
    this.setupWeaponSystem();

    // 设置相机边界（允许无限向右滚动）
    this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, this.gameHeight);

    this.game.events.emit("onSceneReady", this);
  }

  // 创建粒子特效系统
  setupParticleSystem() {
    // 初始化粒子管理器
    this.particleManager = this.add.particles("speedParticle");

    // 加速特效
    this.speedEmitter = this.particleManager.createEmitter({
      speed: { min: -300, max: -500 }, // 粒子速度范围
      angle: { min: 150, max: 210 }, // 粒子发射角度范围
      scale: { start: 1, end: 0 }, // 粒子大小变化
      lifespan: 200, // 粒子生命周期
      blendMode: "ADD", // 混合模式
      frequency: 50, // 粒子产生频率
      quantity: 3, // 每次产生的粒子数量
      on: false, // 初始状态为关闭
    });
  }

  // 创建武器系统
  setupWeaponSystem() {
    // 创建主要冲击波粒子
    this.shockwaveParticles = this.add.particles("bullet");
    this.shockwaveEmitter = this.shockwaveParticles.createEmitter({
      speed: { min: 80, max: 160 },
      scale: { start: 0.6, end: 0.2 }, // 增大粒子尺寸
      alpha: { start: 0.8, end: 0 },
      tint: [0x8b0000, 0x800000, 0x660000],
      lifespan: 300, // 增加持续时间
      blendMode: "ADD",
      frequency: -1,
      quantity: 2,
    });
    this.shockwaveEmitter.stop();

    // 创建能量轨迹粒子
    this.energyTrailParticles = this.add.particles("bullet");
    this.energyTrailEmitter = this.energyTrailParticles.createEmitter({
      speed: { min: 8, max: 25 },
      scale: { start: 0.3, end: 0 }, // 增大迹粒子
      alpha: { start: 0.6, end: 0 },
      tint: [0x8b0000, 0x800000],
      lifespan: 200,
      blendMode: "ADD",
      frequency: 20,
      quantity: 1,
    });
    this.energyTrailEmitter.stop();

    // 创建能量波动粒子
    this.energyWaveParticles = this.add.particles("bullet");
    this.energyWaveEmitter = this.energyWaveParticles.createEmitter({
      speed: { min: 40, max: 80 },
      scale: { start: 0.4, end: 0.1 }, // 增大波动粒子
      alpha: { start: 0.4, end: 0 },
      tint: 0x8b0000,
      lifespan: 300,
      blendMode: "ADD",
      frequency: -1,
      quantity: 1,
      angle: { min: -15, max: 15 },
    });
    this.energyWaveEmitter.stop();
  }

  createGame() {
    try {
      // 初始化物理系统组
      this.platforms = this.physics.add.staticGroup(); // 创建静态平台组
      this.coins = this.add.group(); // 创建金币组
      this.shootingAbilitys = this.add.group(); // 创建能力道具组
      this.speedAbilitys = this.add.group(); // 创建速度提升道具组
      this.bullets = this.physics.add.group(); // 创建子弹物理组
      this.monsters = this.physics.add.group(); // 创建怪物物理组

      // 创建视差滚动背景
      for (let i = 0; i < 5; i++) {
        const bg = this.add.image(
          i * 800, // X坐标，每个背景间隔800素
          this.gameHeight / 2, // Y坐标居中
          "game_background"
        );
        const scaleY = this.gameHeight / 600; // 计算垂直缩放比例以适应屏幕
        bg.setScale(1, scaleY); // 设置背景缩放
        bg.setDepth(-4); // 设置为最底层
        bg.setScrollFactor(0.3); // 设置视差效果系数
        this.backgrounds.push(bg); // 添加到背景数组
      }

      // 创建底部黑色背景
      this.bottomDarkness = this.add
        .rectangle(400, this.gameHeight + 400, 3200, 800, 0x000000)
        .setDepth(-1);

      // 设置物理世界边界
      this.physics.world.setBounds(0, 0, Number.MAX_SAFE_INTEGER, 2000);
      this.physics.world.setBoundsCollision(true, true, false, true);

      // 创建玩家角色
      const start = { x: 100, y: this.groundY - 110 }; // 设置玩家初始位置
      this.player = this.add.sprite(start.x, start.y, "gengar");
      this.player.setScale(1); // 设置玩家大小

      // 设置玩家物理属性
      this.physics.add.existing(this.player, false);
      this.player.body.setCollideWorldBounds(true); // 启用世界边界碰撞
      this.player.body.setBounce(0); // 设置弹跳值
      this.player.body.setGravityY(0); // 初始时无重力
      //   this.player.body.setSize(80, 80); // 设置碰撞箱大小
      //   this.player.body.setOffset(10, 10); // 设置碰撞箱偏
      this.player.body.setMaxVelocity(1000, this.maxFallSpeed); // 设置最大速度

      // 添加玩家与平台的碰撞检测
      this.physics.add.collider(this.player, this.platforms, () => {
        this.jumpCount = 0; // 着地时重置跳跃次数
      });

      // 延迟启用重力，确保玩家位置正确
      this.time.delayedCall(100, () => {
        this.player.body.setGravityY(300);
      });

      // 创建初始地图段落
      this.createMapSegment(-this.gameWidth); // 创建左侧段落
      this.createMapSegment(0); // 建中间段落
      this.createMapSegment(this.gameWidth); // 创建右侧段落

      // 设置游戏对象之间的碰撞和重叠检测
      this.setupCollisions();

      // 设置键盘控制
      this.setupControls();
    } catch (error) {
      console.error("Error in create:", error);
    }
  }

  // 设置游戏对象之间的碰撞和重叠检测
  setupCollisions() {
    // 金币相关
    this.physics.add.collider(this.coins, this.platforms);
    // 道具相关
    this.physics.add.collider(this.shootingAbilitys, this.platforms);
    this.physics.add.collider(this.speedAbilitys, this.platforms);
    this.physics.add.overlap(
      this.player,
      this.coins,
      this.collectCoin,
      null,
      this
    );

    // 道具相关
    this.physics.add.overlap(
      this.player,
      this.shootingAbilitys,
      this.collectShootingAbility,
      null,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.speedAbilitys,
      this.collectSpeedAbility,
      null,
      this
    );

    // 子弹相关
    this.physics.add.collider(this.bullets, this.platforms, (bullet) =>
      bullet.destroy()
    );
    this.physics.add.overlap(
      this.bullets,
      this.coins,
      this.hitCoin,
      null,
      this
    );

    // 怪物相关
    this.physics.add.collider(this.monsters, this.platforms);
    this.physics.add.overlap(
      this.player,
      this.monsters,
      this.hitMonster,
      null,
      this
    );
    this.physics.add.overlap(
      this.bullets,
      this.monsters,
      this.killMonster,
      null,
      this
    );
  }

  // 设置键盘控制
  setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceBar = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.shootKey = this.input.keyboard.addKey("F");
  }

  createMapSegment(startX) {
    // 创建平台的辅助函数
    const createPlatform = (x, y, width) => {
      const brickSize = 32; // 砖块大小
      const brickCount = Math.ceil(width / brickSize); // 计算需要的砖块数量
      const bricks = [];

      // 创建砖块序列形成平台
      for (let i = 0; i < brickCount; i++) {
        const brick = this.platforms.create(
          x + i * brickSize + brickSize / 2, // 砖块X坐标
          y, // 砖块Y坐标
          "brick"
        );
        brick.body.immovable = true; // 置为不可移动
        brick.body.moves = false; // 禁用物理移动
        brick.body.setSize(brickSize, 32); // 设置碰撞大小
        bricks.push(brick);
      }

      return bricks;
    };

    // 检查平台重叠的辅助函数
    const isPlatformOverlapping = (newPlatform, existingPlatforms) => {
      return existingPlatforms.some((platform) => {
        const horizontalOverlap =
          Math.abs(newPlatform.x - platform.x) <
          newPlatform.width / 2 + platform.width / 2;
        const verticalOverlap = Math.abs(newPlatform.y - platform.y) < 40;
        return horizontalOverlap && verticalOverlap;
      });
    };

    // 初始化地图段落对象
    const segment = {
      platforms: [], // 平台数组
      coins: [], // 金币数组
      shootingAbilitys: [], // 能力道具数组
      speedAbilitys: [], // 速度提升道具数组
      monsters: [], // 怪物数组
      startX: startX, // 段落起始X坐标
      width: this.gameWidth, // 段落宽度
    };

    // 平台生成配置
    const platformConfigs = [];
    const minPlatformWidth = 150; // 最小平台宽度
    const maxPlatformWidth = 250; // 最大平台度
    const minHeightDiff = 120; // 最小高度差
    const maxHeightDiff = 160; // 最大高度差

    // 添加地面平台
    platformConfigs.push({
      x: startX + this.gameWidth / 2,
      y: this.groundY,
      width: 200,
    });

    // 生成垂直分布的平台
    let currentHeight = this.groundY;
    while (currentHeight > 160) {
      // 持续生成直到达到最高点
      const heightDiff =
        Math.random() * (maxHeightDiff - minHeightDiff) + minHeightDiff;
      currentHeight -= heightDiff;

      let attempts = 0;
      let validPlatform = null;

      // 尝试找到合适的平台位置
      while (attempts < 10 && !validPlatform) {
        const platformWidth =
          Math.random() * (maxPlatformWidth - minPlatformWidth) +
          minPlatformWidth;
        const platformX =
          startX +
          Math.random() * (this.gameWidth - platformWidth) +
          platformWidth / 2;

        const newPlatform = {
          x: platformX,
          y: currentHeight,
          width: platformWidth,
        };

        if (!isPlatformOverlapping(newPlatform, platformConfigs)) {
          validPlatform = newPlatform;
        }
        attempts++;
      }

      if (validPlatform) {
        platformConfigs.push(validPlatform);
      }
    }

    // 创建地面
    let groundX = startX;
    const endX = startX + this.gameWidth;

    // 为初始区域创安全的连续地面
    if (startX === -this.gameWidth || startX === 0) {
      const safeBricks = createPlatform(startX, this.groundY, this.gameWidth);
      segment.platforms.push(...safeBricks);
      groundX = startX + this.gameWidth;
    }

    // 创建随机间隔的地面
    while (groundX < endX) {
      if (Math.random() > 0.3) {
        // 70%的概率创建地面
        const width = Math.random() * 150 + 150;
        const bricks = createPlatform(groundX, this.groundY, width);
        segment.platforms.push(...bricks);
        groundX += width;
      } else {
        // 30%的概率创建间隙
        groundX += Math.random() * (400 - 200) + 100;
      }
    }

    // 处理每个平台配置
    platformConfigs.forEach((config) => {
      if (config.y !== this.groundY) {
        // 跳地面平台
        // 创建平台
        const bricks = createPlatform(config.x, config.y, config.width);
        segment.platforms.push(...bricks);

        // 在平台上生成金币
        this.generateCoins(config, segment);

        // 在平台上生成道具
        // this.generateShootingAbilitys(config, segment);

        // 在平台上生成怪物
        // this.generateMonsters(config, segment);
      }
    });

    this.generateShootingAbilitysFromSky(
      segment.startX,
      segment.startX + segment.width
    );
    const monsterNum = Math.floor(Math.random() * 4);
    for (let monsterIndex = 0; monsterIndex < monsterNum; monsterIndex++) {
      this.generateMonstersFromSky(
        segment.startX,
        segment.startX + segment.width
      );
    }

    // 新段落添加到游戏中
    this.segments.push(segment);
    return segment;
  }

  // 在平台上生成金币
  generateCoins(platform, segment) {
    const coinSpacing = 40;
    const maxCoinCount = platform.width / coinSpacing;
    const startCoinX = platform.x + coinSpacing / 2;

    for (let i = 0; i < maxCoinCount; i++) {
      const coinX = startCoinX + coinSpacing * i;
      const coinY = platform.y - coinSpacing - 10;
      if (Math.random() > 0.5) {
        let coin = this.physics.add.sprite(coinX, coinY, "coin");
        coin.setScale(0.8);
        this.coins.add(coin);
        coin.body.setAllowGravity(false);
        coin.body.setSize(coinSpacing, coinSpacing);
        coin.body.setOffset(5, 5);
        segment.coins.push(coin);
      }
    }
  }

  // 在平台上生成能力道具
  //   generateShootingAbilitys(platform, segment) {
  //     if (Math.random() < 0.3) {
  //       if (Math.random() > 0.5) {
  //         const shootingAbilityX = platform.x;
  //         const shootingAbilityY = platform.y - 30 - 10;
  //         const shootingAbility = this.physics.add.sprite(
  //           shootingAbilityX,
  //           shootingAbilityY,
  //           "shooting_ability"
  //         );
  //         shootingAbility.setScale(0.8);
  //         shootingAbility.body.setAllowGravity(false);
  //         shootingAbility.body.setSize(50, 30);
  //         this.shootingAbilitys.add(shootingAbility);
  //         segment.shootingAbilitys.push(shootingAbility);
  //       } else {
  //         const speedAbilityX = platform.x;
  //         const speedAbilityY = platform.y - 30 - 10;
  //         const speedAbility = this.physics.add.sprite(
  //           speedAbilityX,
  //           speedAbilityY,
  //           "speed_ability"
  //         );
  //         speedAbility.setScale(0.8);
  //         speedAbility.body.setAllowGravity(false);
  //         speedAbility.body.setSize(50, 30);
  //         this.speedAbilitys.add(speedAbility);
  //         segment.speedAbilitys.push(speedAbility);
  //       }
  //     }
  //   }

  generateShootingAbilitysFromSky(startX, endX) {
    const shootingAbilityX = Phaser.Math.Between(startX, endX);
    const shootingAbilityY = 0; // 从天空开始
    const shootingAbilityType =
      Math.random() > 0.5 ? "shooting_ability" : "speed_ability";
    const shootingAbility = this.physics.add.sprite(
      shootingAbilityX,
      shootingAbilityY,
      shootingAbilityType
    );
    shootingAbility.setScale(2);
    shootingAbility.body.setAllowGravity(true); // 允许重力作用
    // shootingAbility.body.setSize(50, 30);

    if (shootingAbilityType === "shooting_ability") {
      this.shootingAbilitys.add(shootingAbility);
    } else if (shootingAbilityType === "speed_ability") {
      this.speedAbilitys.add(shootingAbility);
    }
  }

  generateMonstersFromSky(startX, endX) {
    const monsterX = Phaser.Math.Between(startX, endX);
    const monsterY = 0; // 从天空开始
    // 随机选择怪物类型
    const monsterType = Math.random() > 0.5 ? "1" : "2";
    const monster = this.physics.add.sprite(
      monsterX,
      monsterY,
      `monster_${monsterType}`
    );
    monster.type = monsterType;
    monster.setScale(0.8);
    monster.body.setCollideWorldBounds(true);
    monster.body.setBounce(0);

    // 设置怪物移动范围
    const monsterRange = Math.floor(Math.random() * (800 - 200 + 1)) + 200;
    const rangeOffset = monsterRange / 2;
    monster.leftBound = monsterX - rangeOffset;
    monster.rightBound = monsterX + rangeOffset;

    // 设置怪物移动属性
    monster.direction = 1;
    monster.moveSpeed = 100;
    monster.startX = monsterX;

    this.monsters.add(monster);
    // segment.monsters.push(monster);
  }

  // 在平台上生成怪物
  generateMonsters(platform, segment) {
    if (Math.random() > 0.8) {
      // 随机选择怪物类型
      const monsterType = Math.random() > 0.5 ? "1" : "2";
      const monster = this.physics.add.sprite(
        platform.x,
        platform.y,
        `monster_${monsterType}`
      );
      monster.type = monsterType;
      monster.setScale(0.8);
      monster.body.setCollideWorldBounds(true);
      monster.body.setBounce(0);

      // 设置怪物移动范围
      const monsterRange = Math.floor(Math.random() * (800 - 200 + 1)) + 200;
      const rangeOffset = monsterRange / 2;
      monster.leftBound = platform.x - rangeOffset;
      monster.rightBound = platform.x + rangeOffset;

      // 设置怪物移动属性
      monster.direction = 1;
      monster.moveSpeed = 100;
      monster.startX = platform.x;

      this.monsters.add(monster);
      segment.monsters.push(monster);
    }
  }

  removeMapSegment(segment) {
    // 移除所有平台
    segment.platforms.forEach((platform) => platform.destroy());
    // 移除所有金币
    segment.coins.forEach((coin) => coin.destroy());
    // 移除所有能量道具
    segment.shootingAbilitys.forEach((shootingAbility) =>
      shootingAbility.destroy()
    );
    // 移除所有速度提升道具
    segment.speedAbilitys.forEach((speedAbility) => speedAbility.destroy());
    // 除所有怪物
    segment.monsters.forEach((monster) => monster.destroy());
    // 从数组中移除这个段
    this.segments = this.segments.filter((s) => s !== segment);
  }

  update(time, delta) {
    // 游戏结束时只更新背景
    if (this.gameOver) {
      this.updateBackgrounds();
      return;
    }

    // 获取键盘输入和当前速度状态
    const cursors = this.input.keyboard.createCursorKeys();
    const currentSpeed = this.hasSpeedAbility
      ? this.boostedSpeed
      : this.normalSpeed;
    const baseJumpVelocity = this.hasSpeedAbility
      ? this.boostedJumpVelocity
      : this.normalJumpVelocity;

    // 据移动速度调整跳跃高度
    const speedMultiplier =
      Math.abs(this.player.body.velocity.x) / this.normalSpeed;
    const currentJumpVelocity = baseJumpVelocity * (1 + speedMultiplier * 0.2);

    // 更新背景视差效果
    this.updateBackgrounds();

    // 获取相机位置信息
    const cameraLeftEdge = this.cameras.main.scrollX;
    const screenWidth = this.cameras.main.width;
    const playerWidth = 32;

    // 处理玩家水平移动
    if (cursors.right.isDown) {
      // 向右移动
      this.player.body.setVelocityX(currentSpeed);
      this.playerDirection = 1;
      this.player.setFlipX(false);

      // 相机跟随
      if (this.player.x > this.cameras.main.scrollX + 400) {
        this.cameras.main.scrollX = this.player.x - 400;
      }

      // 生成新的地图段落
      if (this.player.x > this.currentSegmentX + this.gameWidth * 0.75) {
        this.currentSegmentX += this.gameWidth;
        this.createMapSegment(this.currentSegmentX + this.gameWidth);

        // 移除过远的地图段落
        if (this.segments.length > 4) {
          const firstSegment = this.segments[0];
          if (this.player.x - firstSegment.startX > this.gameWidth * 2) {
            this.removeMapSegment(firstSegment);
          }
        }
      }

      // 速度提升特效
      if (this.hasSpeedAbility && this.speedEmitter) {
        this.speedEmitter.on = true;
        this.speedEmitter.setPosition(this.player.x - 20, this.player.y);
        this.speedEmitter.setAngle({ min: 160, max: 200 });
      }
    } else if (cursors.left.isDown) {
      // 向左移动（限制不能超过相机左边缘）
      if (this.player.x <= cameraLeftEdge + playerWidth / 2) {
        this.player.setX(cameraLeftEdge + playerWidth / 2);
        this.player.body.setVelocityX(0);
      } else {
        this.player.body.setVelocityX(-currentSpeed);
      }
      this.playerDirection = -1;
      this.player.setFlipX(true);

      // 向左移动的速度特效
      if (this.hasSpeedAbility && this.speedEmitter) {
        this.speedEmitter.on = true;
        this.speedEmitter.setPosition(this.player.x + 20, this.player.y);
        this.speedEmitter.setAngle({ min: -20, max: 20 });
        // this.speedEmitter.setTint(0x00ffff, 0x0088ff);
      }
    } else {
      // 停止移动
      if (this.player.x < cameraLeftEdge + playerWidth / 2) {
        this.player.setX(cameraLeftEdge + playerWidth / 2);
      }
      this.player.body.setVelocityX(0);
      this.cameras.main.setDeadzone(200, 0);

      // 关闭速度特效
      if (this.speedEmitter) {
        this.speedEmitter.on = false;
      }
    }

    // 处理跳跃
    if (Phaser.Input.Keyboard.JustDown(this.spaceBar)) {
      if (this.player.body.blocked.down) {
        // 第一段跳跃
        this.player.body.setVelocityY(currentJumpVelocity);
        this.jumpCount = 1;
      } else if (this.jumpCount === 1) {
        // 二段跳
        this.player.body.setVelocityY(
          currentJumpVelocity * this.secondJumpMultiplier
        );
        this.jumpCount = 2;
      }
    }

    // 处理射击
    if (this.shootKey.isDown && this.hasShootingAbility && this.canShoot) {
      this.shoot();
      this.canShoot = false;
      // 设置射击冷却
      this.time.delayedCall(this.shootCooldown, () => {
        this.canShoot = true;
      });
    }

    // 记录玩家位置
    this.lastPlayerX = this.player.x;

    // 相机垂直跟随逻辑
    const groundLevel = 568;
    const screenHeight = 600;

    if (this.player.y > groundLevel) {
      // 玩家在地面以下时相机向下移动
      const targetY = this.player.y - this.cameras.main.height / 2;
      this.cameras.main.scrollY += (targetY - this.cameras.main.scrollY) * 0.1;
    } else {
      // 玩家在地面以上时，相机回到默认位置
      const targetY = 0;
      this.cameras.main.scrollY += (targetY - this.cameras.main.scrollY) * 0.1;
    }

    // 确保相机位置为整数以避免画面抖动
    this.cameras.main.scrollX = Math.round(this.cameras.main.scrollX);
    this.cameras.main.scrollY = Math.round(this.cameras.main.scrollY);

    // 检查玩家是否掉落死亡
    if (this.player.y > this.groundY + 100) {
      this.playerDeath();
    }

    // 更新怪物移动
    this.monsters.getChildren().forEach((monster) => {
      if (!monster.active) return;
      // 在平台范围内来回移动
      if (monster.x <= monster.leftBound) {
        monster.x = monster.leftBound;
        monster.direction = 1;
        monster.flipX = false;
      } else if (monster.x >= monster.rightBound) {
        monster.x = monster.rightBound;
        monster.direction = -1;
        monster.flipX = true;
      }
      monster.body.setVelocityX(monster.moveSpeed * monster.direction);
    });
  }

  // 创建能力道具UI
  createShootingAbilityUI(type) {
    const startX = this.gameWidth - 450;
    const y = 30;

    // 创建UI容器和组件
    const ui = {
      container: this.add.container(0, 0).setScrollFactor(0),

      icon: this.add
        .sprite(
          startX,
          y,
          type === "speed" ? "speed_ability" : "shooting_ability"
        )
        .setScale(0.5)
        .setScrollFactor(0),

      barBg: this.add
        .rectangle(startX + 50, y, 100, 12, 0x333333)
        .setOrigin(0, 0.5)
        .setScrollFactor(0),

      bar: this.add
        .rectangle(
          startX + 50,
          y,
          100,
          12,
          type === "speed" ? 0xffcc00 : 0x00aaff
        )
        .setOrigin(0, 0.5)
        .setScrollFactor(0),

      timer: this.add
        .text(startX + 160, y, "10.0s", {
          fontSize: "20px",
          fill: type === "speed" ? "#ffcc00" : "#00aaff",
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0),
    };

    // 将所有组件添加到容器中
    ui.container.add([ui.icon, ui.barBg, ui.bar, ui.timer]);

    // 根据类型设置位置
    if (type === "speed") {
      ui.container.setPosition(0, 0);
    } else {
      ui.container.setPosition(220, 0);
    }

    return ui;
  }

  // 更新能力道具UI
  updateShootingAbilityUI(ui, timeLeft) {
    if (ui) {
      const progress = timeLeft / this.shootingAbilityDuration;
      ui.bar.scaleX = progress;
      ui.bar.setOrigin(0, 0.5);
      ui.timer.setText((timeLeft / 1000).toFixed(1) + "s");
    }
  }

  // 收集能力道具
  collectShootingAbility(player, shootingAbility) {
    shootingAbility.destroy();
    this.shootingAbilityTime = this.shootingAbilityDuration;
  }

  // 子弹击中金币
  hitCoin(bullet, coin) {
    bullet.destroy();
    coin.destroy();
    this.score += 10;
  }

  // 射击系统
  shoot() {
    if (!this.hasShootingAbility) return;

    // 计算发射位置
    const offsetX = this.playerDirection === 1 ? 40 : -40;
    const shockwaveX = this.player.x + offsetX;
    const shockwaveY = this.player.y + 5;

    // 创建主要能量球
    const energyBall = this.add.circle(
      shockwaveX,
      shockwaveY,
      16,
      0x8b0000,
      0.9
    );
    this.bullets.add(energyBall);
    energyBall.body.setAllowGravity(false);
    energyBall.body.setVelocityX(this.playerDirection * 800);

    // 记录发射位置，用于计算射程
    energyBall.startX = shockwaveX;
    const MAX_RANGE = 500; // 设置最大射程为100像素

    // 创建内部能量核心
    const energyCore = this.add.circle(shockwaveX, shockwaveY, 8, 0x800000, 1);
    energyCore.setBlendMode("ADD");

    // 创建外部光环
    const outerGlow = this.add.circle(
      shockwaveX,
      shockwaveY,
      22,
      0x660000,
      0.4
    );
    outerGlow.setBlendMode("ADD");

    // 创建能量波纹动画
    const createEnergyRipple = () => {
      const ripple = this.add.circle(
        energyBall.x,
        energyBall.y,
        14,
        0x8b0000,
        0.3
      );
      ripple.setBlendMode("ADD");
      this.tweens.add({
        targets: ripple,
        scaleX: 1.8,
        scaleY: 1.8,
        alpha: 0,
        duration: 200,
        onComplete: () => ripple.destroy(),
      });
    };

    // 设置脉动动画
    this.tweens.add({
      targets: [energyBall, energyCore],
      scaleX: 1.2,
      scaleY: 1.2,
      yoyo: true,
      duration: 100,
      repeat: -1,
    });

    // 同步所有视觉效果
    const updateEffects = () => {
      if (energyBall.active) {
        // 检查射程
        const distance = Math.abs(energyBall.x - energyBall.startX);
        if (distance >= MAX_RANGE) {
          // 超出射程，创建消散效果
          const fadeEffect = this.add.circle(
            energyBall.x,
            energyBall.y,
            16,
            0x8b0000,
            0.5
          );
          fadeEffect.setBlendMode("ADD");
          this.tweens.add({
            targets: fadeEffect,
            alpha: 0,
            scale: 0.5,
            duration: 150,
            onComplete: () => fadeEffect.destroy(),
          });

          // 销毁所有相关效果
          destroyEffects();
          return;
        }

        // 更新视觉效果位置
        energyCore.x = energyBall.x;
        energyCore.y = energyBall.y;
        outerGlow.x = energyBall.x;
        outerGlow.y = energyBall.y;

        this.shockwaveEmitter.setPosition(energyBall.x, energyBall.y);
        this.energyTrailEmitter.setPosition(
          energyBall.x - this.playerDirection * 15,
          energyBall.y
        );
        this.energyWaveEmitter.setPosition(energyBall.x, energyBall.y);

        if (Math.random() < 0.2) {
          createEnergyRipple();
        }
      } else {
        energyCore.destroy();
        outerGlow.destroy();
        this.shockwaveEmitter.stop();
        this.energyTrailEmitter.stop();
        this.energyWaveEmitter.stop();
      }
    };

    // 设置更新间隔
    this.time.addEvent({
      delay: 16,
      callback: updateEffects,
      repeat: -1,
    });

    // 激活所有粒子效果
    this.shockwaveEmitter.start();
    this.energyTrailEmitter.start();
    this.energyWaveEmitter.start();

    // 添加碰撞检测
    const destroyEffects = () => {
      energyBall.destroy();
      energyCore.destroy();
      outerGlow.destroy();
      this.shockwaveEmitter.stop();
      this.energyTrailEmitter.stop();
      this.energyWaveEmitter.stop();
    };

    // 与道具的碰撞
    this.physics.add.overlap(
      energyBall,
      this.shootingAbilitys,
      (energyBall, shootingAbility) => {
        destroyEffects();
        shootingAbility.destroy();
        this.collectShootingAbility(this.player, shootingAbility);
      },
      null,
      this
    );

    this.physics.add.overlap(
      energyBall,
      this.speedAbilitys,
      (energyBall, speedAbility) => {
        destroyEffects();
        speedAbility.destroy();
        this.collectSpeedAbility(this.player, speedAbility);
      },
      null,
      this
    );

    // 与平台的碰撞
    this.physics.add.collider(energyBall, this.platforms, () => {
      // 创建碰撞爆炸效果
      const explosion = this.add.circle(
        energyBall.x,
        energyBall.y,
        30,
        0x8b0000,
        0.8
      );
      explosion.setBlendMode("ADD");

      this.tweens.add({
        targets: explosion,
        scale: 2,
        alpha: 0,
        duration: 200,
        onComplete: () => explosion.destroy(),
      });

      destroyEffects();
    });

    // 与怪物的碰撞
    this.physics.add.overlap(
      energyBall,
      this.monsters,
      (energyBall, monster) => {
        destroyEffects();
        this.killMonster(energyBall, monster);
      },
      null,
      this
    );
  }

  // 更新背景视差效果
  updateBackgrounds() {
    const cameraX = this.cameras.main.scrollX;
    const cameraY = this.cameras.main.scrollY;

    // 更新背景层位置
    this.backgrounds.forEach((bg, index) => {
      const parallaxX = cameraX * 0.3;
      const baseX = Math.floor(parallaxX / 800) * 800;
      let targetX = baseX + index * 800;

      // 循环背景
      if (targetX < parallaxX - 1600) {
        targetX += this.backgrounds.length * 800;
      }

      bg.x = targetX;
      bg.y = this.gameHeight / 2 + cameraY * 0.3;
    });

    // 更新底部黑色背景位置
    if (this.bottomDarkness) {
      this.bottomDarkness.x = cameraX + 400;
      this.bottomDarkness.y = this.gameHeight + 400 + cameraY;
    }
  }

  // 收集速度提升道具
  collectSpeedAbility(player, speedAbility) {
    speedAbility.destroy();
    this.speedAbilityTime = this.speedAbilityDuration;
  }

  // 收集金币
  collectCoin(player, coin) {
    coin.destroy();
    this.score += 10;
  }
  playerDeath() {
    if (this.gameOver) return;
    this.cameras.main.shake(200, 0.01); // 缩短震动时间

    this.gameOver = true;

    // 关闭能力
    this.shootingAbilityTime = 0;
    this.speedAbilityTime = 0;

    // 停止所有现有的运动和动画
    this.player.body.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);

    // 停止背景音乐
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
    }

    // 创建死亡动画序列
    const deathAnimation = async () => {
      // 向上跳跃动画
      this.tweens.add({
        targets: this.player,
        y: this.player.y - 150,
        duration: 300,
        ease: "Quad.easeOut",
      });

      // 等待一小段时间后开始下落
      await new Promise((resolve) => this.time.delayedCall(500, resolve));

      // 下落动画
      this.tweens.add({
        targets: this.player,
        y: this.gameHeight + 100,
        duration: 500,
        ease: "Quad.easeIn",
        onComplete: () => {
          this.game.events.emit("onGameOver");
        },
      });

      // 旋转动画
      this.tweens.add({
        targets: this.player,
        angle: 360,
        duration: 500,
        ease: "Linear",
      });

      // 创建死亡粒子效果
      const deathParticles = this.add.particles("speedParticle");
      const emitter = deathParticles.createEmitter({
        x: this.player.x,
        y: this.player.y,
        speed: { min: -200, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.4, end: 0 },
        blendMode: "ADD",
        lifespan: 800,
        quantity: 20,
        tint: [0x8b0000, 0xff0000],
      });

      // 粒子跟随玩家
      this.time.delayedCall(500, () => {
        emitter.stop();
        this.time.delayedCall(500, () => {
          deathParticles.destroy();
        });
      });
    };

    deathAnimation();
  }

  // 处理玩家与怪物的碰撞
  hitMonster(player, monster) {
    const playerBottom = player.body.y + player.body.height;
    const monsterTop = monster.body.y;

    // 从上方踩踏怪物
    if (playerBottom <= monsterTop + 10) {
      this.killMonster(null, monster);
      player.body.setVelocityY(-300);
    } else {
      // 到怪物导致游戏结束
      this.playerDeath();
    }
  }

  // 处理子弹击中怪物
  killMonster(bullet, monster) {
    if (bullet) {
      // 创建击中爆炸效果
      const hitX = monster.x;
      const hitY = monster.y;

      // 销毁冲击波
      bullet.destroy();

      // 创建中心爆炸光环
      const explosion = this.add.circle(hitX, hitY, 30, 0x8b0000, 0.8);
      explosion.setBlendMode("ADD");

      // 创建扩散波纹
      const createRipple = (radius, duration) => {
        const ripple = this.add.circle(hitX, hitY, radius, 0x8b0000, 0.4);
        ripple.setBlendMode("ADD");
        this.tweens.add({
          targets: ripple,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: duration,
          ease: "Power2",
          onComplete: () => ripple.destroy(),
        });
      };

      // 创建多个扩散波纹 - 缩短间隔和持续时间
      createRipple(20, 150);
      this.time.delayedCall(50, () => createRipple(25, 200));
      this.time.delayedCall(100, () => createRipple(30, 250));

      // 创建粒子爆发效果
      const particles = this.add.particles("bullet");
      const emitter = particles.createEmitter({
        x: hitX,
        y: hitY,
        speed: { min: 100, max: 200 },
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.6, end: 0 },
        tint: [0x8b0000, 0x800000],
        lifespan: 300, // 缩短粒子生命周期
        angle: { min: 0, max: 360 },
        quantity: 12,
        blendMode: "ADD",
      });

      // 创建能量溢出效果
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 40;
        const energyX = hitX + Math.cos(angle) * distance;
        const energyY = hitY + Math.sin(angle) * distance;

        const energyLine = this.add.line(
          0,
          0,
          hitX,
          hitY,
          energyX,
          energyY,
          0x8b0000,
          0.6
        );
        energyLine.setLineWidth(2);
        energyLine.setBlendMode("ADD");

        this.tweens.add({
          targets: energyLine,
          alpha: 0,
          duration: 100, // 缩短线条消失时间
          ease: "Power2",
          onComplete: () => energyLine.destroy(),
        });
      }

      // 创建冲击波震动效果
      this.cameras.main.shake(100, 0.005); // 缩短震动时间

      // 添加时间减缓效果
      this.time.delayedCall(25, () => {
        // 缩短延迟
        this.time.timeScale = 0.5;
        this.time.delayedCall(50, () => {
          // 缩短减速时间
          this.time.timeScale = 1;
        });
      });

      // 清理特效
      this.time.delayedCall(300, () => {
        // 缩短清理延迟
        explosion.destroy();
        particles.destroy();
      });
    }

    // 销毁怪物
    monster.destroy();
    this.score += 20;
  }
}

export default GameScene;
