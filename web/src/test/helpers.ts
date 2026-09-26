import { vi } from "vitest";
import type { Catalog, Player } from "@/lib/types";

export const REGIONS: Catalog["regions"] = [
  { id: "vila", name: "VILA LOCALHOST", tag: "HUB", minLevel: 1, description: "hub" },
  { id: "floresta", name: "FLORESTA DE LOGS", tag: "EXPLORAR", minLevel: 1, description: "logs" },
  { id: "mercado", name: "MERCADO DE PACOTES", tag: "LOJA", minLevel: 2, description: "pacotes" },
  { id: "caverna", name: "CAVERNA DOS BUGS", tag: "COMBATE", minLevel: 5, description: "bugs" },
  { id: "torre", name: "TORRE DE DEPLOY", tag: "CHEFE", minLevel: 8, description: "torre" },
  { id: "nuvem", name: "PICOS DA NUVEM", tag: "ENDGAME", minLevel: 12, description: "nuvem" },
];

export const DEPLOY_TYPES: Catalog["deployTypes"] = [
  { id: "backend", name: "BACKEND", glyph: "$_" },
  { id: "frontend", name: "FRONTEND", glyph: "</>" },
  { id: "mobile", name: "MOBILE", glyph: "[]" },
  { id: "database", name: "BANCO DE DADOS", glyph: "##" },
  { id: "microservices", name: "MICROSSERVIÇOS", glyph: "::" },
];

export const DEPLOY_LEVELS: Catalog["deployLevels"] = [
  { level: 1, minLevel: 1, minutes: 15, xp: 80, coins: 40, gems: 0 },
  { level: 2, minLevel: 3, minutes: 30, xp: 150, coins: 70, gems: 1 },
  { level: 3, minLevel: 6, minutes: 60, xp: 260, coins: 110, gems: 2 },
  { level: 4, minLevel: 10, minutes: 180, xp: 420, coins: 180, gems: 4 },
  { level: 5, minLevel: 15, minutes: 360, xp: 700, coins: 300, gems: 8 },
];

export const SKILL_TREES: Catalog["skillTrees"] = [
  { id: "frontend", name: "FRONTEND", nodes: [
    { id: "f1", glyph: "</>", name: "MARKUP SEMÂNTICO", description: "+10 HP máximo permanente", bonus: { type: "hp", amount: 10 } },
    { id: "f2", glyph: "{}", name: "GRID MASTER", description: "+8 SP máximo em combate", bonus: { type: "sp", amount: 8 } },
    { id: "f3", glyph: "~", name: "MOTION", description: "+10% de dano em todos os ataques", bonus: { type: "dmg", amount: 10 } },
  ] },
  { id: "backend", name: "BACKEND", nodes: [
    { id: "b1", glyph: "$_", name: "API REST", description: "+10 HP máximo permanente", bonus: { type: "hp", amount: 10 } },
    { id: "b2", glyph: "[]", name: "CAMADA DE CACHE", description: "+10 SP máximo em combate", bonus: { type: "sp", amount: 10 } },
    { id: "b3", glyph: "##", name: "FILA DE EVENTOS", description: "+12% de dano em todos os ataques", bonus: { type: "dmg", amount: 12 } },
  ] },
  { id: "infra", name: "INFRA", nodes: [
    { id: "i1", glyph: ">_", name: "SHELL SCRIPT", description: "+8 SP máximo em combate", bonus: { type: "sp", amount: 8 } },
    { id: "i2", glyph: "::", name: "CONTAINERS", description: "+15 HP máximo permanente", bonus: { type: "hp", amount: 15 } },
    { id: "i3", glyph: "^", name: "AUTO-SCALING", description: "+15% de dano em todos os ataques", bonus: { type: "dmg", amount: 15 } },
  ] },
];

export const ENEMIES: Catalog["enemies"] = [
  { id: "vila", region: "vila", name: "NULL SLIME", level: 3, hp: 60, sp: 50, weakness: "null-check", drop: "null_shard", glyph: "(0x0)" },
  { id: "floresta", region: "floresta", name: "LOG WISP", level: 5, hp: 70, sp: 55, weakness: "referência circular", drop: "log_essence", glyph: "(~.~)" },
];

