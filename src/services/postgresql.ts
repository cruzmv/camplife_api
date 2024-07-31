import { v4 as uuidv4 } from 'uuid';
import pgPromise from 'pg-promise';
import { DataItem, Photo } from './providers/dataItem.interface';
import { Observable } from 'rxjs';

// Create a connection to the PostgreSQL database
// const pgp = pgPromise({
//     query(e) {
//         console.log('QUERY:', e.query);
//         console.log('PARAMS:', e.params);  // Optional: log parameters for deeper inspection
//     }
// });
const pgp = pgPromise();
const db = pgp({
    application_name: 'campilife api',
    host: 'cruzmv.ddns.net',   //'192.168.1.67',   //, // Replace with your database host
    port: 5432,         // Replace with your database port
    database: 'camplife', // Replace with your database name
    user: 'postgres', // Replace with your database username
    password: '142536' // Replace with your database password
});

function updateCampings(data: DataItem[]): Observable<void> {
    return new Observable<void>(observer => {
        try {

            data.forEach((element: any) => {
                if (element.id == null) {
                    element.id = uuidv4();
                }
            });

            db.one('SELECT insert_camping_from_json_array($1::text)', [JSON.stringify(data)]).then( (result) => {
                observer.next(result);
                console.log(`Success record for ${data.length} campings`);
            }).catch(error => {
                console.log(`Error on campings records: ${error.message}`);
            }).finally( () =>{
                observer.complete();
                console.log(`Finished PLSQL call`);
            });
        } catch (error: any) {
            console.log(`Error updating campings: ${error.message || error}`);
        }
    });
} 

async function updatePGPlaces(data: DataItem[]): Promise<void> {
    try {
        db.one('SELECT insert_camping_from_json_array($1)', [JSON.stringify(data)]);
    } catch (error: any) {
        console.error('Error inserting or updating data:', error.message || error);
    }
}


async function updatePGIntermache(data: DataItem[]): Promise<void> {
    try {
        db.one('SELECT update_intermache($1)', JSON.stringify(data));
    } catch (error: any) {
        console.error('Error inserting or updating data for intermache:', error.message || error);
    }
}

async function updatePGCampingCarPortugal(data: DataItem[]): Promise<void> {
    try {
        db.one('SELECT update_campingcarportugal($1)', JSON.stringify(data));
    } catch (error: any) {
        console.error('Error inserting or updating data for campingcarportugal:', error.message || error);
    }
}

function updatePGEuroStop(data: DataItem[]): Observable<void> {
    return new Observable<void>(observer => {
        try {
            db.one('SELECT insert_eurostops_from_json_array($1::text)', [JSON.stringify(data)]).then( (result) => {
                observer.next(result);
                console.log(`Success record for ${data.length} EuroStops`);
            }).catch(error => {
                console.log(`Error on EuroStops records: ${error.message}`);
            }).finally( () =>{
                observer.complete();
                console.log(`Finished PLSQL call - EuroStops`);
            });
        } catch (error: any) {
            console.log(`Error updating EuroStops: ${error.message || error}`);
        }
    });
} 



function updateAREASAC(data: any[]): Observable<void> {
    return new Observable<void>(observer => {
        try {
            db.one('SELECT update_areasac($1::text)', [JSON.stringify(data)]).then( (result) => {
                observer.next(result);
                console.log(`Success record for ${data.length} AREASAC`);
            }).catch(error => {
                console.log(`Error on AREASAC records: ${error.message}`);
            }).finally( () =>{
                observer.complete();
                console.log(`Finished PLSQL call - AREASAC`);
            });
        } catch (error: any) {
            console.log(`Error updating AREASAC: ${error.message || error}`);
        }
    });
} 

