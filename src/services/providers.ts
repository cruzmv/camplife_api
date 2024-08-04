import axios from 'axios';
import qs from 'qs';

import { DataItem } from './providers/dataItem.interface';
import { insertOrUpdatePlaces, insertOrUpdateCruiserList, updatePGPlaces, updateCampings, updatePGIntermache, updatePGCampingCarPortugal, updatePGEuroStop, updateAREASAC, updateCAMPINGCARPARK, updateLAWASH } from './postgresql';
import { readDataFolder, flatData } from './providers/park4night';
import { Observable, timeout } from 'rxjs';
import {setTimeout} from "node:timers/promises";

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

async function updateIntermacheList(){
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.intermarche.pt/lojas/', {
        waitUntil: 'networkidle2',
    });
    await page.waitForSelector('#poss-search-results');
    const poiData = await page.evaluate(() => {
        // Array to hold the POI data
        const pois: any = [];

        // Select all elements within the search results
        const resultElements = document.querySelectorAll('#poss-search-results a[href]');

        // Loop through each result element
        resultElements.forEach((element) => {
            // Check if the element contains motorhome-related data
            const hasCaravanPark = element.querySelector('span.caravan');
            const hasDataAv = element.getAttribute('data-av') === 'True';

            if (hasCaravanPark || hasDataAv) {
                // Extract the required data
                const data = {
                    latitude: element.getAttribute('data-latitude'),
                    longitude: element.getAttribute('data-longitude'),
                    title: element.getAttribute('data-title'),
                    url: element.getAttribute('data-url'),
                    search: element.getAttribute('data-search'),
                    gaLabel: element.getAttribute('data-ga-label')
                };

                // Add the data to the POIs array
                pois.push(data);
            }
        });

        return pois;
    });
    await browser.close();
    await updatePGIntermache(poiData)
}

// async function updateEuroStopsList() {
//     const puppeteer = require('puppeteer');
//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();
//     // Set up request interception
//     await page.setRequestInterception(true);

//     page.on('request', (request: any) => {
//         // Continue all requests
//         request.continue();
//     });


//     page.on('response', async (response: any) => {
//         // Check if the response is from the desired AJAX call
//         if (response.url().includes('ajax/get_markers.php') && response.request().method() === 'POST') {
//             try {
//                 // Get the JSON data from the response
//                 const json = await response.json();
//                 return json;
//             } catch (e) {
//                 console.error('Error parsing JSON:', e);
//             }
//         }
//     });

//     await page.goto('https://eurostops.pt/mapa-autocaravansimo');
//     await page.waitForTimeout(5000);
//     await browser.close();
// }

async function updateEuroStopsList() {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    let jsonData: any = null;

    // Set up request interception
    await page.setRequestInterception(true);

    page.on('request', (request: any) => {
        request.continue();
    });

    page.on('response', async (response: any) => {
        if (response.url().includes('ajax/get_markers.php') && response.request().method() === 'POST') {
            try {
                const json = await response.json();
                jsonData = json;
            } catch (e) {
                console.error('Error parsing JSON:', e);
            }
        }
    });

    await page.goto('https://eurostops.pt/mapa-autocaravansimo');
    await setTimeout(5000);
    await browser.close();

    const requiredFields = jsonData.markers.map((item: any) => ({
        lat: item.lat,
        lon: item.lon,
        address: item.address,
        centered: item.centered,
        city: item.city,
        country: item.country,
        description: item.description,
        email: item.email,
        id_categories: item.id_categories,
        link: item.link,
        name: item.name,
        phone: item.phone,
        postal_code: item.postal_code,
        rating: item.rating,
        street: item.street,
        type: item.type,
        website: item.website,
        whatsapp: item.whatsapp,
        images: item.images // Assuming 'images' is the correct field name for photos
    }));

    updatePGEuroStop(requiredFields).subscribe(result => {
        // nothing
    })

    return jsonData;
}