export const COMMANDS: Catalog["commands"] = [
  { id: "fix", label: "FIX", hint: "corrige o bug", cost: 10, damage: [14, 20] },
  { id: "test", label: "TEST", hint: "expõe a fraqueza", cost: 8, exposesWeakness: true },
  { id: "refactor", label: "REFACTOR", hint: "recupera 18 HP", cost: 14, heal: 18 },
  { id: "plain", label: "PLAIN", hint: "defende e recupera 3 SP", cost: 0, shield: true, spGain: 3 },
  { id: "f1", label: "</> MARKUP", hint: "golpe limpo", cost: 12, damage: [12, 14], skill: "f1" },
  { id: "b2", label: "[] CACHE", hint: "recupera 24 HP", cost: 16, heal: 24, skill: "b2" },
  { id: "rollback", label: "ROLLBACK", hint: "volta para o mapa", cost: 0, flee: true },
];

export const ITEMS: Catalog["items"] = [
  { id: "null_shard", name: "FRAGMENTO NULL", glyph: "0x0", rarity: "COMUM", description: "resto de slime" },
  { id: "log_essence", name: "ESSÊNCIA DE LOG", glyph: "</>", rarity: "COMUM", description: "resto de wisp" },
  { id: "corrupt_dep", name: "DEPENDÊNCIA CORROMPIDA", glyph: "!pkg", rarity: "INCOMUM", description: "resto de pacote" },
  { id: "wild_trace", name: "STACK TRACE SELVAGEM", glyph: "{!}", rarity: "INCOMUM", description: "resto de exceção" },
  { id: "race_core", name: "NÚCLEO DE CONCORRÊNCIA", glyph: "//", rarity: "RARO", description: "resto de race" },
  { id: "memory_crystal", name: "CRISTAL DE MEMÓRIA", glyph: "^^", rarity: "LENDÁRIO", description: "resto de leak" },
  { id: "sp_potion", name: "POÇÃO DE CACHE", glyph: "++", rarity: "COMUM", description: "30 SP", restore: { stat: "sp", amount: 30 }, price: { currency: "gems", amount: 15 } },
  { id: "hp_potion", name: "POÇÃO DE MEMÓRIA", glyph: "HP+", rarity: "COMUM", description: "40 HP", restore: { stat: "hp", amount: 40 }, price: { currency: "gems", amount: 12 } },
  { id: "boost_deploy", name: "ACELERADOR DE DEPLOY", glyph: ">>", rarity: "COMUM", description: "-15 min", price: { currency: "gems", amount: 35 } },
  { id: "redesign_token", name: "TOKEN DE REDESIGN", glyph: "<~>", rarity: "RARO", description: "Troca o corpo do seu dev (masculino/feminino). Consumido ao usar no AVATAR.", price: { currency: "gems", amount: 100 } },
];

export const GEAR_SLOTS: Catalog["gearSlots"] = [
  { id: "setup", name: "CONFIGURAÇÃO" },
  { id: "bebida", name: "BEBIDA" },
  { id: "vestuario", name: "VESTUÁRIO" },
  { id: "acessorio", name: "ACESSÓRIO" },
];