function updateCAMPINGCARPARK(data: any[]): Observable<void> {
    return new Observable<void>(observer => {
        try {
            db.one('SELECT update_campingcarpark($1::text)', [JSON.stringify(data)]).then( (result) => {
                observer.next(result);
                console.log(`Success record for ${data.length} CAMPINGCARPARK`);
            }).catch(error => {
                console.log(`Error on CAMPINGCARPARK records: ${error.message}`);
            }).finally( () =>{
                observer.complete();
                console.log(`Finished PLSQL call - CAMPINGCARPARK`);
            });
        } catch (error: any) {
            console.log(`Error updating CAMPINGCARPARK: ${error.message || error}`);
        }
    });
} 


// Function to insert or update data in the database
async function insertOrUpdatePlaces(data: DataItem[]): Promise<void> {
    try {
        for (const dataItem of data) {
            await db.tx(async (t: any) => {   
                //if (!dataItem.id) {
                dataItem.id = uuidv4();
                //}

                const existingData = await t.oneOrNone(
                    'SELECT * FROM places WHERE location_latitude = $1 AND location_longitude = $2',
                    [dataItem.location?.latitude, dataItem.location?.longitude]
                )

                if (existingData) {
                    await t.none('DELETE FROM photos WHERE place_id = $1; DELETE FROM places WHERE id = $1', [existingData.id]);
                }

                await t.batch([
                    t.none(
                        'INSERT INTO places(id, name, date_verified, description, ' +                      
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
                        '$69, $70, $71, $72, $73, $74)',
                        [
                            dataItem.id,
                            dataItem.name,
                            dataItem.date_verified,
                            dataItem.description,
                            dataItem.location?.latitude,
                            dataItem.location?.longitude,
                            dataItem.category?.name,
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
                        ]    
                    ),
                    // Insert or update photo data
                    ...(dataItem.photos || []).map((photo: Photo) =>
                        t.none(
                            'INSERT INTO photos(id, link_large, link_thumb, numero, p4n_user_id, pn_lieu_id, place_id) ' +
                            'VALUES($1, $2, $3, $4, $5, $6, $7)',
                            [
                                photo.id,
                                photo.link_large,
                                photo.link_thumb,
                                photo.numero,
                                photo.p4n_user_id,
                                photo.pn_lieu_id,
                                dataItem.id,
                            ]
                        )
                    ),
                ]);
            });
        }
    } catch (error: any) {
        console.error('Error inserting or updating data:', error.message || error);
        throw error;
    }
}

async function insertOrUpdateCruiserList(data: any) {
    try {
        console.log(`Recording into database...`);
        for (const item of data) {
            const existingRecord = await db.oneOrNone('SELECT * FROM cruiser_list WHERE lat = $1 AND lng = $2', [item.lat, item.lng]);
            if (existingRecord) {
                // Update the existing record
                await db.none('UPDATE cruiser_list SET title = $1, place = $2, description = $3, more = $4 WHERE lat = $5 AND lng = $6',
                    [item.title, item.place, item.text, item.more, item.lat, item.lng]);
            } else {
                // Insert a new record
                await db.none('INSERT INTO cruiser_list(lat, lng, title, place, description, more) VALUES ($1, $2, $3, $4, $5, $6)',
                    [item.lat, item.lng, item.title, item.place, item.text, item.more]);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        console.log('Finished record into database.')
    }
}

async function insertGeoData(reqIp: string, geoData: any): Promise<void> {
    try {
        await db.none(
            'INSERT INTO track_geo(ip,geo_data,date_time) VALUES ($1,$2,now())',
            [reqIp,geoData]
        );
        //console.log('Geo data inserted successfully');
    } catch (error: any) {
        console.error('Error inserting geo data:', error.message || error);
        throw error;
    }
}

export { db, insertOrUpdatePlaces, insertOrUpdateCruiserList, insertGeoData, updatePGPlaces, updateCampings, updatePGIntermache, updatePGCampingCarPortugal, updatePGEuroStop, updateAREASAC, updateCAMPINGCARPARK };