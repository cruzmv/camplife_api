import { DataItem } from './providers/dataItem.interface';
import { insertOrUpdatePlaces, insertOrUpdateCruiserList, updatePGPlaces, updateCampings } from './postgresql';
import { readDataFolder, flatData } from './providers/park4night';
import { Observable } from 'rxjs';

function feedPark4NightDB(campings: any) : Observable<void> {
    return new Observable<void>((observer: any) =>{
        const flatDataItems = flatData(campings);
        const processedData = flatDataItems.map((data: any) => {
            const processed: DataItem = {
                id: data.id,
                name: data.name ?? null,
                date_verified: data.date_verified ?? null,
                description: data.description ?? null,
                location: {
                    latitude: data.location?.latitude ?? null,
                    longitude: data.location?.longitude ?? null,
                },
                category: {
                    name: data.category?.name ?? null,
                },
                address: data.address ?? null,
                date_creation: data.date_creation ?? null,
                description_fr: data.description_fr ?? null,
                description_en: data.description_en ?? null,
                description_de: data.description_de ?? null,
                description_es: data.description_es ?? null,
                description_it: data.description_it ?? null,
                description_nl: data.description_nl ?? null,
                reseaux: data.reseaux ?? null,
                date_fermeture: data.date_fermeture ?? null,
                borne: data.borne ?? null,
                prix_stationnement: data.prix_stationnement ?? null,
                prix_services: data.prix_services ?? null,
                nb_places: data.nb_places ?? null,
                hauteur_limite: data.hauteur_limite ?? null,
                route: data.route ?? null,
                ville: data.ville ?? null,
                code_postal: data.code_postal ?? null,
                pays: data.pays ?? null,
                pays_iso: data.pays_iso ?? null,
                publique: data.publique ?? null,
                nature_protect: data.nature_protect ?? null,
                contact_visible: data.contact_visible ?? null,
                top_liste: data.top_liste ?? null,
                site_internet: data.site_internet ?? null,
                video: data.video ?? null,
                tel: data.tel ?? null,
                mail: data.mail ?? null,
                note_moyenne: data.note_moyenne ?? null,
                nb_commentaires: data.nb_commentaires ?? null,
                nb_visites: data.nb_visites ?? null,
                nb_photos: data.nb_photos ?? null,
                validation_admin: data.validation_admin ?? null,
                caravaneige: data.caravaneige ?? null,
                animaux: data.animaux ?? null,
                point_eau: data.point_eau ?? null,
                eau_noire: data.eau_noire ?? null,
                eau_usee: data.eau_usee ?? null,
                wc_public: data.wc_public ?? null,
                poubelle: data.poubelle ?? null,
                douche: data.douche ?? null,
                boulangerie: data.boulangerie ?? null,
                electricite: data.electricite ?? null,
                wifi: data.wifi ?? null,
                piscine: data.piscine ?? null,
                laverie: data.laverie ?? null,
                gaz: data.gaz ?? null,
                gpl: data.gpl ?? null,
                donnees_mobile: data.donnees_mobile ?? null,
                lavage: data.lavage ?? null,
                visites: data.visites ?? null,
                windsurf: data.windsurf ?? null,
                vtt: data.vtt ?? null,
                rando: data.rando ?? null,
                escalade: data.escalade ?? null,
                eaux_vives: data.eaux_vives ?? null,
                peche: data.peche ?? null,
                peche_pied: data.peche_pied ?? null,
                moto: data.moto ?? null,
                point_de_vue: data.point_de_vue ?? null,
                baignade: data.baignade ?? null,
                jeux_enfants: data.jeux_enfants ?? null,
                distance: data.distance ?? null,
                code: data.code ?? null,
                utilisateur_creation: data.utilisateur_creation ?? null,
                user_id: data.user_id ?? null,
                user_vehicule: data.user_vehicule ?? null,
                photos: data.photos ?? null,
            };
            return processed;
        });
        console.log(`Updating Database with ${processedData.length} places`);
        updateCampings(processedData).subscribe(result => {
            observer.next(result);
            observer.complete();
        })
    })
}





    // return new Promise((resolve, reject) => {
    //     const flatDataItems = flatData(places);
    //     const processedData = flatDataItems.map((data: any) => {
    //         const processed: DataItem = {
    //             id: null,
    //             name: data.name ?? null,
    //             date_verified: data.date_verified ?? null,
    //             description: data.description ?? null,
    //             location: {
    //                 latitude: data.location?.latitude ?? null,
    //                 longitude: data.location?.longitude ?? null,
    //             },
    //             category: {
    //                 name: data.category?.name ?? null,
    //             },
    //             address: data.address ?? null,
    //             date_creation: data.date_creation ?? null,
    //             description_fr: data.description_fr ?? null,
    //             description_en: data.description_en ?? null,
    //             description_de: data.description_de ?? null,
    //             description_es: data.description_es ?? null,
    //             description_it: data.description_it ?? null,
    //             description_nl: data.description_nl ?? null,
    //             reseaux: data.reseaux ?? null,
    //             date_fermeture: data.date_fermeture ?? null,
    //             borne: data.borne ?? null,
    //             prix_stationnement: data.prix_stationnement ?? null,
    //             prix_services: data.prix_services ?? null,
    //             nb_places: data.nb_places ?? null,
    //             hauteur_limite: data.hauteur_limite ?? null,
    //             route: data.route ?? null,
    //             ville: data.ville ?? null,
    //             code_postal: data.code_postal ?? null,
    //             pays: data.pays ?? null,
    //             pays_iso: data.pays_iso ?? null,
    //             publique: data.publique ?? null,
    //             nature_protect: data.nature_protect ?? null,
    //             contact_visible: data.contact_visible ?? null,
    //             top_liste: data.top_liste ?? null,
    //             site_internet: data.site_internet ?? null,
    //             video: data.video ?? null,
    //             tel: data.tel ?? null,
    //             mail: data.mail ?? null,
    //             note_moyenne: data.note_moyenne ?? null,
    //             nb_commentaires: data.nb_commentaires ?? null,
    //             nb_visites: data.nb_visites ?? null,
    //             nb_photos: data.nb_photos ?? null,
    //             validation_admin: data.validation_admin ?? null,
    //             caravaneige: data.caravaneige ?? null,
    //             animaux: data.animaux ?? null,
    //             point_eau: data.point_eau ?? null,
    //             eau_noire: data.eau_noire ?? null,
    //             eau_usee: data.eau_usee ?? null,
    //             wc_public: data.wc_public ?? null,
    //             poubelle: data.poubelle ?? null,
    //             douche: data.douche ?? null,
    //             boulangerie: data.boulangerie ?? null,
    //             electricite: data.electricite ?? null,
    //             wifi: data.wifi ?? null,
    //             piscine: data.piscine ?? null,
    //             laverie: data.laverie ?? null,
    //             gaz: data.gaz ?? null,
    //             gpl: data.gpl ?? null,
    //             donnees_mobile: data.donnees_mobile ?? null,
    //             lavage: data.lavage ?? null,
    //             visites: data.visites ?? null,
    //             windsurf: data.windsurf ?? null,
    //             vtt: data.vtt ?? null,
    //             rando: data.rando ?? null,
    //             escalade: data.escalade ?? null,
    //             eaux_vives: data.eaux_vives ?? null,
    //             peche: data.peche ?? null,
    //             peche_pied: data.peche_pied ?? null,
    //             moto: data.moto ?? null,
    //             point_de_vue: data.point_de_vue ?? null,
    //             baignade: data.baignade ?? null,
    //             jeux_enfants: data.jeux_enfants ?? null,
    //             distance: data.distance ?? null,
    //             code: data.code ?? null,
    //             utilisateur_creation: data.utilisateur_creation ?? null,
    //             user_id: data.user_id ?? null,
    //             user_vehicule: data.user_vehicule ?? null,
    //             photos: data.photos ?? null,
    //         };
    //         return processed;
    //     });
    //     console.log(`Updating Database with ${processedData.length} places`);
    //     updateCampings(processedData).then()



    // });