async function updateASAList() {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: false }); // Set headless to false to see browser window
    const page = await browser.newPage();

    try {
        // Navigate to the page
        await page.goto('https://www.campingcarportugal.com/areasac/LstAreasnv.php?language=PT&mode=2&distrito=0&concelho=0&nomearea=&tiparea=0&pernoita=-1&elect=-1&intern=-1', {
            waitUntil: 'networkidle2',
        });

        // Wait for the element with class "resultados_completos" to appear
        await page.waitForSelector('.resultados_completos', { timeout: 60000 });

        // Extracting data
        const areas = await page.evaluate(() => {
            // Array to hold the area data
            const data: any = [];

            // Select all rows within ".resultados_completos"
            const rows = document.querySelectorAll('.resultados_completos');

            // Loop through each row
            rows.forEach(row => {
                const trs: any = row.querySelectorAll('tr');

                trs.forEach((tr: any) => {
                    const tds = tr.querySelectorAll('td');
                    const cellData: any = [];

                    // Loop through each 'td' and push its content into cellData
                    tds.forEach((td: any) => {
                        cellData.push(td.textContent.trim());
                    });

                    if (cellData.length == 11) {
                        const latitudeLongitudeRegex = /N (\d+\.\d+)\s+W (\d+\.\d+)/; // Regex pattern for latitude and longitude

                        // Extract latitude and longitude from distritoCoordenadas using regex
                        const match = cellData[0].match(latitudeLongitudeRegex);
                        let latitude = '';
                        let longitude = '';

                        if (match) {
                            latitude = match[1];
                            longitude = '-'+match[2];
                        }

                        const asaData = {
                            latitude: parseFloat(latitude),
                            longitude: parseFloat(longitude),
                            distritoCoordenadas: cellData[0],
                            nomeASMorada: cellData[1],
                            tipologiaTarifa: cellData[2],
                            pernoitaNlugares: cellData[3],
                            aguaTarifa: cellData[4],
                            Tarifa220V: cellData[5],
                            despAguasCinz: cellData[6],
                            despWCQuim: cellData[7],
                            wc: cellData[8],
                            wiFiPreco: cellData[9],
                            descricaodaArea: cellData[10]
                        }
                        data.push(asaData);
                    }
                });

            });

            return data;
        });

        const campings = areas.filter((x: any) => x.latitude != null && x.longitude != null );
        updatePGCampingCarPortugal(campings).then(() => {
            //nothing
        });

        return areas;
    } catch (error) {
        console.error('Error scraping data:', error);
    } finally {
        await browser.close();
    }
}

