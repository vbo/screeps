'use strict';

let config = require('config');

function setTowerFiller(room) {
  let exits = _.map(Game.map.describeExits(room.name));

  room.memory.position.creep.towerfiller = [];

  for (let index = 0; index < CONTROLLER_STRUCTURES.tower[8] - 1; index++) {
    let roomName = exits[index % exits.length];
    if (!roomName) {
      break;
    }
    for (let offsetDirection = 2; offsetDirection < 7; offsetDirection += 4) {
      let linkSet = false;
      let towerFillerSet = false;
      let positionsFound = false;
      let path = Room.stringToPath(room.memory.routing['pathStart' + '-' + roomName].path);
      for (let pathIndex = path.length - 1; pathIndex >= 1; pathIndex--) {
        let posPath = path[pathIndex];
        let posPathObject = new RoomPosition(posPath.x, posPath.y, posPath.roomName);
        let posPathNext = path[pathIndex - 1];

        let directionNext = posPathObject.getDirectionTo(posPathNext.x, posPathNext.y, posPathNext.roomName);

        let offset = (directionNext + offsetDirection - 1) % 8 + 1;
        let pos = posPathObject.buildRoomPosition(offset);
        if (pos.x <= 4 || pos.x >= 45 || pos.y <= 4 || pos.y >= 45) {
          continue;
        }

        if (pos.inPositions()) {
          continue;
        }

        if (pos.inPath()) {
          continue;
        }

        let terrain = pos.lookFor(LOOK_TERRAIN)[0];
        if (terrain == 'wall') {
          break;
        }

        if (!linkSet) {
          room.memory.position.structure.link.push(pos);
          linkSet = true;
          continue;
        }
        if (!towerFillerSet) {
          room.memory.position.creep.towerfiller.push(pos);
          towerFillerSet = true;
          continue;
        }
        room.memory.position.structure.tower.push(pos);
        positionsFound = true;
        break;
      }

      if (positionsFound) {
        break;
      }
    }
  }
}

