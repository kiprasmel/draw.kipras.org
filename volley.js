/**
 * needed to use some fn's before `setup`.
 * see https://github.com/processing/p5.js/wiki/p5.js-overview#why-cant-i-assign-variables-using-p5-functions-and-variables-before-setup
 *
 */
new p5();

// const W = 600
// const H = 600
const W = windowWidth
const H = windowHeight
const Pdiam = 50
// const Pdiam = ((W+H)/2)/12

const netX1 = 0,
      netY = 1.5/6*H,
      //netY1 = 1.5/6*H,
      netX2 = W
      //netY2 = 1.5/6*H

// TODO: only reset positions
let resetBtn
function initResetBtn() {
  resetBtn = createButton("reset players")
  resetBtn.position(10, 10);
  resetBtn.mousePressed(reset);
  
  function reset() {
    players = getDefaultPlayers()
  }
}

let showAreaOf = {
  selectLabel: null,
  select: null,
  opt_currently_selected_player: "currently selected player",
  get_zone_opt: (zone) => `zone ${zone}`,
}
function initShowAreaOf() {
  fill(0)
  const begin = 110 + 20
  const offset = 90
  showAreaOf.label = createSpan("show area of:")
  showAreaOf.label.position(begin, 12)
  
  showAreaOf.select = createSelect("foo")
  showAreaOf.select.position(begin + offset, 10);

  const opts = [
    showAreaOf.opt_currently_selected_player,
    ...players.map(p => showAreaOf.get_zone_opt(p.zone))
  ]
  
  for (const opt of opts) {
    showAreaOf.select.option(opt);
  }
}

// player positions
// x: left = -1, middle = 0, right = 1, 
// y: top = 0, bottom = 1
//         [ x,  y]
const TL = [-1, 0],
      TM = [ 0, 0],
      TR = [ 1, 0],

      BL = [-1, 1],
      BM = [ 0, 1],
      BR = [ 1, 1]

const zone_positions = [BR, TR, TM, TL, BL, BM]

const zone2pos = (zone) => zone_positions[zone-1]

// TODO: adjust for the -1;+1 => 0;+1 change we did to `zone_positions`
const X_range_pos = [-1, 1],
      X_range_screen = [1/6*W, 5/6*W],
      Y_range_pos = [-1, 1],
      // +1 because keeping space for the "net"
      Y_range_screen = [(1+1)/6*H, 5/6*H]

const getx = (pos) => map(pos[0], ...X_range_pos, ...X_range_screen)
const gety = (pos) => map(pos[1], ...Y_range_pos, ...Y_range_screen)
const getxy = (pos) => [getx(pos), gety(pos)]
const xy2pos = (x, y) => [map(x, ...X_range_screen, ...X_range_pos),
                          map(y, ...Y_range_screen, ...Y_range_pos)]

// pos delta stuffs
const dR = [ 1,  0],
      dT = [ 0, -1],
      dL = [-1,  0],
      dB = [ 0,  1]
const pos_deltas = [dR, dT, dL, dB]
const d0 = [ 0,  0] // identity

const pos_sum = (A, B) => [A[0] + B[0], A[1] + B[1]]
const pos_sums = (...xs) => xs.reduce(pos_sum, d0)
const pos_eq = (A, B) => A[0] === B[0] && A[1] === B[1]
const pos_scale = (A, k) => [A[0] * k, A[1] * k]

