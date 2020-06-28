// Server Side File

// To do:
// Add players on join, only update checkbox from clicks 

import { Room, Client, Delayed } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
var colors = ['AntiqueWhite','Lavender','Coral','Orchid','Cyan','DarkSeaGreen','DarkGrey','RosyBrown'];

export class Player extends Schema {

    @type("string")
    name = colors[Math.floor(Math.random() * colors.length)];

    @type("number")
    points = Math.floor(Math.random() * 400);

    @type("boolean")
    ready = false;

    @type("boolean")
    group_willing = false;

    @type("number")
    group = -1;
}

export class State extends Schema {
    @type("number")
    seconds_timer = 300; //This will need to be extracted from the environment at some point.

    @type("number")
    group_max = 4; //This will need to be extracted from the environment at some point.

    @type({ map: Player })
    players = new MapSchema<Player>();


    group_count = [0,0,0,0,0,0,0,0];
    player_count = 0;
    // something = "This attribute won't be sent to the client-side";

    createPlayer (id: string) {
        this.player_count += 1;
        this.players[ id ] = new Player();
        this.players[ id ].ready = false;
    }

    removePlayer (id: string) {
        if (this.players[ id ].group >= 0) {
            this.group_count[this.players[ id ].group]--;
        }
        delete this.players[ id ];
    }

    pointToPlayer (id: string) {
        this.players[ id ].size += 50;
        return this.players[ id ].size;
    }
}

export class LobbyRoom extends Room<State> {
    // maxClients = 4;

    onCreate (options) {
        console.log("Lobby Room Created!", options);

        this.setState(new State());
        this.clock.start();
        
        this.onMessage("error", (client) => {
            console.log("State received by " + client.sessionId + " was incorrect.");
        })

        this.onMessage("check", (client, message) => {
            console.log(client.sessionId + " has clicked a button.");
            if (client.sessionId + '_readyButton' == message["Id"]) {
                console.log(client.sessionId + " has readied up.");
                this.state.players[ client.sessionId ].ready = !this.state.players[ client.sessionId ].ready;
            }
        })

        this.onMessage("group_confirm", (client, message) => {
            console.log(client.sessionId + " has confirmed wanting to join group " + message[ "Group" ]);
            this.state.players[ client.sessionId ].group = parseInt(message[ "Group" ]);
        })

        this.onMessage("group_decline", (client, message) => {
            console.log(client.sessionId + " has declined joining group " + message[ "Group" ]);
        })

        this.onMessage("group_swap", (client) => {
            var player = this.state.players[ client.sessionId ];
            if(player.group_willing) {
                player.group_willing = false;
                player.group = -1;
            } else {
                player.group_willing = true;
                var i;
                for (i = 0; i < 8; i++) {
                    if (this.state.group_count[i]==0) {
                        this.state.group_count[i]++;
                        player.group = i;
                        break;
                    }
                }
            }
        })

        this.onMessage("group_request", (client, message) => {
            console.log(client.sessionId + " has requested to join " + message["Id"] + "'s group.");
            this.clients[ message["Id"] ].send("group_request", {Id:client.sessionId});
            // this.
            // this.client[message["Id"]].send("group_request", {group: this.state.players[ client.sessionId ].group})
            // this.state.players[ ]
        })
    }

    onAuth(client, options, req) {
        console.log(req.headers.cookie);
        return true;
    }

    onJoin (client: Client) {
        this.state.createPlayer(client.sessionId);
    }

    onLeave (client) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose () {
        console.log("Dispose Lobby Room");
    }
}