// }




async function updatePark4NightDB(places: any) {
    try{
        const flatDataItems = flatData(places);
        const processedData = flatDataItems.map((data: any) => {
            const processed: DataItem = {
                id: null,
                name: data.name ?? null,
                date_verified: data.date_verified ?? null,
                description: data.description ?? null,
                location: {
                    latitude: data.location?.latitude ?? null,
                    longitude: data.location?.longitude ?? null,
                },
                category: {
                    name: data.category?.name ?? null,
                },
                address: data.address ?? null,
                date_creation: data.date_creation ?? null,
                description_fr: data.description_fr ?? null,
                description_en: data.description_en ?? null,
                description_de: data.description_de ?? null,
                description_es: data.description_es ?? null,
                description_it: data.description_it ?? null,
                description_nl: data.description_nl ?? null,
                reseaux: data.reseaux ?? null,
                date_fermeture: data.date_fermeture ?? null,
                borne: data.borne ?? null,
                prix_stationnement: data.prix_stationnement ?? null,
                prix_services: data.prix_services ?? null,
                nb_places: data.nb_places ?? null,
                hauteur_limite: data.hauteur_limite ?? null,
                route: data.route ?? null,
                ville: data.ville ?? null,
                code_postal: data.code_postal ?? null,
                pays: data.pays ?? null,
                pays_iso: data.pays_iso ?? null,
                publique: data.publique ?? null,
                nature_protect: data.nature_protect ?? null,
                contact_visible: data.contact_visible ?? null,
                top_liste: data.top_liste ?? null,
                site_internet: data.site_internet ?? null,
                video: data.video ?? null,
                tel: data.tel ?? null,
                mail: data.mail ?? null,
                note_moyenne: data.note_moyenne ?? null,
                nb_commentaires: data.nb_commentaires ?? null,
                nb_visites: data.nb_visites ?? null,
                nb_photos: data.nb_photos ?? null,
                validation_admin: data.validation_admin ?? null,
                caravaneige: data.caravaneige ?? null,
                animaux: data.animaux ?? null,
                point_eau: data.point_eau ?? null,
                eau_noire: data.eau_noire ?? null,
                eau_usee: data.eau_usee ?? null,
                wc_public: data.wc_public ?? null,
                poubelle: data.poubelle ?? null,
                douche: data.douche ?? null,
                boulangerie: data.boulangerie ?? null,
                electricite: data.electricite ?? null,
                wifi: data.wifi ?? null,
                piscine: data.piscine ?? null,
                laverie: data.laverie ?? null,
                gaz: data.gaz ?? null,
                gpl: data.gpl ?? null,
                donnees_mobile: data.donnees_mobile ?? null,
                lavage: data.lavage ?? null,
                visites: data.visites ?? null,
                windsurf: data.windsurf ?? null,
                vtt: data.vtt ?? null,
                rando: data.rando ?? null,
                escalade: data.escalade ?? null,
                eaux_vives: data.eaux_vives ?? null,
                peche: data.peche ?? null,
                peche_pied: data.peche_pied ?? null,
                moto: data.moto ?? null,
                point_de_vue: data.point_de_vue ?? null,
                baignade: data.baignade ?? null,
                jeux_enfants: data.jeux_enfants ?? null,
                distance: data.distance ?? null,
                code: data.code ?? null,
                utilisateur_creation: data.utilisateur_creation ?? null,
                user_id: data.user_id ?? null,
                user_vehicule: data.user_vehicule ?? null,
                photos: data.photos ?? null,
            };
            return processed;
        });
        console.log(`Updating Database with ${processedData.length} places`);
        updatePGPlaces(processedData).then(()=>{
            console.log(`Finished update ${processedData.length} places`);
        }).catch(error => {
            console.log(`Error updating places ${error.message}`);
        })
    } catch(error){
        console.error('Error inserting or updating data:', error);
    }

}


