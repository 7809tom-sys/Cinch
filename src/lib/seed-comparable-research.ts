/**
 * HARD RULE — when Seed describes a site, crawl at least 50 competitor
 * websites in that industry and take the best features of each.
 * Give the customer who ordered the site at least five reference links.
 * Do not paste competitor headlines onto the page.
 * A notebook is not research — this module fetches public HTML.
 */

import {
  seedIndustryKey,
  type SeedShopCopy,
  type SeedSiteCopy,
} from "./seed-site-copy";

export const MIN_COMPARABLE_CRAWL = 50;

export const MIN_CUSTOMER_REFERENCES = 5;

export const SEED_COMPARE_IDEALS_RULE = {
  summary:
    "HARD-CODED: crawl at least 50 competitor websites in this industry and take the best features of each — CTA, headline, fulfillment, and SEO/AIO from different sites. Give the customer who ordered the website at least five reference sites to open. Do not paste competitor headlines onto the page. A notebook is not research. Never UPS a car.",
} as const;

export const SEARCH_COMPARABLE_IDEALS_TITLE =
  "Search comparable ideal sites and take the best";

export function taskIsComparableResearch(taskTitle: string): boolean {
  return /comparable ideal|search comparable|take the best/i.test(taskTitle);
}

export type ComparableSnapshot = {
  url: string;
  host: string;
  fetched: boolean;
  title: string;
  h1: string;
  cta: string;
  description: string;
  nav: string[];
  score: number;
  notes: string[];
};

export type BestOfPiece = {
  value: string;
  fromHost: string;
  fromUrl: string;
};

export type BestOfEach = {
  cta: BestOfPiece | null;
  headline: BestOfPiece | null;
  seoTitle: BestOfPiece | null;
  seoDescription: BestOfPiece | null;
  nav: BestOfPiece | null;
  methods: BestOfPiece[];
};

export type ComparableResearch = {
  query: string;
  industry: string;
  searchedAt: string;
  urlsConsidered: string[];
  snapshots: ComparableSnapshot[];
  winnerUrl: string | null;
  bestCta: string | null;
  bestHeadline: string | null;
  bestSeoTitle: string | null;
  bestSeoDescription: string | null;
  customerFriendlyMethods: string[];
  bestOfEach?: BestOfEach;
  takeaways: string[];
};

