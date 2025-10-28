const Matter = require("matter-js");
const constants = require("./constants");

class GameEngine {
  constructor() {
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    this.engine.gravity.y = 0; // 縦方向の重力を0に
    this._init();
  }

  _init() {
    this._createWalls();
    this._createGoals();
    this._createPuck();
    // collision event: expose handler attachable by caller
    this.collisionHandler = null;
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      if (this.collisionHandler) {
        this.collisionHandler(event);
      }
    });
  }

  // 壁（フィールドの周囲）
  _createWalls() {
    const { WIDTH, HEIGHT, WALL_THICK } = constants; // フィールド幅, 高さ, 壁の厚み
    const walls = [
      Matter.Bodies.rectangle(WIDTH / 2, -WALL_THICK / 2, WIDTH, WALL_THICK, { isStatic: true, restitution: 1 }),
      Matter.Bodies.rectangle(WIDTH / 2, HEIGHT + WALL_THICK / 2, WIDTH, WALL_THICK, { isStatic: true, restitution: 1 }),
      Matter.Bodies.rectangle(-WALL_THICK / 2, HEIGHT / 2, WALL_THICK, HEIGHT, { isStatic: true, restitution: 1 }),
      Matter.Bodies.rectangle(WIDTH + WALL_THICK / 2, HEIGHT / 2, WALL_THICK, HEIGHT, { isStatic: true, restitution: 1 })
    ];
    Matter.World.add(this.world, walls);
  }

  // パック状態(初期位置と初期速度)
  _createPuck() {
    const { WIDTH, HEIGHT, PUCK_RADIUS } = constants;
    this.puck = Matter.Bodies.circle(WIDTH / 2, HEIGHT / 2, PUCK_RADIUS, {
      restitution: 0.9, // 反発係数
      friction: 0, // 面との摩擦
      frictionAir: 0.00005, // 空気抵抗（小さいほど減速しない）
      frictionStatic: 0,  // 静止摩擦
      inertia: Infinity // 回転禁止
    });
    Matter.World.add(this.world, this.puck);
  }

  // ゴール
  _createGoals() {
    const { WIDTH, HEIGHT, GOAL_WIDTH, GOAL_DEPTH } = constants;
    this.goals = {
      top: Matter.Bodies.rectangle(WIDTH / 2, -GOAL_DEPTH / 2, GOAL_WIDTH, GOAL_DEPTH, { isSensor: true, isStatic: true }),
      bottom: Matter.Bodies.rectangle(WIDTH / 2, HEIGHT + GOAL_DEPTH / 2, GOAL_WIDTH, GOAL_DEPTH, { isSensor: true, isStatic: true })
    };
    Matter.World.add(this.world, [this.goals.top, this.goals.bottom]);
  }

  // ゴール幅の更新
  updateGoalWidths(topWidth, bottomWidth) {
    const { WIDTH, HEIGHT, GOAL_DEPTH } = constants;
    
    // 既存のゴールを削除
    Matter.World.remove(this.world, [this.goals.top, this.goals.bottom]);
    
    // 新しい幅でゴールを再作成
    this.goals = {
      top: Matter.Bodies.rectangle(WIDTH / 2, -GOAL_DEPTH / 2, topWidth, GOAL_DEPTH, { isSensor: true, isStatic: true }),
      bottom: Matter.Bodies.rectangle(WIDTH / 2, HEIGHT + GOAL_DEPTH / 2, bottomWidth, GOAL_DEPTH, { isSensor: true, isStatic: true })
    };
    
    // 新しいゴールを追加
    Matter.World.add(this.world, [this.goals.top, this.goals.bottom]);
  }

  // パックを一時停止（演出中など）
  freezePuck(durationMs) {
    const Matter = require('matter-js');
    if (!this.puck) return;
    // 停止して物理干渉を避ける
    Matter.Body.setVelocity(this.puck, { x: 0, y: 0 });
    Matter.Body.setPosition(this.puck, { x: constants.WIDTH / 2, y: constants.HEIGHT / 2 });
    Matter.Body.setStatic(this.puck, true);
    this.puckFrozen = true;
    if (this._freezeTimeout) clearTimeout(this._freezeTimeout);
    this._freezeTimeout = setTimeout(() => {
      // 再開
      Matter.Body.setStatic(this.puck, false);
      this.puckFrozen = false;
      // リセット位置に戻す
      this.resetPuck();
      this._freezeTimeout = null;
    }, durationMs);
  }

  // 即時解除（任意）
  unfreezePuck() {
    const Matter = require('matter-js');
    if (!this.puck) return;
    if (this._freezeTimeout) {
      clearTimeout(this._freezeTimeout);
      this._freezeTimeout = null;
    }
    Matter.Body.setStatic(this.puck, false);
    this.puckFrozen = false;
  }

  resetPuck() {
    const { WIDTH, HEIGHT } = constants;
    Matter.Body.setPosition(this.puck, { x: WIDTH / 2, y: HEIGHT / 2 });
    Matter.Body.setVelocity(this.puck, { x: 0, y: 0 });
  }

  update() {
    Matter.Engine.update(this.engine, 1000 / constants.FRAME_RATE);

    // パックがフィールド外（壁の外）に出てしまった場合は位置をリセット
    // 物理的にすり抜けてしまうケースを防ぐための安全措置
    if (this.puck && this.puck.position) {
      const { WIDTH, HEIGHT, WALL_THICK } = constants;
      const px = this.puck.position.x;
      const py = this.puck.position.y;
      // 壁の外に出たと判断する閾値（壁厚みを基準にする）
      if (px < -WALL_THICK || px > WIDTH + WALL_THICK || py < -WALL_THICK || py > HEIGHT + WALL_THICK) {
        // freeze 中は既に reset がスケジュールされている可能性があるため即リセット
        this.resetPuck();
      }
    }
  }

  onCollision(handler) {
    this.collisionHandler = handler;
  }
}

module.exports = GameEngine;
