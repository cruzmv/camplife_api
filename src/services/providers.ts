import axios from 'axios';
import qs from 'qs';

import { DataItem } from './providers/dataItem.interface';
import { dbloglife, insertOrUpdatePlaces, insertOrUpdateCruiserList, updatePGPlaces, updateCampings, updatePGIntermache, updatePGCampingCarPortugal, updatePGEuroStop, updateAREASAC, updateCAMPINGCARPARK, updateLAWASH, updateCAMPERSTOP, updateCAMPERCONTACT, updateAIRECAMPINGCAR, updateParkingVerdeList } from './postgresql';
import { readDataFolder, flatData } from './providers/park4night';
import { Observable, timeout } from 'rxjs';
import {setTimeout} from "node:timers/promises";

interface MovimentPayload {
    contract: number | null;
    user: number | null;
    datetime: string | null;
    description: string | null;
    ledger_account: number | null;
    moviment_account: number | null;
    status: number | null;
    value: string | number | null;
}

interface PlanningPayload {
    contract: number | null;
    user: number | null;
    start_datetime: string;
    end_date: string;
    day_of_month: number;
    description: string;
    ledger_account: number | null;
    moviment_account: number | null;
    value: string | number | null;
}

interface MovimentAccountPayload {
    description: string | null;
    icon: string | null;
    contract: number | null;
    start_date: string | null;
    start_value: string | number | null;
    closing_day: number | null;
    account_type: number | null;
}

interface BasicSettingsPayload {
    description: string | null;
    icon: string | null;
    contract: number | null;
}

function normalizeMovimentPayload(body: any): MovimentPayload {
    if (!body || typeof body !== 'object') {
        throw new Error('Invalid moviment body');
    }

    const {
        contract,
        user,
        datetime,
        description,
        ledger_account,
        moviment_account,
        status,
        value
    } = body;

    if (
        contract === undefined ||
        user === undefined ||
        datetime === undefined ||
        description === undefined ||
        ledger_account === undefined ||
        moviment_account === undefined ||
        status === undefined ||
        value === undefined
    ) {
        throw new Error('Missing required moviment fields');
    }

    if (datetime !== null) {
        const parsedDate = new Date(datetime);
        if (Number.isNaN(parsedDate.getTime())) {
            throw new Error('Invalid moviment datetime');
        }
    }

    return {
        contract: normalizeNullableInteger(contract, 'contract'),
        user: normalizeNullableInteger(user, 'user'),
        datetime,
        description: description === null ? null : String(description),
        ledger_account: normalizeNullableInteger(ledger_account, 'ledger_account'),
        moviment_account: normalizeNullableInteger(moviment_account, 'moviment_account'),
        status: normalizeNullableInteger(status, 'status'),
        value: value === null ? null : value
    };
}

function normalizeNullableInteger(value: any, fieldName: string): number | null {
    if (value === null) {
        return null;
    }

    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue)) {
        throw new Error(`Invalid ${fieldName}`);
    }

    return parsedValue;
}

function getMovimentValues(moviment: MovimentPayload) {
    return [
        moviment.contract,
        moviment.user,
        moviment.datetime,
        moviment.description,
        moviment.ledger_account,
        moviment.moviment_account,
        moviment.status,
        moviment.value
    ];
}

function normalizeMovimentId(value: any): number {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Invalid moviment id');
    }

    return id;
}

function normalizePlanningId(value: any): number {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Invalid planning id');
    }

    return id;
}

function normalizePlanningPayload(body: any): PlanningPayload {
    if (!body || typeof body !== 'object') {
        throw new Error('Invalid planning body');
    }

    const startDatetime = String(body.start_datetime ?? '');
    const endDate = String(body.end_date ?? '');
    const dayOfMonth = Number(body.day_of_month);
    const startTimestamp = new Date(startDatetime);

    if (
        !/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.test(startDatetime) ||
        Number.isNaN(startTimestamp.getTime())
    ) {
        throw new Error('Invalid planning start_datetime');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || Number.isNaN(new Date(`${endDate}T00:00:00Z`).getTime())) {
        throw new Error('Invalid planning end_date');
    }

    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
        throw new Error('Invalid planning day_of_month');
    }

    if (endDate < startDatetime.slice(0, 10)) {
        throw new Error('Planning end_date must be after start_datetime');
    }

    const description = normalizeOptionalDescription(body.description);
    if (!description) {
        throw new Error('Missing planning description');
    }

    if (body.value === undefined || body.value === null || !Number.isFinite(Number(body.value))) {
        throw new Error('Invalid planning value');
    }

    return {
        contract: normalizeNullableInteger(body.contract, 'contract'),
        user: normalizeNullableInteger(body.user, 'user'),
        start_datetime: startDatetime,
        end_date: endDate,
        day_of_month: dayOfMonth,
        description,
        ledger_account: normalizeNullableInteger(body.ledger_account, 'ledger_account'),
        moviment_account: normalizeNullableInteger(body.moviment_account, 'moviment_account'),
        value: body.value
    };
}