async function updatePark4NightCoordinates(lat: number, long: number){
    const locationsData = await readDataFolder(lat,long);
    try{
        const processedData = locationsData.map(data => {
            const processed: DataItem = {
                id: null,
                name: data.name ?? null,
                date_verified: data.date_verified ?? null,
                description: data.description ?? null,
                location: {
                    latitude: data.location?.latitude ?? null,
                    longitude: data.location?.longitude ?? null,
                },
                category: {
                    name: data.category?.name ?? null,
                },
                address: data.address ?? null,
                date_creation: data.date_creation ?? null,
                description_fr: data.description_fr ?? null,
                description_en: data.description_en ?? null,
                description_de: data.description_de ?? null,
                description_es: data.description_es ?? null,
                description_it: data.description_it ?? null,
                description_nl: data.description_nl ?? null,
                reseaux: data.reseaux ?? null,
                date_fermeture: data.date_fermeture ?? null,
                borne: data.borne ?? null,
                prix_stationnement: data.prix_stationnement ?? null,
                prix_services: data.prix_services ?? null,
                nb_places: data.nb_places ?? null,
                hauteur_limite: data.hauteur_limite ?? null,
                route: data.route ?? null,
                ville: data.ville ?? null,
                code_postal: data.code_postal ?? null,
                pays: data.pays ?? null,
                pays_iso: data.pays_iso ?? null,
                publique: data.publique ?? null,
                nature_protect: data.nature_protect ?? null,
                contact_visible: data.contact_visible ?? null,
                top_liste: data.top_liste ?? null,
                site_internet: data.site_internet ?? null,
                video: data.video ?? null,
                tel: data.tel ?? null,
                mail: data.mail ?? null,
                note_moyenne: data.note_moyenne ?? null,
                nb_commentaires: data.nb_commentaires ?? null,
                nb_visites: data.nb_visites ?? null,
                nb_photos: data.nb_photos ?? null,
                validation_admin: data.validation_admin ?? null,
                caravaneige: data.caravaneige ?? null,
                animaux: data.animaux ?? null,
                point_eau: data.point_eau ?? null,
                eau_noire: data.eau_noire ?? null,
                eau_usee: data.eau_usee ?? null,
                wc_public: data.wc_public ?? null,
                poubelle: data.poubelle ?? null,
                douche: data.douche ?? null,
                boulangerie: data.boulangerie ?? null,
                electricite: data.electricite ?? null,
                wifi: data.wifi ?? null,
                piscine: data.piscine ?? null,
                laverie: data.laverie ?? null,
                gaz: data.gaz ?? null,
                gpl: data.gpl ?? null,
                donnees_mobile: data.donnees_mobile ?? null,
                lavage: data.lavage ?? null,
                visites: data.visites ?? null,
                windsurf: data.windsurf ?? null,
                vtt: data.vtt ?? null,
                rando: data.rando ?? null,
                escalade: data.escalade ?? null,
                eaux_vives: data.eaux_vives ?? null,
                peche: data.peche ?? null,
                peche_pied: data.peche_pied ?? null,
                moto: data.moto ?? null,
                point_de_vue: data.point_de_vue ?? null,
                baignade: data.baignade ?? null,
                jeux_enfants: data.jeux_enfants ?? null,
                distance: data.distance ?? null,
                code: data.code ?? null,
                utilisateur_creation: data.utilisateur_creation ?? null,
                user_id: data.user_id ?? null,
                user_vehicule: data.user_vehicule ?? null,
                photos: data.photos ?? null,
            };

            return processed;
        });
        console.log('Updating Database...')
        await insertOrUpdatePlaces(processedData)
        console.log('Finish update');
    } catch(error){
        console.error('Error inserting or updating data:', error);
    }
}

