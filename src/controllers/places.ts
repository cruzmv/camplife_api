import { db } from '../services/postgresql'

interface latlong {
    lat: string;
    long: string;
}

interface Place {
    place_name: string;
    place_latitude: number;
    place_longitude: number;
    place_distance_km: number;
}

async function getPlacesList(cood: latlong): Promise<Place[]> {
  console.log(`places requested for ${JSON.stringify(cood)}`);
    try {
      const result = await db.any<Place>(
        `
          SELECT place_id, 
                 place_name, 
                 place_latitude, 
                 place_longitude, 
                 place_distance_km, 
                 is_center, 
                 place_category,
                 verified,
                 place_resume,
                 place_address,
                 closing_date,
                 parking_price,
                 service_price,
                 number_places,
                 height_limit,
                 postal_code,
                 water_point,
                 black_water,
                 public_toilet,
                 shower,
                 electricity,
                 has_wifi,
                 gray_water,
                 laudry,
                 photos
            FROM get_places_within_radius($1, $2)
        `,
        [cood.lat, cood.long]
      );
      
      console.log(`returning ${result.length} places`);
      return result;
    } catch (error) {
      console.error('Error retrieving places:', error);
      throw new Error('Error retrieving places');
    }
}


async function getCruiserList(cood: latlong): Promise<Place[]> {
    try {
      const result = await db.any<Place>(
        `
          SELECT latitude,longitude,title_place,place_place,description_place,place_distance_km,is_center,more_place
            FROM get_cruiser_within_radius($1, $2)
        `,
        [cood.lat, cood.long]
      );
      
      console.log(`returning ${result.length} cruiser places`);
      return result;
    } catch (error) {
      console.error('Error retrieving cruiser places:', error);
      throw new Error('Error retrieving cruiser places');
    }
}


async function getIntermacheList(cood: latlong): Promise<Place[]> {
  try {
    const result = await db.any<Place>(
      `
        SELECT latitude,longitude,label,address,title,url,distance_km from get_intermache_within_radius($1, $2)
      `,
      [cood.lat, cood.long]
    );
    
    console.log(`returning ${result.length} intermache places`);
    return result;
  } catch (error) {
    console.error('Error retrieving intermache places:', error);
    throw new Error('Error retrieving intermache places');
  }
}

async function getEuroStopslList(cood: latlong): Promise<Place[]> {
  try {
    const result = await db.any<Place>(
      `
        SELECT eurostop_id,eurostop_name,eurostop_latitude,eurostop_longitude,eurostop_distance_km,is_center,eurostop_address,eurostop_city,eurostop_country,eurostop_description,eurostop_email,eurostop_categories_id,eurostop_link,eurostop_phone,eurostop_postal_code,eurostop_street,eurostop_type,eurostop_website,eurostop_whatsapp,photos from get_eurostops_within_radius($1, $2)
      `,
      [cood.lat, cood.long]
    );
    
    console.log(`returning ${result.length} intermache places`);
    return result;
  } catch (error) {
    console.error('Error retrieving intermache places:', error);
    throw new Error('Error retrieving intermache places');
  }
}


async function getcampingcarportugalList(cood: latlong): Promise<Place[]> {
  try {
    const result = await db.any<Place>(
      `
        SELECT latitude,longitude,distritocoordenadas,nomeasmorada,tipologiatarifa,pernoitanlugares,aguatarifa,tarifa220v,despaguascinz,despwcquim,wc,wifipreco,descricaodaarea,distance_km from get_campingcarportugal_within_radius($1, $2)
      `,
      [cood.lat, cood.long]
    );
    
    console.log(`returning ${result.length} intermache places`);
    return result;
  } catch (error) {
    console.error('Error retrieving intermache places:', error);
    throw new Error('Error retrieving intermache places');
  }
}

async function getareasacList(cood: latlong): Promise<Place[]> {
  try {
    const result = await db.any<Place>(
      `
        SELECT latitude,longitude,title,link,"type",distance_km from get_areasac_within_radius($1, $2)
      `,
      [cood.lat, cood.long]
    );
    
    console.log(`returning ${result.length} areasac places`);
    return result;
  } catch (error) {
    console.error('Error retrieving areasac places:', error);
    throw new Error('Error retrieving areasac places');
  }
}

async function getPark4NightMyDB(cood: latlong): Promise<Place[]> {
  try {
    const result: any = await db.any<Place>(
      `
        select data from get_campings_with_photos_within_radius($1, $2)
      `,
      [cood.lat, cood.long]
    );

    const results: any = {lieux: []}
    for (let i = 0; i < result.length; i++) {
      results.lieux.push(result[i].data)
    } 
    
    console.log(`returning ${results.lieux.length} park4night places`);
    return results;
  } catch (error) {
    console.error('Error retrieving park4night places:', error);
    throw new Error('Error retrieving park4night places');
  }
}

async function getcampingcarparkList(cood: latlong): Promise<Place[]> {
  try {
    const result = await db.any<Place>(
      `
        SELECT latitude,longitude,id,status,"type","data",distance_km FROM get_campingcarpark_within_radius($1, $2)
      `,
      [cood.lat, cood.long]
    );
    
    console.log(`returning ${result.length} campingcarpark places`);
    return result;
  } catch (error) {
    console.error('Error retrieving campingcarpark places:', error);
    throw new Error('Error retrieving campingcarpark places');
  }
}


export { getPlacesList, latlong, getCruiserList, getIntermacheList, getcampingcarportugalList, getEuroStopslList, getareasacList, getPark4NightMyDB, getcampingcarparkList };