/**
 * from = 1
 * to = 2
 * zone_pos_deltas[from][to] => dT => [0, -1]
 *
 * i.e., how to go from `from` to `to`
*/
const zone_pos_deltas = {
  1: { 1: d0, 2: dT,
      3: pos_sums(dT, dL), 4: pos_sums(dT, dL, dL),
      5: pos_sums(dL, dL), 6: dL },
  2: { 1: dB, 2: d0,
      3: dL, 4: pos_sums(dL, dL),
      5: pos_sums(dL, dL, dB), 6: pos_sums(dL, dB) },
  3: { 1: pos_sums(dR, dB), 2: dR,
      3: d0, 4: dL,
      5: pos_sums(dL, dB), 6: dB },
  4: { 1: pos_sums(dR, dR, dB), 2: pos_sums(dR, dR),
      3: dR, 4: d0,
      5: dB, 6: pos_sums(dB, dR) },
  5: { 1: pos_sums(dR, dR), 2: pos_sums(dR, dR, dT),
      3: pos_sums(dT, dR), 4: dT,
      5: d0, 6: dR },
  6: { 1: dR, 2: pos_sums(dR, dT),
      3: dT, 4: pos_sums(dT, dL),
      5: dL, 6: d0 },
}

function Player({ zone, connected }) {  
  this.zone = zone
  this.pos = zone2pos(zone)
  this.x = getx(this.pos)
  this.y = gety(this.pos)
  this.connected = connected
}
Player.prototype.current_pos = function() {
  return xy2pos(this.x, this.y)
}

// players
const getDefaultPlayers = () => [
  new Player({ zone: 1, connected: [2, 6]    }),
  new Player({ zone: 2, connected: [1, 3]    }),
  new Player({ zone: 3, connected: [2, 4, 6] }),
  new Player({ zone: 4, connected: [3, 5]    }),
  new Player({ zone: 5, connected: [4, 6]    }),
  new Player({ zone: 6, connected: [1, 3, 5] }),
  /*
  { _zone: 1, _pos: zone2pos(1), x: getx(BR), y: gety(BR), connected: [2, 6] },
  { _zone: 2, _pos: zone2pos(2), x: getx(TR), y: gety(TR), connected: [1, 3] },
  { _zone: 3, _pos: zone2pos(3), x: getx(TM), y: gety(TM), connected: [2, 4, 6]},
  { _zone: 4, _pos: zone2pos(4), x: getx(TL), y: gety(TL), connected: [3, 5] },
  { _zone: 5, _pos: zone2pos(5), x: getx(BL), y: gety(BL), connected: [4, 6] },
  { _zone: 6, _pos: zone2pos(6), x: getx(BM), y: gety(BM), connected: [1, 3, 5]},
  */
  /*
  { zone: 1, pos: BR, x: 5/6*W, y: 5/6*H },
  { zone: 2, pos: TR, x: 5/6*W, y: 3/6*H },
  { zone: 3, pos: TM, x: 3/6*W, y: 3/6*H },
  { zone: 4, pos: TL, x: 1/6*W, y: 3/6*H },
  { zone: 5, pos: BL, x: 1/6*W, y: 5/6*H },
  { zone: 6, pos: BM, x: 3/6*W, y: 5/6*H },
  */
]

let players = getDefaultPlayers()

let selectedPlayer
let prevMouseX
let prevMouseY
let hasPrevMouse
function initSelectedPlayerMovement() {
  selectedPlayer = null
  prevMouseX = 0
  prevMouseY = 0
  hasPrevMouse = false
}

const playersHandlers = {
  mousePressed: () => {
      selectedPlayer = findPlayerAtMouse()
  },
  mouseReleased: () => {
    initSelectedPlayerMovement()
  },
  mouseDragged: () => {
    if (!hasPrevMouse) {   
      prevMouseX = mouseX
      prevMouseY = mouseY

      hasPrevMouse = true
      return
    }

    if (selectedPlayer) {
      const dx = mouseX - prevMouseX
      const dy = mouseY - prevMouseY
      selectedPlayer.x += dx
      selectedPlayer.y += dy
    }

    prevMouseX = mouseX
    prevMouseY = mouseY
  },
  doubleClicked: () => {
    const target_player = findPlayerAtMouse()
    if (!target_player) {
      return
    }

    const new_zone_opt = showAreaOf.get_zone_opt(target_player.zone)
    const old_zone_opt = showAreaOf.select.value()

    if (new_zone_opt === old_zone_opt) {
      // un-select
      showAreaOf.select.value(showAreaOf.opt_currently_selected_player)
    } else {
      // select
      showAreaOf.select.value(new_zone_opt)
    }
  }
}

