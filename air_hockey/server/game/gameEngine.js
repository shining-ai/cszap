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

  resetPuck() {
    const { WIDTH, HEIGHT } = constants;
    Matter.Body.setPosition(this.puck, { x: WIDTH / 2, y: HEIGHT / 2 });
    Matter.Body.setVelocity(this.puck, { x: 0, y: 0 });
  }

  update() {
    Matter.Engine.update(this.engine, 1000 / constants.FRAME_RATE);
  }

  onCollision(handler) {
    this.collisionHandler = handler;
  }
}

module.exports = GameEngine;