function buildMonthlyPlanningDates(planning: PlanningPayload): string[] {
    const match = planning.start_datetime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)!;
    const startDate = planning.start_datetime.slice(0, 10);
    const time = `${match[4]}:${match[5]}:${match[6] ?? '00'}`;
    let year = Number(match[1]);
    let month = Number(match[2]);
    const dates: string[] = [];

    while (`${year}-${String(month).padStart(2, '0')}-01` <= planning.end_date) {
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const day = Math.min(planning.day_of_month, lastDay);
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (date >= startDate && date <= planning.end_date) {
            dates.push(`${date}T${time}`);
        }

        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }

    if (dates.length === 0) {
        throw new Error('Planning does not generate any moviment');
    }

    return dates;
}

async function getProvisionedStatus(contract: number | null): Promise<any> {
    const status = await dbloglife.oneOrNone(
        `SELECT id
           FROM finance.status
          WHERE lower(trim(description)) = lower('Provisionado')
            AND (contract = $1 OR contract IS NULL)
          ORDER BY CASE WHEN contract = $1 THEN 0 ELSE 1 END
          LIMIT 1`,
        [contract]
    );

    if (!status) {
        throw new Error('Provisionado status not found');
    }

    return status;
}

async function assertPlanningSettingsAccess(planning: PlanningPayload, statusId: number): Promise<void> {
    await assertMovimentSettingsAccess({
        contract: planning.contract,
        user: planning.user,
        datetime: planning.start_datetime,
        description: planning.description,
        ledger_account: planning.ledger_account,
        moviment_account: planning.moviment_account,
        status: statusId,
        value: planning.value
    });
}