function findPlayerAtMouse() {
  // go in reverse,
  // because players are drawn in order 1-6,
  // so later ones appear on top of each other.
  // TODO: last moved higher pos?
  for (let i = players.length - 1; i >= 0; i--) {
    const p = players[i]
    const d = dist(mouseX, mouseY, p.x, p.y)

    // TODO: search all players, find min dist, pick that
    if (d <= Pdiam/2) {
      return p
    }
  }
  
  return null
}

function mousePressed() {
  playersHandlers["mousePressed"]()
}
function mouseReleased() {
  playersHandlers["mouseReleased"]()
}
function mouseDragged() {
  playersHandlers["mouseDragged"]()
}
function doubleClicked() {
  playersHandlers["doubleClicked"]()
}

function setup() {
  createCanvas(W, H)
  rectMode(CENTER)
  textAlign(CENTER, CENTER)
  
  initResetBtn()
  initSelectedPlayerMovement()
  
  initShowAreaOf()
}

function draw() {
  background(220)
  fill(255)
  
  rectMode(CENTER)
  
  drawNet()
  
  // draw connections before drawing players,
  // so that they are behind the circles (players),
  // instead of on top of them.
  drawConnectionsBetweenPlayers()
  
  // draw areas before drawing players or connections between them
  // TODO: move before connections
  drawPlayerAreas()
  
  drawPlayers()
  
}

function drawNet() {
  line(netX1, netY, netX2, netY)
}

function drawConnectionsBetweenPlayers() {
  for (let z = 1; z <= 6; z++) {
    const from = players[z-1]
    
    for (const to_z of from.connected) {
      const to = players[to_z-1]
      line(from.x, from.y, to.x, to.y)
    }
  } 
}

function drawPlayers() {
  const reset_stroke = () => {
    strokeWeight(1)
    stroke(0)
  }
  
  for (const p of players) {
    // if (showAreaOf.select.value() === showAreaOf.opt_currently_selected_player) {  
        // strokeWeight(3) 
        // stroke("#0000FF")
    // }
    
    // if (p === selectedPlayer) {
    //   // fill(255)
    // } else {
    //   // fill(250)
    // }

    if (isPlayerOutsideAreaBounds(p)) {
      fill("#FF0000")
    } else {
      fill(255)
    }
    
    circle(p.x, p.y, Pdiam)
    // reset_stroke()
    
    fill(0)
    // if (p === selectedPlayer) {
    //   textSize(16)
    // }
    text(p.zone, p.x, p.y)
    // textSize(12)
  }
}

function isPlayerOutsideAreaBounds(p) {
  const { minX, minY, maxX, maxY } = calcPlayerAreaBounds(p.pos)
  
  if (p.x > maxX || p.x < minX) {
    return true
  }
  
  if (p.y > maxY || p.y < minY) {
    return true
  }

  return false
}
    
const drawPlayerAreas = drawPlayerAreas_v2

// new
function drawPlayerAreas_v2() {
  for (const target of players) {
    if (!shouldShowAreaOfPlayer(target)) {
      continue
    }
    
    const { minX, minY, maxX, maxY } = calcPlayerAreaBounds(target.pos)
    
    const w = abs(maxX - minX)
    const h = abs(maxY - minY)
    
    fill("#00FF0060")
    rectMode(CORNER)
    rect(minX, minY, w, h)

    // function isLimitedByConnectedPlayer(target, pos_delta) {}
  }
}

function calcPlayerAreaBounds(playerPos) {
  const playerRight = playerAtPosDelta(playerPos, dR)
  const playerTop = playerAtPosDelta(playerPos, dT)
  const playerLeft = playerAtPosDelta(playerPos, dL)
  const playerBottom = playerAtPosDelta(playerPos, dB)

  const maxX = playerRight ? playerRight.x : W
  const minY = playerTop ? playerTop.y : netY // 0
  const minX = playerLeft ? playerLeft.x : 0
  const maxY = playerBottom ? playerBottom.y : H

  return { maxX, maxY, minX, minY }
}