async function updateAREASACList() {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.areasac.es/areas-servicio-autocaravanas/areasaces/espana_4_1_ap.html?m=1#contenido', { timeout: 60000 * 5 });

    await setTimeout(5000);

    const scriptContent = await page.evaluate(() => {
        const scriptTags = document.querySelectorAll('script');
        return scriptTags[scriptTags.length - 1].innerHTML; // Get the content of the last script tag
    });

    console.log(scriptContent);

    const pois = [];

    const latLngRegex = /new google\.maps\.LatLng\(([^,]+),\s*([^)]+)\)/;
    const infoWindowRegex = /new google\.maps\.InfoWindow\(\{ content: "(.*?)"/g;

    const lines = scriptContent.split('\n');
    let latLngMatch, infoWindowMatch;

    for (let i = 0; i < lines.length; i++) {
        const latLngLine = lines[i];
        latLngMatch = latLngLine.match(latLngRegex);

        if (latLngMatch) {
            const lat = latLngMatch[1].trim();
            const lng = latLngMatch[2].trim();

            for (let j = i + 1; j < lines.length; j++) {
                const infoWindowLine = lines[j];

                if (infoWindowLine.includes('new google.maps.LatLng')) {
                    // Found another LatLng before finding InfoWindow, break out
                    break;
                }

                infoWindowMatch = infoWindowLine.match(infoWindowRegex);

                if (infoWindowMatch) {
                    const content = infoWindowMatch[0];

                    // Extract title, link, and image from InfoWindow content
                    const titleRegex = /<div class='info_bloque_texto'>(.*?)<\\\/div>/s
                    const linkRegex = /<div class='info_bloque_enlace_mapa'><a href='(.*?)'>\+Info<\\\/a><\\\/div>/s;
                    const imgSrcRegex = /<img[^>]*src=['"]([^'"]*\.jpg)[^'"]*['"][^>]*>/g;

                    const titleMatch = content.match(titleRegex);
                    const linkMatch = content.match(linkRegex);
                    const imgMatch = content.match(imgSrcRegex);
                    const srcRegex = /src=['"]([^'"]*)['"]/;
                    const type = imgMatch[0].match(srcRegex)

                    const title = titleMatch ? titleMatch[1] : 'None';
                    const link = linkMatch ? linkMatch[1] : 'None';
                    const image: any = type ? type[1] : 'None';

                    pois.push({
                        title,
                        link,
                        lat,
                        lng,
                        type: image.split('/').pop().replace('.jpg', '').replace('imagen.asp?f=', '').split('&')[0]
                    });

                    break; // Move to the next latLng match
                }
            }
        }
    }

    updateAREASAC(pois).subscribe(() => {
        // nothing
    });

    await browser.close();
}

async function updateCAMPINGCARPARKList() {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.campingcarpark.com/en_GB/search/areas/map', { timeout: 60000 * 5 } );
    await page.waitForSelector('#map');

    const pois = await page.evaluate(() => {
        const mapDiv: any = document.querySelector('#map');
        const dataLocations = mapDiv.getAttribute('data-locations');
        const locations = JSON.parse(dataLocations.replace(/&quot;/g, '"')); // Replace HTML entities and parse JSON

        return locations.data.features.map((feature: any) => ({
          id: feature.properties.id,
          type: feature.properties.type,
          status: feature.properties.status,
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0]
        }));
    });

    console.log(pois);

    for (const poi of pois) {
        const url = 'https://www.campingcarpark.com/ajax/location/';
        const headers = {
            'accept': 'application/json',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.5',
            'channel': 'website',
            'connection': 'keep-alive',
            'content-type': 'application/x-www-form-urlencoded',
            'x-requested-with': 'XMLHttpRequest'
        };

        const body = JSON.stringify({
          id: poi.id,
          locale: 'en_GB'
        });

        try{
            const response = await axios.post(url, body, { headers });
            console.log(poi.id);
            if (response.status === 200) {
                poi.data = response.data
            }
        } catch (error) {
            console.log("Error getting data from campingcarpark.com", error);
        }
    }

    updateCAMPINGCARPARK(pois).subscribe(() => {
        // nothing
    });

    await browser.close();


}


async function getREVOLUTIONList() {
    const url = "https://stores.revolution-laundry.com/Ajax/searchByCoordinates";
    const body = {
        "location": {
            "geoCoordinates": {
                "latitude": 39.13339493770496,
                "longitude": -5.207167738167442,
                "geoCircle": 843464
            }
        },
        "company": {
            "companyId": 65
        },
        "machineFamily": {
            "familyId": 6
        },
        "pagination": {
            "pageNumber": 1,
            "pageSize": 99999
        }
    }
    const headers = {
        "Content-Type": "application/json"
    }

    try{
        const response = await axios.post(url, body, { headers });
        return JSON.parse(response.data.data);
    } catch (error) {
        console.log("Error getting data from stores.revolution-laundry.com", error);
        return null;
    }
}


async function getBLOOMESTLAUNDRYList() {
    const cheerio = require('cheerio');
    const url = "https://www.bloomestlaundry.com/?geo_mashup_content=render-map&map_data_key=8ffedb5f1e206e9b2be534e16487945e&lang=en&map_content=global&name=gm-map-1&object_id=8598";
    try{
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const scriptContent = $('script').filter((i: any, el: any) => {
            return $(el).html().includes('GeoMashup.createMap');
        }).html();

        const jsonMatch = scriptContent.match(/GeoMashup\.createMap\(.*?, (.*)\);/);
        if (jsonMatch && jsonMatch[1]) {
            const jsonData = JSON.parse(jsonMatch[1]);

            // Extract objects from "object_data"
            const objects = jsonData.object_data;
            return objects;
        } else {
            console.error('JSON data not found in the script content.');
            return null;
        }
    } catch (error) {
        console.log("Error getting data from stores.revolution-laundry.com", error);
        return null;
    }

}

async function updateLAWASHList() {
    const fs = require('fs');
    const path = require('path');
    const cheerio = require('cheerio');
    const querystring = require('querystring');
    
    const filePath = path.join(__dirname, '../resource/lawash.html');
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);

    // Extract information from '.vp-portfolio__item-img-wrap'
    const items: any = [];
    $('.vp-portfolio__item-img-wrap').each((index: any, element: any) => {
        const aTag = $(element).find('a');
        const imgTag = $(element).find('img');

        const item = {
            url: aTag.attr('href'),
            imgUrl: imgTag.attr('src'),
            alt: imgTag.attr('alt')
        };
        items.push(item);
    });

    // Process each item
    for (const item of items) {
        try {
            const response = await axios.get(item.url);
            const html = response.data;
            const $ = cheerio.load(html);

            // Extract address and coordinates
            $('.elementor-custom-embed').each(async (index: any, element: any) => {
                const url = $(element)[0].children[1].attribs["data-src"];
                const parsedUrl = querystring.parse(url.split('?')[1]);
                item.address = parsedUrl.q;

                try {
                    const latlong = await axios.get('https://api.openrouteservice.org/geocode/search', {
                        params: {
                            api_key: "5b3ce3597851110001cf6248822f7a9d64924aa5bb3fb8ace99891d2",
                            text: item.address
                        }
                    });

                    if (latlong.data.features.length > 0) {
                        item.lat = latlong.data.features[0].geometry.coordinates[1];
                        item.long = latlong.data.features[0].geometry.coordinates[0];
                    }
                } catch (error) {
                    console.error(`Error fetching coordinates for address "${item.address}":`, error);
                }
            });

            // Extract additional details from '.elementor-price-list-item'
            $('.elementor-price-list-item').each((index: any, element: any) => {
                const imageSrc = $(element).find('.elementor-price-list-image img').attr('data-src');
                const headerText = $(element).find('.elementor-price-list-header').text().trim();
                const priceText = $(element).find('.elementor-price-list-price').text().trim();
                const descriptionText = $(element).find('.elementor-price-list-description').text().trim();

                item.details = item.details || [];
                item.details.push({
                    imageSrc,
                    headerText,
                    priceText,
                    descriptionText
                });
            });

        } catch (error) {
            console.error(`Error processing URL "${item.url}":`, error);
        }
    }

    updateLAWASH(items).subscribe(() => {
        // nothing
    });


    return items;
}

