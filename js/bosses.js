/* ==== ONLY CONSTANT HERE ==== */
const BOSSES = [

  /* ==== MONDSTADT – NORMAL ==== */
  { id:"anemo_hypostasis",      name:"Anemo Hypostasis",    type:"normal",  region:"Mondstadt",   imageBase:"images/bosses/Anemo Hypostasis",     drops:["boss_Hurricane Seed"],              location:"Stormbearer Mountains",elements: ["anemo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"cryo_hypostasis",       name:"Cryo Hypostasis",     type:"normal",  region:"Mondstadt",   imageBase:"images/bosses/Cryo Hypostasis",      drops:["boss_Crystalline Bloom"],           location:"Stormbearer Mountains",elements: ["cryo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"cryo_regisvine",        name:"Cryo Regisvine",      type:"normal",  region:"Mondstadt",   imageBase:"images/bosses/Cryo Regisvine",       drops:["boss_Hoarfrost Core"],              location:"Stormbearer Mountains",elements: ["cryo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"electro_hypostasis",    name:"Electro Hypostasis",  type:"normal",  region:"Mondstadt",   imageBase:"images/bosses/Electro Hypostasis",   drops:["boss_Lightning Prism"],             location:"Stormbearer Mountains",elements: ["electro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },


  /* ==== LIYUE – NORMAL ==== */
  { id:"geo_hypostasis",        name:"Geo Hypostasis",      type:"normal",  region:"Liyue",       imageBase:"images/bosses/Geo Hypostasis",       drops:["boss_Basalt Pillar"],               location:"Wuwang Hill",       elements: ["geo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"oceanid",               name:"Oceanid",             type:"normal",  region:"Liyue",       imageBase:"images/bosses/Oceanid",              drops:["boss_Cleansing Heart"],             location:"Wuwang Hill",       elements: ["hydro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"primo_geovishap",       name:"Primo Geovishap",     type:"normal",  region:"Liyue",       imageBase:"images/bosses/Primo Geovishap",      drops:["boss_Juvenile Jade"],               location:"Wuwang Hill",       elements: ["electro", "geo", "cryo", "pyro", "hydro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"pyro_regisvine",        name:"Pyro Regisvine",      type:"normal",  region:"Liyue",       imageBase:"images/bosses/Pyro Regisvine",       drops:["boss_Everflame Seed"],              location:"Wuwang Hill",       elements: ["pyro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"ruin_serpent",          name:"Ruin Serpent",        type:"normal",  region:"Liyue",       imageBase:"images/bosses/Ruin Serpent",         drops:["boss_Runic Fang"],                  location:"Wuwang Hill",       elements: ["geo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"solitary_suanni",       name:"Solitary Suanni",     type:"normal",  region:"Liyue",       imageBase:"images/bosses/Solitary Suanni",      drops:["boss_Cloudseam Scale"],             location:"Wuwang Hill",       elements: ["hydro", "anemo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },


  /* ==== INAZUMA – NORMAL ==== */
  { id:"bathysmal_vishap_herd", name:"Bathysmal Vishap Herd",type:"normal",  region:"Inazuma",     imageBase:"images/bosses/Bathysmal Vishap Herd",drops:["boss_Dragonheir's False Fin"],      location:"",                  elements: ["cryo", "electro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"golden_wolflord",       name:"Golden Wolflord",     type:"normal",  region:"Inazuma",     imageBase:"images/bosses/Golden Wolflord",      drops:["boss_Riftborn Regalia"],            location:"",                  elements: ["geo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"hydro_hypostasis",      name:"Hydro Hypostasis",    type:"normal",  region:"Inazuma",     imageBase:"images/bosses/Hydro Hypostasis",     drops:["boss_Dew of Repudiation"],          location:"",                  elements: ["hydro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"maguu_kenki",           name:"Maguu Kenki",         type:"normal",  region:"Inazuma",     imageBase:"images/bosses/Maguu Kenki",          drops:["boss_Marionette Core"],             location:"",                  elements: ["cryo", "anemo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"perpetual_mechanical_array",name:"Perpetual Mechanical Array",type:"normal",  region:"Inazuma",     imageBase:"images/bosses/Perpetual Mechanical Array",drops:["boss_Perpetual Heart"],             location:"",                  elements: ["geo", "cryo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"pyro_hypostasis",       name:"Pyro Hypostasis",     type:"normal",  region:"Inazuma",     imageBase:"images/bosses/Pyro Hypostasis",      drops:["boss_Smoldering Pearl"],            location:"",                  elements: ["pyro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"thunder_manifestation", name:"Thunder Manifestation",type:"normal",  region:"Inazuma",     imageBase:"images/bosses/Thunder Manifestation",drops:["boss_Storm Beads"],                 location:"",                  elements: ["electro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },


  /* ==== SUMERU – NORMAL ==== */
  { id:"aeonblight_drake",      name:"Aeonblight Drake",    type:"normal",  region:"Sumeru",      imageBase:"images/bosses/Aeonblight Drake",     drops:["boss_Perpetual Caliber"],           location:"",                  elements: ["cryo", "hydro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"algorithm_of_semi-intransient_matrix_of_overseer_network",name:"Algorithm of Semi-Intransient Matrix of Overseer Network",type:"normal",  region:"Sumeru",      imageBase:"images/bosses/Algorithm of Semi-Intransient Matrix of Overseer Network",drops:["boss_Light Guiding Tetrahedron"],   location:"",                  elements: ["pyro", "anemo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"dendro_hypostasis",     name:"Dendro Hypostasis",   type:"normal",  region:"Sumeru",      imageBase:"images/bosses/Dendro Hypostasis",    drops:["boss_Quelled Creeper"],             location:"",                  elements: ["dendro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"electro_regisvine",     name:"Electro Regisvine",   type:"normal",  region:"Sumeru",      imageBase:"images/bosses/Electro Regisvine",    drops:["boss_Thunderclap Fruitcore"],       location:"",                  elements: ["electro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"iniquitous_baptist",    name:"Iniquitous Baptist",  type:"normal",  region:"Sumeru",      imageBase:"images/bosses/Iniquitous Baptist",   drops:["boss_Evergloom Ring"],              location:"",                  elements: ["electro", "cryo", "pyro", "hydro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"jadeplume_terrorshroom",name:"Jadeplume Terrorshroom",type:"normal",  region:"Sumeru",      imageBase:"images/bosses/Jadeplume Terrorshroom",drops:["boss_Majestic Hooked Beak"],        location:"",                  elements: ["dendro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"setekh_wenut",          name:"Setekh Wenut",        type:"normal",  region:"Sumeru",      imageBase:"images/bosses/Setekh Wenut",         drops:["boss_Pseudo-Stamens"],              location:"",                  elements: ["anemo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },


  /* ==== FONTAINE – NORMAL ==== */
  { id:"icewind_suite",         name:"Icewind Suite (Coppelia & Coppelius)",type:"normal",  region:"Fontaine",    imageBase:"images/bosses/Icewind Suite",        drops:["boss_Artificed Spare Clockwork Component - Coppelia","boss_Artificed Spare Clockwork Component - Coppelius"],location:"",                  elements: ["cryo", "anemo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"emperor_of_fire_and_iron",name:"Emperor of Fire and Iron",type:"normal",  region:"Fontaine",    imageBase:"images/bosses/Emperor of Fire and Iron",drops:["boss_Emperor's Resolution"],        location:"",                  elements: ["pyro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"experimental_field_generator",name:"Experimental Field Generator",type:"normal",  region:"Fontaine",    imageBase:"images/bosses/Experimental Field Generator",drops:["boss_Tourbillon Device"],           location:"",                  elements: ["geo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"millennial_pearl_seahorse",name:"Millennial Pearl Seahorse",type:"normal",  region:"Fontaine",    imageBase:"images/bosses/Millennial Pearl Seahorse",drops:["boss_Fontemer Unihorn"],            location:"",                  elements: ["electro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"hydro_tulpa",           name:"Hydro Tulpa",         type:"normal",  region:"Fontaine",    imageBase:"images/bosses/Hydro Tulpa",          drops:["boss_Water That Failed to Transcend"],location:"",                  elements: ["hydro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"legatus_golem",         name:"Legatus Golem",       type:"normal",  region:"Fontaine",    imageBase:"images/bosses/Legatus Golem",        drops:["boss_Fragment of a Golden Melody"], location:"",                  elements: ["geo", "pyro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },


  /* ==== NATLAN – NORMAL ==== */
  { id:"goldflame_qucusaur_tyrant",name:"Goldflame Qucusaur Tyrant",type:"normal",  region:"Natlan",      imageBase:"images/bosses/Goldflame Qucusaur Tyrant",drops:["boss_Mark of the Binding Blessing"],location:"",                  elements: ["pyro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"gluttonous_yumkasaur_mountain_king",name:"Gluttonous Yumkasaur Mountain King",type:"normal",  region:"Natlan",      imageBase:"images/bosses/Gluttonous Yumkasaur Mountain King",drops:["boss_Overripe Flamegranate"],       location:"",                  elements: ["dendro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"secret_source_automaton_configuration_device",name:"Secret Source Automaton Configuration Device",type:"normal",  region:"Natlan",      imageBase:"images/bosses/Secret Source Automaton Configuration Device",drops:["boss_Gold-Inscribed Secret Source Core"],location:"",                  elements: ["electro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"tenebrous_papilla",     name:"Tenebrous Papilla",   type:"normal",  region:"Natlan",      imageBase:"images/bosses/Tenebrous Papilla",    drops:["boss_Ensnaring Gaze"],              location:"",                  elements: ["electro", "anemo", "pyro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"wayward_hermetic_spiritspeaker",name:"Wayward Hermetic Spiritspeaker",type:"normal",  region:"Natlan",      imageBase:"images/bosses/Wayward Hermetic Spiritspeaker",drops:["boss_Talisman of the Enigmatic Land"],location:"",                  elements: ["cryo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"lava_dragon_statue",    name:"Lava Dragon Statue",  type:"normal",  region:"Natlan",      imageBase:"images/bosses/Lava Dragon Statue",   drops:["boss_Sparkless Statue Core"],       location:"",                  elements: ["pyro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"secret_source_automaton:_overseer_device",name:"Secret Source Automaton: Overseer Device",type:"normal",  region:"Natlan",      imageBase:"images/bosses/Secret Source Automaton Overseer Device",drops:["boss_Secret Source Airflow Accumulator"],location:"",                  elements: ["hydro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },


  /* ==== NOD-KRAI – NORMAL ==== */
  { id:"knuckle_duckle",        name:"Knuckle Duckle",      type:"normal",  region:"Nod-Krai",    imageBase:"images/bosses/Knuckle Duckle",       drops:["boss_Precision Kuuvahki Stamping Die"],location:"",                  elements: ["electro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"radiant_moonfly",       name:"Radiant Moonfly",     type:"normal",  region:"Nod-Krai",    imageBase:"images/bosses/Radiant Moonfly",      drops:["boss_Lightbearing Scale-Feather"],  location:"",                  elements: ["dendro", "pyro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },


  /* ==== MONDSTADT – WEEKLY ==== */
  { id:"dvalin",                name:"Stormterror Dvalin",  type:"weekly",  region:"Mondstadt",   imageBase:"images/bosses/Stormterror Dvalin",   drops:["weekly_dvalin1","weekly_dvalin2","weekly_dvalin3"],elements: ["anemo", "electro", "hydro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"boreas",                name:"Andrius",             type:"weekly",  region:"Mondstadt",   imageBase:"images/bosses/Andrius",              drops:["weekly_boreas1","weekly_boreas2","weekly_boreas3"],elements: ["cryo", "geo", "pyro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"childe",                name:"Childe",              type:"weekly",  region:"Mondstadt",   imageBase:"images/bosses/Childe",               drops:["weekly_Childe1","weekly_Childe2","weekly_Childe3"],elements: ["hydro", "electro", "cryo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"azhdaha",               name:"Azhdaha",             type:"weekly",  region:"Mondstadt",   imageBase:"images/bosses/Azhdaha",              drops:["weekly_Azhdaha1","weekly_Azhdaha2","weekly_Azhdaha3"],elements: ["hydro", "electro", "geo"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop" }
   ],
   teams: [
     {
       name: "National (Raiden Variant)",
       members: [
         { name: "Raiden", role: "Main DPS" },
         { name: "Xiangling", role: "Off-field Pyro" },
         { name: "Xingqiu", role: "Off-field Hydro" },
         { name: "Bennett", role: "ATK/Heal" }
       ],
     }
   ]
    },

  { id:"signora",               name:"La Signora",          type:"weekly",  region:"Mondstadt",   imageBase:"images/bosses/La Signora",           drops:["weekly_Signora1","weekly_Signora2","weekly_Signora3"],elements: ["cryo", "pyro"],
    guide:[
    { text:"Neutralize Sheer Cold & Blazing Heat", substeps:[
      "While fighting La Signora your characters will be affected by Sheer Cold or Blazing Heat in their respective phases. Use or destroy the Hearts of Flame/Eyes of Frost at the corners of the room to keep yourself warm/cool.",
      "You should also take note that some of La Signora's skills leave a trail of Cryo and Pyro that cause damage over time, and being hit by her skills increases the accumulation of Sheer Cold and Blazing Heat."
    ]},
    { text:"Destroy the Ice Barrier with the Crimson Lotus Moth", substeps:[
      "When La Signora reaches a certain amount of HP in her first phase, she will shield herself in a pillar of Cryo. Use Elemental attacks and gather Crimson Lotus Moths to quickly destroy the barrier."
    ]}
   ],
   teams: [
     {
       name: "",
       members: [
         { name: "Yoimiya" },
         { name: "Bennett" },
         { name: "Kokomi" },
         { name: "Zhongli" }
       ],
     },
     {
       name: "",
       members: [
         { name: "Nahida" },
         { name: "Kokomi" },
         { name: "Shinobu" },
         { name: "Zhongli" }
       ],
     },
     {
       name: "",
       members: [
         { name: "Alhaitham" },
         { name: "Raiden" },
         { name: "Shinobu" },
         { name: "Zhongli" }
       ],
     },
     {
       name: "",
       members: [
         { name: "Itto" },
         { name: "Gorou" },
         { name: "Bennett" },
         { name: "Zhongli" }
       ],
     },
     {
       name: "",
       members: [
         { name: "Noelle" },
         { name: "Xiangling" },
         { name: "Xingqiu" },
         { name: "Barbara" }
       ],
     }
   ]
    },

  { id:"shogun",                name:"Raiden Shogun",       type:"weekly",  region:"Mondstadt",   imageBase:"images/bosses/Raiden Shogun",        drops:["weekly_Shogun1","weekly_Shogun2","weekly_Shogun3"],elements: ["electro"],
    guide:[
    { text:"Be Wary of Attacks that Spawn on the Field", substeps:[
      "There are two main attacks that you need to keep an eye out for before the Raiden Shogun Enters Baleful Shadowlord form. These attacks will summon field units that will leave the Raiden Shogun defenseless if you destroy it on time."
    ]},
    { text:"Quickly Destroy the Magatsu Electroculi", substeps:[
      "Look out for when she summons the Magatsu Electroculi. Ready your Elemental Skills before it spawn as the Electroculi disappears quick. Failing to destroy it damages the area around it!"
    ]},
    { text:"Find and Defeat the Special Illusion", substeps:[
      "The real Raiden Shogun will do an X-shaped attack while the other 3 illusions that will do a single line attack.",
      "You'll need to do this when the boss creates 4 identical copies of herself. Each illusion doesn't have a lot of health and finding the right one will put her into an exposed state for you to freely do damage."
    ]},
    { text:"Focus on Surviving Through Baleful Shadowlord Form", substeps:[
      "The Baleful Shadowlord Form is an unavoidable phase for the fight. The Electro Shield on the Raiden Shogun will deplete on its own, but dealing any type of damage can help deplete it faster and will also recharge your Energy!",
      "Once the shields reaches zero, she will take increased damage and be open to attack. If the Raiden Shogun isn't defeated by then, the fight will cycle through the whole process again."
    ]},
    { text:"Attack the Flowers of Remembrance to Avoid KO", substeps:[
      "When the Raiden Shogun summons a colossal arm, you will need to attack the Flowers of Remembrance to create a dome shield. Doing this will prevent your active character from being hit by her 1-hit KO attack!",
      "You'll know when to do this when the Raiden Shogun exclaims ''Witness the final calamity''!"
    ]}
   ],
   teams: [
     {
       name: "",
       members: [
         { name: "Raiden" },
         { name: "Xingqiu" },
         { name: "Xiangling" },
         { name: "Bennett" }
       ],
     }
   ]
    },

  { id:"scaramouche",           name:"Scaramouche",         type:"weekly",  region:"Mondstadt",   imageBase:"images/bosses/Scaramouche",          drops:["weekly_Scaramouche1","weekly_Scaramouche2","weekly_Scaramouche3"],elements: ["electro", "anemo", "hydro"],
    guide:[
    { text:"Charge Up the Neo Akasha Terminal using Energy Blocks", substeps:[
      "To defeat Scaramouche, you must collect Energy Blocks generated from his attacks to charge up the Neo Akasha Terminal.",
      "The Neo Akasha Terminal is a device used during battle to immobilize or deal DMG to Shouki no Kami."
    ]},
    { text:"During the first phase, there will be circular pads on the floor you can step on called Elemental Matrices. Fully charge the Neo Akasha Terminal and use it on the pads to generate the following effects:", substeps:[
      "Pyro: Clears the Raw Frost effect from the ground.",
      "Cryo: Clears the Remnant Flame effect from the ground.",
      "Anemo: Creates a wind current you can use to avoid Scaramouche's large scale attacks.",
      "Hydro: Creates a continous healing effect.",
      "Electro: Immobilizes Shouki no Kami. You will have to activate two of them in order for it to work."
    ]},
    { text:"Deplete the Shield on the Second Phase", substeps:[
      "Using a fully charged Neo Akasha Terminal during the second phase will replace your Elemental Skill with a powerful attack that can deal a huge chunk of DMG.",
      "Hold the Skill and aim it on the enemy to unleash a green blast."
    ]},
    { text:"Destroy the Nirvana Engines using Elemental Attacks", substeps:[
      "When Scaramouche's shield in the second phase has been destroyed, attack the Nirvana Engines using Pyro, Cryo, and Dendro to charge up the Akasha Terminal. Once charged up, use it to unleash a blast that can immobilize Shouki no Kami.",
      "Failure to do so will have one of your party members killed by the Setsuna Shoumetsu attack."
    ]}
   ],
   teams: [
     {
       name: "",
       members: [
         { name: "Ganyu" },
         { name: "Nahida" },
         { name: "Bennett" },
         { name: "Zhongli" }
       ],
     }
   ]
    },

  { id:"apep",                  name:"Apep",                type:"weekly",  region:"Mondstadt",   imageBase:"images/bosses/Apep",                 drops:["weekly_Apep1","weekly_Apep2","weekly_Apep3"],elements: ["dendro"],
    guide:[
    { text:"1st Phase: Warden of the Last Oasis", substeps:[
      "The first phase of the boss is the simplest phase to finish. Simply dish out your strongest attacks and avoid Apep's attacks that can hit on a wide range."
    ]},
    { text:"2nd Phase: Heart of Oasis. Fill Up Meter by Defeating Enemies", substeps:[
      "After defeating the boss in the first phase, you will be tasked to defeat monsters in the area to fill up the Heart of Oasis.",
      "The Heart of Oasis will lose its stored up energy when attacked, so do your best to defend it."
    ]},
    { text:"Prioritize Larger Enemies", substeps:[
      "Some of the larger monsters will defend the smaller ones by providing them with shields or healing. Focus on taking out the larger enemies first to destroy the monsters' defenses.",
      "Larger enemies will provide a larger amount to fill up the Heart of Oasis when defeated."
    ]},
    { text:"3rd Phase: Warden of Oasis Prime. Avoid Aftershocks using Shields of Revival's Hymn", substeps:[
      "When Apep is about to summon Aftershocks of the Apocalypse, hide under the Shields of Revival's Hymn to avoid taking massive damage."
    ]}
   ],
   teams: [
     {
       name: "",
       members: [
         { name: "Raiden" },
         { name: "Xingqiu" },
         { name: "Xiangling" },
         { name: "Bennett" }
       ],
     }
   ]
    },


  /* ==== FONTAINE – WEEKLY ==== */
  { id:"narwhal",               name:"All-Devouring Narwhal",type:"weekly",  region:"Fontaine",    imageBase:"images/bosses/All-Devouring Narwhal",drops:["weekly_Narwhal1","weekly_Narwhal2","weekly_Narwhal3"],elements: ["hydro"],
    guide:[
    { text:"Wait Until the Narwhal Rises", substeps:[
      "At the beginning of the boss fight, the Narwhal will remain underwater and will show up in a few seconds. Only use your strongest attacks when it resurfaces to deal as much DMG as possible without wasting your energy."
    ]},
    { text:"Use Pneuma or Ousia Attacks to Destroy Eye of Maelstrom", substeps:[
      "When the Eye of Maelstrom shows up, use Pneuma or Ousia attacks on it to attract the Narwhal as soon as possible. The Narwhal will devour your character and have them fight against the Dark Shadow."
    ]},
    { text:"Use Pneuma or Ousia Attacks to Interrupt the Dark Shadow", substeps:[
      "The Dark Shadow can summon smaller creatures that can attack your characters in different directions. You can prevent this by using Pneuma or Ousia attacks when a prompt shows up to immobilize the Dark Shadow.",
      "After defeating the Dark Shadow, the Narwhal will fall into an immobilized state and will take increased DMG from attacks."
    ]}
   ],
   teams: [
     {
       name: "",
       members: [
         { name: "Lyney" },
         { name: "Zhongli" },
         { name: "Xiangling" },
         { name: "Bennett" }
       ],
     }
   ]
    },


  /* ==== MONDSTADT – WEEKLY ==== */
  { id:"knave",                 name:"The Knave",           type:"weekly",  region:"Mondstadt",   imageBase:"images/bosses/The Knave",            drops:["weekly_Knave1","weekly_Knave2","weekly_Knave3"],elements: ["pyro"],
    guide:[
    { text:"The Knave Has Two Forms", substeps:[
      "Like all the other Harbingers we've fought so far, Arlecchino has 2 forms. Her first form consists of leaps and melee strikes, and her second form will increase her agility and dexterity, enabling her to execute longer attack strings.",
      "She will also be able to fly around the battlefield, evading several of your attacks, while sending forth powerful projectiles. Pay attention to her attack patterns and prediction lines and avoid them as best you can!"
    ]},
    { text:"Clear Bond of Life to Gain Scarlet Nighttide", substeps:[
      "A large number of the Knave's attacks will inflict you with a Bond of Life status that will absorb any healing for it to be cleared, and will add to any incoming DMG.",
      "However, clearing it will bestow your next Charged Attack with Scarlet Nighttide, which will deal massive True DMG to the Knave and leave her open for attacks!"
    ]},
    { text:"Clear Bond of Life to Interrupt Bloodtide Banquet", substeps:[
      "The Knave's strongest attack, Bloodtide Banquet, will bestow Bond on Life to your characters as she starts casting it. To counteract this, clear the Bond of Life status and use a Charged Attack to interrupt it.",
      "This will leave the Knave vulnerable for a short period of time, allowing you to stack up on damage and unleash all your Elemental Bursts as necessary!"
    ]}
   ],
   teams: [
     {
       name: "",
       members: [
         { name: "Neuvillette" },
         { name: "Kazuha" },
         { name: "Furina" },
         { name: "Zhongli" }
       ],
     },
     {
       name: "",
       members: [
         { name: "Wriothesley" },
         { name: "Shenhe" },
         { name: "Kokomi" },
         { name: "Zhongli" }
       ],
     },
     {
       name: "",
       members: [
         { name: "Raiden" },
         { name: "Nahida" },
         { name: "Furina" },
         { name: "Baizhu" }
       ],
     }
   ]
    },

  { id:"eroded",                name:"Lord of Eroded Primal Fire",type:"weekly",  region:"Mondstadt",   imageBase:"images/bosses/Lord of Eroded Primal Fire",drops:["weekly_Eroded1","weekly_Eroded2","weekly_Eroded3"],elements: ["pyro"],
    guide:[
    { text:"Use Characters' Nightsoul Blessing", substeps:[
      "The Lord of Eroded Primal Fire is stationary most of the time. Still, it will periodically summon three pillars, three Tenebrous Mimiflora, or shield itself with Void Ward, which is a shield used by Tenebrous Mimiflora and Tenebrous Papilla.",
      "When the boss summons either of those three things, remember to use characters who use Nightsoul's Blessing to give you a strategic advantage against the dragon."
    ]},
    { text:"Destroy the Three Pillars With Nightsoul Blessing", substeps:[
      "You need to destroy the three pillars, that will be summoned on the battlefield, with Nightsoul Blessing attacks. Destroying all three pillars will stun the Lord of Eroded Primal Fire for a short time, giving you the chance to go all out against it."
    ]},
    { text:"Be Mindful of the Battlefield", substeps:[
      "Although the Lord of Eroded Primal Fire doesn't move around that much compared to other bosses, it can use its sword to slice off a portion of the battlefield from time to time. It can do this for a total of three times.",
      "This gives you not much ground to dodge and move around, so you always need to be mindful of how much of the battlefield is left."
    ]}
   ],
   teams: [
     {
       name: "Team 1",
       members: [
         { name: "Mavuika" },
         { name: "Citlali" },
         { name: "Xilonen" },
         { name: "Bennett" }
       ],
     },
     {
       name: "Team 2",
       members: [
         { name: "Mualani" },
         { name: "Candace" },
         { name: "Mavuika" },
         { name: "Xilonen" }
       ],
     },
     {
       name: "Team 3",
       members: [
         { name: "Kinich" },
         { name: "Emilie" },
         { name: "Mavuika" },
         { name: "Bennett" }
       ],
     },
     {
       name: "Team 4",
       members: [
         { name: "Chasca" },
         { name: "Furina" },
         { name: "Ororon" },
         { name: "Bennett" }
       ],
     },
     {
       name: "Team 5",
       members: [
         { name: "Navia" },
         { name: "Traveler Pyro" },
         { name: "Kachina" },
         { name: "Bennett" }
       ],
     }
   ]
    },

  { id:"game",                  name:"The Game Before the Gate",type:"weekly",  region:"Mondstadt",   imageBase:"images/bosses/The Game Before the Gate",drops:["weekly_Game1","weekly_Game2","weekly_Game3"],elements: ["pyro", "hydro", "electro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop", substeps:[
      "One of the King's phases is to hover on top of a Bishop while it navigates the field, dealing damage in an X shape wherever it goes.",
      "Simply overwhelm it with Cryo or Pyro to force the King off and stagger him."
    ]},
    { text:"Defeat The Queen Piece", substeps:[
      "As the King is about to take Lethal damage, the Queen will take his place and fight you. She is not much more of a threat than the King was, so she can be brute-forced and defeated.",
      "Once the Queen goes down, the King will reappear, staggered, allowing you to hit it to proceed to Phase 2."
    ]},
    { text:"Freeze The King's Lethal Blow", substeps:[
      "At some point after the initial attacks, the King and Queen will gather together in the center where the King will raise his sword and charge up a huge attack.",
      "Apply Hydro and Cryo to the King to stack Freeze on him until he comes Frozen. This will promptly abort its attack and deal heavy Physical damage onto it."
    ]},
    { text:"What Happens If You Ignore It", substeps:[
      "The King unleashes an arena-wide sword slam, instantly killing the on-field character. This cannot be i-framed by the Elemental Bursts of the party."
    ]},
    { text:"Freeze The Queen's Lethal Blow in Phase 2", substeps:[
      "Further into the fight, the King will jump to the edge and start charging at the player while the Queen prepares an arena-wide Lethal Blow.",
      "The gimmick here is to Freeze the Queen and bait the King into bumping into the Queen. In most cases this will kill the Queen and allow you to finish the King off."
    ]},
    { text:"What Happens If You Ignore It", substeps:[
      "Similar to the King's Lethal Blow, this is a oneshot and cannot be nullified by i-frames."
    ]}
   ],
   teams: [
     {
       name: "Team 1",
       members: [
         { name: "Wriothesley" },
         { name: "Furina" },
         { name: "Shenhe" },
         { name: "Escoffier" }
       ],
     },
     {
       name: "Team 2",
       members: [
         { name: "Ayaka" },
         { name: "Shenhe" },
         { name: "Kazuha" },
         { name: "Kokomi" }
       ],
     },
     {
       name: "Team 3",
       members: [
         { name: "Kaeya" },
         { name: "Diona" },
         { name: "Xingqiu" },
         { name: "Sucrose" }
       ],
     }
   ]
    },


  /* ==== NOD-KRAI – WEEKLY ==== */
  { id:"doctor",                name:"The Doctor",          type:"weekly",  region:"Nod-Krai",    imageBase:"images/bosses/The Doctor",           drops:["weekly_Dottore1","weekly_Dottore2","weekly_Dottore3"],elements: ["cryo", "hydro", "electro"],
    guide:[
    { text:"Bait The King Onto The Pawns", substeps:[
      "One of the King's attacks during the first Phase is to summon three Pawns that function like towers, shooting the player on the square they are standing on. While this is happening, the King will be rolling around on a Rook from one end of the battlefield to the other.",
      "To beat this, position yourself in a way where the King bumps himself against the Pawns and destroys them. Do this three times and the King will be thrown off-balanced and staggered for a time."
    ]},
    { text:"Apply Cryo or Pyro Onto The Bishop", substeps:[
      "One of the King's phases is to hover on top of a Bishop while it navigates the field, dealing damage in an X shape wherever it goes.",
      "Simply overwhelm it with Cryo or Pyro to force the King off and stagger him."
    ]},
    { text:"Defeat The Queen Piece", substeps:[
      "As the King is about to take Lethal damage, the Queen will take his place and fight you. She is not much more of a threat than the King was, so she can be brute-forced and defeated.",
      "Once the Queen goes down, the King will reappear, staggered, allowing you to hit it to proceed to Phase 2."
    ]},
    { text:"Freeze The King's Lethal Blow", substeps:[
      "At some point after the initial attacks, the King and Queen will gather together in the center where the King will raise his sword and charge up a huge attack.",
      "Apply Hydro and Cryo to the King to stack Freeze on him until he comes Frozen. This will promptly abort its attack and deal heavy Physical damage onto it."
    ]},
    { text:"What Happens If You Ignore It", substeps:[
      "The King unleashes an arena-wide sword slam, instantly killing the on-field character. This cannot be i-framed by the Elemental Bursts of the party."
    ]},
    { text:"Freeze The Queen's Lethal Blow in Phase 2", substeps:[
      "Further into the fight, the King will jump to the edge and start charging at the player while the Queen prepares an arena-wide Lethal Blow.",
      "The gimmick here is to Freeze the Queen and bait the King into bumping into the Queen. In most cases this will kill the Queen and allow you to finish the King off."
    ]},
    { text:"What Happens If You Ignore It", substeps:[
      "Similar to the King's Lethal Blow, this is a oneshot and cannot be nullified by i-frames."
    ]}
   ],
   teams: [
     {
       name: "Team 1",
       members: [
         { name: "Flins" },
         { name: "Ineffa" },
         { name: "Columbina" },
         { name: "Sucrose" }
       ],
     },
     {
       name: "Team 2",
       members: [
         { name: "Nahida" },
         { name: "Shinobu" },
         { name: "Furina" },
         { name: "Zhongli" }
       ],
     },
     {
       name: "Team 3",
       members: [
         { name: "Nefer" },
         { name: "Lauma" },
         { name: "Columbina" },
         { name: "Shinobu" }
       ],
     }
   ]
    },


  /* ==== NOD-KRAI – NORMAL ==== */
  { id:"Frostnight Herra",      name:"Frostnight Herra",    type:"normal",  region:"Nod-Krai",    imageBase:"images/bosses/Frostnight Herra",     drops:["boss_Radiant Antler"],              location:"",                  elements: ["cryo", "hydro"],
    guide:[
    { text:"Bring Multiple Elements", substeps:[
      "On the halfway point of the battle, the Frostnight Herra will perform a series of channeled attacks and set aside a bar to absorb elemental damage. Dealing elemental damage and filling this gauge will eventually cause the Frostnight Herra to stop channeling.",
      "However, finishing the gauge will cause the Frostnight Herra to be invulnerable to the element that dealt the most damage. Bring Elemental Reaction teams to counter this, with dual DPS teams even being an option."
    ]},
    { text:"Lunar Teams Can Bypass the Absorption Mechanic", substeps:[
      "Bringing Lunar Reaction teams will instead cause the Frostnight Herra to become elementless if its gauge absorbs Lunar damage more than regular damage. This allows you to continue your stream of attacks without having to adjust at all.",
      "They also have the added benefit of performing high-damage attacks that can also bypass this mechanic by Bursting down the boss within two rotations."
    ]}
   ],
   teams: [
     {
       name: "Team 1",
       members: [
         { name: "Flins" },
         { name: "Ineffa" },
         { name: "Aino" },
         { name: "Sucrose" }
       ],
     },
     {
       name: "Team 2",
       members: [
         { name: "Nefer" },
         { name: "Lauma" },
         { name: "Aino" },
         { name: "Kokomi" }
       ],
     },
     {
       name: "Team 3",
       members: [
         { name: "Chasca" },
         { name: "Furina" },
         { name: "Bennett" },
         { name: "Ororon" }
       ],
     }
   ]
    },

  { id:"Super-Heavy Landrover Mechanized Fortress",name:"Super-Heavy Landrover Mechanized Fortress",type:"normal",  region:"Nod-Krai",    imageBase:"images/bosses/Super-Heavy Landrover Mechanized Fortress",drops:["boss_Cyclic Military Kuuvahki Core"],location:"",                  elements: ["cryo", "pyro"],
    guide:[
    { text:"Apply Continuous Pyro to Fill the Gauge", substeps:[
      "The boss is inherently resistant when it's active. To \"cool\" the boss down, you will first need to apply as much Pyro as you can with off-field or on-field DPS like Durin and Mavuika to fill this gauge. It is mandatory to have a Pyro character as a result."
    ]},
    { text:"Remove the Cryo Shield As Fast As Possible", substeps:[
      "Once the Pyro meter is filled up, the boss creates a Cryo shield and charges up an ultimate attack if it depletes all accumulated Pyro. With the same Pyro application, melt the shield as fast as you can, as doing so will stun the boss and also lower its resistances."
    ]}
   ],
   teams: [
     {
       name: "Team 1",
       members: [
         { name: "Arlecchino", role: "Main DPS" },
         { name: "Durin", role: "Sub DPS" },
         { name: "Chevreuse", role: "Support" },
         { name: "Fischl", role: "Sub DPS" }
       ],
     },
     {
       name: "Team 2",
       members: [
         { name: "Mavuika", role: "Main DPS" },
         { name: "Bennett", role: "Support" },
         { name: "Xilonen", role: "Sub DPS" },
         { name: "Iansan", role: "Support" }
       ],
     },
     {
       name: "Team 3",
       members: [
         { name: "Kinich", role: "Main DPS" },
         { name: "Emilie", role: "Sub DPS" },
         { name: "Xiangling", role: "Sub DPS" },
         { name: "Bennett", role: "Support" }
       ],
     },
     {
       name: "Team 4",
       members: [
         { name: "Sucrose", role: "Main DPS" },
         { name: "Xiangling", role: "Sub DPS" },
         { name: "Bennett", role: "Support" },
         { name: "Fischl", role: "Sub DPS" }
       ],
     }
   ]
    },

  { id:"The Whisperer of Nightmares",name:"The Whisperer of Nightmares",type:"normal",  region:"Nod-Krai",    imageBase:"images/bosses/The Whisperer of Nightmares",drops:["boss_Remnant of the Dreadwing"],    location:"",                  elements: ["electro"],
    guide:[
    { text:"Use Lunar or Elemental Reaction to Destroy the Shield", substeps:[
      "The Whisperer of Nightmares will eventually gain a shield during the fight while summoning minions to provide the shield. The shield can be destroyed by utilizing Elemental Reactions, but Lunar Reactions are more efficient.",
      "Take note, focus on the boss itself rather than the minions to damage the shields"
    ]}
   ],
   teams: [
     {
       name: "Team 1",
       members: [
         { name: "Flins" },
         { name: "Ineffa" },
         { name: "Columbina" },
         { name: "Sucrose" }
       ],
     },
     {
       name: "Team 2",
       members: [
         { name: "Nefer" },
         { name: "Lauma" },
         { name: "Nahida" },
         { name: "Columbina" }
       ],
     },
     {
       name: "Team 3",
       members: [
         { name: "Nahida" },
         { name: "Shinobu" },
         { name: "Xingqiu" },
         { name: "Zhongli" }
       ],
     },
     {
       name: "Team 4",
       members: [
         { name: "Sucrose" },
         { name: "Fischl" },
         { name: "Beidou" },
         { name: "Xingqiu" }
       ],
     }
   ]
    },
];