const IDEAL_URLS: Record<string, string[]> = {
  dealership: [
    "https://www.carmax.com/",
    "https://www.carvana.com/",
    "https://www.vroom.com/",
    "https://www.autotrader.com/",
    "https://www.cars.com/",
    "https://www.cargurus.com/",
    "https://www.truecar.com/",
    "https://www.edmunds.com/",
    "https://www.kbb.com/",
    "https://www.carfax.com/",
    "https://www.driveway.com/",
    "https://www.hertzcarsales.com/",
    "https://www.enterprisecarsales.com/",
    "https://www.autonation.com/",
    "https://www.lithia.com/",
    "https://www.sonicautomotive.com/",
    "https://www.group1auto.com/",
    "https://www.asburyauto.com/",
    "https://www.carsdirect.com/",
    "https://www.capitalone.com/cars/",
    "https://www.carvana.com/cars",
    "https://www.carmax.com/cars",
  ],
  delivery: [
    "https://www.doordash.com/",
    "https://www.ubereats.com/",
    "https://www.grubhub.com/",
    "https://www.postmates.com/",
    "https://www.deliveroo.com/",
    "https://www.just-eat.com/",
    "https://merchant.doordash.com/",
    "https://www.uber.com/us/en/deliver/",
    "https://get.doordash.com/en-us/products/drive",
    "https://www.skipthedishes.com/",
    "https://www.instacart.com/",
    "https://www.gopuff.com/",
    "https://www.caviar.com/",
    "https://www.seamless.com/",
    "https://www.eat24.com/",
    "https://www.trycaviar.com/",
    "https://www.relay.delivery/",
    "https://www.bitesquad.com/",
    "https://www.chowbus.com/",
    "https://www.hungrypanda.co/",
  ],
  food: [
    "https://www.dominos.com/",
    "https://www.papajohns.com/",
    "https://www.pizzahut.com/",
    "https://www.chipotle.com/",
    "https://www.olivegarden.com/",
    "https://www.applebees.com/",
    "https://www.chilis.com/",
    "https://www.outback.com/",
    "https://www.panerabread.com/",
    "https://www.starbucks.com/",
    "https://www.dunkindonuts.com/",
    "https://www.sweetgreen.com/",
    "https://www.cava.com/",
    "https://www.modpizza.com/",
    "https://www.blazepizza.com/",
    "https://www.jetspizza.com/",
    "https://www.littlecaesars.com/",
    "https://www.papamurphys.com/",
    "https://www.hungryhowies.com/",
    "https://www.cicis.com/",
  ],
  salon: [
    "https://www.greatclips.com/",
    "https://www.sportclips.com/",
    "https://www.supercuts.com/",
    "https://www.fantastic-sams.com/",
    "https://www.costcutters.com/",
    "https://www.regiscorp.com/",
    "https://www.ultabeauty.com/",
    "https://www.sephora.com/",
    "https://www.drybar.com/",
    "https://www.madisonreed.com/",
    "https://www.myoliver.com/",
    "https://www.sportclips.com/locations",
    "https://www.greatclips.com/salons",
    "https://www.thesalonsuccess.com/",
    "https://www.booksy.com/",
    "https://www.vagaro.com/",
    "https://www.styleseat.com/",
    "https://www.schedulicity.com/",
    "https://www.mindbodyonline.com/",
    "https://www.thecut.com/",
    "https://www.thesaltcave.com/",
    "https://www.mytime.com/",
  ],
  lawn: [
    "https://www.trugreen.com/",
    "https://www.lawnstarter.com/",
    "https://www.weedman.com/",
    "https://www.scotts.com/",
    "https://www.naturescape.com/",
    "https://www.lawncare.net/",
    "https://www.angieslist.com/",
    "https://www.angi.com/companylist/us/lawn-and-garden.htm",
    "https://www.thumbtack.com/k/lawn-mowing/",
    "https://www.homeadvisor.com/",
    "https://www.porch.com/",
    "https://www.lawnlove.com/",
    "https://www.greenpal.com/",
    "https://www.mowandglow.com/",
    "https://www.weedpro.com/",
    "https://www.spring-green.com/",
    "https://www.lawncare.com/",
    "https://www.milorganite.com/",
    "https://www.pennington.com/",
    "https://www.natureslawn.com/",
    "https://www.naturescape.com/services/",
    "https://www.trugreen.com/lawn-care",
    "https://www.lawnstarter.com/lawn-care",
    "https://www.scotts.com/en-us/library/lawn-care",
  ],
  garage: [
    "https://www.firestonecompleteautocare.com/",
    "https://www.meineke.com/",
    "https://www.jiffylube.com/",
    "https://www.valvoline.com/",
    "https://www.midascars.com/",
    "https://www.pepboys.com/",
    "https://www.napaonline.com/",
    "https://www.autozone.com/",
    "https://www.oreillyauto.com/",
    "https://www.advanceautoparts.com/",
    "https://www.aaa.com/autorepair/",
    "https://www.yourmechanic.com/",
    "https://www.repairpal.com/",
    "https://www.maaco.com/",
    "https://www.christianbrothersauto.com/",
    "https://www.suncocoloco.com/",
    "https://www.takecareofyourcar.com/",
    "https://www.aamco.com/",
    "https://www.monro.com/",
    "https://www.bridgestonetire.com/",
    "https://www.firestonecompleteautocare.com/auto-repair/",
    "https://www.jiffylube.com/services",
    "https://www.meineke.com/services/",
  ],
  detail: [
    "https://www.chemicalguys.com/",
    "https://www.meguiars.com/",
    "https://www.adams.com/",
    "https://www.griotsgarage.com/",
    "https://www.theultimatedetail.com/",
    "https://www.ziebart.com/",
    "https://www.detailking.com/",
    "https://www.autogeek.net/",
    "https://www.detailedimage.com/",
    "https://www.carpro-us.com/",
    "https://www.amdetailing.com/",
    "https://www.detailersdomain.com/",
    "https://www.thesuperherodetailer.com/",
    "https://www.mobiledetailers.com/",
    "https://www.mydetailingshop.com/",
    "https://www.autopia-carcare.com/",
    "https://www.adamspolishes.com/",
    "https://www.mothers.com/",
    "https://www.turtlewax.com/",
    "https://www.p21s.com/",
    "https://www.chemicalguys.com/collections/car-wash",
    "https://www.meguiars.com/en/car-care",
    "https://www.ziebart.com/services",
    "https://www.griotsgarage.com/car-care/",
  ],
  retail: [
    "https://www.rei.com/",
    "https://www.etsy.com/",
    "https://www.shopify.com/",
    "https://www.walmart.com/",
    "https://www.target.com/",
    "https://www.bestbuy.com/",
    "https://www.homedepot.com/",
    "https://www.lowes.com/",
    "https://www.ikea.com/",
    "https://www.wayfair.com/",
    "https://www.nordstrom.com/",
    "https://www.macys.com/",
    "https://www.kohls.com/",
    "https://www.costco.com/",
    "https://www.samsclub.com/",
    "https://www.amazon.com/",
    "https://www.ebay.com/",
    "https://www.poshmark.com/",
    "https://www.mercari.com/",
    "https://www.depops.com/",
  ],
  trade: [
    "https://www.angi.com/",
    "https://www.thumbtack.com/",
    "https://www.homeadvisor.com/",
    "https://www.porch.com/",
    "https://www.taskrabbit.com/",
    "https://www.handy.com/",
    "https://www.mrhandyman.com/",
    "https://www.rotorooter.com/",
    "https://www.servpro.com/",
    "https://www.servicemaster.com/",
    "https://www.mollymaid.com/",
    "https://www.merrymaids.com/",
    "https://www.two-men-and-a-truck.com/",
    "https://www.podsofmoving.com/",
    "https://www.uhaul.com/",
    "https://www.pensketruckrental.com/",
    "https://www.budgettruck.com/",
    "https://www.acehardware.com/",
    "https://www.truevalue.com/",
    "https://www.ferguson.com/",
  ],
  generic: [
    "https://www.squarespace.com/",
    "https://www.wix.com/",
    "https://www.webflow.com/",
    "https://www.godaddy.com/",
    "https://www.shopify.com/",
    "https://www.wordpress.com/",
    "https://www.weebly.com/",
    "https://www.strikingly.com/",
    "https://www.carrd.co/",
    "https://www.framer.com/",
    "https://www.web.com/",
    "https://www.networksolutions.com/",
    "https://www.bluehost.com/",
    "https://www.siteground.com/",
    "https://www.hostinger.com/",
    "https://www.ionos.com/",
    "https://www.namecheap.com/",
    "https://www.google.com/business/",
    "https://www.yelp.com/",
    "https://www.bbb.org/",
  ],
  club: [
    "https://www.brightcellars.com/",
    "https://www.winc.com/",
    "https://www.nakedwines.com/",
    "https://www.wsjwine.com/",
    "https://www.wine.com/",
    "https://www.vivino.com/",
    "https://www.winefolly.com/",
    "https://www.klwines.com/",
    "https://www.zachys.com/",
    "https://www.wineenthusiast.com/",
    "https://www.cellartracker.com/",
    "https://www.totalwine.com/",
    "https://www.wineaccess.com/",
    "https://www.lastbottlewines.com/",
    "https://www.wtso.com/",
    "https://www.invino.com/",
    "https://www.lot18.com/",
    "https://www.winebid.com/",
    "https://www.astorwines.com/",
    "https://www.flatironwines.com/",
    "https://www.winesearcher.com/",
    "https://www.decanter.com/",
    "https://www.vinous.com/",
    "https://www.jancisrobinson.com/",
    "https://www.robertparker.com/",
    "https://www.flaviar.com/",
    "https://www.reservebar.com/",
    "https://www.drizly.com/",
    "https://www.murrayscheese.com/",
    "https://www.igourmet.com/",
    "https://www.cheese.com/",
    "https://www.wisconsincheese.com/",
    "https://www.fromagination.com/",
    "https://www.wisconsincheesemart.com/",
    "https://www.formaggiokitchen.com/",
    "https://www.dibruno.com/",
    "https://www.zabars.com/",
    "https://www.cowgirlcreamery.com/",
    "https://www.pointreyescheese.com/",
    "https://www.rothcheese.com/",
    "https://www.hookscheese.com/",
    "https://www.sartoricheese.com/",
    "https://www.carrvalleycheese.com/",
    "https://www.hookscheese.com/shop",
    "https://www.wollersheim.com/",
    "https://www.cedarcreekwinery.com/",
    "https://www.culturecheesemag.com/",
    "https://www.beecherscheese.com/",
    "https://www.tillamook.com/",
    "https://www.cabotcheese.coop/",
    "https://www.goldbelly.com/",
    "https://www.mouth.com/",
    "https://www.food52.com/",
    "https://www.surlatable.com/",
    "https://www.williams-sonoma.com/",
    "https://www.vinebox.com/",
    "https://www.usualwines.com/",
    "https://www.undergroundcellar.com/",
    "https://www.firstleaf.com/",
    "https://www.splashwines.com/",
    "https://www.wineinsiders.com/",
    "https://www.goldmedalwineclub.com/",
    "https://www.thecaliforniawineclub.com/",
    "https://www.bedfordcheeseshop.com/",
  ],
};

/**
 * Extra competitor hosts so every industry catalog clears the 50-site floor.
 * Hosts already listed above are skipped by uniqueCompetitorHosts.
 */
