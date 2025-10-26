class GameState {
    getTeamSize(team) {
        return this.teams[team].size;
    }
    constructor() {
        // players: { socketId: { body: Matter.Body, lastPos: {x,y}, team: string } }
        this.players = {}; // 全プレイヤーの位置を保持
        this.score = { top: 0, bottom: 0 };
        this.teams = { top: new Set(), bottom: new Set() }; // チームごとのプレイヤー管理
    }

    addPlayer(id, body, team) {
        if (team) {
            // チームに所属する場合
            if (this.canJoinTeam(team)) {
                this.players[id] = { body, team };
                this.teams[team].add(id);
            }
        } else {
            // 観戦者の場合
            this.players[id] = { body };
        }
    }

    canJoinTeam(team) {
        return true; // チーム人数制限なし
    }

    removePlayer(id) {
        if (!this.players[id]) return;
        // チームからも削除
        const player = this.players[id];
        if (player.team) {
            this.teams[player.team].delete(id);
        }
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
            const player = this.players[id];
            if (player.body) { // 観戦者以外のプレイヤーのみ位置情報を送信
                state[id] = {
                    x: player.body.position.x,
                    y: player.body.position.y,
                    team: player.team || null
                };
            }
        }
        return state;
    }
}

module.exports = GameState;