async function updateCruiserList(body: any){
    let url = `https://www.gays-cruising.com/en/${body.country}`;
    if (body.city !== undefined &&
        body.country !== undefined &&
        body.lat !== undefined &&
        body.long !== undefined){
        url = `https://www.gays-cruising.com/en/${body.city}/${body.country}#map-zoom=${body.zoom}&map-lat=${body.lat}&map-lng=${body.long}`;
    } else if (body.city !== undefined){
        url = `https://www.gays-cruising.com/en/${body.city}/${body.country}`;
    }

    console.log(`cruiser_list: ${url}`)

    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForFunction('typeof gcMaps !== "undefined"');

    console.log("Getting places...");

    const result = []
    for (let mI = 0; mI < 20; mI++) {
        let markerString = `gcMaps.parametros.markers[${mI}]  !== undefined`;
        let markerExists = await page.evaluate(markerString);
        if (markerExists){
            let cI = 0;
            while (markerExists){
                const latlng = await page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._latlng`);
                const title = await page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[0].innerText`);
                const place = await page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[1].innerText`);
                const text = await page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[2].innerText`);
                const more = await page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[3].children[0].href`);
                result.push({
                    lat: latlng.lat,
                    lng: latlng.lng,
                    title: title,
                    place: place,
                    text: text,
                    more: more
                })
                cI++;
                markerString = `gcMaps.parametros.markers[${mI}][${cI}] !== undefined`;
                markerExists = await page.evaluate(markerString);
                //console.log(latlng);
            }
        }
    }
    await browser.close();
    console.log(`Got ${result.length} places`);
    await insertOrUpdateCruiserList(result);
}

export { updatePark4NightCoordinates, updateCruiserList, updatePark4NightDB, feedPark4NightDB };