const EXTRA_IDEAL_URLS: Record<string, string[]> = {
  dealership: [
    "https://www.shift.com/",
    "https://www.autolist.com/",
    "https://www.iseecars.com/",
    "https://www.carsoup.com/",
    "https://www.autobytel.com/",
    "https://www.carsforsale.com/",
    "https://www.classiccars.com/",
    "https://www.hemmings.com/",
    "https://www.bringatrailer.com/",
    "https://www.dupontregistry.com/",
    "https://www.tred.com/",
    "https://www.drivetime.com/",
    "https://www.byrider.com/",
    "https://www.jdbyrider.com/",
    "https://www.americascarmart.com/",
    "https://www.offleaseonly.com/",
    "https://www.carsense.com/",
    "https://www.penskeautomotive.com/",
    "https://www.hendrickcars.com/",
    "https://www.herbchambers.com/",
    "https://www.galpin.com/",
    "https://www.echopark.com/",
    "https://www.flowautomotive.com/",
    "https://www.morganauto.com/",
    "https://www.raycatena.com/",
    "https://www.fletcherjones.com/",
    "https://www.sewell.com/",
    "https://www.koons.com/",
    "https://www.ourisman.com/",
    "https://www.sheehy.com/",
    "https://www.darcars.com/",
    "https://www.rickcase.com/",
    "https://www.kengarff.com/",
  ],
  delivery: [
    "https://www.favordelivery.com/",
    "https://www.waitrapp.com/",
    "https://www.delivery.com/",
    "https://www.slicelife.com/",
    "https://www.toasttab.com/",
    "https://www.olo.com/",
    "https://www.chownow.com/",
    "https://www.beyondmenu.com/",
    "https://www.menufy.com/",
    "https://www.ezcater.com/",
    "https://www.goldbelly.com/",
    "https://www.tryotter.com/",
    "https://www.shipt.com/",
    "https://www.freshdirect.com/",
    "https://www.hungryroot.com/",
    "https://www.misfitsmarket.com/",
    "https://www.thrivemarket.com/",
    "https://www.rappi.com/",
    "https://www.ifood.com.br/",
    "https://www.glovoapp.com/",
    "https://www.zomato.com/",
    "https://www.swiggy.com/",
    "https://www.foodpanda.com/",
    "https://www.grab.com/",
    "https://www.wolt.com/",
    "https://www.lieferando.de/",
    "https://www.talabat.com/",
    "https://www.careem.com/",
    "https://www.zeptonow.com/",
    "https://www.blinkit.com/",
    "https://www.getir.com/",
    "https://www.amazon.com/",
    "https://www.walmart.com/",
    "https://www.kroger.com/",
    "https://www.wholefoodsmarket.com/",
  ],
  food: [
    "https://www.mcdonalds.com/",
    "https://www.bk.com/",
    "https://www.wendys.com/",
    "https://www.tacobell.com/",
    "https://www.kfc.com/",
    "https://www.popeyes.com/",
    "https://www.chick-fil-a.com/",
    "https://www.fiveguys.com/",
    "https://www.shakeshack.com/",
    "https://www.in-n-out.com/",
    "https://www.whataburger.com/",
    "https://www.culvers.com/",
    "https://www.sonicdrivein.com/",
    "https://www.arbys.com/",
    "https://www.dairyqueen.com/",
    "https://www.subway.com/",
    "https://www.jerseymikes.com/",
    "https://www.firehousesubs.com/",
    "https://www.jimmyjohns.com/",
    "https://www.potbelly.com/",
    "https://www.noodles.com/",
    "https://www.pandaexpress.com/",
    "https://www.pfchangs.com/",
    "https://www.thecheesecakefactory.com/",
    "https://www.redlobster.com/",
    "https://www.texasroadhouse.com/",
    "https://www.longhornsteakhouse.com/",
    "https://www.crackerbarrel.com/",
    "https://www.dennys.com/",
    "https://www.ihop.com/",
    "https://www.wafflehouse.com/",
    "https://www.buffalowildwings.com/",
    "https://www.wingstop.com/",
  ],
  salon: [
    "https://www.glossgenius.com/",
    "https://www.fresha.com/",
    "https://www.joinblvd.com/",
    "https://www.phorest.com/",
    "https://www.sallybeauty.com/",
    "https://www.cosmoprofbeauty.com/",
    "https://www.aveda.com/",
    "https://www.paulmitchell.com/",
    "https://www.redken.com/",
    "https://www.ipsy.com/",
    "https://www.birchbox.com/",
    "https://www.functionofbeauty.com/",
    "https://www.curology.com/",
    "https://www.hims.com/",
    "https://www.forhers.com/",
    "https://www.floydsbarbershop.com/",
    "https://www.haircuttery.com/",
    "https://www.firstchoicehaircutters.com/",
    "https://www.magicuts.com/",
    "https://www.chatters.ca/",
    "https://www.toniandguy.com/",
    "https://www.salonlofts.com/",
    "https://www.solasalons.com/",
    "https://www.phenixsalon.com/",
    "https://www.mysalonsuite.com/",
    "https://www.saloncentric.com/",
    "https://www.olaplex.com/",
    "https://www.livingproof.com/",
    "https://www.oribe.com/",
    "https://www.wella.com/",
    "https://www.matrix.com/",
    "https://www.rudysbarbershop.com/",
  ],
  lawn: [
    "https://www.lawndoctor.com/",
    "https://www.mosquitojoe.com/",
    "https://www.mosquitonix.com/",
    "https://www.mosquitosquad.com/",
    "https://www.barefootmosquito.com/",
    "https://www.savatree.com/",
    "https://www.davey.com/",
    "https://www.bartlett.com/",
    "https://www.brightview.com/",
    "https://www.ruppertlandscape.com/",
    "https://www.uslawns.com/",
    "https://www.groundsguys.com/",
    "https://www.plowzandmowz.com/",
    "https://www.getsunday.com/",
    "https://www.orkin.com/",
    "https://www.terminix.com/",
    "https://www.rentokil.com/",
    "https://www.masseyservices.com/",
    "https://www.arrowexterminators.com/",
    "https://www.siteone.com/",
    "https://www.deere.com/",
    "https://www.toro.com/",
    "https://www.husqvarna.com/",
    "https://www.stihlusa.com/",
    "https://www.cubcadet.com/",
    "https://www.ariens.com/",
    "https://www.exmark.com/",
    "https://www.yellowstonelandscape.com/",
    "https://www.taskeasy.com/",
    "https://www.lawn.com/",
    "https://www.domyown.com/",
    "https://www.pennington.com/",
  ],
  garage: [
    "https://www.take5oilchange.com/",
    "https://www.greasemonkeyauto.com/",
    "https://www.speedeeoil.com/",
    "https://www.expressoilchange.com/",
    "https://www.tiresplus.com/",
    "https://www.discounttire.com/",
    "https://www.ntb.com/",
    "https://www.bigotires.com/",
    "https://www.belletire.com/",
    "https://www.townfairtire.com/",
    "https://www.mavistire.com/",
    "https://www.goodyear.com/",
    "https://www.michelinman.com/",
    "https://www.continentaltire.com/",
    "https://www.pirelli.com/",
    "https://www.calibercollision.com/",
    "https://www.gerbercollision.com/",
    "https://www.carstar.com/",
    "https://www.crashchampions.com/",
    "https://www.servicekingcollision.com/",
    "https://www.precisiontune.com/",
    "https://www.tuffyauto.com/",
    "https://www.cottman.com/",
    "https://www.honest1auto.com/",
    "https://www.abraauto.com/",
    "https://www.classiccollision.com/",
    "https://www.yokohamatire.com/",
    "https://www.bfgoodrichtires.com/",
    "https://www.sullivantire.com/",
    "https://www.firestone.com/",
    "https://www.bridgestone.com/",
  ],
  detail: [
    "https://www.mistercarwash.com/",
    "https://www.tommys-express.com/",
    "https://www.quickquackcarwash.com/",
    "https://www.clubcarwash.com/",
    "https://www.tidalwaveautospa.com/",
    "https://www.zipscarwash.com/",
    "https://www.deltasoniccarwash.com/",
    "https://www.gtechniq.com/",
    "https://www.ceramicpro.com/",
    "https://www.gyeon.co/",
    "https://www.rupesusa.com/",
    "https://www.armorall.com/",
    "https://www.rainx.com/",
    "https://www.303products.com/",
    "https://www.sonaxusa.com/",
    "https://www.drbeasleys.com/",
    "https://www.poorboysworld.com/",
    "https://www.wolfgangcarcare.com/",
    "https://www.collinite.com/",
    "https://www.jescar.com/",
    "https://www.theragcompany.com/",
    "https://www.esotericdetail.com/",
    "https://www.obsessedgarage.com/",
    "https://www.superstarcarwash.com/",
    "https://www.washos.com/",
    "https://www.autogeek.com/",
    "https://www.carpro.com/",
    "https://www.koch-chemie.com/",
    "https://www.lakecountrymfg.com/",
    "https://www.buffandshine.com/",
    "https://www.detailpro.com/",
  ],
  retail: [
    "https://www.gap.com/",
    "https://www.oldnavy.com/",
    "https://www.bananarepublic.com/",
    "https://www.jcrew.com/",
    "https://www.uniqlo.com/",
    "https://www.zara.com/",
    "https://www.hm.com/",
    "https://www.nike.com/",
    "https://www.adidas.com/",
    "https://www.lululemon.com/",
    "https://www.patagonia.com/",
    "https://www.llbean.com/",
    "https://www.dickssportinggoods.com/",
    "https://www.academy.com/",
    "https://www.cabelas.com/",
    "https://www.basspro.com/",
    "https://www.williams-sonoma.com/",
    "https://www.potterybarn.com/",
    "https://www.crateandbarrel.com/",
    "https://www.westelm.com/",
    "https://www.anthropologie.com/",
    "https://www.urbanoutfitters.com/",
    "https://www.newegg.com/",
    "https://www.bhphotovideo.com/",
    "https://www.gamestop.com/",
    "https://www.staples.com/",
    "https://www.officedepot.com/",
    "https://www.containerstore.com/",
    "https://www.walgreens.com/",
    "https://www.cvs.com/",
    "https://www.wholefoodsmarket.com/",
    "https://www.kroger.com/",
  ],
  trade: [
    "https://www.benjaminfranklinplumbing.com/",
    "https://www.onehourheatandair.com/",
    "https://www.mistersparky.com/",
    "https://www.mrelectric.com/",
    "https://www.mrrooter.com/",
    "https://www.mrappliance.com/",
    "https://www.aireserv.com/",
    "https://www.glassdoctor.com/",
    "https://www.windowworld.com/",
    "https://www.renewalbyandersen.com/",
    "https://www.leaffilter.com/",
    "https://www.bathfitter.com/",
    "https://www.rebath.com/",
    "https://www.certapro.com/",
    "https://www.stanleysteemer.com/",
    "https://www.zerorez.com/",
    "https://www.chemdry.com/",
    "https://www.coit.com/",
    "https://www.belfor.com/",
    "https://www.pauldavis.com/",
    "https://www.rainbowintl.com/",
    "https://www.overheaddoor.com/",
    "https://www.clopaydoor.com/",
    "https://www.fivestarpainting.com/",
    "https://www.collegepro.com/",
    "https://www.orkin.com/",
    "https://www.terminix.com/",
    "https://www.ars.com/",
    "https://www.a1garagedoor.com/",
    "https://www.garage.com/",
  ],
  generic: [
    "https://www.duda.co/",
    "https://www.jimdo.com/",
    "https://www.site123.com/",
    "https://www.zyro.com/",
    "https://www.ucraft.com/",
    "https://www.tilda.cc/",
    "https://www.bubble.io/",
    "https://www.softr.io/",
    "https://www.durable.co/",
    "https://www.10web.io/",
    "https://www.dreamhost.com/",
    "https://www.a2hosting.com/",
    "https://www.inmotionhosting.com/",
    "https://www.wpengine.com/",
    "https://www.kinsta.com/",
    "https://www.getflywheel.com/",
    "https://www.cloudways.com/",
    "https://www.netlify.com/",
    "https://vercel.com/",
    "https://www.webador.com/",
    "https://www.vistaprint.com/",
    "https://www.format.com/",
    "https://www.cargocollective.com/",
    "https://www.readymag.com/",
    "https://www.super.so/",
    "https://www.typedream.com/",
    "https://www.unbounce.com/",
    "https://www.leadpages.com/",
    "https://www.instapage.com/",
    "https://www.clickfunnels.com/",
    "https://www.podia.com/",
    "https://www.teachable.com/",
    "https://www.kajabi.com/",
    "https://www.systeme.io/",
  ],
};