async function searchOpenRoute(queryString: string,coords: any) {
    try {

        const bounds = calculateBoundingBox(coords.lat, coords.long, 200);
        const url = "https://api.openrouteservice.org/geocode/search";
        const params = {
            api_key: "5b3ce3597851110001cf6248822f7a9d64924aa5bb3fb8ace99891d2",
            text: queryString,
            boundary: JSON.stringify({
                rect: [[bounds.southwest.lat,bounds.southwest.lon],[bounds.northeast.lat,bounds.northeast.lon]] 
            })
        }
        const response = await axios.get(url, {params: params });
        return response.data;
    } catch(error: any) {
        console.log("Error getting data from open route", error);
        return null;  
    }
  }


  function calculateBoundingBox(lat: any, lon: any, radiusKm: any) {
    const earthRadiusKm = 6371; // Earth radius in kilometers
    
    // Convert radius from kilometers to radians
    const radiusRadians = radiusKm / earthRadiusKm;

    // Convert latitude and longitude to radians
    const latRad = lat * (Math.PI / 180);
    const lonRad = lon * (Math.PI / 180);

    // Calculate the bounds in radians
    const minLatRad = latRad - radiusRadians;
    const maxLatRad = latRad + radiusRadians;
    
    // Calculate the bounds for longitude
    const minLonRad = lonRad - radiusRadians / Math.cos(latRad);
    const maxLonRad = lonRad + radiusRadians / Math.cos(latRad);

    // Convert the bounds back to degrees
    const minLat = minLatRad * (180 / Math.PI);
    const maxLat = maxLatRad * (180 / Math.PI);
    const minLon = minLonRad * (180 / Math.PI);
    const maxLon = maxLonRad * (180 / Math.PI);

    return {
        southwest: { lat: minLat, lon: minLon },
        northeast: { lat: maxLat, lon: maxLon }
    };
}  
  


/*
async function getLAWASHList() {
    const fs = require('fs');
    const path = require('path');
    const cheerio = require('cheerio');
    const querystring = require('querystring');


    const filePath = path.join(__dirname, '../resource/lawash.html');
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    const items: any = [];
    $('.vp-portfolio__item-img-wrap').each((index: any, element: any) => {
        const aTag = $(element).find('a');
        const imgTag = $(element).find('img');

        const item = {
            url: aTag.attr('href'),
            imgUrl: imgTag.attr('src'),
            alt: imgTag.attr('alt')
        };
        items.push(item);
    });

    for (const item of items) {
        try{
            const response = await axios.get(item.url);
            const html = response.data;
            const $ = cheerio.load(html);

            const itemsData: any = [];
            $('.elementor-custom-embed').each(async (index: any, element: any) => {
                const url = $(element)[0].children[1].attribs["data-src"]
                const parsedUrl = querystring.parse(url.split('?')[1]);
                item.address = parsedUrl.q;
                const latlong = await axios.get('https://api.openrouteservice.org/geocode/search', {
                    params: {
                        api_key: "5b3ce3597851110001cf6248822f7a9d64924aa5bb3fb8ace99891d2",
                        text: item.address
                    }
                });

                if (latlong.data.features.length > 0) {
                    item.lat = latlong.data.features[0].geometry.coordinates[1];
                    item.long = latlong.data.features[0].geometry.coordinates[0]
                }
            });
        } catch(error: any) {
            console.log(`Error: ${error}`);
        }
    }

    console.log(items);

    return items;
}
*/

export { updatePark4NightCoordinates, updateCruiserList, updatePark4NightDB, feedPark4NightDB, updateIntermacheList, updateEuroStopsList, updateASAList, updateAREASACList, updateCAMPINGCARPARKList, getREVOLUTIONList, getBLOOMESTLAUNDRYList, updateLAWASHList, searchOpenRoute };
