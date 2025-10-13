class GameState {
    constructor() {
        // players: { socketId: { body: Matter.Body, lastPos: {x,y} } }
        this.players = {}; // 全プレイヤーの位置を保持
        this.score = { top: 0, bottom: 0 };
    }

    addPlayer(id, body) {
        this.players[id] = { body };
    }

    removePlayer(id) {
        if (!this.players[id]) return;
        delete this.players[id];
    }

    setPlayerLastPos(id, pos) {
        if (!this.players[id]) return;
        this.players[id].lastPos = { x: pos.x, y: pos.y };
    }

    getPlayerLastPos(id) {
        return this.players[id] ? this.players[id].lastPos : undefined;
    }

    getPlayersState() {
        const state = {};
        for (const id in this.players) {
            const body = this.players[id].body;
            state[id] = { x: body.position.x, y: body.position.y };
        }
        return state;
    }
}

module.exports = GameState;