export const GEAR: Catalog["gear"] = [
  { id: "macbook", name: "MACBOOK PRO", glyph: "[Mac]", slot: "setup", rarity: "RARO", description: "compila sem travar", price: { currency: "gems", amount: 120 }, bonus: { type: "dmg", amount: 8 }, look: { part: "laptop", option: "laptop_macbook" } },
  { id: "monitor", name: "MONITOR ULTRAWIDE", glyph: "[==]", slot: "setup", rarity: "LENDÁRIO", description: "mais tela", price: { currency: "gems", amount: 200 }, bonus: { type: "sp", amount: 20 } },
  { id: "cafe", name: "CAFÉ EXPRESSO", glyph: "{C}", slot: "bebida", rarity: "COMUM", description: "cafeína", price: { currency: "coins", amount: 50 }, bonus: { type: "sp", amount: 12 } },
  { id: "moletom", name: "MOLETOM CONFORTÁVEL", glyph: "[[]]", slot: "vestuario", rarity: "COMUM", description: "conforto", price: { currency: "coins", amount: 70 }, bonus: { type: "hp", amount: 15 }, look: { part: "top", option: "top_moletom_gear" } },
  { id: "cadeira", name: "CADEIRA ERGONÔMICA", glyph: "[|]", slot: "vestuario", rarity: "RARO", description: "postura", price: { currency: "gems", amount: 150 }, bonus: { type: "hp", amount: 30 } },
  { id: "fone", name: "FONE COM CANCELAMENTO", glyph: "((o))", slot: "acessorio", rarity: "INCOMUM", description: "foco", price: { currency: "gems", amount: 90 }, bonus: { type: "dmg", amount: 6 } },
  // Copied by value from api/catalog/shop.json (forge C29 asserts the same values).
  { id: "caneca_log", name: "CANECA DE LOGS", glyph: "[u]", slot: "bebida", rarity: "INCOMUM", description: "Café coado no filtro de stack trace.", bonus: { type: "sp", amount: 16 } },
  { id: "hoodie_trace", name: "MOLETOM STACK TRACE", glyph: "{#}", slot: "vestuario", rarity: "RARO", description: "Cada linha do erro costurada à mão.", bonus: { type: "hp", amount: 36 }, look: { part: "top", option: "top_hoodie_trace" } },
  { id: "teclado_race", name: "TECLADO RACE CONDITION", glyph: "[kbd]", slot: "acessorio", rarity: "LENDÁRIO", description: "As teclas chegam antes de você apertar.", bonus: { type: "dmg", amount: 12 } },
];

export const SKINS: Catalog["skins"] = [
  { id: "default", name: "DEV PADRÃO", rarity: "PADRÃO", description: "visual clássico", palette: {}, price: { currency: "gems", amount: 0 }, bonus: null },
  { id: "neon", name: "DEV NEON", rarity: "INCOMUM", description: "ciano", palette: {tone: ["#1a6a70", "#2a9aa0", "#5ad2d2", "#a0f4f0"], hairColor: ["#6a1a4a", "#9c2a6c", "#d04a98", "#f080c0"], eyes: ["#0c3060", "#1450a0", "#2a78d0", "#62a8f0"]}, price: { currency: "gems", amount: 60 }, bonus: { type: "dmg", amount: 5 } },
  { id: "shadow", name: "DEV SOMBRIO", rarity: "RARO", description: "roxa", palette: {tone: ["#3a2a5a", "#54407e", "#7058a2", "#9478c4"], hairColor: ["#0c0818", "#1a1030", "#2a1c48", "#3e2c66"], eyes: ["#2e3640", "#4a5460", "#6c7884", "#98a4b0"]}, price: { currency: "gems", amount: 80 }, bonus: { type: "sp", amount: 10 } },
  { id: "golden", name: "DEV DOURADO", rarity: "LENDÁRIO", description: "dourada", palette: {tone: ["#886018", "#c08c20", "#f0c040", "#fce484"], hairColor: ["#a08a50", "#c8b070", "#e8d498", "#fff4c8"], eyes: ["#6a4210", "#946018", "#be8424", "#e0aa40"]}, price: { currency: "gems", amount: 150 }, bonus: { type: "hp", amount: 20 } },
];