function playerAtPosDelta(A, B) {
  const potentially_player_pos = pos_sum(A, B)
  const zone_idx = zone_positions.findIndex(zp => pos_eq(zp, potentially_player_pos))
  if (zone_idx === -1) return null
  return players[zone_idx]
}

// old
function drawPlayerAreas_v1() {
  for (let i = 0; i < players.length; i++) {
    const target = players[i]
   
    if (!shouldShowAreaOfPlayer(target)) {
      continue
    }
  
  const edges = []
  for (const pos_delta of pos_deltas) {
    const new_zone_pos_for_checking = pos_sum(target.pos, pos_delta)
    
    const matching_pos = zone_positions.find(pos => pos_eq(pos, new_zone_pos_for_checking))
    
    const isUnlimitedToDirection = !matching_pos
    
    if (isUnlimitedToDirection) {
      fill("#00FF00")
    } else {
      fill("#FFFF00")
    }
    
    const inside = getxy(target.pos)
    
    const new_pos_for_area = pos_sum(target.current_pos(), pos_delta)
    // const outside = getxy(new_pos)
    const outside = getxy(new_pos_for_area)
    
      quad( inside[0] + 10,  inside[1] - 10,
            inside[0] - 10,  inside[1] + 10, 
           outside[0] - 10, outside[1] + 10,
           outside[0] + 10, outside[1] - 10)

    edges.push(outside)
  }
  
  const proper_area_coords = rhombus_to_rect(edges)
  // fill("#0000FF40") // if allowing to draw all players
  //                     (max at once = 4 => 4*4 = 16 = F (max, so  fine))
  fill("#0000FF80")
  quad(...proper_area_coords.flat())
  
  // fill(255)
  // quad(target.x, target.y, target.x, target.y+20, )
  
  // console.log(...edges)
  // const area_before_coords = rhombus_to_rect(edges)
  // const area_coords = area_before_coords.map(pos => getxy(pos))
  // fill(255)
  // quad(...area_coords.flat())
  // // console.log(...area_before_coords)

  
  }
}
  // currently, in `edges`, we have the coordinates of the middle of the edges,
  // instead of the edges of the area we want to draw.
  // i.e., if we drew a rectangle (quad) from the coords,
  // we'd get a diamond/rhombus, and we want a rectangle instead.
  //
  // to fix this, we need to swap some pairs of the coordinates.
  // is this called a "matrix transpose"?
  //
  // after a bit of drawing, seems like some sort of different way
  // of what i call "shape rotation", i don't think it's matrix transpose,
  // but something of similar kind.
  //
  // upd: see vid rec, or https://notes.kipras.org/public.html#jw033LvvT
  //
  //
  // order of the `pos_deltas` matters here.
  function rhombus_to_rect(coords) {
      const A = coords[0],
            B = coords[1],
            C = coords[2],
            D = coords[3]
      
      const A2 = [A[0], B[1]],
            B2 = [C[0], B[1]],
            C2 = [C[0], D[1]],
            D2 = [A[0], D[1]]
      
      return [
        A2,
        B2,
        C2,
        D2,
      ]
  }
   
    function shouldShowAreaOfPlayer(target) {
      const show_area_of = showAreaOf.select.value()
          
      if (show_area_of === showAreaOf.opt_currently_selected_player) {
      // show if currently selected
      
      if (!selectedPlayer) {
        return false
      }
      if (target.zone !== selectedPlayer.zone) {
        return false
      }
        
    } else {
      // show if correct zone
      
      if (show_area_of !== showAreaOf.get_zone_opt(target.zone)) {
        // wrong zone
        return false
      }
    }
    
      return true  
      
    // if (!selectedPlayer) {
    //   // DEBUG
    //   // if (target.zone !== 2) continue  
    //   continue
    // } else {
    //   if (!selectedPlayer || target.zone !== selectedPlayer.zone) continue  
    // }
    }
  
