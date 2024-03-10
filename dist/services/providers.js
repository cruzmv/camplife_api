"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCruiserList = exports.updatePark4NightCoordinates = void 0;
const postgresql_1 = require("./postgresql");
const park4night_1 = require("./providers/park4night");
// const modules = [
//     require('./providers/ioverlander'),
//     require('./providers/furgo'),
//     require('./providers/park4night')
// ];
// Execute each module
// async function executeModules() {
//     const allLocationsData:DataItem[] = []
//     for (const module of modules) {
//         try {
//             if (module.readDataFolder){
//                 console.log("Grabing data from ",module.name);
//                 const locationsData = await module.readDataFolder();
//                 allLocationsData.push(...locationsData)
//             }
//         } catch (error) {
//             console.error('Error executing module:', error);
//         }
//     }
//     try{
//         const processedData = allLocationsData.map(data => {
//             const processed: DataItem = {
//                 id: null,
//                 name: data.name ?? null,
//                 date_verified: data.date_verified ?? null,
//                 description: data.description ?? null,
//                 location: {
//                     latitude: data.location?.latitude ?? null,
//                     longitude: data.location?.longitude ?? null,
//                 },
//                 category: {
//                     name: data.category?.name ?? null,
//                 },
//                 address: data.address ?? null,
//                 date_creation: data.date_creation ?? null,
//                 description_fr: data.description_fr ?? null,
//                 description_en: data.description_en ?? null,
//                 description_de: data.description_de ?? null,
//                 description_es: data.description_es ?? null,
//                 description_it: data.description_it ?? null,
//                 description_nl: data.description_nl ?? null,
//                 reseaux: data.reseaux ?? null,
//                 date_fermeture: data.date_fermeture ?? null,
//                 borne: data.borne ?? null,
//                 prix_stationnement: data.prix_stationnement ?? null,
//                 prix_services: data.prix_services ?? null,
//                 nb_places: data.nb_places ?? null,
//                 hauteur_limite: data.hauteur_limite ?? null,
//                 route: data.route ?? null,
//                 ville: data.ville ?? null,
//                 code_postal: data.code_postal ?? null,
//                 pays: data.pays ?? null,
//                 pays_iso: data.pays_iso ?? null,
//                 publique: data.publique ?? null,
//                 nature_protect: data.nature_protect ?? null,
//                 contact_visible: data.contact_visible ?? null,
//                 top_liste: data.top_liste ?? null,
//                 site_internet: data.site_internet ?? null,
//                 video: data.video ?? null,
//                 tel: data.tel ?? null,
//                 mail: data.mail ?? null,
//                 note_moyenne: data.note_moyenne ?? null,
//                 nb_commentaires: data.nb_commentaires ?? null,
//                 nb_visites: data.nb_visites ?? null,
//                 nb_photos: data.nb_photos ?? null,
//                 validation_admin: data.validation_admin ?? null,
//                 caravaneige: data.caravaneige ?? null,
//                 animaux: data.animaux ?? null,
//                 point_eau: data.point_eau ?? null,
//                 eau_noire: data.eau_noire ?? null,
//                 eau_usee: data.eau_usee ?? null,
//                 wc_public: data.wc_public ?? null,
//                 poubelle: data.poubelle ?? null,
//                 douche: data.douche ?? null,
//                 boulangerie: data.boulangerie ?? null,
//                 electricite: data.electricite ?? null,
//                 wifi: data.wifi ?? null,
//                 piscine: data.piscine ?? null,
//                 laverie: data.laverie ?? null,
//                 gaz: data.gaz ?? null,
//                 gpl: data.gpl ?? null,
//                 donnees_mobile: data.donnees_mobile ?? null,
//                 lavage: data.lavage ?? null,
//                 visites: data.visites ?? null,
//                 windsurf: data.windsurf ?? null,
//                 vtt: data.vtt ?? null,
//                 rando: data.rando ?? null,
//                 escalade: data.escalade ?? null,
//                 eaux_vives: data.eaux_vives ?? null,
//                 peche: data.peche ?? null,
//                 peche_pied: data.peche_pied ?? null,
//                 moto: data.moto ?? null,
//                 point_de_vue: data.point_de_vue ?? null,
//                 baignade: data.baignade ?? null,
//                 jeux_enfants: data.jeux_enfants ?? null,
//                 distance: data.distance ?? null,
//                 code: data.code ?? null,
//                 utilisateur_creation: data.utilisateur_creation ?? null,
//                 user_id: data.user_id ?? null,
//                 user_vehicule: data.user_vehicule ?? null,
//                 photos: data.photos ?? null,
//             };
//             return processed;
//         });
//         console.log('Updating Database...')
//         await insertOrUpdateData(processedData)
//         console.log('Finish update');
//     } catch(error){
//         console.error('Error inserting or updating data:', error);
//     }
// }
function updatePark4NightCoordinates(lat, long) {
    return __awaiter(this, void 0, void 0, function* () {
        const locationsData = yield (0, park4night_1.readDataFolder)(lat, long);
        try {
            const processedData = locationsData.map(data => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52;
                const processed = {
                    id: null,
                    name: (_a = data.name) !== null && _a !== void 0 ? _a : null,
                    date_verified: (_b = data.date_verified) !== null && _b !== void 0 ? _b : null,
                    description: (_c = data.description) !== null && _c !== void 0 ? _c : null,
                    location: {
                        latitude: (_e = (_d = data.location) === null || _d === void 0 ? void 0 : _d.latitude) !== null && _e !== void 0 ? _e : null,
                        longitude: (_g = (_f = data.location) === null || _f === void 0 ? void 0 : _f.longitude) !== null && _g !== void 0 ? _g : null,
                    },
                    category: {
                        name: (_j = (_h = data.category) === null || _h === void 0 ? void 0 : _h.name) !== null && _j !== void 0 ? _j : null,
                    },
                    address: (_k = data.address) !== null && _k !== void 0 ? _k : null,
                    date_creation: (_l = data.date_creation) !== null && _l !== void 0 ? _l : null,
                    description_fr: (_m = data.description_fr) !== null && _m !== void 0 ? _m : null,
                    description_en: (_o = data.description_en) !== null && _o !== void 0 ? _o : null,
                    description_de: (_p = data.description_de) !== null && _p !== void 0 ? _p : null,
                    description_es: (_q = data.description_es) !== null && _q !== void 0 ? _q : null,
                    description_it: (_r = data.description_it) !== null && _r !== void 0 ? _r : null,
                    description_nl: (_s = data.description_nl) !== null && _s !== void 0 ? _s : null,
                    reseaux: (_t = data.reseaux) !== null && _t !== void 0 ? _t : null,
                    date_fermeture: (_u = data.date_fermeture) !== null && _u !== void 0 ? _u : null,
                    borne: (_v = data.borne) !== null && _v !== void 0 ? _v : null,
                    prix_stationnement: (_w = data.prix_stationnement) !== null && _w !== void 0 ? _w : null,
                    prix_services: (_x = data.prix_services) !== null && _x !== void 0 ? _x : null,
                    nb_places: (_y = data.nb_places) !== null && _y !== void 0 ? _y : null,
                    hauteur_limite: (_z = data.hauteur_limite) !== null && _z !== void 0 ? _z : null,
                    route: (_0 = data.route) !== null && _0 !== void 0 ? _0 : null,
                    ville: (_1 = data.ville) !== null && _1 !== void 0 ? _1 : null,
                    code_postal: (_2 = data.code_postal) !== null && _2 !== void 0 ? _2 : null,
                    pays: (_3 = data.pays) !== null && _3 !== void 0 ? _3 : null,
                    pays_iso: (_4 = data.pays_iso) !== null && _4 !== void 0 ? _4 : null,
                    publique: (_5 = data.publique) !== null && _5 !== void 0 ? _5 : null,
                    nature_protect: (_6 = data.nature_protect) !== null && _6 !== void 0 ? _6 : null,
                    contact_visible: (_7 = data.contact_visible) !== null && _7 !== void 0 ? _7 : null,
                    top_liste: (_8 = data.top_liste) !== null && _8 !== void 0 ? _8 : null,
                    site_internet: (_9 = data.site_internet) !== null && _9 !== void 0 ? _9 : null,
                    video: (_10 = data.video) !== null && _10 !== void 0 ? _10 : null,
                    tel: (_11 = data.tel) !== null && _11 !== void 0 ? _11 : null,
                    mail: (_12 = data.mail) !== null && _12 !== void 0 ? _12 : null,
                    note_moyenne: (_13 = data.note_moyenne) !== null && _13 !== void 0 ? _13 : null,
                    nb_commentaires: (_14 = data.nb_commentaires) !== null && _14 !== void 0 ? _14 : null,
                    nb_visites: (_15 = data.nb_visites) !== null && _15 !== void 0 ? _15 : null,
                    nb_photos: (_16 = data.nb_photos) !== null && _16 !== void 0 ? _16 : null,
                    validation_admin: (_17 = data.validation_admin) !== null && _17 !== void 0 ? _17 : null,
                    caravaneige: (_18 = data.caravaneige) !== null && _18 !== void 0 ? _18 : null,
                    animaux: (_19 = data.animaux) !== null && _19 !== void 0 ? _19 : null,
                    point_eau: (_20 = data.point_eau) !== null && _20 !== void 0 ? _20 : null,
                    eau_noire: (_21 = data.eau_noire) !== null && _21 !== void 0 ? _21 : null,
                    eau_usee: (_22 = data.eau_usee) !== null && _22 !== void 0 ? _22 : null,
                    wc_public: (_23 = data.wc_public) !== null && _23 !== void 0 ? _23 : null,
                    poubelle: (_24 = data.poubelle) !== null && _24 !== void 0 ? _24 : null,
                    douche: (_25 = data.douche) !== null && _25 !== void 0 ? _25 : null,
                    boulangerie: (_26 = data.boulangerie) !== null && _26 !== void 0 ? _26 : null,
                    electricite: (_27 = data.electricite) !== null && _27 !== void 0 ? _27 : null,
                    wifi: (_28 = data.wifi) !== null && _28 !== void 0 ? _28 : null,
                    piscine: (_29 = data.piscine) !== null && _29 !== void 0 ? _29 : null,
                    laverie: (_30 = data.laverie) !== null && _30 !== void 0 ? _30 : null,
                    gaz: (_31 = data.gaz) !== null && _31 !== void 0 ? _31 : null,
                    gpl: (_32 = data.gpl) !== null && _32 !== void 0 ? _32 : null,
                    donnees_mobile: (_33 = data.donnees_mobile) !== null && _33 !== void 0 ? _33 : null,
                    lavage: (_34 = data.lavage) !== null && _34 !== void 0 ? _34 : null,
                    visites: (_35 = data.visites) !== null && _35 !== void 0 ? _35 : null,
                    windsurf: (_36 = data.windsurf) !== null && _36 !== void 0 ? _36 : null,
                    vtt: (_37 = data.vtt) !== null && _37 !== void 0 ? _37 : null,
                    rando: (_38 = data.rando) !== null && _38 !== void 0 ? _38 : null,
                    escalade: (_39 = data.escalade) !== null && _39 !== void 0 ? _39 : null,
                    eaux_vives: (_40 = data.eaux_vives) !== null && _40 !== void 0 ? _40 : null,
                    peche: (_41 = data.peche) !== null && _41 !== void 0 ? _41 : null,
                    peche_pied: (_42 = data.peche_pied) !== null && _42 !== void 0 ? _42 : null,
                    moto: (_43 = data.moto) !== null && _43 !== void 0 ? _43 : null,
                    point_de_vue: (_44 = data.point_de_vue) !== null && _44 !== void 0 ? _44 : null,
                    baignade: (_45 = data.baignade) !== null && _45 !== void 0 ? _45 : null,
                    jeux_enfants: (_46 = data.jeux_enfants) !== null && _46 !== void 0 ? _46 : null,
                    distance: (_47 = data.distance) !== null && _47 !== void 0 ? _47 : null,
                    code: (_48 = data.code) !== null && _48 !== void 0 ? _48 : null,
                    utilisateur_creation: (_49 = data.utilisateur_creation) !== null && _49 !== void 0 ? _49 : null,
                    user_id: (_50 = data.user_id) !== null && _50 !== void 0 ? _50 : null,
                    user_vehicule: (_51 = data.user_vehicule) !== null && _51 !== void 0 ? _51 : null,
                    photos: (_52 = data.photos) !== null && _52 !== void 0 ? _52 : null,
                };
                return processed;
            });
            console.log('Updating Database...');
            yield (0, postgresql_1.insertOrUpdatePlaces)(processedData);
            console.log('Finish update');
        }
        catch (error) {
            console.error('Error inserting or updating data:', error);
        }
    });
}
exports.updatePark4NightCoordinates = updatePark4NightCoordinates;
function updateCruiserList(body) {
    return __awaiter(this, void 0, void 0, function* () {
        let url = `https://www.gays-cruising.com/en/${body.country}`;
        if (body.city !== undefined &&
            body.country !== undefined &&
            body.lat !== undefined &&
            body.long !== undefined) {
            url = `https://www.gays-cruising.com/en/${body.city}/${body.country}#map-zoom=${body.zoom}&map-lat=${body.lat}&map-lng=${body.long}`;
        }
        else if (body.city !== undefined) {
            url = `https://www.gays-cruising.com/en/${body.city}/${body.country}`;
        }
        console.log(`cruiser_list: ${url}`);
        const puppeteer = require('puppeteer');
        const browser = yield puppeteer.launch({ args: ['--no-sandbox'] });
        const page = yield browser.newPage();
        yield page.goto(url);
        yield page.waitForFunction('typeof gcMaps !== "undefined"');
        console.log("Getting places...");
        const result = [];
        for (let mI = 0; mI < 20; mI++) {
            let markerString = `gcMaps.parametros.markers[${mI}]  !== undefined`;
            let markerExists = yield page.evaluate(markerString);
            if (markerExists) {
                let cI = 0;
                while (markerExists) {
                    const latlng = yield page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._latlng`);
                    const title = yield page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[0].innerText`);
                    const place = yield page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[1].innerText`);
                    const text = yield page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[2].innerText`);
                    const more = yield page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[3].children[0].href`);
                    result.push({
                        lat: latlng.lat,
                        lng: latlng.lng,
                        title: title,
                        place: place,
                        text: text,
                        more: more
                    });
                    cI++;
                    markerString = `gcMaps.parametros.markers[${mI}][${cI}] !== undefined`;
                    markerExists = yield page.evaluate(markerString);
                    //console.log(latlng);
                }
            }
        }
        yield browser.close();
        console.log(`Got ${result.length} places`);
        yield (0, postgresql_1.insertOrUpdateCruiserList)(result);
    });
}
exports.updateCruiserList = updateCruiserList;
//# sourceMappingURL=providers.js.map