export const OFFICE: Catalog["office"] = {
  zones: [
    { id: "parede", name: "PAREDE", cells: 8 },
    { id: "piso", name: "PISO", cells: 24 },
  ],
  furniture: [
    { id: "mesa", name: "MESA EM L", glyph: "[==]", color: "#ffc93c", zone: "piso", price: { currency: "coins", amount: 60 }, comfort: 8, bonus: { type: "xp", amount: 3 }, description: "Espaço para dois monitores e o café." },
    { id: "cadeira_gamer", name: "CADEIRA GAMER", glyph: "[|]", color: "#e05252", zone: "piso", price: { currency: "gems", amount: 40 }, comfort: 10, bonus: { type: "spregen", amount: 1 }, description: "Plantão de madrugada sem dor nas costas." },
    { id: "setup2", name: "SETUP 2 TELAS", glyph: "][", color: "#45b7ff", zone: "piso", price: { currency: "gems", amount: 90 }, comfort: 14, bonus: { type: "deploy", amount: 5 }, description: "Build de um lado, log do outro." },
    { id: "rack", name: "RACK CASEIRO", glyph: "::", color: "#6bd425", zone: "piso", price: { currency: "gems", amount: 70 }, comfort: 9, bonus: { type: "deploy", amount: 6 }, description: "Servidor local zumbindo no canto." },
    { id: "cafeteira", name: "CAFETEIRA", glyph: "{C}", color: "#ffc93c", zone: "piso", price: { currency: "coins", amount: 55 }, comfort: 7, bonus: { type: "spregen", amount: 2 }, description: "Combustível renovável do dev." },
    { id: "estante", name: "ESTANTE DE LIVROS", glyph: "|||", color: "#b46cf0", zone: "piso", price: { currency: "coins", amount: 45 }, comfort: 6, bonus: { type: "xp", amount: 2 }, description: "Documentação que ninguém lê, mas inspira." },
    { id: "planta", name: "PLANTA DE CANTO", glyph: "^", color: "#6bd425", zone: "piso", price: { currency: "coins", amount: 25 }, comfort: 5, bonus: null, description: "Oxigênio e um pouco de sanidade." },
    { id: "tapete", name: "TAPETE PIXELADO", glyph: "##", color: "#8b6cf0", zone: "piso", price: { currency: "coins", amount: 30 }, comfort: 4, bonus: null, description: "Aquece a sala e abafa o teclado." },
    { id: "neon", name: "LETREIRO NEON", glyph: "~~", color: "#45b7ff", zone: "parede", price: { currency: "gems", amount: 35 }, comfort: 12, bonus: null, description: "IT WORKS ON MY MACHINE em ciano." },
    { id: "poster", name: "PÔSTER RETRÔ", glyph: "[#]", color: "#ffc93c", zone: "parede", price: { currency: "coins", amount: 20 }, comfort: 4, bonus: null, description: "Key art do DevServer emoldurada." },
    { id: "kanban", name: "QUADRO KANBAN", glyph: "[+]", color: "#dbeeff", zone: "parede", price: { currency: "coins", amount: 50 }, comfort: 5, bonus: { type: "xp", amount: 2 }, description: "Post-its que viram sprint." },
    { id: "janela", name: "JANELA COM VISTA", glyph: "[/]", color: "#8fc3e8", zone: "parede", price: { currency: "gems", amount: 60 }, comfort: 15, bonus: null, description: "Luz natural entre dois deploys." },
  ],
  levels: [
    { min: 0, name: "CANTINHO" },
    { min: 30, name: "HOME OFFICE" },
    { min: 70, name: "ESTÚDIO" },
    { min: 120, name: "LAB DEV" },
    { min: 180, name: "SEDE DEVSERVE" },
  ],
  maxDeployCut: 40,
};

/** An office with the given cells filled: room({ piso: { 0: "mesa" }, parede: { 1: "neon" } }). */
export function room(filled: { parede?: Record<number, string>; piso?: Record<number, string> } = {}): Player["office"] {
  const zone = (n: number, cells: Record<number, string> = {}) => Array.from({ length: n }, (_, i) => cells[i] ?? null);
  return { parede: zone(8, filled.parede), piso: zone(24, filled.piso) };
}

