export const STORES = {
  nike: { type: 'custom', module: './scrapers/nike.js', enabled: true },
  snkrs: { type: 'custom', module: './scrapers/snkrs.js', enabled: true },
  adidas: { type: 'custom', module: './scrapers/adidas.js', enabled: true },
  footlocker: { type: 'custom', module: './scrapers/footlocker.js', enabled: true },
  champs: { type: 'custom', module: './scrapers/champs.js', enabled: true },
  jdSports: { type: 'custom', module: './scrapers/jdSports.js', enabled: true },
  finishline: { type: 'custom', module: './scrapers/finishline.js', enabled: true },
  hibbets: { type: 'custom', module: './scrapers/hibbetts.js', enabled: true },

  undefeated: { type: 'shopify', domain: 'undefeated.com', module: './scrapers/undefeated.js', enabled: true, collections: ['footwear','launch','new-arrivals'] },
  concepts: { type: 'shopify', domain: 'cncpts.com', module: './scrapers/concepts.js', enabled: true, collections: ['footwear','launch','new-arrivals'] },
  kith: { type: 'shopify', domain: 'kith.com', module: './scrapers/kith.js', enabled: true, collections: ['footwear','launch','new-arrivals'] },
  bodega: { type: 'shopify', domain: 'bdgastore.com', module: './scrapers/bodega.js', enabled: true, collections: ['footwear','launch','new-arrivals'] },
  endclothing: { type: 'custom', module: './scrapers/endclothing.js', enabled: true },
  offspring: { type: 'custom', module: './scrapers/offspring.js', enabled: true },
  sneakersnstuff: { type: 'custom', module: './scrapers/sneakersnstuff.js', enabled: true },
  lapstonehammer: { type: 'shopify', domain: 'lapstoneandhammer.com', module: './scrapers/lapstonehammer.js', enabled: true, collections: ['footwear'] },
  extraButter: { type: 'shopify', domain: 'extrabutterny.com', module: './scrapers/extraButter.js', enabled: true, collections: ['footwear','launch'] },
  atmos: { type: 'shopify', domain: 'atmosusa.com', module: './scrapers/atmos.js', enabled: true, collections: ['footwear','new-arrivals'] },
  socialStatus: { type: 'shopify', domain: 'socialstatuspgh.com', module: './scrapers/socialStatus.js', enabled: true, collections: ['footwear','launch'] },
  aMaManiere: { type: 'shopify', domain: 'a-ma-maniere.com', module: './scrapers/aMaManiere.js', enabled: true, collections: ['footwear','launch'] },
  sizeOfficial: { type: 'custom', module: './scrapers/sizeOfficial.js', enabled: true },
  oneBlockDown: { type: 'shopify', domain: 'oneblockdown.it', module: './scrapers/oneBlockDown.js', enabled: true, collections: ['footwear','new-arrivals'] },
  solebox: { type: 'custom', module: './scrapers/solebox.js', enabled: true },
  asphaltgold: { type: 'custom', module: './scrapers/asphaltgold.js', enabled: true },
  hanon: { type: 'custom', module: './scrapers/hanon.js', enabled: true },
  feature: { type: 'shopify', domain: 'feature.com', module: './scrapers/feature.js', enabled: true, collections: ['footwear','new-arrivals'] },
  kickz: { type: 'custom', module: './scrapers/kickz.js', enabled: true },
  bait: { type: 'shopify', domain: 'baitme.com', module: './scrapers/bait.js', enabled: true, collections: ['footwear','new-arrivals'] },
  oneness: { type: 'shopify', domain: 'onenessboutique.com', module: './scrapers/oneness.js', enabled: true, collections: ['footwear','new-arrivals'] },
  palace: { type: 'custom', module: './scrapers/palace.js', enabled: true },
  stockx: { type: 'custom', module: './scrapers/stockx.js', enabled: true },

  // Additional Shopify stores already in Python list
  sneakerpolitics: { type: 'shopify', domain: 'sneakerpolitics.com', module: './scrapers/sneakerpolitics.js', enabled: true, collections: ['footwear','new-arrivals'] },
  saintalfred: { type: 'shopify', domain: 'saintalfred.com', module: './scrapers/saintalfred.js', enabled: true, collections: ['footwear','new-arrivals'] },
  dtlr: { type: 'custom', module: './scrapers/dtlr.js', enabled: true },
  notreshop: { type: 'shopify', domain: 'notre-shop.com', module: './scrapers/notre.js', enabled: true },
  unionla: { type: 'shopify', domain: 'store.unionlosangeles.com', module: './scrapers/unionla.js', enabled: true },
  shoepalace: { type: 'custom', module: './scrapers/shoepalace.js', enabled: true },

  // Expansion Roadmap - Quick Wins (Shopify stores)
  jimmyjazz: { type: 'shopify', domain: 'jimmyjazz.com', module: './scrapers/jimmyjazz.js', enabled: true, collections: ['sneakers', 'new-arrivals', 'footwear'] },
  einhalb43: { type: 'shopify', domain: '43einhalb.com', module: './scrapers/43einhalb.js', enabled: true, collections: ['sneakers', 'new-releases'] },
  packershoes: { type: 'shopify', domain: 'packershoes.com', module: './scrapers/packershoes.js', enabled: true, collections: ['footwear', 'new-arrivals'] },

  myCustom: { type: 'custom', module: './scrapers/myCustom.js', enabled: true },
};

export const loadConfig = async () => ({ STORES });
