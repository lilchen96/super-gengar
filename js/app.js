import { initGame } from "./game.js";
import GameUI from "./GameUI.js";

const CONFIG = {
  DESIGN_WIDTH: 800,
  DESIGN_HEIGHT: 600,
  BASE_FONT_SIZE: 16,
};

async function init() {
  function onWindowResize() {
    gameUI.dom.style.width = gameCanvas.style.width;
    gameUI.dom.style.height = gameCanvas.style.height;

    const currentWidth = gameUI.dom.style.width.replace("px", "");
    const currentHeight = gameUI.dom.style.height.replace("px", "");

    const widthRatio = currentWidth / CONFIG.DESIGN_WIDTH;
    const heightRatio = currentHeight / CONFIG.DESIGN_HEIGHT;
    const scaleFactor = Math.min(widthRatio, heightRatio);
    const fontSize = CONFIG.BASE_FONT_SIZE * scaleFactor;

    document.documentElement.style.fontSize = `${fontSize}px`;
  }

  const gameUI = new GameUI();
  const game = await initGame(
    "game",
    CONFIG.DESIGN_WIDTH,
    CONFIG.DESIGN_HEIGHT
  );

  const gameDom = document.getElementById("game");
  const gameCanvas = gameDom.querySelector("canvas");

  game.events.on("onScoreChange", (score) => gameUI.updateScore(score));
  game.events.on("onGameOver", () => gameUI.showGameOver());
  game.events.on("onShootingAbilityTimeChange", (time) => {
    gameUI.updateAbilityTime("shooting", time);
  });
  game.events.on("onSpeedAbilityTimeChange", (time) => {
    gameUI.updateAbilityTime("speed", time);
  });
  game.events.on("onSceneReady", (gameScene) => {
    gameUI.events.on("onRestart", () => gameScene.scene.restart());
    gameUI.events.on("onPause", () => gameScene.scene.pause());
    gameUI.events.on("onResume", () => gameScene.scene.resume());
  });

  onWindowResize();
  window.addEventListener("resize", onWindowResize);
}

init();