async function insertPlanningMoviments(
    transaction: any,
    planning: PlanningPayload,
    planningId: number,
    statusId: number
): Promise<any[]> {
    const dates = buildMonthlyPlanningDates(planning);
    const inserted = [];

    for (const datetime of dates) {
        inserted.push(await transaction.one(
            `INSERT INTO finance.moviments (
                contract, "user", datetime, description, ledger_account,
                moviment_account, status, value, planning
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                planning.contract, planning.user, datetime, planning.description,
                planning.ledger_account, planning.moviment_account, statusId,
                planning.value, planningId
            ]
        ));
    }

    return inserted;
}

function normalizeSettingsId(value: any, entityName: string): number {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`Invalid ${entityName} id`);
    }

    return id;
}

function normalizeOptionalDescription(value: any): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    const description = String(value).trim();
    return description || null;
}

function normalizeOptionalIcon(value: any): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    const icon = String(value).trim();
    return icon || null;
}

function normalizeMovimentAccountPayload(body: any): MovimentAccountPayload {
    if (!body || typeof body !== 'object') {
        throw new Error('Invalid account body');
    }

    if (body.description === undefined || body.contract === undefined || body.account_type === undefined) {
        throw new Error('Missing required account fields');
    }

    const accountType = normalizeNullableInteger(body.account_type, 'account_type');
    if (accountType !== 0 && accountType !== 1) {
        throw new Error('Invalid account_type');
    }

    if (body.start_date !== null && body.start_date !== undefined && Number.isNaN(new Date(body.start_date).getTime())) {
        throw new Error('Invalid start_date');
    }

    return {
        description: normalizeOptionalDescription(body.description),
        icon: normalizeOptionalIcon(body.icon),
        contract: normalizeNullableInteger(body.contract, 'contract'),
        start_date: body.start_date || null,
        start_value: body.start_value ?? null,
        closing_day: body.closing_day === undefined ? null : normalizeNullableInteger(body.closing_day, 'closing_day'),
        account_type: accountType
    };
}

function normalizeBasicSettingsPayload(body: any, entityName: string): BasicSettingsPayload {
    if (!body || typeof body !== 'object') {
        throw new Error(`Invalid ${entityName} body`);
    }

    if (body.description === undefined || body.contract === undefined) {
        throw new Error(`Missing required ${entityName} fields`);
    }

    return {
        description: normalizeOptionalDescription(body.description),
        icon: normalizeOptionalIcon(body.icon),
        contract: normalizeNullableInteger(body.contract, 'contract')
    };
}

function getMovimentAccountValues(account: MovimentAccountPayload) {
    return [
        account.description,
        account.icon,
        account.contract,
        account.start_date,
        account.start_value,
        account.closing_day,
        account.account_type
    ];
}

function getBasicSettingsValues(settings: BasicSettingsPayload) {
    return [
        settings.description,
        settings.icon,
        settings.contract
    ];
}

async function assertMovimentSettingsAccess(moviment: MovimentPayload): Promise<void> {
    const hasAccess = await dbloglife.oneOrNone(
        `SELECT 1
           WHERE EXISTS (
                    SELECT 1 FROM finance.ledger_accounts
                     WHERE id = $2 AND (contract = $1 OR contract IS NULL)
                 )
             AND EXISTS (
                    SELECT 1 FROM finance.moviment_accounts
                     WHERE id = $3 AND (contract = $1 OR contract IS NULL)
                 )
             AND EXISTS (
                    SELECT 1 FROM finance.status
                     WHERE id = $4 AND (contract = $1 OR contract IS NULL)
                 )`,
        [
            moviment.contract,
            moviment.ledger_account,
            moviment.moviment_account,
            moviment.status
        ]
    );

    if (!hasAccess) {
        throw new Error('Invalid moviment settings for contract');
    }
}

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
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled',
        ],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
    });

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(
            () => typeof (window as any).gcMaps !== 'undefined',
            { timeout: 60000 }
        );
        await setTimeout(2000);

        console.log("Getting places...");

        const result = await page.evaluate(() => {
            const gcMaps = (window as any).gcMaps;
            const markerGroups = gcMaps?.parametros?.markers;
            if (!Array.isArray(markerGroups)) {
                const title = document.title || '';
                const bodyText = document.body?.innerText?.slice(0, 500) || '';
                throw new Error(`gcMaps markers are unavailable. title="${title}" body="${bodyText}"`);
            }

            const places: any[] = [];
            for (const markerGroup of markerGroups) {
                if (!Array.isArray(markerGroup)) {
                    continue;
                }

                for (const marker of markerGroup) {
                    const popupChildren = marker?._popup?._content?.children;
                    const link = popupChildren?.[3]?.children?.[0];
                    places.push({
                        lat: marker?._latlng?.lat ?? null,
                        lng: marker?._latlng?.lng ?? null,
                        title: popupChildren?.[0]?.innerText ?? null,
                        place: popupChildren?.[1]?.innerText ?? null,
                        text: popupChildren?.[2]?.innerText ?? null,
                        more: link?.href ?? null,
                    });
                }
            }
            return places.filter((place) => place.lat !== null && place.lng !== null);
        });

        console.log(`Got ${result.length} places`);
        await insertOrUpdateCruiserList(result);
    } finally {
        await browser.close();
    }
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
            "api_key": "5b3ce3597851110001cf6248822f7a9d64924aa5bb3fb8ace99891d2",
            "text": queryString,
            "boundary.rect.min_lat": bounds.southwest.lat,
            "boundary.rect.min_lon": bounds.southwest.lon,
            "boundary.rect.max_lat": bounds.northeast.lat,
            "boundary.rect.max_lon": bounds.northeast.lon
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

async function updateCAMPERSTOPList() {
    const countries = [
        {
            "id": "AL",
            "name": "Albania",
        },
        {
            "id": "AT",
            "name": "Austria",
        },
        {
            "id": "BE",
            "name": "Belgium",
        },
        {
            "id": "BA",
            "name": "Bosnia and Herzegovina",
        },
        {
            "id": "HR",
            "name": "Croatia",
        },
        {
            "id": "CZ",
            "name": "Czech Republic",
        },
        {
            "id": "DK",
            "name": "Denmark",
        },
        {
            "id": "EE",
            "name": "Estonia",
        },
        {
            "id": "FI",
            "name": "Finland",
        },
        {
            "id": "FR",
            "name": "France",
        },
        {
            "id": "DE",
            "name": "Germany",
        },
        {
            "id": "GR",
            "name": "Greece",
        },
        {
            "id": "HU",
            "name": "Hungary",
        },
        {
            "id": "IE",
            "name": "Ireland",
        },
        {
            "id": "IT",
            "name": "Italy",
        },
        {
            "id": "LV",
            "name": "Latvia",
        },
        {
            "id": "LT",
            "name": "Lithuania",
        },
        {
            "id": "LU",
            "name": "Luxembourg",
        },
        {
            "id": "ME",
            "name": "Montenegro",
        },
        {
            "id": "NL",
            "name": "Netherlands",
        },
        {
            "id": "NO",
            "name": "Norway",
        },
        {
            "id": "PL",
            "name": "Poland",
        },
        {
            "id": "PT",
            "name": "Portugal",
        },
        {
            "id": "RO",
            "name": "Romania",
        },
        {
            "id": "SK",
            "name": "Slovakia",
        },
        {
            "id": "SI",
            "name": "Slovenia",
        },
        {
            "id": "ES",
            "name": "Spain",
        },
        {
            "id": "SE",
            "name": "Sweden",
        },
        {
            "id": "CH",
            "name": "Switzerland",
        },
        {
            "id": "GB",
            "name": "United Kingdom",
        }
    ]
    const campings: any = [];

    for (const country of countries) {
        const cUrl = `https://camperstop.com/index.php?option=com_campersites&view=campersites&format=json&language=en-GB&filter_limit=-1&filter_country=${country.id}`;
        try {
            const response: any = await axios.get(cUrl);
            if (response.status == 200 && response.data._embedded.campersite_list.length > 0) {

                updateCAMPERSTOP(response.data._embedded.campersite_list).subscribe(() => {
                    // nothing
                });

                campings.push(...response.data._embedded.campersite_list);
            }
        } catch (error) {
            console.log(`Error getting data from camperstop.com for ${country.name}`, error);
        }
    }
    return campings

}

async function updateCAMPERCONTACTList() {

    const url = "https://search.campercontact.com/geolocation-nl,auto-suggest/_search";
    const header = {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.7',
        'content-type': 'application/json',
        'origin': 'https://www.campercontact.com',
        'priority': 'u=1, i',
        'referer': 'https://www.campercontact.com/',
        'sec-ch-ua': '"Not)A;Brand";v="99", "Brave";v="127", "Chromium";v="127"',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-mobile': '?0',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'sec-gpc': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
    }

    const body = {
        "_source": [
            "id",
            "type",
            "title",
            "shortName",
            "originalName",
            "names",
            "subtitle",
            "location",
            "boundingBox",
            "sitecode",
            "filters.poiType",
            "permalink",
            "oldPermalink",
            "thumbnail",
            "filters.isClaimed",
            "filters.rating",
            "filters.numberOfReviews",
            "filters.prices",
            "filters.maxCamperSpots",
            "filters.isBookable",
            "translatedPermalinks",
            "subscriptionLevel"
        ],
        "size": 10000,
        "sort": [
            {
                "_score": {
                    "order": "desc"
                }
            },
            {
                "level": {
                    "order": "desc"
                }
            },
            {
                "filters.relevance": {
                    "order": "desc"
                }
            }
        ],
        "query": {
            "bool": {
                "filter": {
                    "bool": {
                        "must": [
                            {
                                "term": {
                                    "type": "poi"
                                }
                            },
                            {
                                "geo_bounding_box": {
                                    "location": {
                                        "top_left": {
                                            "lat": 50.163277,
                                            "lon": -20.076871
                                        },
                                        "bottom_right": {
                                            "lat": 32.993027,
                                            "lon": 8.153289
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        }
    }

    try {
        const response: any = await axios.post(url,body,{headers: header});
        if (response.status == 200) {
            updateCAMPERCONTACT(response.data.hits.hits).subscribe(() => {
                // nothing
            });
            return response.data.hits.hits;
        } else {
            console.log(`Error getting data from campercontact `, response.status);
        }
    } catch (error) {
        console.log(`Error getting data from campercontact `, error);
    }

}

async function updateAIRECAMPINGCARList() {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const baseUrl = 'https://pt.airecampingcar.com/?pays=France&region=0&page=';
    let currentPage = 1;
    let allAires: any = [];

    while (true) {
        const url = `${baseUrl}${currentPage}`;
        console.log(`Navigating to ${url}...`);

        await page.goto(url);

        // Wait for the elements with the class "liste_aires" to be loaded
        await page.waitForSelector('.liste_aires', { timeout: 10000 });

        // Extract the data from each <li> element within .liste_aires
        const airesOnPage = await page.$$eval('.liste_aires li', (lis: any) => {
            return lis.map((li: any) => {
                const href = li.querySelector('a')?.getAttribute('href');
                const title = li.querySelector('.grand')?.innerText.trim();
                const number = li.querySelector('.petit')?.innerText.trim();

                // Extract all text contents that follow <br> tags
                const locationInfo = Array.from(li.querySelectorAll('br')).map((br: any) => {
                    return br.nextSibling?.textContent.trim();
                }).filter(text => text);

                return {
                    href,
                    title,
                    number,
                    locationInfo
                };
            });
        });

        // If no more data is found, break the loop
        if (airesOnPage.length === 0) {
            break;
        }

        allAires = allAires.concat(airesOnPage);
        console.log(`Page ${currentPage} has ${airesOnPage.length} aires.`);

        // Move to the next page
        currentPage++;
    }

    // Step 2: Visit each URL and scrape the required details
    let aires = [];
    for (let aire of allAires) {
        const aireUrl = `https://pt.airecampingcar.com${aire.href}`;
        console.log(`Visiting ${aireUrl}...`);

        try {
            await page.goto(aireUrl);

            await setTimeout(6000);

            await page.waitForSelector('#grand_block_fiche_camping', { timeout: 1500 });

            // Extract the first h1 text
            let title = "";
            try {
                title = await page.$eval('#grand_block_fiche_camping h1', (h1: any) => h1.innerText.trim());
            } catch (error) {
                console.error('Error extracting title:', error);
            }

            // Extract all the image alt texts from the paragraph
            let imageAlts = undefined;
            try {
                imageAlts = await page.$$eval('#grand_block_fiche_camping p img', (imgs: any) =>
                    imgs.map((img: any) => img.alt)
                );
            } catch (error) {
                console.error('Error extracting image alts:', error);
            }

            // Extract the text from <font color="#1421C1">
            let fontText = undefined;
            try {
                fontText = await page.$eval('#grand_block_fiche_camping font[color="#1421C1"]', (font: any) =>
                    font.innerText.trim()
                );
            } catch (error) {
                console.error('Error extracting font text:', error);
            }

            // Extract the coordinates by parsing the text following "Coordenadas de GPS"
            let lat, long;
            try {
                const coordinatesText = await page.$eval('#grand_block_fiche_camping', (block: HTMLElement) => {
                    const coordElement = Array.from(block.querySelectorAll('b')).find(el =>
                        (el as HTMLElement).innerText.includes('Coordenadas de GPS')
                    ) as HTMLElement | undefined;

                    // If coordElement is found, get the text content of its next sibling
                    return (coordElement as any)?.nextSibling?.textContent.trim() || '';
                });

                if (coordinatesText) {
                    const longitudeMatch = coordinatesText.match(/Longitude\s*:\s*(-?\d+\.\d+)/);
                    const latitudeMatch = coordinatesText.match(/Latitude\s*:\s*(-?\d+\.\d+)/);
                    if (longitudeMatch && latitudeMatch) {
                        long = longitudeMatch[1];
                        lat = latitudeMatch[1];
                    }
                }
            } catch (error) {
                console.error('Error extracting coordinates:', error);
            }

            // Extract all paragraph texts to the end of this block
            let additionalInfo = undefined;
            try {
                additionalInfo = await page.$$eval('#grand_block_fiche_camping p', (paragraphs: any) =>
                    paragraphs.map((p: any) => p.innerText.trim()).filter((text: any) => text)
                );
            } catch (error) {
                console.error('Error extracting additional info:', error);
            }

            // Save all the extracted details back into the aire object
            aire.details = {
                title,
                imageAlts,
                fontText,
                coordinates: { lat, long },
                additionalInfo
            };
            aires.push(aire)

            if (aires.length >= 500) {
                updateAIRECAMPINGCAR(aires.filter((x: any) => x.details)).subscribe(() => {
                    // nothing
                });
                aires = [];
            }
            console.log(`Details collected for: ${title}`);
        } catch (error) {
            console.error(`Error scraping details for ${aireUrl}:`, error);
        }
    }

    updateAIRECAMPINGCAR(aires.filter((x: any) => x.details)).subscribe(() => {
        // nothing
    });

    await browser.close();
    return allAires;
}


async function updateParkingVerde() {
    const cUrl = "https://es.secure.parkingverde.com/parkings_obtener_lista.php";
    const header = {
        "Accept": "*/*"
    }
    try{
        const response: any = await axios.post(cUrl, {}, {headers: header});
        updateParkingVerdeList(response.data).subscribe(() => {
            // nothing
        });
        return response;
    } catch (error) {
        console.log(`Error getting data from parkingverde `, error);
    }

}

async function getPlannings(contract: any) {
    const contractId = normalizeNullableInteger(contract, 'contract');

    return dbloglife.any(
        `SELECT DISTINCT ON (moviments.planning)
                moviments.planning,
                min(moviments.datetime) OVER planning_group AS start_datetime,
                max(moviments.datetime) OVER planning_group AS end_date,
                (max(extract(day FROM moviments.datetime)) OVER planning_group)::int AS day_of_month,
                moviments.description,
                moviments.ledger_account AS ledger_account_id,
                ledger_accounts.description AS ledger_account,
                moviments.moviment_account AS moviment_account_id,
                moviment_accounts.description AS moviment_account,
                moviments.status AS status_id,
                status.description AS status,
                moviments.value,
                (count(*) OVER planning_group)::int AS occurrence_count
           FROM finance.moviments moviments
           LEFT JOIN finance.ledger_accounts ledger_accounts ON ledger_accounts.id = moviments.ledger_account
           LEFT JOIN finance.moviment_accounts moviment_accounts ON moviment_accounts.id = moviments.moviment_account
           LEFT JOIN finance.status status ON status.id = moviments.status
          WHERE moviments.contract = $1
            AND moviments.planning IS NOT NULL
          WINDOW planning_group AS (PARTITION BY moviments.planning)
          ORDER BY moviments.planning, moviments.datetime`,
        [contractId]
    );
}

async function addPlanning(body: any) {
    const planning = normalizePlanningPayload(body?.planningData ?? body);
    const status = await getProvisionedStatus(planning.contract);
    await assertPlanningSettingsAccess(planning, status.id);

    return dbloglife.tx(async transaction => {
        await transaction.one(`SELECT pg_advisory_xact_lock(hashtext('finance.moviments.planning'))`);
        const nextPlanning = await transaction.one(
            `SELECT coalesce(max(planning), 0) + 1 AS planning FROM finance.moviments`
        );
        const planningId = Number(nextPlanning.planning);
        const moviments = await insertPlanningMoviments(transaction, planning, planningId, status.id);

        return { success: true, planning: planningId, moviments };
    });
}

async function editPlanning(body: any) {
    const planningId = normalizePlanningId(body?.planning);
    const planning = normalizePlanningPayload(body?.planningData ?? body);
    const status = await getProvisionedStatus(planning.contract);
    await assertPlanningSettingsAccess(planning, status.id);

    return dbloglife.tx(async transaction => {
        const existing = await transaction.oneOrNone(
            `SELECT 1 FROM finance.moviments WHERE planning = $1 AND contract = $2 LIMIT 1`,
            [planningId, planning.contract]
        );

        if (!existing) {
            throw new Error('Planning not found');
        }

        await transaction.none(
            `DELETE FROM finance.moviments WHERE planning = $1 AND contract = $2`,
            [planningId, planning.contract]
        );
        const moviments = await insertPlanningMoviments(transaction, planning, planningId, status.id);

        return { success: true, planning: planningId, moviments };
    });
}

async function deletePlanning(body: any) {
    const planningId = normalizePlanningId(body?.planning);
    const contract = normalizeNullableInteger(body?.contract, 'contract');
    const result = await dbloglife.result(
        `DELETE FROM finance.moviments WHERE planning = $1 AND contract = $2`,
        [planningId, contract]
    );

    if (result.rowCount === 0) {
        throw new Error('Planning not found');
    }

    return { success: true, planning: planningId, deleted: result.rowCount };
}

async function addMoviment(body: any) {
    try{
        const moviment = normalizeMovimentPayload(body?.moviment ?? body);
        await assertMovimentSettingsAccess(moviment);
        const insertedMoviment = await dbloglife.one(
            `INSERT INTO finance.moviments (
                contract,
                "user",
                datetime,
                description,
                ledger_account,
                moviment_account,
                status,
                value
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            getMovimentValues(moviment)
        );

        return {
            success: true,
            moviment: insertedMoviment
        };
    } catch (error) {
        console.log(`Error adding moviment`, error);
        throw error;
    }
}

async function editMoviment(body: any) {
    try{
        const movimentBody = body?.moviment ?? body?.updatedData ?? body;
        const id = normalizeMovimentId(body?.id ?? movimentBody?.id);
        const updatedMoviment = normalizeMovimentPayload(movimentBody);
        await assertMovimentSettingsAccess(updatedMoviment);

        const result = await dbloglife.oneOrNone(
            `UPDATE finance.moviments
                SET contract = $1,
                    "user" = $2,
                    datetime = $3,
                    description = $4,
                    ledger_account = $5,
                    moviment_account = $6,
                    status = $7,
                    value = $8
              WHERE id = $9 AND contract = $1
              RETURNING *`,
            [
                ...getMovimentValues(updatedMoviment),
                id
            ]
        );

        if (!result) {
            throw new Error('Moviment not found');
        }

        return {
            success: true,
            moviment: result
        };
    } catch (error) {
        console.log(`Error editing moviment`, error);
        throw error;
    }
}

async function deleteMoviment(body: any) {
    try{
        const id = normalizeMovimentId(body?.id ?? body?.moviment?.id);
        const result = await dbloglife.oneOrNone(
            `DELETE FROM finance.moviments
              WHERE id = $1 AND contract = $2
              RETURNING *`,
            [id, normalizeNullableInteger(body?.contract, 'contract')]
        );

        if (!result) {
            throw new Error('Moviment not found');
        }

        return {
            success: true,
            moviment: result
        };
    } catch (error) {
        console.log(`Error deleting moviment`, error);
        throw error;
    }
}

async function toggleMovimentCreditStatus(body: any) {
    try {
        const id = normalizeMovimentId(body?.id ?? body?.moviment?.id);
        const confirmed = body?.confirmed;

        if (typeof confirmed !== 'boolean') {
            throw new Error('Invalid credit status');
        }

        const result = await dbloglife.oneOrNone(
            `UPDATE finance.moviments
                SET credit_status = CASE
                    WHEN $2 = true THEN CURRENT_TIMESTAMP
                    ELSE NULL
                END
              WHERE id = $1 AND contract = $3
              RETURNING id, credit_status`,
            [id, confirmed, normalizeNullableInteger(body?.contract, 'contract')]
        );

        if (!result) {
            throw new Error('Moviment not found');
        }

        return {
            success: true,
            moviment: result
        };
    } catch (error) {
        console.log(`Error toggling moviment credit status`, error);
        throw error;
    }
}

async function getFinanceSettings(contract: any) {
    try {
        const contractId = normalizeNullableInteger(contract, 'contract');
        const params = [contractId];
        const contractFilter = 'WHERE contract = $1 OR contract IS NULL';

        const accounts = await dbloglife.any(
            `SELECT id, description, icon, contract, start_date, start_value, closing_day, account_type
               FROM finance.moviment_accounts
               ${contractFilter}
              ORDER BY description NULLS LAST, id`,
            params
        );
        const ledgerAccounts = await dbloglife.any(
            `SELECT id, description, icon, contract
               FROM finance.ledger_accounts
               ${contractFilter}
              ORDER BY description NULLS LAST, id`,
            params
        );
        const statuses = await dbloglife.any(
            `SELECT id, description, icon, contract
               FROM finance.status
               ${contractFilter}
              ORDER BY description NULLS LAST, id`,
            params
        );

        return {
            accounts,
            ledgerAccounts,
            statuses
        };
    } catch (error) {
        console.log(`Error getting finance settings`, error);
        throw error;
    }
}

async function addMovimentAccount(body: any) {
    try {
        const account = normalizeMovimentAccountPayload(body?.account ?? body);
        const result = await dbloglife.one(
            `INSERT INTO finance.moviment_accounts (
                description,
                icon,
                contract,
                start_date,
                start_value,
                closing_day,
                account_type
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            getMovimentAccountValues(account)
        );

        return { success: true, account: result };
    } catch (error) {
        console.log(`Error adding moviment account`, error);
        throw error;
    }
}

async function editMovimentAccount(body: any) {
    try {
        const accountBody = body?.account ?? body?.updatedData ?? body;
        const id = normalizeSettingsId(body?.id ?? accountBody?.id, 'account');
        const account = normalizeMovimentAccountPayload(accountBody);
        const result = await dbloglife.oneOrNone(
            `UPDATE finance.moviment_accounts
                SET description = $1,
                    icon = $2,
                    contract = $3,
                    start_date = $4,
                    start_value = $5,
                    closing_day = $6,
                    account_type = $7
              WHERE id = $8 AND contract = $3
              RETURNING *`,
            [
                ...getMovimentAccountValues(account),
                id
            ]
        );

        if (!result) {
            throw new Error('Account not found');
        }

        return { success: true, account: result };
    } catch (error) {
        console.log(`Error editing moviment account`, error);
        throw error;
    }
}

async function deleteMovimentAccount(body: any) {
    try {
        const id = normalizeSettingsId(body?.id ?? body?.account?.id, 'account');
        const result = await dbloglife.oneOrNone(
            `DELETE FROM finance.moviment_accounts
              WHERE id = $1 AND contract = $2
              RETURNING *`,
            [id, normalizeNullableInteger(body?.contract, 'contract')]
        );

        if (!result) {
            throw new Error('Account not found');
        }

        return { success: true, account: result };
    } catch (error) {
        console.log(`Error deleting moviment account`, error);
        throw error;
    }
}

async function addLedgerAccount(body: any) {
    return addBasicSettingsRecord(body, 'ledgerAccount', 'ledger account', 'finance.ledger_accounts');
}

async function editLedgerAccount(body: any) {
    return editBasicSettingsRecord(body, 'ledgerAccount', 'ledger account', 'finance.ledger_accounts');
}

async function deleteLedgerAccount(body: any) {
    return deleteBasicSettingsRecord(body, 'ledgerAccount', 'ledger account', 'finance.ledger_accounts');
}

async function addStatus(body: any) {
    return addBasicSettingsRecord(body, 'status', 'status', 'finance.status');
}

async function editStatus(body: any) {
    return editBasicSettingsRecord(body, 'status', 'status', 'finance.status');
}

async function deleteStatus(body: any) {
    return deleteBasicSettingsRecord(body, 'status', 'status', 'finance.status');
}

async function addBasicSettingsRecord(body: any, bodyKey: string, entityName: string, tableName: string) {
    try {
        const settings = normalizeBasicSettingsPayload(body?.[bodyKey] ?? body, entityName);
        const result = await dbloglife.one(
            `INSERT INTO ${tableName} (description, icon, contract)
             VALUES ($1, $2, $3)
             RETURNING *`,
            getBasicSettingsValues(settings)
        );

        return { success: true, [bodyKey]: result };
    } catch (error) {
        console.log(`Error adding ${entityName}`, error);
        throw error;
    }
}

async function editBasicSettingsRecord(body: any, bodyKey: string, entityName: string, tableName: string) {
    try {
        const settingsBody = body?.[bodyKey] ?? body?.updatedData ?? body;
        const id = normalizeSettingsId(body?.id ?? settingsBody?.id, entityName);
        const settings = normalizeBasicSettingsPayload(settingsBody, entityName);
        const result = await dbloglife.oneOrNone(
            `UPDATE ${tableName}
                SET description = $1,
                    icon = $2,
                    contract = $3
              WHERE id = $4 AND contract = $3
              RETURNING *`,
            [
                ...getBasicSettingsValues(settings),
                id
            ]
        );

        if (!result) {
            throw new Error(`${entityName.charAt(0).toUpperCase()}${entityName.slice(1)} not found`);
        }

        return { success: true, [bodyKey]: result };
    } catch (error) {
        console.log(`Error editing ${entityName}`, error);
        throw error;
    }
}

async function deleteBasicSettingsRecord(body: any, bodyKey: string, entityName: string, tableName: string) {
    try {
        const id = normalizeSettingsId(body?.id ?? body?.[bodyKey]?.id, entityName);
        const result = await dbloglife.oneOrNone(
            `DELETE FROM ${tableName}
              WHERE id = $1 AND contract = $2
              RETURNING *`,
            [id, normalizeNullableInteger(body?.contract, 'contract')]
        );

        if (!result) {
            throw new Error(`${entityName.charAt(0).toUpperCase()}${entityName.slice(1)} not found`);
        }

        return { success: true, [bodyKey]: result };
    } catch (error) {
        console.log(`Error deleting ${entityName}`, error);
        throw error;
    }
}

export {
    updatePark4NightCoordinates,
    updateCruiserList,
    updatePark4NightDB,
    feedPark4NightDB,
    updateIntermacheList,
    updateEuroStopsList,
    updateASAList,
    updateAREASACList,
    updateCAMPINGCARPARKList,
    getREVOLUTIONList,
    getBLOOMESTLAUNDRYList,
    updateLAWASHList,
    searchOpenRoute,
    updateCAMPERSTOPList,
    updateCAMPERCONTACTList,
    updateAIRECAMPINGCARList,
    updateParkingVerde,
    getPlannings,
    addPlanning,
    editPlanning,
    deletePlanning,
    getFinanceSettings,
    addMoviment,
    editMoviment,
    deleteMoviment,
    toggleMovimentCreditStatus,
    addMovimentAccount,
    editMovimentAccount,
    deleteMovimentAccount,
    addLedgerAccount,
    editLedgerAccount,
    deleteLedgerAccount,
    addStatus,
    editStatus,
    deleteStatus
};
