const http = require("http");
const WebSocket = require("ws");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// =====================================================
// GLOBAL SAVE (Replit resets on restart unless DB added)
// =====================================================
let players = {};
let globalStage = 0;
let islandCounter = 0;

// =====================================================
// PHASES (Modern OneBlock)
// =====================================================
const phases = [
  { name: "Plains", blocks:["grass_block","oak_log","oak_planks","dirt"], mobs:["cow","pig"], rare:["iron_ingot"] },
  { name: "Forest", blocks:["birch_log","birch_planks","mossy_cobblestone"], mobs:["wolf"], rare:["name_tag"] },
  { name: "Desert", blocks:["sand","sandstone","cactus"], mobs:["husk"], rare:["gold_ingot"] },
  { name: "Snow", blocks:["snow_block","ice","spruce_log"], mobs:["stray"], rare:["packed_ice"] },
  { name: "Ocean", blocks:["prismarine","sea_lantern","coral"], mobs:["drowned"], rare:["heart_of_the_sea"] },
  { name: "Nether", blocks:["netherrack","nether_quartz_ore","soul_sand"], mobs:["blaze"], rare:["netherite_scrap"] },
  { name: "End", blocks:["end_stone","purpur_block","chorus_plant"], mobs:["enderman"], rare:["ender_pearl"] },
  { name: "Void", blocks:["obsidian","diamond_block","emerald_block"], mobs:["phantom"], rare:["totem_of_undying"] }
];

// =====================================================
// ISLAND TEMPLATES (Villages, Structures, Mega, Boss)
// =====================================================
const islandTemplates = {
  plainsVillage: {
    name: "Plains Village Island",
    blocks:["grass_block","oak_log","oak_planks","hay_block"],
    structures:["village_house","village_farm","village_tower"],
    mobs:["villager"]
  },
  desertVillage: {
    name: "Desert Village Island",
    blocks:["sand","sandstone","cactus"],
    structures:["desert_house","desert_well","desert_tower"],
    mobs:["villager"]
  },
  snowVillage: {
    name: "Snow Village Island",
    blocks:["snow_block","ice","spruce_log"],
    structures:["igloo","snow_house"],
    mobs:["villager"]
  },
  oceanRuins: {
    name: "Ocean Ruins Island",
    blocks:["prismarine","sea_lantern","coral"],
    structures:["ruined_portal","shipwreck_piece"],
    mobs:["drowned"]
  },
  netherFort: {
    name: "Nether Fortress Island",
    blocks:["netherrack","nether_bricks"],
    structures:["nether_fort_bridge","nether_tower"],
    mobs:["blaze","zombified_piglin"]
  },
  endShrine: {
    name: "End Shrine Island",
    blocks:["end_stone","purpur_block"],
    structures:["end_shrine","end_pillar"],
    mobs:["enderman"]
  },
  megaIsland: {
    name: "Mega Island",
    blocks:["stone","oak_log","grass_block","water"],
    structures:["mega_tree","mega_ruin","mega_tower"],
    mobs:["cow","pig","sheep","zombie"]
  },
  bossIsland: {
    name: "Boss Island",
    blocks:["obsidian","crying_obsidian","nether_bricks"],
    structures:["boss_arena","boss_spire"],
    mobs:["wither_skeleton","blaze","phantom"],
    boss:"void_reaper"
  }
};

// =====================================================
// HELPERS
// =====================================================
function getPhase() {
  return phases[Math.min(globalStage, phases.length - 1)];
}
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomIsland() {
  const keys = Object.keys(islandTemplates);
  return islandTemplates[keys[Math.floor(Math.random() * keys.length)]];
}

// =====================================================
// WEBSOCKET HANDLING
// =====================================================
wss.on("connection", ws => {
  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // PLAYER JOIN
    if (msg.type === "join") {
      players[msg.uuid] = players[msg.uuid] || { x:0, y:100, z:0 };
      ws.send(JSON.stringify({
        type:"init",
        phase:getPhase().name,
        stage:globalStage
      }));
    }

    // BREAK ONEBLOCK
    if (msg.type === "break_oneblock") {
      globalStage++;

      const phase = getPhase();
      const block = randomItem(phase.blocks);
      const rareDrop = Math.random() < 0.05 ? randomItem(phase.rare) : null;
      const mob = Math.random() < 0.15 ? randomItem(phase.mobs) : null;

      // ISLAND GENERATION EVERY 15 BREAKS
      islandCounter++;
      let island = null;
      if (islandCounter >= 15) {
        islandCounter = 0;
        island = randomIsland();
      }

      // BROADCAST UPDATE
      wss.clients.forEach(client => {
        client.send(JSON.stringify({
          type:"oneblock_update",
          phase:phase.name,
          block,
          rare:rareDrop,
          mob,
          island
        }));
      });
    }

    // MOVEMENT SYNC
    if (msg.type === "move") {
      const p = players[msg.uuid];
      p.x = msg.x;
      p.y = msg.y;
      p.z = msg.z;

      wss.clients.forEach(client => {
        client.send(JSON.stringify({
          type:"player_move",
          uuid:msg.uuid,
          x:msg.x,
          y:msg.y,
          z:msg.z
        }));
      });
    }
  });
});

server.listen(8080, () => {
  console.log("ULTRA Fancy OneBlock Server Running");
});
