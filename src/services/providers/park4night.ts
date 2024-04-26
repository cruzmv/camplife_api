import axios from 'axios';
import { DataItem, Photo } from './dataItem.interface';

interface Park4NightData {
    api_infos: string;
    status: string;
    lieux: DataItem[];
}

export async function readDataFolder(lat: number, long: number): Promise<DataItem[]> {
    const regionCenters = [
        { lat: lat, lng: long }, // custom
        //{ lat: 51.509865, lng: -0.118092 }, // London
        //{ lat: 48.856613, lng: 2.352222 },  // Paris
    ];
    const dataItems: DataItem[] = []

    for (const center of regionCenters) {
        const regionURLs = generateURLsForRegion(center.lat, center.lng, 3, 10);
        
        for (const url of regionURLs) {
            try {
                const park4NightData = await fetchDataFromPark4Night(url);
                const flatDataItems = flatData(park4NightData);
                dataItems.push(...flatDataItems);
            } catch (error: any) {
                console.error(`Error fetching data from Park4Night for URL ${url}: ${error.message}`);
            }
        }
    }

    return dataItems;
}



function generateURLsForRegion(centerLat: number, centerLng: number, gridSize: number, zoom: number): string[] {
    const urls: string[] = [];
    const latRange = 1.0;
    const lngRange = 1.0;
    const latStep = latRange / gridSize;
    const lngStep = lngRange / gridSize;

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const lat = centerLat - latRange / 2 + i * latStep;
            const lng = centerLng - lngRange / 2 + j * lngStep;
            const url = `https://guest.park4night.com/services/V4.1/lieuxGetFilter.php?latitude=${lat}&longitude=${lng}`;
            urls.push(url);
        }
    }

    return urls;
}



export async function fetchDataFromPark4Night(apiUrl: string): Promise<any> {

    const maxRetries = 3;
    let currentRetry = 0;

    while (currentRetry < maxRetries) {
        try {
            const response = await axios.get(apiUrl);
            return response.data;
        } catch (error:any) {
            console.error(`Error fetching data from Park4Night: ${error.message} - retry: ${currentRetry}`);

            // Increment the retry counter
            currentRetry++;

            // Add a delay before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    throw new Error(`Failed to fetch data from Park4Night after ${maxRetries} retries`);
}


// Convert Park4Night data to the common DataItem structure
export function flatData(park4NightData: Park4NightData): DataItem[] {
    return park4NightData.lieux.map((place:any) => {
        const location = {
            latitude: parseFloat(place.latitude),
            longitude: parseFloat(place.longitude),
        };

        return {
            id: place.id,
            name: place.titre,
            date_verified: place.date_creation,
            description: place.description_fr || place.description_en || place.description_de || '',
            location,
            address: `${place.route}, ${place.ville}, ${place.code_postal}, ${place.pays}`,
            category: {
                name: park4NightCategory(place.code),
            },
            date_creation: place.date_creation,
            description_fr: place.description_fr,
            description_en: place.description_en,
            description_de: place.description_de,
            description_es: place.description_es || '',
            description_it: place.description_it || '',
            description_nl: place.description_nl || '',
            reseaux: place.reseaux || null,
            date_fermeture: place.date_fermeture || '',
            borne: place.borne || '',
            prix_stationnement: place.prix_stationnement || '',
            prix_services: place.prix_services || '',
            nb_places: place.nb_places || '',
            hauteur_limite: place.hauteur_limite || '',
            route: place.route,
            ville: place.ville,
            code_postal: place.code_postal,
            pays: place.pays,
            pays_iso: place.pays_iso,
            publique: place.publique || 0,
            nature_protect: place.nature_protect || '',
            contact_visible: place.contact_visible || 0,
            top_liste: place.top_liste || 0,
            site_internet: place.site_internet || '',
            video: place.video || '',
            tel: place.tel || '',
            mail: place.mail || '',
            note_moyenne: place.note_moyenne || null,
            nb_commentaires: place.nb_commentaires || null,
            nb_visites: place.nb_visites || null,
            nb_photos: place.nb_photos,
            validation_admin: place.validation_admin,
            caravaneige: place.caravaneige,
            animaux: place.animaux,
            point_eau: place.point_eau,
            eau_noire: place.eau_noire,
            eau_usee: place.eau_usee,
            wc_public: place.wc_public,
            poubelle: place.poubelle,
            douche: place.douche,
            boulangerie: place.boulangerie,
            electricite: place.electricite,
            wifi: place.wifi,
            piscine: place.piscine,
            laverie: place.laverie,
            gaz: place.gaz,
            gpl: place.gpl,
            donnees_mobile: place.donnees_mobile,
            lavage: place.lavage,
            visites: place.visites,
            windsurf: place.windsurf,
            vtt: place.vtt,
            rando: place.rando,
            escalade: place.escalade,
            eaux_vives: place.eaux_vives,
            peche: place.peche,
            peche_pied: place.peche_pied,
            moto: place.moto,
            point_de_vue: place.point_de_vue,
            baignade: place.baignade,
            jeux_enfants: place.jeux_enfants,
            distance: place.distance,
            code: place.code,
            utilisateur_creation: place.utilisateur_creation,
            user_id: place.user_id,
            user_vehicule: place.user_vehicule,
            photos: place.photos as Photo[],
        };
    });
}

function park4NightCategory(code: string){
    let category = 'Park4Night Category'
    switch(code){
        case 'P': category = 'PARKING LOT DAY/NIGHT'; break;
        case 'DS': category = 'EXTRA SERVICES'; break;
        case 'C': category = 'CAMPING'; break;
        case 'ACC_PR': category = 'PRIVATE CAR PARK FOR CAMPERS'; break;
        case 'ACC_P': category = 'PAYING MOTORHOME AREA'; break;
        case 'F': category = 'ON THE FARM'; break;
        case 'PN': category = 'SURROUNDED BY NATURE'; break;
        case 'PJ': category = 'DAILY PARKING LOT ONLY'; break;
        case 'APN': category = 'PICNIC AREA'; break;
        case 'OR': category = 'OFF-ROAD'; break;
        case 'AR': category = 'REST AREA'; break;
        case 'EP': category = 'HOMESTAYS ACCOMMODATION'; break;
        default: category = 'None';
    }

    return category
}

const name = 'par4night'
export { name }