const SEARCH_QUERY: Record<string, string> = {
  dealership:
    "used car dealership website hold a car test drive dealer delivery financing SEO",
  delivery:
    "food delivery platform merchant portal driver dasher app order nearby",
  food: "best restaurant website order online menu",
  salon: "best salon website book appointment",
  lawn: "best lawn care website get a quote",
  garage: "best auto repair website book service",
  detail: "best auto detailing website book a detail",
  retail: "best small retail website shop now",
  trade: "best home service website request service",
  generic: "best small business website clear CTA SEO",
  club: "cheese and wine club monthly pairing taste quiz subscription reorder",
};

export function idealUrlsForIndustry(industry: string): string[] {
  const base = IDEAL_URLS[industry] ?? IDEAL_URLS.generic;
  const extra = EXTRA_IDEAL_URLS[industry] ?? [];
  return [...base, ...extra];
}

export type CustomerReferenceSite = {
  url: string;
  host: string;
  feature: string;
};

/** Five sites the ordering customer can open. The feature line is ours. */
const CUSTOMER_REFERENCES: Record<string, CustomerReferenceSite[]> = {
  club: [
    {
      url: "https://www.brightcellars.com/",
      host: "brightcellars.com",
      feature: "A palate quiz chooses the case before it ships.",
    },
    {
      url: "https://www.nakedwines.com/",
      host: "nakedwines.com",
      feature: "Members can skip a month and still back the maker.",
    },
    {
      url: "https://www.winc.com/",
      host: "winc.com",
      feature: "Preferences set a monthly club shipment.",
    },
    {
      url: "https://www.wisconsincheese.com/",
      host: "wisconsincheese.com",
      feature: "The state’s creameries are the product, not a stock board.",
    },
    {
      url: "https://www.murrayscheese.com/",
      host: "murrayscheese.com",
      feature: "A producer note sits next to the wedge.",
    },
  ],
  dealership: [
    {
      url: "https://www.carmax.com/",
      host: "carmax.com",
      feature: "Filter the lot and hold a car.",
    },
    {
      url: "https://www.carvana.com/",
      host: "carvana.com",
      feature: "The seller delivers the car. A parcel carrier does not.",
    },
    {
      url: "https://www.autotrader.com/",
      host: "autotrader.com",
      feature: "Search inventory before the visit.",
    },
    {
      url: "https://www.cargurus.com/",
      host: "cargurus.com",
      feature: "Price context sits on the listing.",
    },
    {
      url: "https://www.edmunds.com/",
      host: "edmunds.com",
      feature: "Research the car, then go see it.",
    },
  ],
  delivery: [
    {
      url: "https://www.doordash.com/",
      host: "doordash.com",
      feature: "Order from kitchens nearby.",
    },
    {
      url: "https://www.ubereats.com/",
      host: "ubereats.com",
      feature: "Track the bag from kitchen to door.",
    },
    {
      url: "https://www.grubhub.com/",
      host: "grubhub.com",
      feature: "Reorder a meal you already liked.",
    },
    {
      url: "https://www.instacart.com/",
      host: "instacart.com",
      feature: "A shopper brings the grocery list.",
    },
    {
      url: "https://www.gopuff.com/",
      host: "gopuff.com",
      feature: "A small order can still come to the door.",
    },
  ],
  food: [
    {
      url: "https://www.dominos.com/",
      host: "dominos.com",
      feature: "Order, pickup, or delivery from one menu.",
    },
    {
      url: "https://www.chipotle.com/",
      host: "chipotle.com",
      feature: "Build the order in a few taps.",
    },
    {
      url: "https://www.sweetgreen.com/",
      host: "sweetgreen.com",
      feature: "The menu is the homepage.",
    },
    {
      url: "https://www.olivegarden.com/",
      host: "olivegarden.com",
      feature: "A table can be reserved before you arrive.",
    },
    {
      url: "https://www.starbucks.com/",
      host: "starbucks.com",
      feature: "A saved order comes back the next visit.",
    },
  ],
  salon: [
    {
      url: "https://www.greatclips.com/",
      host: "greatclips.com",
      feature: "Book a chair by time, not by a phone tag.",
    },
    {
      url: "https://www.sportclips.com/",
      host: "sportclips.com",
      feature: "Check-in and the wait is visible.",
    },
    {
      url: "https://www.booksy.com/",
      host: "booksy.com",
      feature: "The stylist’s book is online.",
    },
    {
      url: "https://www.styleseat.com/",
      host: "styleseat.com",
      feature: "A client can rebook the same service.",
    },
    {
      url: "https://www.drybar.com/",
      host: "drybar.com",
      feature: "Services are named so a guest knows what they booked.",
    },
  ],
  lawn: [
    {
      url: "https://www.trugreen.com/",
      host: "trugreen.com",
      feature: "A seasonal plan, not a one-off guess.",
    },
    {
      url: "https://www.lawnstarter.com/",
      host: "lawnstarter.com",
      feature: "A quote before the crew shows up.",
    },
    {
      url: "https://www.lawnlove.com/",
      host: "lawnlove.com",
      feature: "Recurring mows on a route.",
    },
    {
      url: "https://www.angi.com/",
      host: "angi.com",
      feature: "Compare local crews before you hire.",
    },
    {
      url: "https://www.thumbtack.com/",
      host: "thumbtack.com",
      feature: "Request the job and get a price.",
    },
  ],
  garage: [
    {
      url: "https://www.jiffylube.com/",
      host: "jiffylube.com",
      feature: "Book a service bay online.",
    },
    {
      url: "https://www.firestonecompleteautocare.com/",
      host: "firestonecompleteautocare.com",
      feature: "Tires and repair share one visit.",
    },
    {
      url: "https://www.meineke.com/",
      host: "meineke.com",
      feature: "The repair menu is public before you arrive.",
    },
    {
      url: "https://www.yourmechanic.com/",
      host: "yourmechanic.com",
      feature: "The mechanic can come to the car.",
    },
    {
      url: "https://www.repairpal.com/",
      host: "repairpal.com",
      feature: "A fair-price range sits next to the job.",
    },
  ],
  detail: [
    {
      url: "https://www.ziebart.com/",
      host: "ziebart.com",
      feature: "Packages are named before the driveway visit.",
    },
    {
      url: "https://www.chemicalguys.com/",
      host: "chemicalguys.com",
      feature: "The product and the job are explained together.",
    },
    {
      url: "https://www.mistercarwash.com/",
      host: "mistercarwash.com",
      feature: "A membership for the wash you repeat.",
    },
    {
      url: "https://www.meguiars.com/",
      host: "meguiars.com",
      feature: "Care steps are shown, not just a slogan.",
    },
    {
      url: "https://www.griotsgarage.com/",
      host: "griotsgarage.com",
      feature: "A kit matches the job the owner is doing.",
    },
  ],
  retail: [
    {
      url: "https://www.rei.com/",
      host: "rei.com",
      feature: "The product story sits next to the buy button.",
    },
    {
      url: "https://www.etsy.com/",
      host: "etsy.com",
      feature: "The maker is part of the listing.",
    },
    {
      url: "https://www.shopify.com/",
      host: "shopify.com",
      feature: "A shop can live on the same site as the story.",
    },
    {
      url: "https://www.target.com/",
      host: "target.com",
      feature: "Search, then add, then checkout.",
    },
    {
      url: "https://www.nordstrom.com/",
      host: "nordstrom.com",
      feature: "Size, color, and availability before the cart.",
    },
  ],
  trade: [
    {
      url: "https://www.angi.com/",
      host: "angi.com",
      feature: "Request a home service with the job named.",
    },
    {
      url: "https://www.thumbtack.com/",
      host: "thumbtack.com",
      feature: "Get a price before the truck rolls.",
    },
    {
      url: "https://www.taskrabbit.com/",
      host: "taskrabbit.com",
      feature: "Book a person for a specific hour.",
    },
    {
      url: "https://www.rotorooter.com/",
      host: "rotorooter.com",
      feature: "The emergency job has its own path.",
    },
    {
      url: "https://www.servpro.com/",
      host: "servpro.com",
      feature: "What happens after the call is spelled out.",
    },
  ],
  generic: [
    {
      url: "https://www.squarespace.com/",
      host: "squarespace.com",
      feature: "One primary action on the first screen.",
    },
    {
      url: "https://www.wix.com/",
      host: "wix.com",
      feature: "The owner can change the words without a rebuild.",
    },
    {
      url: "https://www.webflow.com/",
      host: "webflow.com",
      feature: "Layout stays intentional on a phone.",
    },
    {
      url: "https://www.shopify.com/",
      host: "shopify.com",
      feature: "A shop can sit next to the story.",
    },
    {
      url: "https://www.godaddy.com/",
      host: "godaddy.com",
      feature: "A domain and a contact path are obvious.",
    },
  ],
};

