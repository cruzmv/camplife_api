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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertOrUpdateCruiserList = exports.insertOrUpdatePlaces = exports.db = void 0;
const uuid_1 = require("uuid");
const pg_promise_1 = __importDefault(require("pg-promise"));
// Create a connection to the PostgreSQL database
const pgp = (0, pg_promise_1.default)();
const db = pgp({
    host: '192.168.1.67', //'172.31.193.127', // Replace with your database host
    port: 5432, // Replace with your database port
    database: 'postgres', // Replace with your database name
    user: 'postgres', // Replace with your database username
    password: '142536' // Replace with your database password
});
exports.db = db;
// Function to insert or update data in the database
function insertOrUpdatePlaces(data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            for (const dataItem of data) {
                yield db.tx((t) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c, _d, _e;
                    //if (!dataItem.id) {
                    dataItem.id = (0, uuid_1.v4)();
                    //}
                    const existingData = yield t.oneOrNone('SELECT * FROM places WHERE location_latitude = $1 AND location_longitude = $2', [(_a = dataItem.location) === null || _a === void 0 ? void 0 : _a.latitude, (_b = dataItem.location) === null || _b === void 0 ? void 0 : _b.longitude]);
                    if (existingData) {
                        yield t.none('DELETE FROM photos WHERE place_id = $1; DELETE FROM places WHERE id = $1', [existingData.id]);
                    }
                    yield t.batch([
                        t.none('INSERT INTO places(id, name, date_verified, description, ' +
                            'location_latitude, location_longitude, category_name, address, date_creation, ' +
                            'description_fr, description_en, description_de, description_es, description_it, ' +
                            'description_nl, reseaux, date_fermeture, borne, prix_stationnement, prix_services, ' +
                            'nb_places, hauteur_limite, route, ville, code_postal, pays, pays_iso, publique, ' +
                            'nature_protect, contact_visible, top_liste, site_internet, video, tel, mail, ' +
                            'note_moyenne, nb_commentaires, nb_visites, nb_photos, validation_admin, ' +
                            'caravaneige, animaux, point_eau, eau_noire, eau_usee, wc_public, poubelle, douche, ' +
                            'boulangerie, electricite, wifi, piscine, laverie, gaz, gpl, donnees_mobile, lavage, ' +
                            'visites, windsurf, vtt, rando, escalade, eaux_vives, peche, peche_pied, moto, ' +
                            'point_de_vue, baignade, jeux_enfants, distance, code, utilisateur_creation, user_id, ' +
                            'user_vehicule) ' +
                            'VALUES($1, $2, $3, $4, ' +
                            '$5, $6, $7, $8, $9, ' +
                            '$10, $11, $12, $13, $14, ' +
                            '$15, $16, $17, $18, $19, $20, ' +
                            '$21, $22, $23, $24, $25, $26, $27, $28, ' +
                            '$29, $30, $31, $32, $33, $34, $35, $36, $37, $38, ' +
                            '$39, $40, $41, $42, $43, $44, $45, $46, $47, $48, ' +
                            '$49, $50, $51, $52, $53, $54, $55, $56, $57, $58, ' +
                            '$59, $60, $61, $62, $63, $64, $65, $66, $67, $68, ' +
                            '$69, $70, $71, $72, $73, $74)', [
                            dataItem.id,
                            dataItem.name,
                            dataItem.date_verified,
                            dataItem.description,
                            (_c = dataItem.location) === null || _c === void 0 ? void 0 : _c.latitude,
                            (_d = dataItem.location) === null || _d === void 0 ? void 0 : _d.longitude,
                            (_e = dataItem.category) === null || _e === void 0 ? void 0 : _e.name,
                            dataItem.address,
                            dataItem.date_creation,
                            dataItem.description_fr,
                            dataItem.description_en,
                            dataItem.description_de,
                            dataItem.description_es,
                            dataItem.description_it,
                            dataItem.description_nl,
                            dataItem.reseaux,
                            dataItem.date_fermeture,
                            dataItem.borne,
                            dataItem.prix_stationnement,
                            dataItem.prix_services,
                            dataItem.nb_places,
                            dataItem.hauteur_limite,
                            dataItem.route,
                            dataItem.ville,
                            dataItem.code_postal,
                            dataItem.pays,
                            dataItem.pays_iso,
                            dataItem.publique,
                            dataItem.nature_protect,
                            dataItem.contact_visible,
                            dataItem.top_liste,
                            dataItem.site_internet,
                            dataItem.video,
                            dataItem.tel,
                            dataItem.mail,
                            dataItem.note_moyenne,
                            dataItem.nb_commentaires,
                            dataItem.nb_visites,
                            dataItem.nb_photos,
                            dataItem.validation_admin,
                            dataItem.caravaneige,
                            dataItem.animaux,
                            dataItem.point_eau,
                            dataItem.eau_noire,
                            dataItem.eau_usee,
                            dataItem.wc_public,
                            dataItem.poubelle,
                            dataItem.douche,
                            dataItem.boulangerie,
                            dataItem.electricite,
                            dataItem.wifi,
                            dataItem.piscine,
                            dataItem.laverie,
                            dataItem.gaz,
                            dataItem.gpl,
                            dataItem.donnees_mobile,
                            dataItem.lavage,
                            dataItem.visites,
                            dataItem.windsurf,
                            dataItem.vtt,
                            dataItem.rando,
                            dataItem.escalade,
                            dataItem.eaux_vives,
                            dataItem.peche,
                            dataItem.peche_pied,
                            dataItem.moto,
                            dataItem.point_de_vue,
                            dataItem.baignade,
                            dataItem.jeux_enfants,
                            dataItem.distance,
                            dataItem.code,
                            dataItem.utilisateur_creation,
                            dataItem.user_id,
                            dataItem.user_vehicule,
                        ]),
                        // Insert or update photo data
                        ...(dataItem.photos || []).map((photo) => t.none('INSERT INTO photos(id, link_large, link_thumb, numero, p4n_user_id, pn_lieu_id, place_id) ' +
                            'VALUES($1, $2, $3, $4, $5, $6, $7)', [
                            photo.id,
                            photo.link_large,
                            photo.link_thumb,
                            photo.numero,
                            photo.p4n_user_id,
                            photo.pn_lieu_id,
                            dataItem.id,
                        ])),
                    ]);
                }));
            }
        }
        catch (error) {
            console.error('Error inserting or updating data:', error.message || error);
            throw error;
        }
    });
}
exports.insertOrUpdatePlaces = insertOrUpdatePlaces;
function insertOrUpdateCruiserList(data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`Recording into database...`);
            for (const item of data) {
                const existingRecord = yield db.oneOrNone('SELECT * FROM cruiser_list WHERE lat = $1 AND lng = $2', [item.lat, item.lng]);
                if (existingRecord) {
                    // Update the existing record
                    yield db.none('UPDATE cruiser_list SET title = $1, place = $2, description = $3, more = $4 WHERE lat = $5 AND lng = $6', [item.title, item.place, item.text, item.more, item.lat, item.lng]);
                }
                else {
                    // Insert a new record
                    yield db.none('INSERT INTO cruiser_list(lat, lng, title, place, description, more) VALUES ($1, $2, $3, $4, $5, $6)', [item.lat, item.lng, item.title, item.place, item.text, item.more]);
                }
            }
        }
        catch (error) {
            console.error('Error:', error);
        }
        finally {
            console.log('Finished record into database.');
        }
    });
}
exports.insertOrUpdateCruiserList = insertOrUpdateCruiserList;
//# sourceMappingURL=postgresql.js.map