// Copied by value from api/catalog/rack.json (api C1 asserts the same values).
export const RACK: Catalog["rack"] = {
  slots: 6,
  stats: [
    { id: "power", name: "POWER", color: "#45b7ff", base: 20, max: 100, step: 10, bonus: "dmg" },
    { id: "ram", name: "RAM", color: "#6bd425", base: 15, max: 100, step: 5, bonus: "sp" },
    { id: "uptime", name: "UPTIME", color: "#ffc93c", base: 60, max: 99, step: 1, bonus: "coins" },
  ],
  components: [
    { id: "cpu", name: "CPU 8-CORE", glyph: "::", color: "#45b7ff", price: { currency: "coins", amount: 80 }, effects: [{ stat: "power", amount: 25 }] },
    { id: "ram", name: "RAM 32GB", glyph: "[]", color: "#6bd425", price: { currency: "coins", amount: 60 }, effects: [{ stat: "ram", amount: 30 }] },
    { id: "ssd", name: "SSD NVME", glyph: "=", color: "#ffc93c", price: { currency: "coins", amount: 70 }, effects: [{ stat: "power", amount: 12 }, { stat: "uptime", amount: 8 }] },
    { id: "cache", name: "CACHE REDIS", glyph: "~", color: "#e05252", price: { currency: "coins", amount: 90 }, effects: [{ stat: "power", amount: 18 }] },
    { id: "lb", name: "LOAD BALANCER", glyph: ">>", color: "#b46cf0", price: { currency: "coins", amount: 120 }, effects: [{ stat: "uptime", amount: 20 }] },
    { id: "gpu", name: "GPU EDGE", glyph: "#", color: "#45b7ff", price: { currency: "coins", amount: 150 }, effects: [{ stat: "power", amount: 40 }] },
  ],
};

/** A rack with the given slots filled: rack({ 1: "gpu" }). */
export function rack(filled: Record<number, string> = {}): Player["rack"] {
  return Array.from({ length: 6 }, (_, i) => filled[i] ?? null);
}

// Copied by value from api/catalog/forge.json (forge C29 asserts the same values).
export const RECIPES: Catalog["recipes"] = [
  { id: "forja_cache", output: { kind: "item", id: "sp_potion" }, ingredients: [{ item: "null_shard", quantity: 2 }] },
  { id: "forja_memoria", output: { kind: "item", id: "hp_potion" }, ingredients: [{ item: "log_essence", quantity: 2 }] },
  { id: "forja_acelerador", output: { kind: "item", id: "boost_deploy" }, ingredients: [{ item: "corrupt_dep", quantity: 1 }, { item: "wild_trace", quantity: 1 }], price: { currency: "coins", amount: 20 } },
  { id: "forja_caneca", output: { kind: "gear", id: "caneca_log" }, ingredients: [{ item: "log_essence", quantity: 3 }, { item: "null_shard", quantity: 2 }], price: { currency: "coins", amount: 40 } },
  { id: "forja_hoodie", output: { kind: "gear", id: "hoodie_trace" }, ingredients: [{ item: "wild_trace", quantity: 3 }, { item: "corrupt_dep", quantity: 2 }], price: { currency: "coins", amount: 80 } },
  { id: "forja_teclado", output: { kind: "gear", id: "teclado_race" }, ingredients: [{ item: "race_core", quantity: 2 }, { item: "memory_crystal", quantity: 1 }, { item: "wild_trace", quantity: 3 }], price: { currency: "coins", amount: 150 } },
];

