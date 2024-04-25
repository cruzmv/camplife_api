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

export { getPlacesList, latlong, getCruiserList };
