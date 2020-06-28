// Server Side File

// To do:
// Move Player across the screen
// Create box in 
// Track players points
// Close room if they get 3 points
// Move timer into html, from server side

import { Room, Client, Delayed } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
var colors = ['yellow', 'blue', 'cyan', 'magenta'];

export class Player extends Schema {

    @type("number")
    x = Math.floor(Math.random() * 400);

    @type("number")
    y = 250;

    @type("boolean")
    mode = false;

    @type("string")
    color = colors[Math.floor(Math.random() * colors.length)];

    @type("number")
    size = 100;
}

export class State extends Schema {
    @type("number")
    mode: number = 0; //0 = normal, 1 = good state (wood log), 2 = bad state (bomb)

    @type({ map: Player })
    players = new MapSchema<Player>();

    something = "This attribute won't be sent to the client-side";

    createPlayer (id: string) {
        this.players[ id ] = new Player();
    }

    removePlayer (id: string) {
        delete this.players[ id ];
    }

    hitPlayer (id: string, s: boolean) {
        this.players[ id ].mode = s;
    }

    pointToPlayer (id: string) {
        this.players[ id ].size += 50;
        return this.players[ id ].size;
    }
}

export class LoggerheadsRoom extends Room<State> {
    maxClients = 4;

    onCreate (options) {
        console.log("LoggerheadsRoom created!", options);

        this.setState(new State());
        this.clock.start();

        var t_out = 3000 + Math.floor(Math.random()*4000)
        console.log("Time out duration is ", t_out);
        this.modeChange(t_out);

        this.onMessage("hit", (client,message) => {
            console.log("LoggerheadsRoom received hit message from", client.sessionId,);
            var delay;
            
            if (this.state.mode < 2) {
                delay = 500;
                if (this.state.mode == 1) {
                    this.pointTo(client);
                }
            }
            else if (this.state.mode == 2) {
                delay = 3000;
            }
    
            this.clock.setTimeout(() => {
                // client.send("player_change",{string: "enable"});
                // this.state.players[ client.sessionId ].mode = false
                this.state.hitPlayer(client.sessionId,false);
                console.log("Player ", client.sessionId, " is enabled.");
            }, delay);
            this.state.hitPlayer(client.sessionId,true);
            // this.state.movePlayer(client.sessionId)
        });

        this.onMessage("players cleared",(client) => {
            console.log("Players variable was cleared by " + client.sessionId);
            console.log("Currently " + this.state.players.length + "players connected")
        })
        
        this.onMessage("error", (client, message) => {
            console.log("State received by " + client.sessionId + " was incorrect.");
        })
    }

    onAuth(client, options, req) {
        console.log(req.headers.cookie);
        return true;
    }

    onJoin (client: Client) {
        client.send("hello", "world");
        this.state.createPlayer(client.sessionId);
    }

    onLeave (client) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose () {
        console.log("Dispose LoggerheadsRoom");
    }

    modeChange(time:number) {
        this.clock.setTimeout(() => {
            var rnd_max = 3;
            var good_or_bad = Math.floor(Math.random()*rnd_max);
            if (good_or_bad < rnd_max - 1) {
                this.state.mode = 1; //1 or 0 is good mode
            }
            else if (good_or_bad >= rnd_max - 1) {
                this.state.mode = 2; //2 is bad mode
                
            }
            this.broadcast("mode_change",this.state.mode);
            console.log("Reset Time Out");
            this.clock.setTimeout(() => {
                this.state.mode = 0;
                this.broadcast("mode_change",0);

                var t_out = 3000 + Math.floor(Math.random()*4000)
                console.log("Time out duration is ", t_out);
                this.modeChange(t_out);
            }, 3000);
        }, time);
    }

    pointTo(client: Client) {
        if (this.state.pointToPlayer(client.sessionId) > 200) {
            this.broadcast("win",`${ client.sessionId } has won!.`);
            this.clock.setTimeout(() => {
                this.disconnect();
            }, 3000);
        }
    }
}