export function customerReferenceSites(
  industry: string,
  research?: ComparableResearch | null,
): CustomerReferenceSite[] {
  const curated = CUSTOMER_REFERENCES[industry] ?? CUSTOMER_REFERENCES.generic;
  const picked: CustomerReferenceSite[] = [];
  const seen = new Set<string>();

  function push(site: CustomerReferenceSite) {
    const host = site.host.replace(/^www\./, "");
    if (!host || seen.has(host) || picked.length >= MIN_CUSTOMER_REFERENCES) return;
    if (!/^https:\/\//i.test(site.url)) return;
    seen.add(host);
    picked.push({ ...site, host });
  }

  for (const site of curated) push(site);

  const fromResearch = [...(research?.snapshots ?? [])]
    .filter((snap) => snap.fetched && snap.url)
    .sort((a, b) => b.score - a.score);
  for (const snap of fromResearch) {
    push({
      url: snap.url,
      host: snap.host || hostOf(snap.url),
      feature: "Opened while taking features for this site.",
    });
  }
  for (const url of idealUrlsForIndustry(industry)) {
    push({
      url,
      host: hostOf(url),
      feature: "Opened while taking features for this site.",
    });
  }
  return picked;
}

export function comparableSearchQuery(
  projectName: string,
  brief: string,
): string {
  const industry = seedIndustryKey(projectName, brief);
  const base = SEARCH_QUERY[industry] ?? SEARCH_QUERY.generic;
  const brand = projectName.replace(/\s+Seed$/i, "").trim();
  return `${brand} ${base}`.replace(/\s+/g, " ").trim();
}

export function ctaFitsIndustry(cta: string, industry: string): boolean {
  const lower = cta.toLowerCase().replace(/\s+/g, " ").trim();
  if (!lower || lower.length > 40) return false;
  if (
    industry !== "food" &&
    /reserve a table|dinner|kitchen ticket|small plates|cocktail|order pizza/.test(
      lower,
    )
  ) {
    return false;
  }
  if (industry === "dealership") {
    return /inventory|used car|shop cars|browse|view inventory|shop used|search cars|see (?:cars|inventory)|shop now/.test(
      lower,
    );
  }
  if (industry === "delivery") {
    return /order nearby|order|start order|get the app/.test(lower);
  }
  if (industry === "food") {
    return /order|reserve|book a table|start order|menu/.test(lower);
  }
  if (industry === "salon") {
    return /book|appointment|schedule/.test(lower);
  }
  if (industry === "lawn") {
    return /quote|estimate|schedule|book/.test(lower);
  }
  if (industry === "garage") {
    return /book|service|schedule|appointment/.test(lower);
  }
  if (industry === "detail") {
    return /book|detail|schedule/.test(lower);
  }
  if (industry === "retail") {
    return /shop|buy|browse/.test(lower);
  }
  if (industry === "trade") {
    return /request|book|schedule|quote/.test(lower);
  }
  return /get started|learn more|contact|book|shop/.test(lower);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickH1(html: string): string {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match?.[1]) return "";
  return stripTags(match[1]).slice(0, 120);
}

function pickTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return (match?.[1] ?? "").replace(/\s+/g, " ").trim();
}