function setStructures(room, path, costMatrixBase) {

  setTowerFiller(room);

  let pathI;
  for (pathI in path) {
    let pathPos = new RoomPosition(path[pathI].x, path[pathI].y, room.name);
    let structurePosIterator = pathPos.findNearPosition();
    for (let structurePos of structurePosIterator) {
      if (structurePos.setSpawn(pathPos, path[+pathI + 1])) {
        room.memory.position.structure.spawn.push(structurePos);
        costMatrixBase.set(structurePos.x, structurePos.y, config.layout.structureAvoid);
        continue;
      }
      if (structurePos.setExtension()) {
        room.memory.position.structure.extension.push(structurePos);
        costMatrixBase.set(structurePos.x, structurePos.y, config.layout.structureAvoid);
        continue;
      }
      if (room.memory.position.structure.spawn.length < CONTROLLER_STRUCTURES.spawn[8] && room.memory.position.structure.extension.length < CONTROLLER_STRUCTURES.extension[8]) {
        continue;
      }

      // TODO Build labs, terminal, nuker ... at the path to extractor / mineral or the next path which diverge from the harvester path
      if (room.memory.position.structure.tower.length < CONTROLLER_STRUCTURES.tower[8]) {
        room.memory.position.structure.tower.push(structurePos);
        costMatrixBase.set(structurePos.x, structurePos.y, config.layout.structureAvoid);
        continue;
      }
      if (room.memory.position.structure.lab.length < CONTROLLER_STRUCTURES.lab[8]) {
        room.memory.position.structure.lab.push(structurePos);
        costMatrixBase.set(structurePos.x, structurePos.y, config.layout.structureAvoid);
        continue;
      }
      if (room.memory.position.structure.nuker.length < CONTROLLER_STRUCTURES.nuker[8]) {
        room.memory.position.structure.nuker.push(structurePos);
        costMatrixBase.set(structurePos.x, structurePos.y, config.layout.structureAvoid);
        continue;
      }
      if (room.memory.position.structure.observer.length < CONTROLLER_STRUCTURES.observer[8]) {
        room.memory.position.structure.observer.push(structurePos);
        costMatrixBase.set(structurePos.x, structurePos.y, config.layout.structureAvoid);
        continue;
      }
      if (room.memory.position.structure.terminal.length < CONTROLLER_STRUCTURES.terminal[8]) {
        room.memory.position.structure.terminal.push(structurePos);
        costMatrixBase.set(structurePos.x, structurePos.y, config.layout.structureAvoid);
        room.memory.position.pathEnd = [pathPos];
        continue;
      }
      if (room.memory.position.structure.link.length < CONTROLLER_STRUCTURES.link[8]) {
        room.memory.position.structure.link.push(structurePos);
        costMatrixBase.set(structurePos.x, structurePos.y, config.layout.structureAvoid);
        continue;
      }


      if (room.memory.position.structure.spawn.length < CONTROLLER_STRUCTURES.spawn[8] ||
        room.memory.position.structure.extension.length < CONTROLLER_STRUCTURES.extension[8] ||
        room.memory.position.structure.tower.length < CONTROLLER_STRUCTURES.tower[8] ||
        room.memory.position.structure.link.length < CONTROLLER_STRUCTURES.link[8] ||
        room.memory.position.structure.observer.length < CONTROLLER_STRUCTURES.observer[8] ||
        room.memory.position.structure.lab.length < CONTROLLER_STRUCTURES.lab[8] ||
        room.memory.position.structure.terminal.length < CONTROLLER_STRUCTURES.terminal[8] ||
        room.memory.position.structure.nuker.length < CONTROLLER_STRUCTURES.nuker[8]) {
        room.log('Structures not found: ' +
          'spawns: ' + room.memory.position.structure.spawn.length + ' ' +
          'extensions: ' + room.memory.position.structure.extension.length + ' ' +
          'towers: ' + room.memory.position.structure.tower.length + ' ' +
          'links: ' + room.memory.position.structure.link.length + ' ' +
          'observer: ' + room.memory.position.structure.observer.length + ' ' +
          'lab: ' + room.memory.position.structure.lab.length + ' ' +
          'terminal: ' + room.memory.position.structure.terminal.length + ' ' +
          'nuker: ' + room.memory.position.structure.nuker.length
        );
        continue;
      }
      if (!room.memory.position.pathEnd) {
        room.log('Room not completly build');
      }
      //      let pathIndex = _.findIndex(path, i => i.x == room.memory.position.pathEnd[0].x && i.y == room.memory.position.pathEnd[0].y);
      //      room.memory.position.path = path.slice(0, pathIndex);
      //      return positions;
      console.log('All structures set: ' + pathI);
      return pathI;
    }
  }
  room.memory.costMatrix.base = costMatrixBase.serialize();

  return -1;
}

let buildCostMatrix = function(room) {
  delete room.memory.routing;
  room.memory.costMatrix = {};

  // TODO adapt updatePosition => init Position and set the costmatrix
  let costMatrixBase = room.updatePosition();

  for (let id in room.memory.position.creep) {
    let pos = room.memory.position.creep[id];
    costMatrixBase.set(pos.x, pos.y, config.layout.creepAvoid);
  }
  for (let id in room.memory.position.structure) {
    let poss = room.memory.position.structure[id];
    for (let pos of poss) {
      if (!pos) {
        room.log('costmatrix.buildCostMatrix not pos: ' + id + ' ' + JSON.stringify(poss));
        continue;
      }
      costMatrixBase.set(pos.x, pos.y, 0xFF);
    }
  }
  room.memory.costMatrix.base = costMatrixBase.serialize();

  let exits = Game.map.describeExits(room.name);
  if (room.controller) {
    // TODO which first minerals or sources? Maybe order by length of path
    let minerals = room.find(FIND_MINERALS);
    for (let mineral of minerals) {
      let route = [{
        room: room.name
      }];
      let path = room.getPath(route, 0, 'pathStart', mineral.id, true);
      for (let pos of path) {
        costMatrixBase.set(pos.x, pos.y, config.layout.pathAvoid);
      }
      room.memory.costMatrix.base = costMatrixBase.serialize();
    }

    for (let endDir in exits) {
      let end = exits[endDir];
      let route = [{
        room: room.name
      }, {
        room: end
      }];
      let path = room.getPath(route, 0, 'pathStart', undefined, true);
      for (let pos of path) {
        costMatrixBase.set(pos.x, pos.y, config.layout.pathAvoid);
      }
      room.memory.costMatrix.base = costMatrixBase.serialize();
    }
    return costMatrixBase;
  }


  for (let startDir in exits) {
    let start = exits[startDir];
    for (let endDir in exits) {
      let end = exits[endDir];
      if (start == end) {
        continue;
      }
      let route = [{
        room: start
      }, {
        room: room.name
      }, {
        room: end
      }];
      let path = room.getPath(route, 1, undefined, undefined, true);
      for (let pos of path) {
        costMatrixBase.set(pos.x, pos.y, config.layout.pathAvoid);
      }
      room.memory.costMatrix.base = costMatrixBase.serialize();
    }
  }
  return costMatrixBase;
};

