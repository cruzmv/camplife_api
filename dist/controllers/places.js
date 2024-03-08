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
exports.getPlacesList = void 0;
const postgresql_1 = require("../services/postgresql");
function getPlacesList(cood) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`places requested for ${JSON.stringify(cood)}`);
        try {
            const result = yield postgresql_1.db.any(`
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
                 photos
            FROM get_places_within_radius($1, $2)
        `, [cood.lat, cood.long]);
            console.log(`returning ${result.length} places`);
            return result;
        }
        catch (error) {
            console.error('Error retrieving places:', error);
            throw new Error('Error retrieving places');
        }
    });
}
exports.getPlacesList = getPlacesList;
//# sourceMappingURL=places.js.map