// Copied by value from api/catalog/avatar.json (api catalog tests assert the same values).
export const AVATAR: Catalog["avatar"] = {
  bodies: [
    {"id": "masculino", "name": "MASCULINO"},
    {"id": "feminino", "name": "FEMININO", "defaults": {"eyes": "eyes_cinza", "hair": "hair_rabo", "hairColor": "hair_castanho", "bottomColor": "bottom_preto"}},
  ],
  parts: [
    {"id": "tone", "name": "PELE", "kind": "color"},
    {"id": "eyes", "name": "OLHOS", "kind": "color"},
    {"id": "hair", "name": "CABELO", "kind": "style"},
    {"id": "hairColor", "name": "COR DO CABELO", "kind": "color"},
    {"id": "beard", "name": "BARBA", "kind": "style"},
    {"id": "glasses", "name": "ÓCULOS", "kind": "style"},
    {"id": "top", "name": "ROUPA", "kind": "style", "gearSlot": "vestuario"},
    {"id": "topColor", "name": "COR DA ROUPA", "kind": "color"},
    {"id": "bottomColor", "name": "CALÇA", "kind": "color"},
    {"id": "laptop", "name": "NOTEBOOK", "kind": "style", "gearSlot": "setup"},
  ],
  options: [
    {"id": "tone_clara", "part": "tone", "name": "CLARA", "ramp": ["#b07858", "#d8a07c", "#f8cfa8", "#ffe8cc"]},
    {"id": "tone_padrao", "part": "tone", "name": "PADRÃO", "ramp": ["#8a5234", "#b8764a", "#f6ba72", "#ffd8a0"]},
    {"id": "tone_morena", "part": "tone", "name": "MORENA", "ramp": ["#6e3e22", "#9a6038", "#c88a58", "#e4b07c"]},
    {"id": "tone_parda", "part": "tone", "name": "PARDA", "ramp": ["#5a3018", "#80492a", "#a8683e", "#c88c5c"]},
    {"id": "tone_negra", "part": "tone", "name": "NEGRA", "ramp": ["#3a1e10", "#5a3220", "#7c4a30", "#9c6844"]},
    {"id": "tone_retinta", "part": "tone", "name": "RETINTA", "ramp": ["#24120a", "#3a2014", "#553222", "#704834"]},
    {"id": "eyes_castanho", "part": "eyes", "name": "CASTANHO", "ramp": ["#3a2010", "#5c3418", "#7e4c26", "#a06a3a"]},
    {"id": "eyes_preto", "part": "eyes", "name": "PRETO", "ramp": ["#101014", "#1c1c24", "#2a2a34", "#3a3a46"]},
    {"id": "eyes_azul", "part": "eyes", "name": "AZUL", "ramp": ["#0c3060", "#1450a0", "#2a78d0", "#62a8f0"]},
    {"id": "eyes_verde", "part": "eyes", "name": "VERDE", "ramp": ["#0e4020", "#1a6630", "#2e8c44", "#56b464"]},
    {"id": "eyes_mel", "part": "eyes", "name": "MEL", "ramp": ["#6a4210", "#946018", "#be8424", "#e0aa40"]},
    {"id": "eyes_cinza", "part": "eyes", "name": "CINZA", "ramp": ["#2e3640", "#4a5460", "#6c7884", "#98a4b0"]},
    {"id": "hair_espetado", "part": "hair", "name": "ESPETADO", "layer": "hair-espetado"},
    {"id": "hair_curto", "part": "hair", "name": "CURTO", "layer": "hair-curto"},
    {"id": "hair_careca", "part": "hair", "name": "CARECA", "layer": "hair-careca"},
    {"id": "hair_longo", "part": "hair", "name": "LONGO", "layer": "hair-longo"},
    {"id": "hair_cacheado", "part": "hair", "name": "CACHEADO", "layer": "hair-cacheado"},
    {"id": "hair_coque", "part": "hair", "name": "COQUE", "layer": "hair-coque"},
    {"id": "hair_moicano", "part": "hair", "name": "MOICANO", "layer": "hair-moicano", "price": {"currency": "gems", "amount": 30}},
    {"id": "hair_topete", "part": "hair", "name": "TOPETE", "layer": "hair-topete", "price": {"currency": "gems", "amount": 30}},
    {"id": "hair_rabo", "part": "hair", "name": "RABO DE CAVALO", "layer": "hair-rabo", "bodies": ["feminino"]},
    {"id": "hair_trancas", "part": "hair", "name": "TRANÇAS", "layer": "hair-trancas", "bodies": ["feminino"], "price": {"currency": "gems", "amount": 30}},
    {"id": "hair_franja", "part": "hair", "name": "FRANJA CHANEL", "layer": "hair-franja", "bodies": ["feminino"]},
    {"id": "hair_preto", "part": "hairColor", "name": "PRETO", "ramp": ["#141420", "#24242e", "#34343e", "#4a4a56"]},
    {"id": "hair_castanho", "part": "hairColor", "name": "CASTANHO", "ramp": ["#2a160c", "#462814", "#643c20", "#88562e"]},
    {"id": "hair_loiro", "part": "hairColor", "name": "LOIRO", "ramp": ["#8a6420", "#b88a2c", "#e0b44a", "#f8dc84"]},
    {"id": "hair_ruivo", "part": "hairColor", "name": "RUIVO", "ramp": ["#5a1a0c", "#8a2c14", "#b8461e", "#de6a30"]},
    {"id": "hair_grisalho", "part": "hairColor", "name": "GRISALHO", "ramp": ["#4a4e56", "#70767e", "#9ca2aa", "#cfd4da"]},
    {"id": "hair_azul", "part": "hairColor", "name": "AZUL", "ramp": ["#0a2a66", "#12449c", "#2066d0", "#4c96f0"], "price": {"currency": "coins", "amount": 80}},
    {"id": "hair_rosa", "part": "hairColor", "name": "ROSA", "ramp": ["#6a1a4a", "#9c2a6c", "#d04a98", "#f080c0"], "price": {"currency": "coins", "amount": 80}},
    {"id": "hair_verde", "part": "hairColor", "name": "VERDE NEON", "ramp": ["#1a4a08", "#2e7410", "#4ea41c", "#7cd23a"], "price": {"currency": "coins", "amount": 80}},
    {"id": "beard_nenhuma", "part": "beard", "name": "SEM BARBA"},
    {"id": "beard_bigode", "part": "beard", "name": "BIGODE", "layer": "beard-bigode", "bodies": ["masculino"]},
    {"id": "beard_cavanhaque", "part": "beard", "name": "CAVANHAQUE", "layer": "beard-cavanhaque", "bodies": ["masculino"]},
    {"id": "beard_curta", "part": "beard", "name": "BARBA CURTA", "layer": "beard-curta", "bodies": ["masculino"]},
    {"id": "beard_cheia", "part": "beard", "name": "BARBA CHEIA", "layer": "beard-cheia", "bodies": ["masculino"]},
    {"id": "beard_lenhador", "part": "beard", "name": "BARBA LENHADOR", "layer": "beard-lenhador", "bodies": ["masculino"], "price": {"currency": "gems", "amount": 30}},
    {"id": "glasses_nenhum", "part": "glasses", "name": "SEM ÓCULOS"},
    {"id": "glasses_redondo", "part": "glasses", "name": "REDONDO", "layer": "glasses-redondo", "fixed": true},
    {"id": "glasses_quadrado", "part": "glasses", "name": "QUADRADO", "layer": "glasses-quadrado", "fixed": true},
    {"id": "glasses_escuro", "part": "glasses", "name": "ÓCULOS ESCUROS", "layer": "glasses-escuro", "fixed": true},
    {"id": "glasses_cyber", "part": "glasses", "name": "VISOR CYBER", "layer": "glasses-cyber", "fixed": true, "price": {"currency": "gems", "amount": 40}},
    {"id": "top_moletom", "part": "top", "name": "MOLETOM", "layer": "top-moletom"},
    {"id": "top_camiseta", "part": "top", "name": "CAMISETA", "layer": "top-camiseta"},
    {"id": "top_xadrez", "part": "top", "name": "CAMISA XADREZ", "layer": "top-xadrez"},
    {"id": "top_jaqueta", "part": "top", "name": "JAQUETA DE COURO", "layer": "top-jaqueta", "fixed": true, "price": {"currency": "coins", "amount": 150}},
    {"id": "top_moletom_gear", "part": "top", "name": "MOLETOM CONFORTÁVEL", "layer": "top-moletom_gear", "fixed": true, "gearOnly": true},
    {"id": "top_hoodie_trace", "part": "top", "name": "MOLETOM STACK TRACE", "layer": "top-hoodie_trace", "fixed": true, "gearOnly": true},
    {"id": "top_grafite", "part": "topColor", "name": "GRAFITE", "ramp": ["#202030", "#2c3838", "#383844", "#4c4c5a"]},
    {"id": "top_azul", "part": "topColor", "name": "AZUL", "ramp": ["#102040", "#1a3464", "#284c88", "#3c68ac"]},
    {"id": "top_vinho", "part": "topColor", "name": "VINHO", "ramp": ["#3a0c18", "#5a1426", "#7c2036", "#9c3048"]},
    {"id": "top_verde", "part": "topColor", "name": "VERDE", "ramp": ["#10301a", "#1a4a28", "#286a3a", "#3a8a4e"]},
    {"id": "top_mostarda", "part": "topColor", "name": "MOSTARDA", "ramp": ["#5a4210", "#80601a", "#a88026", "#cca238"]},
    {"id": "top_branco", "part": "topColor", "name": "BRANCO", "ramp": ["#8a929a", "#b0b8c0", "#d4dade", "#eef2f4"]},
    {"id": "bottom_jeans", "part": "bottomColor", "name": "JEANS", "ramp": ["#121e36", "#1e364e", "#2a4e66", "#3e6a86"]},
    {"id": "bottom_preto", "part": "bottomColor", "name": "PRETO", "ramp": ["#0e0e14", "#18181f", "#24242c", "#32323c"]},
    {"id": "bottom_caqui", "part": "bottomColor", "name": "CÁQUI", "ramp": ["#4a3c22", "#6a5832", "#8c7646", "#ae965e"]},
    {"id": "bottom_cinza", "part": "bottomColor", "name": "CINZA", "ramp": ["#2a2e34", "#40464e", "#5a626a", "#7a828a"]},
    {"id": "laptop_basico", "part": "laptop", "name": "NOTEBOOK", "layer": "laptop-basico", "fixed": true},
    {"id": "laptop_preto", "part": "laptop", "name": "NOTEBOOK PRETO", "layer": "laptop-preto", "fixed": true},
    {"id": "laptop_gamer", "part": "laptop", "name": "NOTEBOOK GAMER RGB", "layer": "laptop-gamer", "fixed": true, "price": {"currency": "gems", "amount": 40}},
    {"id": "laptop_macbook", "part": "laptop", "name": "MACBOOK PRO", "layer": "laptop-macbook", "fixed": true, "gearOnly": true},
  ],
  defaults: {"tone": "tone_padrao", "eyes": "eyes_castanho", "hair": "hair_espetado", "hairColor": "hair_preto", "beard": "beard_nenhuma", "glasses": "glasses_nenhum", "top": "top_moletom", "topColor": "top_grafite", "bottomColor": "bottom_jeans", "laptop": "laptop_basico"},
};