let flags = function(room, index) {
  let pathName = Object.keys(room.memory.routing)[index];
  let path = Room.stringToPath(room.memory.routing[pathName].path);
  console.log(pathName, JSON.stringify(path));
  for (let posIndex in path) {
    let pos = path[posIndex];
    let returnCode = room.createFlag(pos.x, pos.y);
  }

};

let setup = function(room) {
  delete room.memory.constants;
  room.log('costmatrix.setup called');
  room.memory.controllerLevel = {};

  let costMatrixBase = buildCostMatrix(room);
  //  room.memory.position = {
  //    creep: {}
  //  };

  // TODO find longest path, calculate vert-/horizontal as 2 (new structures) and diagonal as 4

  let sorter = function(object) {
    let last_pos;
    let value = 0;
    for (let pos of Room.stringToPath(object.path)) {
      let valueAdd = 0;
      if (!last_pos) {
        last_pos = new RoomPosition(pos.x, pos.y, pos.roomName);
        continue;
      }
      let direction = last_pos.getDirectionTo(pos.x, pos.y, pos.roomName);
      if (direction % 2 === 0) {
        valueAdd += 2;
      } else {
        valueAdd += 4;
      }

      for (let x = -1; x < 2; x++) {
        for (let y = -1; y < 2; y++) {
          let wall = new RoomPosition(pos.x + x, pos.y + y, pos.roomName);
          let terrains = wall.lookFor(LOOK_TERRAIN);
          if (terrains == 'wall') {
            valueAdd *= 0.5; // TODO some factor
          }
        }
      }

      value += valueAdd;

      last_pos = new RoomPosition(pos.x, pos.y, pos.roomName);

    }
    return value;
  };

  let paths_controller = _.filter(room.memory.routing, function(object, key) {
    return key.startsWith('pathStart-');
  });
  let paths_sorted = _.sortBy(paths_controller, sorter);
  let path = JSON.parse(JSON.stringify(paths_sorted[paths_sorted.length - 1]));
  let pathList = Room.stringToPath(path.path);
  let pathI = setStructures(room, pathList, costMatrixBase);
  console.log('path: ' + path.name + ' pathI: ' + pathI + ' length: ' + pathList.length);
  room.memory.routing['pathStart-harvester'] = path;
  room.memory.routing['pathStart-harvester'].path = Room.pathToString(pathList.slice(0, pathI));
  room.memory.position.version = config.layout.version;

  for (let structureId in room.memory.position.structure) {
    let structures = room.memory.position.structure[structureId];
    for (let pos of structures) {
      costMatrixBase.set(pos.x, pos.y, config.layout.structureAvoid);
    }
  }
  room.memory.costMatrix.base = costMatrixBase.serialize();

};


module.exports = {

  setup: function(name) {
    let room = Game.rooms[name];
    return setup(room);
  },

  flags: function(name, index) {
    let room = Game.rooms[name];
    return flags(room, index);
  },

  clearFlags: function(name) {
    let room = Game.rooms[name];
    let flags = room.find(FIND_FLAGS);
    for (let flag of flags) {
      flag.remove();
    }
  }
};
