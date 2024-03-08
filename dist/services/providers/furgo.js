"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.name = exports.readDataFolder = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const xml2js_1 = require("xml2js");
function readDataFolder() {
    return __awaiter(this, void 0, void 0, function* () {
        const folderPath = path.join(__dirname, '../../../furgo');
        const files = fs.readdirSync(folderPath);
        const kmlDataArray = [];
        for (const file of files) {
            if (file.endsWith('.kml')) {
                const filePath = path.join(folderPath, file);
                const kmlData = yield readKMLFile(filePath);
                kmlDataArray.push(kmlData);
            }
        }
        const flatData = kmlDataArray.flatMap((kmlData) => {
            return kmlData.placemarks.map((placemark) => {
                const latitudeLongitude = parseCoordinates([placemark.coordinates]);
                return {
                    name: placemark.name,
                    address: placemark.address,
                    location: {
                        latitude: latitudeLongitude.latitude,
                        longitude: latitudeLongitude.longitude,
                    },
                };
            });
        });
        return flatData;
    });
}
exports.readDataFolder = readDataFolder;
function parseCoordinates(coordinates) {
    // Assuming coordinates is an array with a single string element in the format 'longitude,latitude'
    const [longitude, latitude] = coordinates[0].split(',').map(coord => parseFloat(coord.trim()));
    return { latitude, longitude };
}
function readKMLFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return new Promise((resolve, reject) => {
            (0, xml2js_1.parseString)(fileContent, (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    const description = result.kml.Folder[0].description[0];
                    const placemarks = result.kml.Folder[0].Placemark.map((placemark) => ({
                        name: placemark.name[0],
                        address: placemark.address[0],
                        coordinates: placemark.Point[0].coordinates[0],
                    }));
                    resolve({ description, placemarks });
                }
            });
        });
    });
}
const name = 'furgo';
exports.name = name;
//# sourceMappingURL=furgo.js.map