export const CATALOG: Catalog = {
  version: "v1", regions: REGIONS, deployTypes: DEPLOY_TYPES, deployLevels: DEPLOY_LEVELS, skillTrees: SKILL_TREES,
  enemies: ENEMIES, commands: COMMANDS, items: ITEMS,
  combat: { counter: [7, 14], spRegen: 5, weaknessMultiplier: 1.8, victory: { xp: 90, coins: 40, gems: 1 }, dropChance: 65, potionChance: 30, potion: "sp_potion" },
  gearSlots: GEAR_SLOTS, gear: GEAR, skins: SKINS, avatar: AVATAR, office: OFFICE, rack: RACK, recipes: RECIPES,
};

export function player(overrides: Partial<Player> = {}): Player {
  return {
    devName: "DEV_01", class: "BACKEND", level: 1, xp: 0, xpMax: 500, hp: 100, hpMax: 100,
    coins: 100, gems: 20, skillPoints: 1, region: "vila", skin: "default", skills: [], inventory: [{ item: "sp_potion", quantity: 2 }],
    gear: [], equipment: { setup: null, bebida: null, vestuario: null, acessorio: null }, skins: ["default"], office: room(), rack: rack(), body: "masculino", appearance: { ...AVATAR.defaults }, looks: [], ...overrides,
  };
}

export function json(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Route = Response | (() => Response | Promise<Response>);

/** Stubs fetch with a table of "METHOD /path" -> response; unknown calls fail the test. */
export function mockFetch(routes: Record<string, Route>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${(init?.method ?? "GET").toUpperCase()} ${String(input)}`;
    const route = routes[key];
    if (!route) throw new Error(`unexpected fetch ${key}`);
    const res = typeof route === "function" ? await route() : route;
    return res.clone();
  });
  vi.stubGlobal("fetch", fn);
  return {
    fn,
    calls: (key: string) =>
      fn.mock.calls.filter(([input, init]) => `${(init?.method ?? "GET").toUpperCase()} ${String(input)}` === key).length,
  };
}
