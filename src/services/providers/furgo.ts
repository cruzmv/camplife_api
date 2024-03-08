import * as fs from 'fs';
import * as path from 'path';
import { DataItem } from './dataItem.interface';
import { parseString } from 'xml2js';

interface Placemark {
    name: string;
    address: string;
    coordinates: string;
}

interface KMLData {
    description: string;
    placemarks: Placemark[];
}

async function readDataFolder(): Promise<DataItem[]> {
    const folderPath = path.join(__dirname, '../../../furgo');
    const files = fs.readdirSync(folderPath);
    const kmlDataArray: KMLData[] = [];

    for (const file of files) {
        if (file.endsWith('.kml')) {
            const filePath = path.join(folderPath, file);
            const kmlData = await readKMLFile(filePath);
            kmlDataArray.push(kmlData);
        }
    }
    
    const flatData: DataItem[] = kmlDataArray.flatMap((kmlData: KMLData) => {
        return kmlData.placemarks.map((placemark: Placemark) => {
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
}

function parseCoordinates(coordinates: string[]): { latitude: number; longitude: number } {
    // Assuming coordinates is an array with a single string element in the format 'longitude,latitude'
    const [longitude, latitude] = coordinates[0].split(',').map(coord => parseFloat(coord.trim()));

    return { latitude, longitude };
}

async function readKMLFile(filePath: string): Promise<KMLData> {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    return new Promise((resolve, reject) => {
        parseString(fileContent, (err, result) => {
            if (err) {
                reject(err);
            } else {
                const description = result.kml.Folder[0].description[0];
                const placemarks = result.kml.Folder[0].Placemark.map((placemark: any) => ({
                    name: placemark.name[0],
                    address: placemark.address[0],
                    coordinates: placemark.Point[0].coordinates[0],
                }));
                resolve({ description, placemarks });
            }
        });
    });
}

const name = 'furgo'
export { readDataFolder };
export { name }