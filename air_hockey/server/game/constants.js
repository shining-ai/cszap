module.exports = {
    PORT: process.env.PORT || 3000,
    WIDTH: 600,
    HEIGHT: 400,
    PUCK_RADIUS: 10,
    PLAYER_RADIUS: 30,
    WALL_THICK: 200,
    GOAL_WIDTH: 200,
    GOAL_DEPTH: 10,
    FRAME_RATE: 60,
    // プレイヤー移動時の最大速度（サーバ側でクリップ）
    PLAYER_MAX_SPEED: 10
};
