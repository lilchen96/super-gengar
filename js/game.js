import GameScene from "./GameScene.js";
function initGame(selectorId, width, height) {
  // 游戏窗口配置
  const config = {
    type: Phaser.AUTO,
    scale: {
      parent: selectorId,
      width: width,
      height: height,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      mode: Phaser.Scale.FIT,
    },
    fps: {
      target: 60,
      forceSetTimeOut: true,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 300 },
      },
    },
    scene: GameScene,
  };
  // 创建游戏实例
  const game = new Phaser.Game(config);
  return game;
}

export { initGame };