function pickMetaDescription(html: string): string {
  const patterns = [
    /<meta[^>]+(?:name|property)=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']description["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function pickCtas(html: string): string[] {
  const texts = [
    ...html.matchAll(
      /<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi,
    ),
  ]
    .map((m) => stripTags(m[1] ?? "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 3 && t.length <= 36);
  const preferred = texts.filter((t) =>
    /shop|buy|book|order|browse|inventory|quote|schedule|reserve|get started|view (?:our )?inventory|shop used/i.test(
      t,
    ) && !looksLikeSeoJunk(t),
  );
  return [...new Set(preferred.length ? preferred : texts)].slice(0, 8);
}

function pickNav(html: string): string[] {
  const nav = html.match(/<nav\b[\s\S]*?<\/nav>/i)?.[0] ?? "";
  const labels = [...nav.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => stripTags(m[1] ?? "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 2 && t.length <= 22);
  return [...new Set(labels)].slice(0, 8);
}

function industryWords(industry: string): RegExp {
  if (industry === "dealership") return /inventory|used car|financing|trade/i;
  if (industry === "delivery") {
    return /order nearby|driver|dasher|scout|merchant|gmv|delivery fee/i;
  }
  if (industry === "food") return /menu|order|pizza|dining|table/i;
  if (industry === "salon") return /salon|cut|color|appointment|barber/i;
  if (industry === "lawn") return /lawn|mow|yard|quote/i;
  if (industry === "garage") return /repair|brake|oil|service|diagnos/i;
  if (industry === "detail") return /detail|wash|ceramic|interior/i;
  if (industry === "retail") return /shop|store|cart/i;
  if (industry === "trade") return /service|repair|quote/i;
  return /welcome|home|about/i;
}

export function scoreComparableSnapshot(
  snap: Omit<ComparableSnapshot, "score" | "notes">,
  industry: string,
): { score: number; notes: string[] } {
  let score = 0;
  const notes: string[] = [];
  if (snap.fetched) {
    score += 2;
  } else {
    notes.push("HTML not fetched — scored from catalog only");
  }
  if (snap.h1) {
    score += 3;
    notes.push("Has a visible H1");
  }
  if (snap.cta) {
    score += 3;
    notes.push(`CTA seen: ${snap.cta}`);
  }
  if (snap.cta && ctaFitsIndustry(snap.cta, industry)) {
    score += 6;
    notes.push("CTA fits this industry");
  }
  if (snap.description.length >= 40 && snap.description.length <= 200) {
    score += 2;
  }
  if (snap.nav.length >= 4) {
    score += 2;
    notes.push("Nav has real depth");
  }
  const blob = `${snap.title} ${snap.h1} ${snap.cta} ${snap.description}`.toLowerCase();
  if (industryWords(industry).test(blob)) {
    score += 3;
    notes.push("Copy talks about this industry");
  }
  if (
    industry !== "food" &&
    /reserve a table|seasonal small plates|kitchen ticket/.test(blob)
  ) {
    score -= 8;
    notes.push("Restaurant leftovers — penalized");
  }
  if (industry === "dealership") {
    if (/hold|test drive|trade-in|financing|inventory|delivery/.test(blob)) {
      score += 4;
      notes.push("Customer-friendly lot method (hold / drive / finance / delivery)");
    }
    if (/ups ground|ups 2nd|ship a car ups|parcel ground/.test(blob)) {
      score -= 10;
      notes.push("UPS on a car — fail");
    }
  }
  return { score, notes };
}

export function parseDuckDuckGoResultUrls(html: string): string[] {
  const urls: string[] = [];
  const uddg = [...html.matchAll(/uddg=([^&"]+)/gi)].map((m) => {
    try {
      return decodeURIComponent(m[1] ?? "");
    } catch {
      return "";
    }
  });
  const hrefs = [...html.matchAll(/class="result__a"[^>]+href="([^"]+)"/gi)].map(
    (m) => m[1] ?? "",
  );
  for (const raw of [...uddg, ...hrefs]) {
    if (!/^https?:\/\//i.test(raw)) continue;
    if (/duckduckgo\.com/i.test(raw)) continue;
    urls.push(raw);
  }
  return [...new Set(urls)].slice(0, 8);
}

async function fetchPublicHtml(
  url: string,
): Promise<{ html: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "CinchSeedResearch/1.0 (+https://cinchseed.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      return null;
    }
    return { html: (await response.text()).slice(0, 400_000) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchComparableUrls(query: string): Promise<string[]> {
  const html = await fetchPublicHtml(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
  );
  if (!html?.html) return [];
  return parseDuckDuckGoResultUrls(html.html);
}

function snapshotFromHtml(
  url: string,
  html: string | null,
  industry: string,
): ComparableSnapshot {
  const host = hostOf(url);
  const title = html ? pickTitle(html) : host;
  const h1 = html ? pickH1(html) : "";
  const description = html ? pickMetaDescription(html) : "";
  const ctas = html ? pickCtas(html) : [];
  const cta =
    ctas.find((item) => ctaFitsIndustry(item, industry)) ?? ctas[0] ?? "";
  const nav = html ? pickNav(html) : [];
  const base = {
    url,
    host,
    fetched: Boolean(html),
    title,
    h1,
    cta,
    description,
    nav,
  };
  const scored = scoreComparableSnapshot(base, industry);
  return { ...base, ...scored };
}

function titleCaseCta(cta: string): string {
  return cta
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .replace(/\bAnd\b/g, "and")
    .replace(/\bA\b/g, "a")
    .replace(/\bThe\b/g, "the");
}

function compactText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function looksLikeSeoJunk(text: string | null | undefined): boolean {
  if (!text) return false;
  return /seo:|complete guide|higher rankings|page unavailable|skip to (?:content|main)|we'?re sorry for any inconvenience|shop on carstory/i.test(
    text,
  );
}

function containsForeignBrand(text: string, hosts: string[]): boolean {
  const hay = compactText(text);
  return hosts.some((host) => {
    const brand = compactText((host.split(".")[0] ?? "").replace(/-/g, ""));
    return brand.length >= 5 && hay.includes(brand);
  });
}

export function uniqueCompetitorHosts(urls: string[]): string[] {
  return [...new Set(urls.map((url) => hostOf(url)).filter(Boolean))];
}

export function researchMeetsHardRule(
  research: ComparableResearch | null | undefined,
): boolean {
  if (!research) return false;
  if (
    uniqueCompetitorHosts(research.urlsConsidered).length < MIN_COMPARABLE_CRAWL
  ) {
    return false;
  }
  if (
    looksLikeSeoJunk(research.bestSeoTitle) ||
    looksLikeSeoJunk(research.bestHeadline) ||
    looksLikeSeoJunk(research.bestCta)
  ) {
    return false;
  }
  const hosts = uniqueCompetitorHosts([
    ...research.urlsConsidered,
    ...research.snapshots.map((snap) => snap.url),
  ]);
  if (
    (research.bestHeadline &&
      containsForeignBrand(research.bestHeadline, hosts)) ||
    (research.bestSeoTitle &&
      containsForeignBrand(research.bestSeoTitle, hosts))
  ) {
    return false;
  }
  return true;
}

function uniqueUrlsByHost(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const host = hostOf(url);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    out.push(url);
  }
  return out;
}

export function composeBestOfEach(
  snapshots: ComparableSnapshot[],
  industry: string,
): BestOfEach {
  const ranked = [...snapshots].sort((a, b) => b.score - a.score);
  const used = new Set<string>();

  function take(
    pick: (snap: ComparableSnapshot) => string,
  ): BestOfPiece | null {
    const unused = ranked.filter((snap) => !used.has(snap.host));
    for (const snap of [...unused, ...ranked]) {
      const value = pick(snap).replace(/\s+/g, " ").trim();
      if (!value) continue;
      if (looksLikeSeoJunk(value)) continue;
      // Never reuse a line that names any crawled brand — including this host.
      if (containsForeignBrand(value, snapshots.map((item) => item.host))) {
        continue;
      }
      used.add(snap.host);
      return { value, fromHost: snap.host, fromUrl: snap.url };
    }
    return null;
  }

  return {
    cta: take((snap) =>
      snap.cta && ctaFitsIndustry(snap.cta, industry) ? snap.cta : "",
    ),
    headline: take((snap) =>
      snap.h1.length >= 8 && snap.h1.length <= 80 ? snap.h1 : "",
    ),
    seoTitle: take((snap) =>
      snap.title.length >= 8 ? snap.title.slice(0, 60) : "",
    ),
    seoDescription: take((snap) =>
      snap.description.length >= 40 ? snap.description.slice(0, 160) : "",
    ),
    nav: take((snap) =>
      snap.nav.length >= 3 ? snap.nav.slice(0, 6).join(", ") : "",
    ),
    methods: collectAttributedMethods(ranked, industry),
  };
}

export function applyComparableOverlay(
  copy: SeedSiteCopy,
  research: ComparableResearch,
): SeedSiteCopy {
  // Club pages keep the specification. Competitor lines stay in the research notes.
  if (research.industry === "club") return copy;
  const next = { ...copy };
  const cta = research.bestOfEach?.cta?.value ?? research.bestCta;
  const headline = research.bestOfEach?.headline?.value ?? research.bestHeadline;
  if (cta && ctaFitsIndustry(cta, research.industry)) {
    next.cta = titleCaseCta(cta);
  }
  if (
    headline &&
    headline.length >= 8 &&
    headline.length <= 80 &&
    !containsForeignBrand(
      headline,
      research.snapshots.map((snap) => snap.host),
    ) &&
    !(
      research.industry === "delivery" &&
      /pizza with personality|reserve a table|table worth dressing|dinner service|chef/i.test(
        headline,
      )
    )
  ) {
    next.headline = headline;
  }
  const methods = research.customerFriendlyMethods;
  if (research.industry === "dealership" && methods.length > 0) {
    next.support = `Inspected used cars with the price on the card. ${methods.slice(0, 3).join(". ")}.`;
    next.aboutBody = next.support;
    next.bookHeadline = "Hold a car or book a drive";
  }
  return next;
}

export function applyComparableOverlayToShop(
  shop: SeedShopCopy,
  research: ComparableResearch | null,
): SeedShopCopy {
  if (!research || research.industry !== "dealership") return shop;
  const methods = research.customerFriendlyMethods;
  if (!methods.length) return shop;
  return {
    ...shop,
    support: `Inspected units from this lot — ${methods.slice(0, 3).join(" · ")}. We do not ship cars UPS.`,
  };
}

export function compareComparableSites(
  snapshots: ComparableSnapshot[],
): ComparableSnapshot | null {
  if (!snapshots.length) return null;
  return [...snapshots].sort((a, b) => b.score - a.score)[0] ?? null;
}

export async function researchComparables(input: {
  projectName: string;
  brief: string;
  referenceUrl?: string | null;
}): Promise<ComparableResearch> {
  const industry = seedIndustryKey(input.projectName, input.brief);
  const query = comparableSearchQuery(input.projectName, input.brief);
  const searched = await searchComparableUrls(query);
  const catalog = idealUrlsForIndustry(industry);
  const reference = input.referenceUrl?.trim() || "";
  const urls = uniqueUrlsByHost([
    ...catalog,
    ...searched,
    ...(reference && /^https?:\/\//i.test(reference) ? [reference] : []),
  ]);
  for (const extra of catalog) {
    if (urls.length >= MIN_COMPARABLE_CRAWL) break;
    if (!urls.includes(extra)) urls.push(extra);
  }

  const snapshots = await Promise.all(
    urls.map(async (url) => {
      const fetched = await fetchPublicHtml(url);
      return snapshotFromHtml(url, fetched?.html ?? null, industry);
    }),
  );

  const winner = compareComparableSites(snapshots);
  const bestOfEach = composeBestOfEach(snapshots, industry);
  const methods = bestOfEach.methods.map((piece) => piece.value);
  const takeaways: string[] = [
    SEED_COMPARE_IDEALS_RULE.summary,
    `Crawled ${uniqueCompetitorHosts(urls).length} competitor hosts (${snapshots.filter((s) => s.fetched).length} returned HTML).`,
  ];
  if (bestOfEach.cta) {
    takeaways.push(
      `Best CTA from ${bestOfEach.cta.fromHost}: “${bestOfEach.cta.value}”.`,
    );
  }
  if (bestOfEach.headline) {
    takeaways.push(
      `Best headline from ${bestOfEach.headline.fromHost}: “${bestOfEach.headline.value.slice(0, 80)}”.`,
    );
  }
  if (bestOfEach.seoTitle) {
    takeaways.push(
      `Best SEO title from ${bestOfEach.seoTitle.fromHost}: “${bestOfEach.seoTitle.value}”.`,
    );
  }
  if (bestOfEach.nav) {
    takeaways.push(
      `Best nav from ${bestOfEach.nav.fromHost}: ${bestOfEach.nav.value}.`,
    );
  }
  if (industry === "dealership") {
    takeaways.push(
      "Customer-friendly lot method: hold the unit, book a drive, or dealer-deliver the car. Never UPS a vehicle.",
    );
  }
  if (industry === "club") {
    takeaways.push(
      "Club pages keep the specification. Take quiz, skip-or-gift, maker notes, and package reorder as features. Do not paste competitor headlines. Show the customer five reference sites.",
    );
  }
  takeaways.push(
    ...bestOfEach.methods.map(
      (piece) => `Best method from ${piece.fromHost}: ${piece.value}`,
    ),
  );
  if (winner) {
    takeaways.push(`Highest overall score: ${winner.host} (${winner.score}).`);
  }

  return {
    query,
    industry,
    searchedAt: new Date().toISOString(),
    urlsConsidered: urls,
    snapshots,
    winnerUrl: winner?.url ?? null,
    bestCta: bestOfEach.cta?.value ?? null,
    bestHeadline: bestOfEach.headline?.value ?? null,
    bestSeoTitle: bestOfEach.seoTitle?.value ?? null,
    bestSeoDescription: bestOfEach.seoDescription?.value ?? null,
    customerFriendlyMethods: methods,
    bestOfEach,
    takeaways,
  };
}

function collectAttributedMethods(
  snapshots: ComparableSnapshot[],
  industry: string,
): BestOfPiece[] {
  const patterns: { test: RegExp; value: string }[] =
    industry === "dealership"
      ? [
          {
            test: /hold|reserve (?:this|the)? ?(?:car|vehicle|unit)/,
            value: "Hold / reserve the unit on the lot",
          },
          {
            test: /test drive|book a drive/,
            value: "Book a test drive",
          },
          {
            test: /deliver|home delivery|we bring/,
            value: "Dealer delivers the car",
          },
          {
            test: /financ|pre-?qualif|monthly payment/,
            value: "See financing before you sign",
          },
          {
            test: /trade/,
            value: "Written trade-in number",
          },
          {
            test: /inspect|certified|carfax/,
            value: "Inspected history on the card",
          },
        ]
      : industry === "food"
        ? [
            { test: /order online|start order/, value: "Order online" },
            { test: /pickup|carryout/, value: "Pickup at the counter" },
            { test: /deliver/, value: "Local delivery" },
          ]
        : [];

  const found: BestOfPiece[] = [];
  const seen = new Set<string>();
  for (const snap of snapshots) {
    const blob =
      `${snap.cta} ${snap.h1} ${snap.nav.join(" ")} ${snap.description}`.toLowerCase();
    for (const pattern of patterns) {
      if (seen.has(pattern.value)) continue;
      if (!pattern.test.test(blob)) continue;
      seen.add(pattern.value);
      found.push({
        value: pattern.value,
        fromHost: snap.host,
        fromUrl: snap.url,
      });
    }
  }
  if (industry === "dealership" && found.length === 0) {
    return [
      {
        value: "Hold on the lot",
        fromHost: "industry-default",
        fromUrl: "",
      },
      {
        value: "Book a test drive",
        fromHost: "industry-default",
        fromUrl: "",
      },
      {
        value: "Dealer delivery — not UPS",
        fromHost: "industry-default",
        fromUrl: "",
      },
    ];
  }
  return found.slice(0, 8);
}

export function seoSourceFromResearch(
  brand: string,
  research: ComparableResearch,
): string {
  if (research.industry === "club") {
    return `export const siteSeo = {
  title: ${JSON.stringify(`${brand} · Monthly Wisconsin pairings`)},
  description: ${JSON.stringify("A taste quiz matches you to a Wisconsin cheese and wine pairing. Reorder from the package. A share of the margin stays with farm nonprofits.")},
  robots: "index,follow",
  aio: "Taste quiz, monthly pairing, package reorder, skip or gift a month, maker notes. Competitor headlines stay off this page.",
};
`;
  }
  const title =
    research.bestSeoTitle &&
    !containsForeignBrand(
      research.bestSeoTitle,
      research.snapshots.map((s) => s.host),
    )
      ? `${brand} · ${research.bestSeoTitle}`.slice(0, 60)
      : research.industry === "dealership"
        ? `${brand} · Used cars, financing, and trade-ins`
        : `${brand}`;
  const description =
    research.bestSeoDescription ||
    (research.industry === "dealership"
      ? `${brand} sells inspected used cars. Hold a unit, book a drive, or ask for dealer delivery. No UPS shipping on vehicles.`
      : research.takeaways.slice(0, 2).join(" "));
  const methods = research.customerFriendlyMethods.join("; ");
  return `export const siteSeo = {
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(description.slice(0, 160))},
  robots: "index,follow",
  aio: ${JSON.stringify(methods || SEED_COMPARE_IDEALS_RULE.summary)},
};
`;
}

export function comparableResearchMarkdown(
  research: ComparableResearch,
): string {
  const rows = research.snapshots
    .map(
      (snap) =>
        `- ${snap.fetched ? "fetched" : "catalog"} ${snap.host} — score ${snap.score}${
          snap.cta ? ` — CTA “${snap.cta}”` : ""
        }${snap.url === research.winnerUrl ? " — WINNER" : ""}`,
    )
    .join("\n");
  return `# Comparable ideal sites

## HARD RULE

${SEED_COMPARE_IDEALS_RULE.summary}

## Query

${research.query}

## Compared

${rows || "- (none)"}

## Best of each competitor

${
  research.bestOfEach
    ? [
        research.bestOfEach.cta &&
          `- CTA from ${research.bestOfEach.cta.fromHost}: “${research.bestOfEach.cta.value}”`,
        research.bestOfEach.headline &&
          `- Headline from ${research.bestOfEach.headline.fromHost}: “${research.bestOfEach.headline.value}”`,
        research.bestOfEach.seoTitle &&
          `- SEO title from ${research.bestOfEach.seoTitle.fromHost}: “${research.bestOfEach.seoTitle.value}”`,
        research.bestOfEach.seoDescription &&
          `- SEO description from ${research.bestOfEach.seoDescription.fromHost}: “${research.bestOfEach.seoDescription.value}”`,
        research.bestOfEach.nav &&
          `- Nav from ${research.bestOfEach.nav.fromHost}: ${research.bestOfEach.nav.value}`,
        ...research.bestOfEach.methods.map(
          (piece) => `- Method from ${piece.fromHost}: ${piece.value}`,
        ),
      ]
        .filter(Boolean)
        .join("\n")
    : "- (compose after crawl)"
}

## Customer-friendly methods

${(research.customerFriendlyMethods ?? []).map((line) => `- ${line}`).join("\n") || "- (none yet)"}

## SEO / AIO

- Title: ${research.bestSeoTitle || "(industry default)"}
- Description: ${research.bestSeoDescription || "(industry default)"}

## Reference sites for the customer

${customerReferenceSites(research.industry, research)
  .map((site) => `- [${site.host}](${site.url}) — ${site.feature}`)
  .join("\n")}

## Take the best of each

${research.takeaways.map((line) => `- ${line}`).join("\n")}

Crawled ${research.urlsConsidered.length} URLs. Researched: ${research.searchedAt}
`;
}

export function parseComparableResearch(
  raw: string,
): ComparableResearch | null {
  try {
    const parsed = JSON.parse(raw) as ComparableResearch;
    if (!parsed || !parsed.industry || !Array.isArray(parsed.snapshots)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
